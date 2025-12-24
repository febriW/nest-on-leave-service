import { Test, TestingModule } from '@nestjs/testing';
import { CutiService } from './cuti.service';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Cuti } from './cuti.entity';
import { Pegawai } from '../pegawai/pegawai.entity';
import { Repository } from 'typeorm';
import { CreateCutiDto } from './dto/cuti.dto';
import { BadRequestException } from '@nestjs/common';

describe('CutiService', () => {
  let service: CutiService;
  let cutiRepository: jest.Mocked<Repository<Cuti>>;
  let pegawaiRepository: jest.Mocked<Repository<Pegawai>>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CutiService,
        {
          provide: getRepositoryToken(Cuti),
          useValue: {
            createQueryBuilder: jest.fn().mockReturnValue({
              innerJoin: jest.fn().mockReturnThis(),
              leftJoinAndSelect: jest.fn().mockReturnThis(),
              where: jest.fn().mockReturnThis(),
              andWhere: jest.fn().mockReturnThis(),
              getMany: jest.fn(),
              getCount: jest.fn(),
              getManyAndCount: jest.fn(),
              orderBy: jest.fn().mockReturnThis(),
              skip: jest.fn().mockReturnThis(),
              take: jest.fn().mockReturnThis(),
            }),
            create: jest.fn(),
            save: jest.fn(),
            find: jest.fn(),
          },
        },
        {
          provide: getRepositoryToken(Pegawai),
          useValue: {
            findOne: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<CutiService>(CutiService);
    cutiRepository = module.get(getRepositoryToken(Cuti));
    pegawaiRepository = module.get(getRepositoryToken(Pegawai));
  });

  describe('applyCuti', () => {
    const createCutiDto: CreateCutiDto = {
      alasan: 'Family event',
      tanggal_mulai: '2025-01-01',
      tanggal_selesai: '2025-01-05',
      pegawaiEmail: 'pegawai@example.com',
    };

    it('should apply cuti successfully', async () => {
      const pegawai = { id: 1, email: 'pegawai@example.com' };
      pegawaiRepository.findOne.mockResolvedValue(pegawai as any);
      (cutiRepository.createQueryBuilder().getMany as jest.Mock).mockResolvedValue([]);
      (cutiRepository.createQueryBuilder().getCount as jest.Mock).mockResolvedValue(0);
      cutiRepository.create.mockReturnValue({ save: jest.fn() } as any);
      cutiRepository.save.mockResolvedValue({} as any);

      await expect(service.applyCuti(createCutiDto)).resolves.toBeUndefined();

      expect(pegawaiRepository.findOne).toHaveBeenCalledWith({
        where: { email: createCutiDto.pegawaiEmail },
      });
      expect(cutiRepository.create).toHaveBeenCalled();
      expect(cutiRepository.save).toHaveBeenCalled();
    });

    it('should throw if pegawai not found', async () => {
      pegawaiRepository.findOne.mockResolvedValue(null);
      await expect(service.applyCuti(createCutiDto)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should throw if end date before start date', async () => {
      const dto = { ...createCutiDto, tanggal_selesai: '2024-12-31' };
      pegawaiRepository.findOne.mockResolvedValue({} as any);

      await expect(service.applyCuti(dto)).rejects.toThrow(BadRequestException);
    });

    it('should throw if yearly leave limit exceeded', async () => {
      pegawaiRepository.findOne.mockResolvedValue({} as any);
      const existingCuti = [
        { tanggal_mulai: '2025-01-01', tanggal_selesai: '2025-01-10' },
      ];
      (cutiRepository.createQueryBuilder().getMany as jest.Mock).mockResolvedValue(
        existingCuti as any,
      );

      const dto = { ...createCutiDto, tanggal_mulai: '2025-01-11', tanggal_selesai: '2025-01-05' };
      // Adjust dates to exceed
      const exceedingDto = { ...createCutiDto, tanggal_mulai: '2025-01-01', tanggal_selesai: '2025-01-05' };
      await expect(service.applyCuti(exceedingDto)).rejects.toThrow(BadRequestException);
    });

    it('should throw if monthly leave exceeded', async () => {
      pegawaiRepository.findOne.mockResolvedValue({} as any);
      (cutiRepository.createQueryBuilder().getMany as jest.Mock).mockResolvedValue([]);
      (cutiRepository.createQueryBuilder().getCount as jest.Mock).mockResolvedValue(1);

      await expect(service.applyCuti(createCutiDto)).rejects.toThrow(BadRequestException);
    });
  });

  describe('findByPegawai', () => {
  it('should return cuti list successfully', async () => {
    const pegawai = { id: 1, email: 'pegawai@example.com' };
    pegawaiRepository.findOne.mockResolvedValue(pegawai as any);

    (cutiRepository.createQueryBuilder().getMany as jest.Mock).mockResolvedValue([
      { id: 1, tanggal_mulai: '2025-01-01', tanggal_selesai: '2025-01-05' },
    ]);

    const result = await service.findByPegawai('pegawai@example.com');
    expect(result.status).toBe('success');
    expect(result.data).toHaveLength(1);
  });

  it('should return message if no cuti found', async () => {
    const pegawai = { id: 1, email: 'pegawai@example.com' };
    pegawaiRepository.findOne.mockResolvedValue(pegawai as any);

    (cutiRepository.createQueryBuilder().getMany as jest.Mock).mockResolvedValue([]);

    const result = await service.findByPegawai('pegawai@example.com');
    expect(result.status).toBe('success');
    expect(result.message).toBe('No leave data found for this pegawai');
    expect(result.data).toEqual([]);
  });

  it('should throw if pegawai not found', async () => {
      pegawaiRepository.findOne.mockResolvedValue(null);
      await expect(service.findByPegawai('email@example.com')).rejects.toThrow(
        BadRequestException,
      );
    });
  });

  describe('findAll', () => {
    it('should return paginated cuti list', async () => {
      const data = [{ id: 1 }];
      (cutiRepository.createQueryBuilder().getManyAndCount as jest.Mock).mockResolvedValue([data, 1]);

      const result = await service.findAll(1, 10);
      expect(result.data).toEqual(data);
      expect(result.total).toBe(1);
      expect(result.page).toBe(1);
      expect(result.limit).toBe(10);
    });

    it('should default to page=1 and limit=10', async () => {
      const data = [{ id: 1 }];
      (cutiRepository.createQueryBuilder().getManyAndCount as jest.Mock).mockResolvedValue([data, 1]);

      const result = await service.findAll(undefined, undefined);
      expect(result.page).toBe(1);
      expect(result.limit).toBe(10);
    });
  });
});