import { Test, TestingModule } from '@nestjs/testing';
import { CutiService } from './cuti.service';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Cuti } from './cuti.entity';
import { Pegawai } from '../pegawai/pegawai.entity';
import { Repository, DataSource } from 'typeorm';
import { CreateCutiDto, UpdateCutiDto } from './dto/cuti.dto';
import { NotFoundException } from '@nestjs/common';
import dayjs from 'dayjs';

describe('CutiService', () => {
  let service: CutiService;
  let cutiRepository: jest.Mocked<Repository<Cuti>>;
  let pegawaiRepository: jest.Mocked<Repository<Pegawai>>;
  let dataSource: jest.Mocked<DataSource>;

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
          provide: DataSource,
          useValue: {
            transaction: jest.fn().mockImplementation((cb) => cb(mockManager)),
          },
        },
      ],
    }).compile();

    service = module.get<CutiService>(CutiService);
    cutiRepository = module.get(getRepositoryToken(Cuti));
    pegawaiRepository = module.get(getRepositoryToken(Pegawai));
    dataSource = module.get(DataSource);
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
      
      // Mock validation passes
      const qb = cutiRepository.createQueryBuilder();
      (qb.getOne as jest.Mock).mockResolvedValue(null);
      (qb.getMany as jest.Mock).mockResolvedValue([]);

      cutiRepository.create.mockReturnValue(createCutiDto as any);
      cutiRepository.save.mockResolvedValue(createCutiDto as any);

      const result = await service.applyCuti(createCutiDto);

      expect(result).toBeDefined();
      expect(dataSource.transaction).toHaveBeenCalled();
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

    it('FAIL: should throw if dates overlap', async () => {
      pegawaiRepository.findOne.mockResolvedValue({ id: 1 } as any);
      (cutiRepository.createQueryBuilder().getOne as jest.Mock).mockResolvedValue({ id: 99 });

      await expect(service.applyCuti(createCutiDto)).rejects.toThrow(
        'The employee already has a leave scheduled on the selected date',
      );
    });

    it('FAIL: should throw if monthly limit reached', async () => {
      pegawaiRepository.findOne.mockResolvedValue({ id: 1, email: 'pegawai@example.com' } as any);
      
      const qb = cutiRepository.createQueryBuilder();
      (qb.getOne as jest.Mock).mockResolvedValue(null);
      
      (qb.getMany as jest.Mock)
        .mockResolvedValueOnce([{ 
            tanggal_mulai: dayjs('2025-01-05').toDate(), 
            tanggal_selesai: dayjs('2025-01-05').toDate() 
        }])
        .mockResolvedValueOnce([]);

      await expect(service.applyCuti(createCutiDto)).rejects.toThrow(
        /Monthly leave limit reached/
      );
    });

    it('FAIL: should throw if yearly limit reached', async () => {
      pegawaiRepository.findOne.mockResolvedValue({ id: 1, email: 'pegawai@example.com' } as any);
      
      const qb = cutiRepository.createQueryBuilder();
      (qb.getOne as jest.Mock).mockResolvedValue(null);
      
      (qb.getMany as jest.Mock)
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce(new Array(12).fill({
            tanggal_mulai: dayjs().toDate(),
            tanggal_selesai: dayjs().toDate()
        }));

      await expect(service.applyCuti(createCutiDto)).rejects.toThrow(
        'Yearly leave limit (12 days) has been exceeded'
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

  describe('findByPegawai', () => {
    it('should return empty array and specific message if not found', async () => {
      pegawaiRepository.findOne.mockResolvedValue({ email: 'a@a.com' } as any);
      cutiRepository.find.mockResolvedValue([]);

      const result = await service.findByPegawai('a@a.com');
      expect(result.message).toBe('No leave records found for this employee');
      expect(result.data).toEqual([]);
    });

    it('should return success list', async () => {
      pegawaiRepository.findOne.mockResolvedValue({ email: 'a@a.com' } as any);
      cutiRepository.find.mockResolvedValue([{ id: 1 }] as any);

      const result = await service.findByPegawai('a@a.com');
      expect(result.status).toBe('success');
      expect(result.data).toHaveLength(1);
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

      await service.deleteCuti(1);
      expect(cutiRepository.remove).toHaveBeenCalled();
    });
  });
});