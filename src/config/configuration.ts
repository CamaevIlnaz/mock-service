import { registerAs } from '@nestjs/config';

export default registerAs('app', () => ({
  nodeEnv: process.env.NODE_ENV ?? 'development',
  port: parseInt(process.env.PORT ?? '3000', 10),
  apiPrefix: process.env.API_PREFIX ?? 'api',
  swaggerPath: process.env.SWAGGER_PATH ?? 'docs',
  databaseUrl: process.env.DATABASE_URL,
  jwtSecret: process.env.JWT_SECRET,
  jwtExpiresIn: process.env.JWT_EXPIRES_IN ?? '7d',
  cookieName: process.env.COOKIE_NAME ?? 'access_token',
  corsOrigin: process.env.CORS_ORIGIN ?? 'http://localhost:5173',
  uploadsDir: process.env.UPLOADS_DIR ?? 'uploads',
  publicDir: process.env.PUBLIC_DIR ?? 'public',
}));
