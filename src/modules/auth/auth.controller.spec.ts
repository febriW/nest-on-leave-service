import { Test, TestingModule } from '@nestjs/testing';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { SignInDto } from './dto/signin.dto';

describe('AuthController', () => {
  let controller: AuthController;
  let service: AuthService;

  const mockAuthService = {
    signIn: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [AuthController],
      providers: [
        {
          provide: AuthService,
          useValue: mockAuthService,
        },
      ],
    }).compile();

    controller = module.get<AuthController>(AuthController);
    service = module.get<AuthService>(AuthService);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('signIn', () => {
  it('should return a mocked JWT token', async () => {
    const dto: SignInDto = { email: 'admin@gmail.com', password: 'password123' };
    const mockToken = { access_token: 'mocked.jwt.token' };

    mockAuthService.signIn.mockResolvedValue(mockToken);

    const result = await controller.signIn(dto);
    expect(result).toEqual(mockToken);
    expect(mockAuthService.signIn).toHaveBeenCalledWith(dto);
    });
  });

});