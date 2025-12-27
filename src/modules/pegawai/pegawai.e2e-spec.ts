import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { PegawaiModule } from './pegawai.module';
import { Pegawai } from './pegawai.entity';
import { Repository } from 'typeorm';
import { getRepositoryToken } from '@nestjs/typeorm';
import { CreatePegawaiDto, JenisKelamin } from './dto/pegawai.dto';
import { Cuti } from '../cuti/cuti.entity';

describe('Pegawai (E2E Test)', () => {
  let app: INestApplication;
  let pegawaiRepo: Repository<Pegawai>;
  const api = () => request(app!.getHttpServer());

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
            entities: [Pegawai, Cuti],
            synchronize: true,
            dropSchema: true,
            logging: false,
          }),
        }),
        PegawaiModule,
      ],
    }).compile();

    app = moduleFixture.createNestApplication();
    
    app.useGlobalPipes(new ValidationPipe({ 
      whitelist: true, 
      forbidNonWhitelisted: true, 
      transform: true 
    }));
    await app.init();

    pegawaiRepo = moduleFixture.get<Repository<Pegawai>>(getRepositoryToken(Pegawai));
  });

  afterAll(async () => {
    await app.close();
    jest.restoreAllMocks();
  });

  beforeEach(async () => {
    await pegawaiRepo.query('SET FOREIGN_KEY_CHECKS = 0');
    await pegawaiRepo.clear();
    await pegawaiRepo.query('SET FOREIGN_KEY_CHECKS = 1');

    await pegawaiRepo.save([
      {
        nama_depan: 'John',
        nama_belakang: 'Doe',
        email: 'john.doe@test.com',
        no_hp: '+6281234567890',
        alamat: 'Jl. Merdeka No. 1, Jakarta',
        jenis_kelamin: JenisKelamin.PRIA,
      },
      {
        nama_depan: 'Jane',
        nama_belakang: 'Doe',
        email: 'jane.doe@test.com',
        no_hp: '+6289876543210',
        alamat: 'Jl. Merdeka No. 2, Jakarta',
        jenis_kelamin: JenisKelamin.WANITA,
      },
    ]);
  });

  describe('GET /pegawai', () => {
    it('should get all pegawai with pagination', async () => {
      const response = await api()
        .get('/pegawai')
        .query({ page: 1, limit: 10 })
        .expect(200);

      expect(response.body).toHaveProperty('data');
      expect(response.body).toHaveProperty('total');
      expect(response.body.data.length).toBe(2);
    });
  });

  describe('POST /pegawai', () => {
    const newPegawai: CreatePegawaiDto = {
      nama_depan: 'Alice',
      nama_belakang: 'Smith',
      email: 'alice.smith@test.com',
      no_hp: '+6281122334455',
      alamat: 'Jl. Sudirman No. 10, Jakarta',
      jenis_kelamin: JenisKelamin.WANITA,
    };

    it('should create pegawai successfully', async () => {
      const response = await api()
        .post('/pegawai')
        .send(newPegawai)
        .expect(201);

      expect(response.body.data).toHaveProperty('email', newPegawai.email);
      expect(response.body.msg).toBe('Pegawai created successfully');
    });

    it('should return 409 if email already registered', async () => {
      const duplicatePegawai = { ...newPegawai, email: 'john.doe@test.com' };

      const response = await api()
        .post('/pegawai')
        .send(duplicatePegawai)
        .expect(409);

      expect(response.body.message).toContain('already created with this Email');
    });

    it('should return 400 for invalid email format', async () => {
      const invalidData = { ...newPegawai, email: 'not-an-email' };

      await api()
        .post('/pegawai')
        .send(invalidData)
        .expect(400);
    });
  });

  describe('PUT /pegawai/:email', () => {
    it('should update pegawai data successfully', async () => {
      const email = 'john.doe@test.com';
      const updateData = { nama_depan: 'John Updated' };

      const response = await api()
        .put(`/pegawai/${email}`)
        .send(updateData)
        .expect(200);

      expect(response.body.data.nama_depan).toBe('John Updated');
      expect(response.body.msg).toBe('Pegawai updated successfully');
    });

    it('should return 404 if email not found', async () => {
      await api()
        .put('/pegawai/notfound@test.com')
        .send({ nama_depan: 'Ghost' })
        .expect(404);
    });
  });

  describe('DELETE /pegawai/:email', () => {
    it('should delete pegawai successfully', async () => {
      const email = 'john.doe@test.com';

      const response = await api()
        .delete(`/pegawai/${email}`)
        .expect(200);

      expect(response.body.msg).toBe('Data pegawai deleted successfully');
      const check = await pegawaiRepo.findOne({ where: { email } });
      expect(check).toBeNull();
    });

    it('should return 404 if data to delete is not found', async () => {
      await api()
        .delete('/pegawai/notfound@test.com')
        .expect(404);
    });
  });
});