import {
  Injectable,
  ExecutionContext,
  UnauthorizedException,
  Inject,
  forwardRef,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { AuthGuard } from '@nestjs/passport';
import { IS_PUBLIC_KEY } from '../decorators/public.decorator';
import { TokenUtil } from '../utils/token.util';

@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {
  constructor(
    private reflector: Reflector,
    @Inject(forwardRef(() => TokenUtil))
    private tokenUtil: TokenUtil,
  ) {
    super();
  }

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (isPublic) {
      return true;
    }

    const request = context.switchToHttp().getRequest();
    const token = request.cookies?.access_token || request.headers.authorization?.split(' ')[1];

    if (!token) {
      throw new UnauthorizedException('Not authorized, no token');
    }

    // Verify JWT first
    const canActivate = await super.canActivate(context);
    if (!canActivate) {
      return false;
    }

    // Get decoded token from request (set by JwtStrategy)
    const decoded = request.user;
    if (!decoded || !decoded.jti) {
      throw new UnauthorizedException('Invalid token');
    }

    // Verify session exists in Redis
    const session = await this.tokenUtil.getSession(decoded.jti);
    if (!session || session.userId !== decoded.id) {
      throw new UnauthorizedException('Session invalid or expired');
    }

    // Attach session ID to request
    request.user.sessionId = decoded.jti;

    return true;
  }
}
