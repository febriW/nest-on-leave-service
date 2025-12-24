import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { TypeOrmModule } from '@nestjs/typeorm';
import request from 'supertest';
import { getRepositoryToken } from '@nestjs/typeorm';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { Repository } from 'typeorm';
import { Pegawai } from '../pegawai/pegawai.entity';
import { Cuti } from './cuti.entity';
import { CutiModule } from './cuti.module';
import { PegawaiModule } from '../pegawai/pegawai.module';
import dayjs from 'dayjs';

describe('Cuti (E2E Test)', () => {
  let app: INestApplication;
  let cutiRepo: Repository<Cuti>;
  let pegawaiRepo: Repository<Pegawai>;

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
            port: +configService.getOrThrow('TEST_MYSQL_PORT'),
            username: configService.getOrThrow('TEST_MYSQL_USERNAME'),
            password: configService.getOrThrow('TEST_MYSQL_PASSWORD'),
            database: configService.getOrThrow('TEST_MYSQL_DB'),
            entities: [Pegawai, Cuti],
            synchronize: true,
            dropSchema: true,
          }),
        }),
        CutiModule,
        PegawaiModule,
      ],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true }));
    await app.init();

    cutiRepo = moduleFixture.get<Repository<Cuti>>(getRepositoryToken(Cuti));
    pegawaiRepo = moduleFixture.get<Repository<Pegawai>>(getRepositoryToken(Pegawai));
  });

  afterAll(async () => {
    await app.close();
  });

  let pegawai: Pegawai;

  beforeEach(async () => {
    await cutiRepo.createQueryBuilder().delete().execute();
    await pegawaiRepo.createQueryBuilder().delete().execute();
    pegawai = await pegawaiRepo.save({
        nama_depan: 'Test',
        nama_belakang: 'Pegawai',
        email: 'pegawai@example.com',
        no_hp: '+628123456789',
        alamat: 'Jl. Test',
        jenis_kelamin: 'L',
    });
  });

  describe('POST /cuti', () => {
    it('should create cuti successfully', async () => {
      const dto = {
        alasan: 'Family event',
        tanggal_mulai: '2025-01-01',
        tanggal_selesai: '2025-01-02',
        pegawaiEmail: pegawai.email,
      };

      const res = await request(app.getHttpServer())
        .post('/cuti')
        .send(dto)
        .expect(201);

      const saved = await cutiRepo.createQueryBuilder('cuti')
        .leftJoinAndSelect('cuti.pegawai', 'pegawai')
        .where('pegawai.email = :email', { email: pegawai.email })
        .getOne();
      expect(saved).toBeDefined();
      expect(saved?.alasan).toBe(dto.alasan);
    });

    it('should fail if pegawai not found', async () => {
      const dto = {
        alasan: 'Family event',
        tanggal_mulai: '2025-01-01',
        tanggal_selesai: '2025-01-02',
        pegawaiEmail: 'unknown@example.com',
      };

      await request(app.getHttpServer())
        .post('/cuti')
        .send(dto)
        .expect(400);
    });

    it('should fail if end date before start date', async () => {
      const dto = {
        alasan: 'Event',
        tanggal_mulai: '2025-01-05',
        tanggal_selesai: '2025-01-01',
        pegawaiEmail: pegawai.email,
      };

      await request(app.getHttpServer()).post('/cuti').send(dto).expect(400);
    });

    it('should enforce 1 day leave per month', async () => {
      const dto1 = {
        alasan: 'Event 1',
        tanggal_mulai: '2025-02-01',
        tanggal_selesai: '2025-02-01',
        pegawaiEmail: pegawai.email,
      };
      const dto2 = {
        alasan: 'Event 2',
        tanggal_mulai: '2025-02-15',
        tanggal_selesai: '2025-02-15',
        pegawaiEmail: pegawai.email,
      };

      await request(app.getHttpServer()).post('/cuti').send(dto1).expect(201);
      await request(app.getHttpServer()).post('/cuti').send(dto2).expect(400);
    });

    it('should enforce yearly leave limit of 12 days', async () => {
      for (let i = 1; i <= 12; i++) {
        await cutiRepo.save({
          pegawai,
          tanggal_mulai: dayjs(`2025-03-${i}`).toDate(),
          tanggal_selesai: dayjs(`2025-03-${i}`).toDate(),
          alasan: 'Existing leave',
        });
      }

      const dto = {
        alasan: 'New leave',
        tanggal_mulai: '2025-04-01',
        tanggal_selesai: '2025-04-01',
        pegawaiEmail: pegawai.email,
      };

      await request(app.getHttpServer()).post('/cuti').send(dto).expect(400);
    });
  });

  describe('GET /cuti/:email', () => {
    it('should return cuti list for pegawai', async () => {
      await cutiRepo.save({
        pegawai,
        tanggal_mulai: dayjs('2025-01-01').toDate(),
        tanggal_selesai: dayjs('2025-01-01').toDate(),
        alasan: 'Event',
      });

      const res = await request(app.getHttpServer())
        .get(`/cuti/${pegawai.email}`)
        .expect(200);

      expect(res.body.status).toBe('success');
      expect(res.body.data).toHaveLength(1);
    });

    it('should return message if no cuti', async () => {
      const res = await request(app.getHttpServer())
        .get(`/cuti/${pegawai.email}`)
        .expect(200);

      expect(res.body.message).toBe('No leave data found for this pegawai');
      expect(res.body.data).toEqual([]);
    });

    it('should return 400 if pegawai not found', async () => {
      await request(app.getHttpServer())
        .get('/cuti/unknown@example.com')
        .expect(400);
    });
  });

  describe('GET /cuti', () => {
    it('should return paginated cuti list', async () => {
      for (let i = 1; i <= 3; i++) {
        await cutiRepo.save({
          pegawai,
          tanggal_mulai: `2025-05-0${i}`,
          tanggal_selesai: `2025-05-0${i}`,
          alasan: `Event ${i}`,
        });
      }

      const res = await request(app.getHttpServer())
        .get('/cuti?page=1&limit=2')
        .expect(200);

      expect(res.body.data).toHaveLength(2);
      expect(res.body.total).toBe(3);
      expect(res.body.page).toBe(1);
      expect(res.body.limit).toBe(2);
    });
  });
});