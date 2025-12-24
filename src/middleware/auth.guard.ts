import { 
    CanActivate,
    ExecutionContext,
    Injectable,
    UnauthorizedException
} from "@nestjs/common";
import { JwtService } from "@nestjs/jwt";
import { Request, Response } from "express";
import { Reflector } from "@nestjs/core";
import { ConfigService } from '@nestjs/config';

@Injectable()
export class AuthGuard implements CanActivate {
    constructor(
        private jwtService: JwtService,
        private reflector: Reflector,
        private configService: ConfigService
    ) {}

    async canActivate(context: ExecutionContext): Promise<boolean> {
        const isPublic = this.reflector.getAllAndOverride<boolean>('isPublic', [
            context.getHandler(),
            context.getClass(),
        ])

        if (isPublic) {
            return true
        }

        const request = context.switchToHttp().getRequest()
        const response = context.switchToHttp().getResponse<Response>()
        const token = this.extractTokenFromHeader(request)
        if(!token) throw new UnauthorizedException("You're not allowed to access this service")
        try {
            const payload = await this.jwtService.verifyAsync(token, {
                secret: this.configService.getOrThrow<string>('secret')
            })
            request['user'] = payload
        } catch (error) {
            const refreshToken = request.cookies?.refresh_token || request.headers['x-refresh-token']
            if (!refreshToken) throw new UnauthorizedException('Refresh token not provided')

            try {
                const refreshPayload = await this.jwtService.verifyAsync(refreshToken, {
                    secret: this.configService.getOrThrow<string>('refresh_secret')
                })

                const newAccessToken = await this.jwtService.signAsync(
                    { username: refreshPayload.username, sub: refreshPayload.sub },
                    { secret: this.configService.getOrThrow<string>('secret'), expiresIn: '2h'}
                )

                response.setHeader('x-access-token', newAccessToken)
                request['user'] = refreshPayload
                return true
            } catch {
                throw new UnauthorizedException("You're not allowed to access this service", "1003")
            }
        }
        return true
    }

    private extractTokenFromHeader(request: Request): string | undefined {
        const [type, token] = request.headers.authorization?.split(' ') ?? [];
        return type === 'Bearer' ? token : undefined;
      }
}