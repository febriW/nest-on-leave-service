import { 
    Injectable, 
    UnauthorizedException, 
    Logger, 
    InternalServerErrorException 
} from '@nestjs/common';
import { AdminService } from '../admin/admin.service';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { SignInDto } from './dto/signin.dto';
import * as bcrypt from 'bcrypt';

@Injectable()
export class AuthService {
    private readonly logger = new Logger(AuthService.name);

    constructor(
        private readonly adminService: AdminService, 
        private readonly jwtService: JwtService, 
        private readonly configService: ConfigService
    ) {}

    async signIn(signInDto: SignInDto): Promise<{ access_token: string, refresh_token: string }> {
        try {
            const user = await this.adminService.findByEmail(signInDto.email);
            
            if (!user) {
                throw new UnauthorizedException('Invalid email or password');
            }

            const isPasswordMatching = await bcrypt.compare(signInDto.password, user.password);
            if (!isPasswordMatching) {
                throw new UnauthorizedException('Invalid email or password');
            }

            const payload = { email: user.email, sub: user.email };
            const [access_token, refresh_token] = await Promise.all([
                this.jwtService.signAsync(payload),
                this.jwtService.signAsync(payload, { 
                    secret: this.configService.get<string>('refresh_secret'), 
                    expiresIn: '1d' 
                })
            ]);

            return { access_token, refresh_token };

        } catch (error) {
            if (error instanceof UnauthorizedException) throw error;
            this.logger.error(`Sign-in unexpected error for email ${signInDto.email}: ${error.message}`, error.stack);
            throw new InternalServerErrorException('An error occurred during the authentication process');
        }
    }
}