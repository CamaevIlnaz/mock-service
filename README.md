# Smart Mock Proxy — Backend

Backend-сервис для приёма запросов от frontend-приложений, возврата настроенных mock-ответов и проксирования на выбранные стенды.

На текущем этапе: NestJS + Fastify, PostgreSQL, Prisma, health-check, Swagger, пользователи и JWT-авторизация через httpOnly cookie, CRUD стендов, мок-серверов, правил мокирования и файлов ответов, mock proxy `/mockapi` с проксированием на стенды.

## Стек

- Node.js + TypeScript
- NestJS + FastifyAdapter
- PostgreSQL
- Prisma (ORM и миграции)
- JWT (cookie)
- Docker Compose
- Swagger/OpenAPI
- ESLint + Prettier
- Jest
- Yarn

## Структура

```text
src/
  common/          # guards, decorators, utils
  config/          # конфигурация и валидация env
  modules/
    auth/          # регистрация, логин, logout, me
    health/        # health-check endpoint
    users/         # загрузка аватара
    stands/        # справочник стендов
    mock-servers/  # персональные мок-серверы
    mock-rules/    # правила мокирования
    mock-response-files/ # файлы ответов мок-сервера
    mock-proxy/    # /mockapi: mock-ответы и проксирование на стенд
  prisma/          # PrismaModule / PrismaService
  app.module.ts
  main.ts
prisma/
  schema.prisma
uploads/           # аватары и файлы ответов (локально)
docker-compose.yml
```

## Быстрый старт

### 1. Установка зависимостей

```bash
yarn install
```

### 2. Переменные окружения

```bash
cp .env.example .env
```

Задайте `JWT_SECRET` (обязателен).

### 3. PostgreSQL

```bash
yarn db:up
```

### 4. Миграции и Prisma Client

```bash
yarn prisma:migrate
```

### 5. Запуск backend

```bash
yarn start:dev
```

Сервис будет доступен по адресу:

- Health: http://localhost:3000/api/health
- Auth: http://localhost:3000/api/auth
- Stands: http://localhost:3000/api/stands
- Mock servers: http://localhost:3000/api/mock-servers
- Mock rules: http://localhost:3000/api/mock-servers/:mockServerId/rules
- Response files: http://localhost:3000/api/mock-servers/:mockServerId/response-files
- Swagger: http://localhost:3000/docs
- Uploads (avatars): http://localhost:3000/uploads/...

## Авторизация

- `POST /api/auth/register` — multipart (`login`, `password`, `firstName`, опционально `avatar`); выставляет httpOnly cookie
- `POST /api/auth/login` — JSON `{ login, password }`; выставляет cookie
- `POST /api/auth/logout` — очищает cookie
- `GET /api/auth/me` — текущий пользователь (по cookie)
- `PATCH /api/users/me` — JSON `{ firstName }`; обновление имени (login менять нельзя)
- `PATCH /api/users/me/password` — JSON `{ currentPassword, newPassword }`; смена пароля
- `POST /api/users/me/avatar` — замена аватара (multipart, поле `avatar`, PNG или JPG)

Фронтенд должен вызывать API с `credentials: 'include'` и обрабатывать 401. Токен в JSON не отдаётся.

Роли: `user` (по умолчанию при регистрации) и `admin` (назначается вручную в БД: `UPDATE users SET role = 'admin' WHERE login = '...'`). В ответах auth/me поле `role`.

CORS: `CORS_ORIGIN` + `credentials: true`.

## Стенды

Общий справочник (доступен всем авторизованным пользователям):

- `GET /api/stands` — список
- `GET /api/stands/:id` — один стенд
- `POST /api/stands` — создать (`code`, `name`, `domain`, `basePath`)
- `PATCH /api/stands/:id` — обновить
- `DELETE /api/stands/:id` — удалить (запрещено, если есть связанные мок-серверы)

## Мок-серверы

Персональные мок-серверы текущего пользователя:

- `GET /api/mock-servers` — список (по `sortOrder`)
- `GET /api/mock-servers/:id` — один мок-сервер
- `POST /api/mock-servers` — создать (`standCode` обязателен; `name` и `sortOrder` опциональны)
- `PATCH /api/mock-servers/:id` — обновить
- `DELETE /api/mock-servers/:id` — удалить

При создании генерируется `connectionToken`. В каждом ответе CRUD отдаётся `connectionToken`.

Имя по умолчанию: `Мок сервер #n` (номер среди серверов пользователя).

При удалении мок-сервера каскадно удаляются его правила и записи файлов; физическая папка `uploads/mock-responses/{mockServerId}` удаляется сервисом.

## Правила мокирования

Правила принадлежат мок-серверу текущего пользователя:

- `GET /api/mock-servers/:mockServerId/rules` — список (по `priority` asc; меньший приоритет выше)
- `GET /api/mock-servers/:mockServerId/rules/:id` — одно правило
- `POST /api/mock-servers/:mockServerId/rules` — создать
- `PATCH /api/mock-servers/:mockServerId/rules/:id` — обновить
- `DELETE /api/mock-servers/:mockServerId/rules/:id` — удалить правило (файл ответа не удаляется)
- `POST /api/mock-servers/:mockServerId/rules/:id/copy` — копировать правило (`{ "targetMockServerId": "..." }`)

Типы ответа:

- `INLINE_JSON` — JSON body (`application/json`) с полем `responseBody`
- `FILE` — либо JSON с `responseFileId` существующего файла того же мок-сервера, либо `multipart/form-data` с полями `data` (JSON настроек) и `file` (новый файл)

Новый файл создаётся только вместе с сохранением правила. Физический путь: `uploads/mock-responses/{mockServerId}/{fileId}.{ext}` (имя на диске не из `originalName`).

При копировании внутри одного мок-сервера файл переиспользуется; при копировании на другой сервер создаётся независимая копия файла.

## Файлы ответов

- `GET /api/mock-servers/:mockServerId/response-files` — список файлов сервера
- `GET /api/mock-servers/:mockServerId/response-files/:fileId/content` — скачать (JWT + ownership; не публичный `/uploads`)
- `DELETE /api/mock-servers/:mockServerId/response-files/:fileId` — удалить; `409`, если файл используется правилами

Один файл может использоваться несколькими правилами одного мок-сервера.

## Mock proxy `/mockapi`

Запросы тестируемого приложения идут на **`/mockapi/{connectionToken}/{url}`** (без префикса `/api`, без JWT). Мок-сервер определяется по `connectionToken` из CRUD мок-серверов.

Алгоритм:

1. Среди включённых правил мок-сервера с тем же HTTP-методом (по `priority` asc, затем `id` asc) ищется первое, у которого `urlMask` совпадает с `{url}`.
2. Если правило найдено — отдаётся mock-ответ (`statusCode`, `delayMs`, `responseHeaders`, `INLINE_JSON` или файл), заголовок `X-Mocked-By: smart-mock-proxy`.
3. Иначе запрос проксируется на **`{stand.domain}{stand.basePath}{url}?query`** с тем же методом, заголовками и body; заголовок `X-Mocked-By: proxy`.

Пример: `domain=https://dev.example.com`, `basePath=/api`, запрос `GET /mockapi/{token}/products?page=1` уходит на `https://dev.example.com/api/products?page=1`.

Маска `urlMask` задаётся относительно `{url}` (без `/api` фронта и без `basePath`):

- `/products` — точное совпадение (trailing slash не важен)
- `/products/:id` — `:param` соответствует ровно одному сегменту
- `/products/*` — `*` соответствует любому остатку пути, в том числе пустому

Query и заголовки в матчинге не участвуют. Методы `HEAD` и `OPTIONS` всегда проксируются.

Ошибки: `404` — неизвестный `connectionToken`; `502` — стенд недоступен или `domain` некорректен; `504` — стенд не ответил за 30 секунд. Редиректы стенда (`3xx`) отдаются клиенту как есть. Лимит body — 10 МБ.

### Подключение через webpack devServer

Браузер ходит на dev-сервер webpack, а тот проксирует `/api` в mock-service:

```js
// webpack.config.js
devServer: {
  proxy: [
    {
      context: ['/api'],
      target: 'http://localhost:3000',
      pathRewrite: { '^/api': `/mockapi/${process.env.MOCK_TOKEN}` },
      changeOrigin: true,
      cookieDomainRewrite: 'localhost',
    },
  ],
},
```

Фронт шлёт `/api/products`, webpack отправляет `/mockapi/{connectionToken}/products`, mock-service отвечает по правилу или проксирует на стенд. `MOCK_TOKEN` — `connectionToken` нужного мок-сервера.

## Основные команды

| Команда | Описание |
| --- | --- |
| `yarn start:dev` | Запуск в режиме разработки |
| `yarn start:prod` | Запуск production-сборки |
| `yarn build` | Сборка проекта |
| `yarn build:web` | Сборка фронта в `public/` |
| `yarn lint` | ESLint с автофиксом |
| `yarn format` | Prettier |
| `yarn test` | Unit-тесты |
| `yarn test:e2e` | E2E-тесты |
| `yarn db:up` | Поднять PostgreSQL |
| `yarn db:down` | Остановить PostgreSQL |
| `yarn prisma:migrate` | Создать/применить миграции (dev) |
| `yarn prisma:migrate:deploy` | Применить миграции (prod/CI) |
| `yarn prisma:generate` | Сгенерировать Prisma Client |
| `yarn prisma:studio` | Открыть Prisma Studio |

## Переменные окружения

См. `.env.example`:

- `PORT` — порт HTTP-сервера
- `API_PREFIX` — глобальный префикс API
- `SWAGGER_PATH` — путь к Swagger UI
- `DATABASE_URL` — строка подключения к PostgreSQL
- `POSTGRES_*` — параметры для Docker Compose
- `JWT_SECRET` — секрет подписи JWT (обязательный)
- `JWT_EXPIRES_IN` — срок жизни токена (например `7d`)
- `COOKIE_NAME` — имя auth-cookie (по умолчанию `access_token`)
- `CORS_ORIGIN` — origin фронтенда для CORS с credentials
- `UPLOADS_DIR` — каталог загрузок (по умолчанию `uploads`)
- `PUBLIC_DIR` — каталог собранного фронта (по умолчанию `public`)
- `PRISMA_SCHEMA_ENGINE_BINARY` — путь к бинарнику schema engine для серверов без доступа к CDN Prisma (см. ниже)

## Фронтенд в `public`

Собранный фронт (`web-mock-service`) лежит в `public/` и раздаётся этим же backend с корня `/`: файлы отдаются как есть, остальные пути без расширения получают `index.html` (SPA-роутинг). `/api`, `/mockapi`, `/uploads` и Swagger работают как раньше. Если в `public/` нет `index.html`, раздача фронта отключена.

Пересобрать фронт (репозиторий `web-mock-service` должен лежать рядом):

```bash
yarn build:web
```

Фронт собирается с пустым `VITE_API_BASE_URL`, поэтому запросы идут на тот же origin и CORS не нужен. На сервере достаточно развернуть только этот backend вместе с папкой `public/`.

## Сервер без доступа к CDN Prisma

Prisma Client работает через драйвер-адаптер `@prisma/adapter-pg` (`engineType = "client"`), поэтому нативный query engine не нужен. Но CLI Prisma перед `prisma generate` и `prisma migrate` всё равно скачивает **schema engine** с `binaries.prisma.sh` под платформу сервера (например `debian-openssl-3.0.x`). Если доступа к этому адресу нет, бинарник нужно положить на сервер вручную.

1. Узнайте версию OpenSSL на сервере: `openssl version`. Для `3.x` нужен target `debian-openssl-3.0.x`, для `1.1.x` — `debian-openssl-1.1.x`.

2. Скачайте бинарник на любой машине с интернетом. Хэш в ссылке соответствует Prisma `6.19.3`; после обновления `prisma` его нужно взять заново: `node -p "require('@prisma/engines-version').enginesVersion"`.

   Linux/macOS:

   ```bash
   curl -L -o schema-engine.gz https://binaries.prisma.sh/all_commits/c2990dca591cba766e3b7ef5d9e8a84796e47ab7/debian-openssl-3.0.x/schema-engine.gz
   ```

   Windows (PowerShell, именно `curl.exe`):

   ```powershell
   curl.exe -L -o schema-engine.gz https://binaries.prisma.sh/all_commits/c2990dca591cba766e3b7ef5d9e8a84796e47ab7/debian-openssl-3.0.x/schema-engine.gz
   ```

3. Скопируйте файл на сервер и распакуйте:

   ```bash
   scp schema-engine.gz user@server:/opt/prisma/
   # на сервере
   cd /opt/prisma
   gunzip schema-engine.gz
   chmod +x schema-engine
   ./schema-engine --version
   ```

   Ошибка про `libssl` при запуске означает, что не совпала версия OpenSSL — скачайте другой target.

4. Задайте переменную в окружении, где выполняются `yarn install`, `yarn build` и `yarn prisma:migrate:deploy` (shell, systemd, Docker):

   ```bash
   export PRISMA_SCHEMA_ENGINE_BINARY=/opt/prisma/schema-engine
   ```

С этой переменной `prisma generate` и `prisma migrate deploy` ничего не скачивают. При `yarn install` пакет `@prisma/engines` всё ещё пытается загрузить бинарники в `postinstall`, но ошибка там подавляется и установку не прерывает.

## Что будет дальше

- сценарии моков и история запросов
- Record/Replay
- OpenAPI-интеграция
- эмуляция Camunda BPM
