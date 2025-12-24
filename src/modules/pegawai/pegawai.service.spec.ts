import { Test, TestingModule } from '@nestjs/testing';
import { PegawaiService, response } from './pegawai.service';
import { Pegawai } from './pegawai.entity';
import { Repository, EntityManager } from 'typeorm';
import { getRepositoryToken } from '@nestjs/typeorm';
import { CreatePegawaiDto, UpdatePegawaiDto } from './dto/pegawai.dto';
import { JenisKelamin } from './dto/pegawai.dto';
import { ConflictException, NotFoundException } from '@nestjs/common';

describe('PegawaiService', () => {
  let service: PegawaiService;
  let repository: Repository<Pegawai>;
  let entityManager: EntityManager;

  const mockRepository = {
    findOne: jest.fn(),
    createQueryBuilder: jest.fn(),
    remove: jest.fn(),
  };

  const mockEntityManager = {
    transaction: jest.fn(),
    create: jest.fn(),
    save: jest.fn(),
    findOne: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PegawaiService,
        { provide: getRepositoryToken(Pegawai), useValue: mockRepository },
        { provide: EntityManager, useValue: mockEntityManager },
      ],
    }).compile();

    service = module.get<PegawaiService>(PegawaiService);
    repository = module.get<Repository<Pegawai>>(getRepositoryToken(Pegawai));
    entityManager = module.get<EntityManager>(EntityManager);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('findByEmail', () => {
    it('should return a pegawai if found', async () => {
      const mockPegawai = { email: 'test@mail.com' };
      mockRepository.findOne.mockResolvedValue(mockPegawai);

      const result = await service.findByEmail('test@mail.com');
      expect(result).toEqual(mockPegawai);
      expect(repository.findOne).toHaveBeenCalledWith({ where: { email: 'test@mail.com' } });
    });

    it('should return null if not found', async () => {
      mockRepository.findOne.mockResolvedValue(null);
      const result = await service.findByEmail('notfound@mail.com');
      expect(result).toBeNull();
    });
  });

  describe('findAll', () => {
    it('should return paginated list of pegawai', async () => {
      const mockData = [{ email: 'a@mail.com' }];
      const mockQueryBuilder: any = {
        orderBy: jest.fn().mockReturnThis(),
        skip: jest.fn().mockReturnThis(),
        take: jest.fn().mockReturnThis(),
        getManyAndCount: jest.fn().mockResolvedValue([mockData, 1]),
      };
      mockRepository.createQueryBuilder.mockReturnValue(mockQueryBuilder);

      const result = await service.findAll(1, 10);
      expect(result).toEqual({ data: mockData, total: 1, page: 1, limit: 10 });
      expect(mockRepository.createQueryBuilder).toHaveBeenCalledWith('pegawai');
    });
  });

  describe('create', () => {
    it('should create a new pegawai', async () => {
      const dto: CreatePegawaiDto = {
        nama_depan: 'John',
        nama_belakang: 'Doe',
        email: 'john@mail.com',
        no_hp: '+628123456789',
        alamat: 'Jakarta',
        jenis_kelamin: JenisKelamin.PRIA,
      };

      mockEntityManager.transaction.mockImplementation(async (fn) => {
        const mockTransaction = {
          findOne: jest.fn().mockResolvedValue(null),
          create: jest.fn().mockReturnValue(dto),
          save: jest.fn().mockResolvedValue(dto),
        };
        return fn(mockTransaction);
      });

      await service.create(dto);
      expect(mockEntityManager.transaction).toHaveBeenCalled();
    });

    it('should throw conflict if email exists', async () => {
      const dto: CreatePegawaiDto = {
        nama_depan: 'John',
        nama_belakang: 'Doe',
        email: 'existing@mail.com',
        no_hp: '+628123456789',
        alamat: 'Jakarta',
        jenis_kelamin: JenisKelamin.PRIA,
      };

      mockEntityManager.transaction.mockImplementation(async (fn) => {
        const mockTransaction = {
          findOne: jest.fn().mockResolvedValue(dto),
        };
        return fn(mockTransaction);
      });

      await expect(service.create(dto)).rejects.toThrow(ConflictException);
    });
  });

  describe('update', () => {
    it('should update pegawai successfully', async () => {
      const email = 'john@mail.com';
      const updateDto: UpdatePegawaiDto = { nama_depan: 'Johnny' };
      const mockPegawai = { email, nama_depan: 'John' };

      jest.spyOn(service, 'findByEmail').mockResolvedValue(mockPegawai as any);
      mockEntityManager.transaction.mockImplementation(async (fn) => {
        const mockTransaction = { save: jest.fn().mockResolvedValue({}) };
        return fn(mockTransaction);
      });

      const result: response = await service.update(email, updateDto);
      expect(result.msg).toBe('Pegawai updated successfully');
      expect(result.data.nama_depan).toBe('Johnny');
    });

    it('should throw not found if pegawai does not exist', async () => {
      const email = 'notfound@mail.com';
      const updateDto: UpdatePegawaiDto = { nama_depan: 'Johnny' };

      jest.spyOn(service, 'findByEmail').mockResolvedValue(null);

      await expect(service.update(email, updateDto)).rejects.toThrow(NotFoundException);
    });
  });

  describe('delete', () => {
    it('should delete pegawai successfully', async () => {
      const mockPegawai = { email: 'john@mail.com' };
      jest.spyOn(service, 'findByEmail').mockResolvedValue(mockPegawai as any);
      mockRepository.remove.mockResolvedValue(undefined);

      const result = await service.delete('john@mail.com');
      expect(result).toEqual({ msg: 'Data pegawai deleted successfully' });
      expect(repository.remove).toHaveBeenCalledWith(mockPegawai);
    });

    it('should throw not found if pegawai does not exist', async () => {
      jest.spyOn(service, 'findByEmail').mockResolvedValue(null);
      await expect(service.delete('notfound@mail.com')).rejects.toThrow(NotFoundException);
    });
  });
});
