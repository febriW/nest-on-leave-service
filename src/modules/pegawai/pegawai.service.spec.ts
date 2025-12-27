import { Test, TestingModule } from '@nestjs/testing';
import { PegawaiService, response } from './pegawai.service';
import { Pegawai } from './pegawai.entity';
import { Repository, EntityManager } from 'typeorm';
import { getRepositoryToken } from '@nestjs/typeorm';
import { CreatePegawaiDto, UpdatePegawaiDto, JenisKelamin } from './dto/pegawai.dto';
import { ConflictException, NotFoundException, InternalServerErrorException } from '@nestjs/common';

describe('PegawaiService', () => {
  let service: PegawaiService;
  let repository: jest.Mocked<Repository<Pegawai>>;
  let entityManager: jest.Mocked<EntityManager>;

  const mockTransactionalManager = {
    findOne: jest.fn(),
    create: jest.fn(),
    save: jest.fn(),
    remove: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PegawaiService,
        {
          provide: getRepositoryToken(Pegawai),
          useValue: {
            findAndCount: jest.fn(),
          },
        },
        {
          provide: EntityManager,
          useValue: {
            findOne: jest.fn(),
            transaction: jest.fn().mockImplementation((cb: any) => cb(mockTransactionalManager)),
          },
        },
      ],
    }).compile();

    service = module.get<PegawaiService>(PegawaiService);
    repository = module.get(getRepositoryToken(Pegawai));
    entityManager = module.get(EntityManager);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('findByEmail', () => {
    it('should return a pegawai if found using default manager', async () => {
      const mockPegawai = { email: 'test@mail.com' } as Pegawai;
      entityManager.findOne.mockResolvedValue(mockPegawai);

      const result = await service.findByEmail('test@mail.com');
      
      expect(result).toEqual(mockPegawai);
      expect(entityManager.findOne).toHaveBeenCalledWith(Pegawai, {
        where: { email: 'test@mail.com' },
      });
    });

    it('should return null if not found', async () => {
      entityManager.findOne.mockResolvedValue(null);

      const result = await service.findByEmail('notfound@mail.com');
      
      expect(result).toBeNull();
    });
  });

  describe('findAll', () => {
    it('should return paginated list', async () => {
      const mockData = [{ email: 'a@mail.com' }] as Pegawai[];
      repository.findAndCount.mockResolvedValue([mockData, 1]);

      const result = await service.findAll(1, 10);
      
      expect(result.data).toEqual(mockData);
      expect(result.total).toBe(1);
    });
  });

  describe('create', () => {
    const dto: CreatePegawaiDto = {
      nama_depan: 'John',
      nama_belakang: 'Doe',
      email: 'john@mail.com',
      no_hp: '+628123456789',
      alamat: 'Jakarta',
      jenis_kelamin: JenisKelamin.PRIA,
    };

    it('should create a new pegawai successfully', async () => {
      mockTransactionalManager.findOne.mockResolvedValue(null);
      mockTransactionalManager.create.mockReturnValue(dto);
      mockTransactionalManager.save.mockResolvedValue(dto);

      const result = await service.create(dto);
      
      expect(result.msg).toBe('Pegawai created successfully');
      expect(mockTransactionalManager.save).toHaveBeenCalled();
    });

    it('should throw ConflictException if email exists', async () => {
      mockTransactionalManager.findOne.mockResolvedValue({ email: dto.email });

      await expect(service.create(dto)).rejects.toThrow(ConflictException);
    });
  });

  describe('update', () => {
    it('should update pegawai successfully', async () => {
      const mockPegawai = { email: 'john@mail.com', nama_depan: 'Old' };
      mockTransactionalManager.findOne.mockResolvedValue(mockPegawai);
      mockTransactionalManager.save.mockResolvedValue({ ...mockPegawai, nama_depan: 'New' });

      const result = await service.update('john@mail.com', { nama_depan: 'New' });
      
      expect(result.msg).toBe('Pegawai updated successfully');
      expect(result.data.nama_depan).toBe('New');
    });

    it('should throw NotFoundException if pegawai not found', async () => {
      mockTransactionalManager.findOne.mockResolvedValue(null);

      await expect(service.update('wrong@mail.com', {})).rejects.toThrow(NotFoundException);
    });
  });

  describe('delete', () => {
    it('should delete pegawai successfully', async () => {
      const mockPegawai = { email: 'del@mail.com' } as Pegawai;
      mockTransactionalManager.findOne.mockResolvedValue(mockPegawai);
      mockTransactionalManager.remove.mockResolvedValue(undefined);

      const result = await service.delete('del@mail.com');
      
      expect(result.msg).toBe('Data pegawai deleted successfully');
      expect(mockTransactionalManager.remove).toHaveBeenCalled();
    });

    it('should throw InternalServerErrorException on unexpected error', async () => {
      mockTransactionalManager.findOne.mockResolvedValue({ email: 'err@mail.com' });
      mockTransactionalManager.remove.mockRejectedValue(new Error('DB Crash'));

      await expect(service.delete('err@mail.com')).rejects.toThrow(InternalServerErrorException);
    });
  });
});