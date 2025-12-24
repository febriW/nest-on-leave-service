import { Test, TestingModule } from '@nestjs/testing';
import { ConflictException, NotFoundException } from '@nestjs/common';
import { getRepositoryToken } from '@nestjs/typeorm';
import { EntityManager, Repository } from 'typeorm';

import { AdminService } from './admin.service';
import { Admin } from './admin.entity';
import {
  CreateAdminDto,
  UpdateAdminDto,
  JenisKelamin,
} from './dto/admin.dto';

describe('AdminService', () => {
  let service: AdminService;
  let adminRepository: jest.Mocked<Repository<Admin>>;
  let entityManager: EntityManager & { transaction: jest.Mock };

  const mockAdminRepository = {
    findOne: jest.fn(),
    remove: jest.fn(),
    createQueryBuilder: jest.fn(),
  };

  const mockEntityManager = {
    transaction: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AdminService,
        {
          provide: getRepositoryToken(Admin),
          useValue: mockAdminRepository,
        },
        {
          provide: EntityManager,
          useValue: mockEntityManager,
        },
      ],
    }).compile();

    service = module.get<AdminService>(AdminService);
    adminRepository = module.get(getRepositoryToken(Admin));
    entityManager = module.get(EntityManager) as EntityManager & {
      transaction: jest.Mock;
    };
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('findByEmail', () => {
    it('should return admin if found', async () => {
      const admin = { email: 'admin@gmail.com' } as Admin;

      adminRepository.findOne.mockResolvedValue(admin);

      const result = await service.findByEmail('admin@gmail.com');

      expect(result).toEqual(admin);
      expect(adminRepository.findOne).toHaveBeenCalledWith({
        where: { email: 'admin@gmail.com' },
      });
    });

    it('should return null if not found', async () => {
      adminRepository.findOne.mockResolvedValue(null);

      const result = await service.findByEmail('notfound@gmail.com');

      expect(result).toBeNull();
    });
  });

  describe('findAll', () => {
    it('should return paginated data', async () => {
      const qb: any = {
        orderBy: jest.fn().mockReturnThis(),
        skip: jest.fn().mockReturnThis(),
        take: jest.fn().mockReturnThis(),
        getManyAndCount: jest.fn().mockResolvedValue([[], 0]),
      };

      adminRepository.createQueryBuilder.mockReturnValue(qb);

      const result = await service.findAll(1, 10);

      expect(result).toEqual({
        data: [],
        total: 0,
        page: 1,
        limit: 10,
      });
    });
  });

  describe('create', () => {
    it('should create admin successfully', async () => {
      const dto: CreateAdminDto = {
        email: 'admin@gmail.com',
        password: 'strongpassword123',
        nama_depan: 'Lorem',
        nama_belakang: 'Ipsum',
        tanggal_lahir: new Date('2000-01-01'),
        jenis_kelamin: JenisKelamin.PRIA,
      };

      const mockTransactionManager = {
        findOne: jest.fn().mockResolvedValue(null),
        create: jest.fn().mockReturnValue(dto),
        save: jest.fn(),
      };

      entityManager.transaction.mockImplementation(async (cb) =>
        cb(mockTransactionManager as any),
      );

      const result = await service.create(dto);

      expect(mockTransactionManager.findOne).toHaveBeenCalled();
      expect(mockTransactionManager.create).toHaveBeenCalledWith(Admin, dto);
      expect(mockTransactionManager.save).toHaveBeenCalled();
    });

    it('should throw ConflictException if email already exists', async () => {
      const dto = { email: 'admin@gmail.com' } as CreateAdminDto;

      const mockTransactionManager = {
        findOne: jest.fn().mockResolvedValue({ email: dto.email }),
      };

      entityManager.transaction.mockImplementation(async (cb) =>
        cb(mockTransactionManager as any),
      );

      await expect(service.create(dto)).rejects.toThrow(ConflictException);
    });
  });

  describe('update', () => {
    it('should update admin successfully', async () => {
      const admin = { email: 'admin@gmail.com' } as Admin;
      const dto: UpdateAdminDto = {
        nama_depan: 'Updated',
      };

      jest.spyOn(service, 'findByEmail').mockResolvedValue(admin);

      const mockTransactionManager = {
        save: jest.fn(),
      };

      entityManager.transaction.mockImplementation(async (cb) =>
        cb(mockTransactionManager as any),
      );

      const result = await service.update(admin.email, dto);

      expect(result.msg).toBe('Admin updated successfully');
      expect(result.data).toEqual(admin);
      expect(mockTransactionManager.save).toHaveBeenCalledWith(Admin, admin);
    });

    it('should throw NotFoundException if admin not found', async () => {
      jest.spyOn(service, 'findByEmail').mockResolvedValue(null);

      await expect(service.update('notfound@gmail.com', {})).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('delete', () => {
    it('should delete admin successfully', async () => {
      const admin = { email: 'admin@gmail.com' } as Admin;

      jest.spyOn(service, 'findByEmail').mockResolvedValue(admin);
      adminRepository.remove.mockResolvedValue(admin);

      const result = await service.delete(admin.email);

      expect(result).toEqual({
        msg: 'Admin deleted successfully',
      });
      expect(adminRepository.remove).toHaveBeenCalledWith(admin);
    });

    it('should throw NotFoundException if admin not found', async () => {
      jest.spyOn(service, 'findByEmail').mockResolvedValue(null);

      await expect(service.delete('notfound@gmail.com')).rejects.toThrow(
        NotFoundException,
      );
    });
  });
});
