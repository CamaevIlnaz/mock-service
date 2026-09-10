# Smart Mock Proxy — Backend

Backend-сервис для приёма запросов от frontend-приложений, возврата настроенных mock-ответов и проксирования на выбранные стенды.

На текущем этапе: NestJS + Fastify, PostgreSQL, Prisma, health-check, Swagger, пользователи и JWT-авторизация через httpOnly cookie, CRUD стендов и мок-серверов.

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
  prisma/          # PrismaModule / PrismaService
  app.module.ts
  main.ts
prisma/
  schema.prisma
uploads/           # загруженные аватары (локально)
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
- Swagger: http://localhost:3000/docs
- Uploads: http://localhost:3000/uploads/...

## Авторизация

- `POST /api/auth/register` — multipart (`login`, `password`, `firstName`, `lastName`, опционально `avatar`); выставляет httpOnly cookie
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
