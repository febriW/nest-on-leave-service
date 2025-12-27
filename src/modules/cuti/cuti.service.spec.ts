import { Test, TestingModule } from '@nestjs/testing';
import { CutiService } from './cuti.service';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Cuti } from './cuti.entity';
import { Pegawai } from '../pegawai/pegawai.entity';
import { Repository, EntityManager } from 'typeorm';
import { CreateCutiDto, UpdateCutiDto } from './dto/cuti.dto';
import { NotFoundException, InternalServerErrorException } from '@nestjs/common';
import dayjs from 'dayjs';

describe('CutiService', () => {
  let service: CutiService;
  let cutiRepository: jest.Mocked<Repository<Cuti>>;
  let pegawaiRepository: jest.Mocked<Repository<Pegawai>>;
  let entityManager: jest.Mocked<EntityManager>;

  const mockManager = {
    getRepository: jest.fn().mockImplementation((entity) => {
      if (entity === Cuti) return cutiRepository;
      if (entity === Pegawai) return pegawaiRepository;
    }),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CutiService,
        {
          provide: getRepositoryToken(Cuti),
          useValue: {
            createQueryBuilder: jest.fn().mockReturnValue({
              innerJoin: jest.fn().mockReturnThis(),
              where: jest.fn().mockReturnThis(),
              andWhere: jest.fn().mockReturnThis(),
              getMany: jest.fn(),
              getOne: jest.fn(),
              getCount: jest.fn(),
            }),
            create: jest.fn(),
            save: jest.fn(),
            find: jest.fn(),
            findAndCount: jest.fn(),
            findOne: jest.fn(),
            remove: jest.fn(),
          },
        },
        {
          provide: getRepositoryToken(Pegawai),
          useValue: {
            findOne: jest.fn(),
          },
        },
        {
          provide: EntityManager,
          useValue: {
            transaction: jest.fn().mockImplementation((cb) => cb(mockManager)),
            findOne: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<CutiService>(CutiService);
    cutiRepository = module.get(getRepositoryToken(Cuti));
    pegawaiRepository = module.get(getRepositoryToken(Pegawai));
    entityManager = module.get(EntityManager);
  });

  describe('applyCuti', () => {
    const createCutiDto: CreateCutiDto = {
      alasan: 'Urgent Matter',
      tanggal_mulai: '2025-01-10',
      tanggal_selesai: '2025-01-10',
      pegawaiEmail: 'pegawai@example.com',
    };

    it('SUCCESS: should apply cuti successfully', async () => {
      const pegawai = { id: 1, email: 'pegawai@example.com' };
      pegawaiRepository.findOne.mockResolvedValue(pegawai as any);
      
      const qb = cutiRepository.createQueryBuilder();
      (qb.getOne as jest.Mock).mockResolvedValue(null);
      (qb.getMany as jest.Mock).mockResolvedValue([]);

      cutiRepository.create.mockReturnValue(createCutiDto as any);
      cutiRepository.save.mockResolvedValue(createCutiDto as any);

      const result = await service.applyCuti(createCutiDto);

      expect(result).toBeDefined();
      expect(entityManager.transaction).toHaveBeenCalled();
      expect(cutiRepository.save).toHaveBeenCalled();
    });

    it('FAIL: should throw NotFoundException if pegawai not found', async () => {
      pegawaiRepository.findOne.mockResolvedValue(null);
      await expect(service.applyCuti(createCutiDto)).rejects.toThrow(NotFoundException);
    });

    it('FAIL: should throw if duration is more than 1 day', async () => {
      const invalidDto = { ...createCutiDto, tanggal_selesai: '2025-01-11' };
      pegawaiRepository.findOne.mockResolvedValue({ id: 1 } as any);

      await expect(service.applyCuti(invalidDto)).rejects.toThrow(
        'You are only allowed to take a maximum of 1 day leave per month',
      );
    });
  });

  describe('updateCuti', () => {
    it('FAIL: should throw if leave is ongoing', async () => {
      const today = dayjs().format('YYYY-MM-DD');
      const ongoingLeave = {
        id: 1,
        tanggal_mulai: today,
        tanggal_selesai: today,
        pegawai: { email: 'test@test.com' },
      };
      cutiRepository.findOne.mockResolvedValue(ongoingLeave as any);

      const dto: UpdateCutiDto = { alasan: 'Change' };
      await expect(service.updateCuti(1, dto)).rejects.toThrow(
        'Ongoing leave records cannot be updated',
      );
    });
  });

  describe('findAll', () => {
    it('should return status success with data', async () => {
      cutiRepository.findAndCount.mockResolvedValue([[], 0]);
      const result = await service.findAll(1, 10);
      expect(result.status).toBe('success');
      expect(result.total).toBe(0);
    });
  });

  describe('deleteCuti', () => {
    it('FAIL: should throw if cuti not found', async () => {
      cutiRepository.findOne.mockResolvedValue(null);
      
      await expect(service.deleteCuti(99)).rejects.toThrow(NotFoundException);
    });

    it('SUCCESS: should remove cuti if in future', async () => {
      const futureDate = dayjs().add(1, 'month').toDate();
      const cuti = { id: 1, tanggal_mulai: futureDate, tanggal_selesai: futureDate };
      
      cutiRepository.findOne.mockResolvedValue(cuti as any);
      cutiRepository.remove.mockResolvedValue(cuti as any);

      const result = await service.deleteCuti(1);
      
      expect(result.message).toBe('Leave record deleted successfully');
      expect(entityManager.transaction).toHaveBeenCalled();
      expect(cutiRepository.remove).toHaveBeenCalled();
    });

    it('FAIL: should throw InternalServerErrorException on system error', async () => {
      const futureDate = dayjs().add(1, 'month').toDate();
      cutiRepository.findOne.mockResolvedValue({ id: 1, tanggal_mulai: futureDate } as any);
      
      cutiRepository.remove.mockRejectedValue(new Error('Database Crash'));

      await expect(service.deleteCuti(1)).rejects.toThrow(InternalServerErrorException);
    });
  });
});