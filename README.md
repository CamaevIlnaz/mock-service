# Smart Mock Proxy — Backend

Backend-сервис для приёма запросов от frontend-приложений, возврата настроенных mock-ответов и проксирования на выбранные стенды.

На текущем этапе: NestJS + Fastify, PostgreSQL, Prisma, health-check, Swagger, пользователи и JWT-авторизация через httpOnly cookie, CRUD стендов, мок-серверов, правил мокирования и файлов ответов.

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
- `POST /api/users/me/avatar` — замена аватара (multipart, поле `avatar`)

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

## Путь `/mockapi` (зарезервирован)

Путь **`/mockapi/{connectionToken}/...`** зарезервирован под будущие запросы с фронта: они будут проксироваться на стенд из настройки мок-сервера (`domain` + `basePath`).

Сейчас proxy **не реализован**. Сервисный API — только под `/api/...`.

## Основные команды

| Команда | Описание |
| --- | --- |
| `yarn start:dev` | Запуск в режиме разработки |
| `yarn start:prod` | Запуск production-сборки |
| `yarn build` | Сборка проекта |
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

## Что будет дальше

- proxy `/mockapi/{connectionToken}` на стенды
- mock engine
- сценарии моков и история запросов
- Record/Replay
- OpenAPI-интеграция
- эмуляция Camunda BPM
