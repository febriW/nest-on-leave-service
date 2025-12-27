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
import { CreateCutiDto, UpdateCutiDto } from './dto/cuti.dto';
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
      nama_depan: 'John',
      nama_belakang: 'Doe',
      email: 'john.doe@example.com',
      no_hp: '+628123456789',
      alamat: 'Street Test No. 1',
      jenis_kelamin: 'L',
    });
  });

  describe('POST /cuti (Apply Leave)', () => {
    it('SUCCESS: should create a 1-day leave successfully', async () => {
      const dto: CreateCutiDto = {
        alasan: 'Urgent Family Matter',
        tanggal_mulai: '2025-01-10',
        tanggal_selesai: '2025-01-10',
        pegawaiEmail: pegawai.email,
      };

      await request(app.getHttpServer()).post('/cuti').send(dto).expect(201);
    });

    it('FAIL: should not allow more than 1 day duration in one request', async () => {
      const dto: CreateCutiDto = {
        alasan: 'Vacation',
        tanggal_mulai: '2025-01-10',
        tanggal_selesai: '2025-01-11',
        pegawaiEmail: pegawai.email,
      };

      const res = await request(app.getHttpServer()).post('/cuti').send(dto).expect(400);
      expect(res.body.message).toBe('You are only allowed to take a maximum of 1 day leave per month');
    });

    it('FAIL: should not allow a second leave request in the same month', async () => {
      await cutiRepo.save({
        pegawai,
        tanggal_mulai: dayjs('2025-02-05').toDate(),
        tanggal_selesai: dayjs('2025-02-05').toDate(),
        alasan: 'Existing Leave',
      });

      const dto: CreateCutiDto = {
        alasan: 'Second Attempt in Same Month',
        tanggal_mulai: '2025-02-20',
        tanggal_selesai: '2025-02-20',
        pegawaiEmail: pegawai.email,
      };

      const res = await request(app.getHttpServer()).post('/cuti').send(dto).expect(400);
      expect(res.body.message).toContain('Monthly leave limit reached');
    });

    it('FAIL: should prevent overlapping dates', async () => {
      const targetDate = '2025-03-10';
      await cutiRepo.save({
        pegawai,
        tanggal_mulai: dayjs(targetDate).toDate(),
        tanggal_selesai: dayjs(targetDate).toDate(),
        alasan: 'Original Leave',
      });

      const dto: CreateCutiDto = {
        alasan: 'Overlapping Leave',
        tanggal_mulai: targetDate,
        tanggal_selesai: targetDate,
        pegawaiEmail: pegawai.email,
      };

      const res = await request(app.getHttpServer()).post('/cuti').send(dto).expect(400);
      expect(res.body.message).toBe('The employee already has a leave scheduled on the selected date');
    });

    it('FAIL: should enforce yearly leave limit of 12 days', async () => {
      for (let i = 2; i <= 12; i++) {
        const month = i < 10 ? `0${i}` : `${i}`;
        await cutiRepo.save({
          pegawai,
          tanggal_mulai: dayjs(`2025-${month}-01`).toDate(),
          tanggal_selesai: dayjs(`2025-${month}-01`).toDate(),
          alasan: `Month ${month}`,
        });
      }
      await cutiRepo.save({
        pegawai,
        tanggal_mulai: dayjs(`2025-12-15`).toDate(),
        tanggal_selesai: dayjs(`2025-12-15`).toDate(),
        alasan: `Extra day in Dec`,
      });

      const dto: CreateCutiDto = {
        alasan: '13th Day Attempt',
        tanggal_mulai: '2025-01-15',
        tanggal_selesai: '2025-01-15',
        pegawaiEmail: pegawai.email,
      };

      const res = await request(app.getHttpServer()).post('/cuti').send(dto).expect(400);
      expect(res.body.message).toBe('Yearly leave limit (12 days) has been exceeded');
    });
  });

  describe('PATCH /cuti/:id (Update Leave)', () => {
    it('FAIL: should not allow updating an ongoing leave', async () => {
      const today = dayjs().format('YYYY-MM-DD');
      const cuti = await cutiRepo.save({
        pegawai,
        tanggal_mulai: dayjs(today).toDate(),
        tanggal_selesai: dayjs(today).toDate(),
        alasan: 'Ongoing',
      });

      const dto: UpdateCutiDto = { alasan: 'Trying to update' };

      const res = await request(app.getHttpServer())
        .patch(`/cuti/${cuti.id}`)
        .send(dto)
        .expect(400);
      
      expect(res.body.message).toBe('Ongoing leave records cannot be updated');
    });

    it('SUCCESS: should allow updating a future leave', async () => {
      const futureDate = dayjs().add(1, 'month').format('YYYY-MM-DD');
      const cuti = await cutiRepo.save({
        pegawai,
        tanggal_mulai: dayjs(futureDate).toDate(),
        tanggal_selesai: dayjs(futureDate).toDate(),
        alasan: 'Old Reason',
      });

      const dto: UpdateCutiDto = { alasan: 'New Reason Updated' };

      await request(app.getHttpServer())
        .patch(`/cuti/${cuti.id}`)
        .send(dto)
        .expect(200);
    });
  });

  describe('DELETE /cuti/:id', () => {
    it('FAIL: should not allow deleting an ongoing leave', async () => {
      const today = dayjs().format('YYYY-MM-DD');
      const cuti = await cutiRepo.save({
        pegawai,
        tanggal_mulai: dayjs(today).toDate(),
        tanggal_selesai: dayjs(today).toDate(),
        alasan: 'Ongoing',
      });

      const res = await request(app.getHttpServer())
        .delete(`/cuti/${cuti.id}`)
        .expect(400);
      
      expect(res.body.message).toBe('Ongoing leave records cannot be deleted');
    });

    it('SUCCESS: should allow deleting a future leave', async () => {
      const futureDate = dayjs().add(2, 'month').format('YYYY-MM-DD');
      const cuti = await cutiRepo.save({
        pegawai,
        tanggal_mulai: dayjs(futureDate).toDate(),
        tanggal_selesai: dayjs(futureDate).toDate(),
        alasan: 'Future Leave',
      });

      const res = await request(app.getHttpServer())
        .delete(`/cuti/${cuti.id}`)
        .expect(200);

      expect(res.body.message).toBe('Leave record deleted successfully');
      
      const deletedCuti = await cutiRepo.findOneBy({ id: cuti.id });
      expect(deletedCuti).toBeNull();
    });
  });

  describe('GET /cuti/:email', () => {
    it('should return empty data if no leave records found', async () => {
      const res = await request(app.getHttpServer())
        .get(`/cuti/${pegawai.email}`)
        .expect(200);

      expect(res.body.status).toBe('success');
      expect(res.body.message).toBe('No leave records found for this employee');
      expect(res.body.data).toEqual([]);
    });

    it('should return leave list for valid email', async () => {
      await cutiRepo.save({
        pegawai,
        tanggal_mulai: dayjs('2025-12-10').toDate(),
        tanggal_selesai: dayjs('2025-12-10').toDate(),
        alasan: 'Year End',
      });

      const res = await request(app.getHttpServer())
        .get(`/cuti/${pegawai.email}`)
        .expect(200);

      expect(res.body.status).toBe('success');
      expect(res.body.data).toHaveLength(1);
    });
  });

  describe('GET /cuti (Pagination)', () => {
    it('should return global leave records with status success', async () => {
      await cutiRepo.save({
        pegawai,
        tanggal_mulai: '2025-11-01',
        tanggal_selesai: '2025-11-01',
        alasan: 'Global Test',
      });

      const res = await request(app.getHttpServer())
        .get('/cuti?page=1&limit=10')
        .expect(200);

      expect(res.body.status).toBe('success');
      expect(res.body.total).toBeGreaterThanOrEqual(1);
    });
  });
});