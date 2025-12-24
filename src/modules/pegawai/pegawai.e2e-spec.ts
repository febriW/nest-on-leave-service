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
            entities: [Pegawai, Cuti],
            synchronize: true,
            dropSchema: true,
          }),
        }),
        PegawaiModule,
      ],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true }));
    await app.init();

    pegawaiRepo = moduleFixture.get<Repository<Pegawai>>(getRepositoryToken(Pegawai));

    // optional: seed initial pegawai data
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

  afterAll(async () => {
    await app.close();
  });

  it('/pegawai (GET) - get all pegawai', async () => {
    const response = await request(app.getHttpServer())
      .get('/pegawai')
      .query({ page: 1, limit: 10 })
      .expect(200);

    expect(Array.isArray(response.body.data || response.body)).toBe(true);
    expect(response.body.data.length || response.body.length).toBeGreaterThanOrEqual(2);
  });

  it('/pegawai (POST) - create pegawai', async () => {
    const newPegawai: CreatePegawaiDto = {
      nama_depan: 'Alice',
      nama_belakang: 'Smith',
      email: 'alice.smith@test.com',
      no_hp: '+6281122334455',
      alamat: 'Jl. Sudirman No. 10, Jakarta',
      jenis_kelamin: JenisKelamin.WANITA,
    };

    const response = await request(app.getHttpServer())
      .post('/pegawai')
      .send(newPegawai)
      .expect(201);

    expect(response.body.data).toHaveProperty('email', newPegawai.email);
    expect(response.body.data).toHaveProperty('nama_depan', newPegawai.nama_depan);
    expect(response.body.data).toHaveProperty('jenis_kelamin', newPegawai.jenis_kelamin);
  });

  it('/pegawai/:email (PUT) - update pegawai', async () => {
    const response = await request(app.getHttpServer())
      .put('/pegawai/john.doe@test.com')
      .send({ nama_depan: 'John Updated' })
      .expect(200);

    expect(response.body.data).toHaveProperty('nama_depan', 'John Updated');
  });

  it('/pegawai/:email (DELETE) - remove pegawai', async () => {
    const response = await request(app.getHttpServer())
      .delete('/pegawai/jane.doe@test.com')
      .expect(200);

    expect(response.body).toHaveProperty('msg', 'Data pegawai deleted successfully');
  });
});