import { Test, TestingModule } from '@nestjs/testing';
import { UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcrypt';

import { AuthService } from './auth.service';
import { AdminService } from '../admin/admin.service';
import { SignInDto } from './dto/signin.dto';

jest.mock('bcrypt');

describe('AuthService', () => {
  let authService: AuthService;
  let adminService: AdminService;
  let jwtService: JwtService;

  const mockAdminService = {
    findByEmail: jest.fn(),
  };

  const mockJwtService = {
    signAsync: jest.fn(),
  };

  const mockConfigService = {
    get: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        {
          provide: AdminService,
          useValue: mockAdminService,
        },
        {
          provide: JwtService,
          useValue: mockJwtService,
        },
        {
          provide: ConfigService,
          useValue: mockConfigService,
        },
      ],
    }).compile();

    authService = module.get(AuthService);
    adminService = module.get(AdminService);
    jwtService = module.get(JwtService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('signIn', () => {
    const dto: SignInDto = {
      email: 'admin@gmail.com',
      password: 'password123',
    };

    it('should return access_token and refresh_token', async () => {
      const mockUser = {
        email: dto.email,
        password: 'hashed-password',
      };

      mockAdminService.findByEmail.mockResolvedValue(mockUser);

      (bcrypt.compare as jest.Mock).mockResolvedValue(true);

      mockJwtService.signAsync
        .mockResolvedValueOnce('access-token')
        .mockResolvedValueOnce('refresh-token');

      mockConfigService.get.mockReturnValue('refresh-secret');

      const result = await authService.signIn(dto);

      expect(result).toEqual({
        access_token: 'access-token',
        refresh_token: 'refresh-token',
      });

      expect(adminService.findByEmail).toHaveBeenCalledWith(dto.email);
      expect(bcrypt.compare).toHaveBeenCalledWith(dto.password, mockUser.password);
      expect(jwtService.signAsync).toHaveBeenCalledTimes(2);
    });

    it('should throw UnauthorizedException if user not found', async () => {
      mockAdminService.findByEmail.mockResolvedValue(null);

      await expect(authService.signIn(dto)).rejects.toThrow(
        UnauthorizedException,
      );
    });

    it('should throw UnauthorizedException if password is invalid', async () => {
      const mockUser = {
        email: dto.email,
        password: 'hashed-password',
      };

      mockAdminService.findByEmail.mockResolvedValue(mockUser);

      (bcrypt.compare as jest.Mock).mockResolvedValue(false);

      await expect(authService.signIn(dto)).rejects.toThrow(
        UnauthorizedException,
      );
    });
  });
});