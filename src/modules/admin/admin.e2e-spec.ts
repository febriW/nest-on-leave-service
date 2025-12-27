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
  const api = () => request(app.getHttpServer());

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
    app.useGlobalPipes(new ValidationPipe({ 
      whitelist: true, 
      forbidNonWhitelisted: true, 
      transform: true 
    }));
    await app.init();

    adminRepo = moduleFixture.get<Repository<Admin>>(getRepositoryToken(Admin));
  });

  afterAll(async () => {
    await app.close();
  });

  beforeEach(async () => {
    await adminRepo.query('SET FOREIGN_KEY_CHECKS = 0');
    await adminRepo.clear();
    await adminRepo.query('SET FOREIGN_KEY_CHECKS = 1');
  });

  describe('POST /admin (Create)', () => {
    const validAdmin: CreateAdminDto = {
      email: 'admin@test.com',
      password: 'password123',
      nama_depan: 'John',
      nama_belakang: 'Doe',
      tanggal_lahir: new Date('1990-01-01'),
      jenis_kelamin: JenisKelamin.PRIA,
    };

    it('should create admin successfully and hash the password', async () => {
      const res = await api()
        .post('/admin')
        .send(validAdmin)
        .expect(201);

      expect(res.body.msg).toBe('Admin created successfully');
      expect(res.body.data.email).toBe(validAdmin.email);
      expect(res.body.data).not.toHaveProperty('password');

      const saved = await adminRepo.findOne({ where: { email: validAdmin.email } });
      expect(saved?.password).not.toBe(validAdmin.password);
    });

    it('should return 409 Conflict if email already exists', async () => {
      await adminRepo.save({ ...validAdmin, password: 'hashed' });

      const res = await api()
        .post('/admin')
        .send(validAdmin)
        .expect(409);

      expect(res.body.message).toContain('already registered');
    });

    it('should return 400 Bad Request if validation fails (e.g. short password)', async () => {
      const invalidAdmin = { ...validAdmin, password: '123' };

      await api()
        .post('/admin')
        .send(invalidAdmin)
        .expect(400);
    });
  });

  describe('GET /admin (Read All)', () => {
    it('should return paginated results and hide passwords', async () => {
      await adminRepo.save([
        { email: 'a1@test.com', password: 'h1', nama_depan: 'A', nama_belakang: '1', tanggal_lahir: new Date(), jenis_kelamin: JenisKelamin.PRIA },
        { email: 'a2@test.com', password: 'h2', nama_depan: 'A', nama_belakang: '2', tanggal_lahir: new Date(), jenis_kelamin: JenisKelamin.WANITA }
      ]);

      const res = await api()
        .get('/admin')
        .query({ page: 1, limit: 10 })
        .expect(200);

      expect(res.body.total).toBe(2);
      expect(res.body.data.length).toBe(2);
      expect(res.body.data[0]).not.toHaveProperty('password');
    });
  });

  describe('PUT /admin/:email (Update)', () => {
    const email = 'update@test.com';

    beforeEach(async () => {
      await adminRepo.save({
        email,
        password: 'old_password_hash',
        nama_depan: 'Old',
        nama_belakang: 'Name',
        tanggal_lahir: new Date(),
        jenis_kelamin: JenisKelamin.PRIA
      });
    });

    it('should update profile and hash new password if provided', async () => {
      const updateData = { nama_depan: 'NewName', password: 'newSecurePassword' };

      const res = await api()
        .put(`/admin/${email}`)
        .send(updateData)
        .expect(200);

      expect(res.body.data.nama_depan).toBe('NewName');
      
      const dbAdmin = await adminRepo.findOne({ where: { email } });
      expect(dbAdmin?.password).not.toBe('newSecurePassword');
    });

    it('should return 404 if admin does not exist', async () => {
      await api()
        .put('/admin/wrong@test.com')
        .send({ nama_depan: 'None' })
        .expect(404);
    });
  });

  describe('DELETE /admin/:email', () => {
    it('should delete admin successfully', async () => {
      const email = 'delete@test.com';
      await adminRepo.save({
        email,
        password: 'hash',
        nama_depan: 'Del',
        nama_belakang: 'Me',
        tanggal_lahir: new Date(),
        jenis_kelamin: JenisKelamin.WANITA
      });

      await api()
        .delete(`/admin/${email}`)
        .expect(200);

      const found = await adminRepo.findOne({ where: { email } });
      expect(found).toBeNull();
    });

    it('should return 404 if admin to delete is not found', async () => {
      await api()
        .delete('/admin/nonexistent@test.com')
        .expect(404);
    });
  });
});