import { Test, TestingModule } from '@nestjs/testing';
import { ConflictException, NotFoundException } from '@nestjs/common';
import { getRepositoryToken } from '@nestjs/typeorm';
import { EntityManager, Repository } from 'typeorm';
import { AdminService } from './admin.service';
import { Admin } from './admin.entity';
import { CreateAdminDto, UpdateAdminDto, JenisKelamin } from './dto/admin.dto';

jest.mock('bcrypt', () => ({
  genSalt: jest.fn().mockResolvedValue('salt'),
  hash: jest.fn().mockResolvedValue('hashed_password'),
}));

describe('AdminService', () => {
  let service: AdminService;
  let adminRepository: jest.Mocked<Repository<Admin>>;
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
        AdminService,
        {
          provide: getRepositoryToken(Admin),
          useValue: {
            findAndCount: jest.fn(),
            findOne: jest.fn(),
          },
        },
        {
          provide: EntityManager,
          useValue: {
            transaction: jest.fn().mockImplementation((cb: any) => cb(mockTransactionalManager)),
          },
        },
      ],
    }).compile();

    service = module.get<AdminService>(AdminService);
    adminRepository = module.get(getRepositoryToken(Admin));
    entityManager = module.get(EntityManager) as jest.Mocked<EntityManager>;
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('create', () => {
    it('should create admin successfully', async () => {
      const dto: CreateAdminDto = {
        email: 'test@test.com',
        password: 'password123',
        nama_depan: 'John',
        nama_belakang: 'Doe',
        tanggal_lahir: new Date(),
        jenis_kelamin: JenisKelamin.PRIA,
      };

      mockTransactionalManager.findOne.mockResolvedValue(null);
      mockTransactionalManager.create.mockReturnValue({ ...dto, password: 'hashed_password' });
      mockTransactionalManager.save.mockResolvedValue({ ...dto, password: 'hashed_password' });

      const result = await service.create(dto);

      expect(result.msg).toBe('Admin created successfully');
      expect(result.data).not.toHaveProperty('password');
      expect(mockTransactionalManager.save).toHaveBeenCalled();
    });

    it('should throw ConflictException if email exists', async () => {
      mockTransactionalManager.findOne.mockResolvedValue({ email: 'exists@test.com' });
      await expect(service.create({ email: 'exists@test.com' } as any)).rejects.toThrow(ConflictException);
    });
  });

  describe('update', () => {
    it('should update admin and remove password from response', async () => {
      const existingAdmin = { email: 'a@a.com', password: 'old' };
      mockTransactionalManager.findOne.mockResolvedValue(existingAdmin);
      mockTransactionalManager.save.mockResolvedValue({ ...existingAdmin, nama_depan: 'New' });

      const result = await service.update('a@a.com', { nama_depan: 'New' });

      expect(result.data).not.toHaveProperty('password');
      expect(result.data.nama_depan).toBe('New');
    });
  });

  describe('delete', () => {
    it('should delete admin successfully', async () => {
      mockTransactionalManager.findOne.mockResolvedValue({ email: 'del@test.com' });
      mockTransactionalManager.remove.mockResolvedValue(true);

      const result = await service.delete('del@test.com');
      expect(result.msg).toBe('Admin deleted successfully');
    });
  });
});