/**
 * Общие утилиты, фильтры, пайпы и декораторы.
 */
export { CurrentUser } from './decorators/current-user.decorator';
export { JwtAuthGuard } from './guards/jwt-auth.guard';
export type { AuthenticatedRequest, JwtPayload } from './guards/jwt-auth.guard';
export {
  removeAvatarFile,
  saveAvatarFile,
  toAvatarUrl,
} from './utils/avatar-storage';
export type { AvatarUpload } from './utils/avatar-storage';
