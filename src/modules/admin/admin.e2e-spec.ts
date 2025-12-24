import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { AdminModule } from './admin.module';
import { Admin } from './admin.entity';
import { Repository } from 'typeorm';
import { getRepositoryToken } from '@nestjs/typeorm';
import { CreateAdminDto, JenisKelamin } from './dto/admin.dto';

describe('Admin (E2E Test)', () => {
  let app: INestApplication;
  let adminRepo: Repository<Admin>;

  beforeAll(async () => {
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
          }),
        }),
        AdminModule,
      ],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true }));
    await app.init();

    adminRepo = moduleFixture.get<Repository<Admin>>(getRepositoryToken(Admin));
    await adminRepo.query('SET FOREIGN_KEY_CHECKS = 0');
    await adminRepo.clear();
    await adminRepo.query('SET FOREIGN_KEY_CHECKS = 1');

    await adminRepo.save([
      {
        email: 'admin1@test.com',
        password: 'password123',
        nama_depan: 'Admin1',
        nama_belakang: 'Test',
        tanggal_lahir: new Date('1990-01-01'),
        jenis_kelamin: JenisKelamin.PRIA,
      },
      {
        email: 'admin2@test.com',
        password: 'password123',
        nama_depan: 'Admin2',
        nama_belakang: 'Test',
        tanggal_lahir: new Date('1992-02-02'),
        jenis_kelamin: JenisKelamin.WANITA,
      },
    ]);
  });

  afterAll(async () => {
    await app.close();
  });

  it('/admin (GET) - get all admins', async () => {
    const response = await request(app.getHttpServer())
      .get('/admin')
      .query({ page: 1, limit: 10 })
      .expect(200);

    expect(Array.isArray(response.body.data)).toBe(true);
    expect(response.body.data.length).toBe(2);
  });

  it('/admin (POST) - create admin', async () => {
    const newAdmin: CreateAdminDto = {
      email: 'admin3@test.com',
      password: 'password123',
      nama_depan: 'Admin3',
      nama_belakang: 'Test',
      tanggal_lahir: new Date('1995-03-03'),
      jenis_kelamin: JenisKelamin.PRIA,
    };

    const response = await request(app.getHttpServer())
      .post('/admin')
      .send(newAdmin)
      .expect(201);

    expect(response.body.data).toHaveProperty('email', newAdmin.email);
    expect(response.body.data).toHaveProperty('nama_depan', newAdmin.nama_depan);
    expect(response.body.data).toHaveProperty('jenis_kelamin', newAdmin.jenis_kelamin);
  });

  it('/admin/:email (PUT) - update admin', async () => {
    const response = await request(app.getHttpServer())
      .put('/admin/admin1@test.com')
      .send({ nama_depan: 'UpdatedAdmin1' })
      .expect(200);

    expect(response.body.data).toHaveProperty('nama_depan', 'UpdatedAdmin1');
  });

  it('/admin/:email (DELETE) - remove admin', async () => {
    const response = await request(app.getHttpServer())
      .delete('/admin/admin2@test.com')
      .expect(200);

    expect(response.body).toHaveProperty('msg', 'Admin deleted successfully');
  });
});
