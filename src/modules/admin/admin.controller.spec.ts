import { Test, TestingModule } from '@nestjs/testing';
import { AdminController } from './admin.controller';
import { AdminService } from './admin.service';
import { CreateAdminDto, UpdateAdminDto, JenisKelamin } from './dto/admin.dto';

describe('AdminController', () => {
  let controller: AdminController;
  let service: AdminService;

  const mockAdminService = {
    create: jest.fn(),
    findAll: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [AdminController],
      providers: [
        {
          provide: AdminService,
          useValue: mockAdminService,
        },
      ],
    }).compile();

    controller = module.get<AdminController>(AdminController);
    service = module.get<AdminService>(AdminService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('create', () => {
    it('should call adminService.create and return result', async () => {
      const dto: CreateAdminDto = {
        email: 'admin@gmail.com',
        password: 'strongpassword123',
        nama_depan: 'Lorem',
        nama_belakang: 'Ipsum',
        tanggal_lahir: new Date('2000-01-01'),
        jenis_kelamin: JenisKelamin.PRIA,
      };

      const result = {
        id: 1,
        ...dto,
      };

      mockAdminService.create.mockResolvedValue(result);

      const response = await controller.create(dto);

      expect(response).toEqual(result);
      expect(service.create).toHaveBeenCalledTimes(1);
      expect(service.create).toHaveBeenCalledWith(dto);
    });
  });

  describe('findAll', () => {
    it('should call adminService.findAll with page and limit', async () => {
      const paginationDto = {
        page: 1,
        limit: 10,
      };

      const result = {
        data: [],
        total: 0,
        page: 1,
        limit: 10,
      };

      mockAdminService.findAll.mockResolvedValue(result);

      const response = await controller.findAll(paginationDto);

      expect(response).toEqual(result);
      expect(service.findAll).toHaveBeenCalledTimes(1);
      expect(service.findAll).toHaveBeenCalledWith(1, 10);
    });
  });

  describe('update', () => {
    it('should call adminService.update with email and UpdateAdminDto', async () => {
      const email = 'admin@gmail.com';

      const dto: UpdateAdminDto = {
        password: 'newpassword123',
        nama_depan: 'Updated',
        jenis_kelamin: JenisKelamin.WANITA,
      };

      const result = {
        email,
        ...dto,
      };

      mockAdminService.update.mockResolvedValue(result);

      const response = await controller.update(email, dto);

      expect(response).toEqual(result);
      expect(service.update).toHaveBeenCalledTimes(1);
      expect(service.update).toHaveBeenCalledWith(email, dto);
    });
  });

  describe('remove', () => {
    it('should call adminService.delete with email', async () => {
      const email = 'admin@gmail.com';
      const result = { message: 'Admin deleted successfully' };

      mockAdminService.delete.mockResolvedValue(result);

      const response = await controller.remove(email);

      expect(response).toEqual(result);
      expect(service.delete).toHaveBeenCalledTimes(1);
      expect(service.delete).toHaveBeenCalledWith(email);
    });
  });
});