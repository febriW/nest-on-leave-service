import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as bcrypt from 'bcrypt';
import * as jwt from 'jsonwebtoken';

import { AuthModule } from './auth.module';
import { Admin } from '../admin/admin.entity';
import { JenisKelamin } from '../admin/dto/admin.dto';

describe('Auth (E2E Test)', () => {
  let app: INestApplication;
  let adminRepo: Repository<Admin>;
  let configService: ConfigService;
  const api = () => request(app.getHttpServer());

  const testUser = {
    email: 'test-auth@gmail.com',
    password: 'password123',
  };

  beforeAll(async () => {
    jest.spyOn(console, 'log').mockImplementation(() => {});
    jest.spyOn(console, 'info').mockImplementation(() => {});
    jest.spyOn(console, 'error').mockImplementation(() => {});

    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [
        ConfigModule.forRoot({ isGlobal: true }),
        TypeOrmModule.forRootAsync({
          imports: [ConfigModule],
          inject: [ConfigService],
          useFactory: (configService: ConfigService) => ({
            type: 'mysql',
            host: configService.getOrThrow('TEST_MYSQL_HOST'),
            port: configService.getOrThrow('TEST_MYSQL_PORT'),
            username: configService.getOrThrow('TEST_MYSQL_USERNAME'),
            password: configService.getOrThrow('TEST_MYSQL_PASSWORD'),
            database: configService.getOrThrow('TEST_MYSQL_DB'),
            entities: [Admin],
            synchronize: true,
            dropSchema: true,
            logging: false, 
          }),
        }),
        AuthModule,
      ],
    }).compile();

    app = moduleFixture.createNestApplication();
    
    app.useGlobalPipes(new ValidationPipe({ 
      whitelist: true, 
      forbidNonWhitelisted: true, 
      transform: true 
    }));
    await app.init();

    adminRepo = moduleFixture.get<Repository<Admin>>(getRepositoryToken(Admin));
    configService = moduleFixture.get<ConfigService>(ConfigService);
  });

  afterAll(async () => {
    await app.close();
    jest.restoreAllMocks();
  });

  beforeEach(async () => {
    await adminRepo.query('SET FOREIGN_KEY_CHECKS = 0');
    await adminRepo.clear();
    await adminRepo.query('SET FOREIGN_KEY_CHECKS = 1');

    const hashedPassword = await bcrypt.hash(testUser.password, 10);
    await adminRepo.save({
      email: testUser.email,
      password: hashedPassword,
      nama_depan: 'Auth',
      nama_belakang: 'Tester',
      tanggal_lahir: new Date('1990-01-01'),
      jenis_kelamin: JenisKelamin.PRIA,
    });
  });

  describe('POST /auth/login', () => {
    
    it('should login successfully and return access & refresh tokens', async () => {
      const response = await api()
        .post('/auth/login')
        .send({
          email: testUser.email,
          password: testUser.password,
        })
        .expect(200);

      expect(response.body).toHaveProperty('access_token');
      expect(response.body).toHaveProperty('refresh_token');

      const secret = configService.get<string>('JWT_SECRET') || configService.get<string>('secret');
      const decoded = jwt.verify(response.body.access_token, secret!) as any;
      
      expect(decoded.email).toBe(testUser.email);
    });

    it('should return 401 for wrong password with generic message', async () => {
      const response = await api()
        .post('/auth/login')
        .send({
          email: testUser.email,
          password: 'wrongpassword',
        })
        .expect(401);

      expect(response.body.message).toBe('Invalid email or password');
    });

    it('should return 401 for non-existent email with generic message', async () => {
      const response = await api()
        .post('/auth/login')
        .send({
          email: 'notfound@gmail.com',
          password: testUser.password,
        })
        .expect(401);

      expect(response.body.message).toBe('Invalid email or password');
    });

    it('should return 400 for invalid email format', async () => {
      const response = await api()
        .post('/auth/login')
        .send({
          email: 'invalid-email-format',
          password: testUser.password,
        })
        .expect(400);

      expect(response.body.message).toBeInstanceOf(Array);
    });

    it('should return a valid long-lived refresh token', async () => {
      const response = await api()
        .post('/auth/login')
        .send(testUser)
        .expect(200);

      const refreshSecret = configService.get<string>('refresh_secret');
      const decodedRefresh = jwt.verify(response.body.refresh_token, refreshSecret!) as any;
      
      expect(decodedRefresh.email).toBe(testUser.email);
    });
  });
});