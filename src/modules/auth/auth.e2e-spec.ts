import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import jwt from 'jsonwebtoken';
import { ConfigService } from '@nestjs/config';

import { AppModule } from '../../app.module';
import { AuthService } from './auth.service';

describe('/auth/login (POST) JWT E2E', () => {
  let app: INestApplication;
  let authService: AuthService;
  let configService: ConfigService;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    authService = moduleFixture.get(AuthService);
    configService = moduleFixture.get(ConfigService);

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(new ValidationPipe({ whitelist: true }));
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  it('should return a valid JWT token', async () => {
    const dto = {
      email: 'admin@gmail.com',
      password: 'admin123',
    };

    const secret = configService.getOrThrow('secret');
    const payload = { sub: 1, email: dto.email };

    jest.spyOn(authService, 'signIn').mockImplementation(async () => {
      const token = jwt.sign(payload, secret, { expiresIn: '1h' });
      const refreshToken = jwt.sign(payload, secret, { expiresIn: '1d' });
      return { access_token: token, refresh_token: refreshToken};
    });

    const response = await request(app.getHttpServer())
      .post('/auth/login')
      .send(dto)
      .expect(200);

    expect(response.body).toHaveProperty('access_token');

    const decoded = jwt.verify(response.body.access_token, secret) as any;
    expect(decoded.email).toBe(dto.email);
    expect(decoded.sub).toBe(1);
  });
});
