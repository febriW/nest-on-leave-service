import { Test, TestingModule } from '@nestjs/testing';
import { PegawaiController } from './pegawai.controller';
import { PegawaiService } from './pegawai.service';
import { CreatePegawaiDto, UpdatePegawaiDto } from './dto/pegawai.dto';
import { JenisKelamin } from './dto/pegawai.dto';
import { PaginationDto } from '../admin/dto/pagination.dto';

describe('PegawaiController', () => {
  let controller: PegawaiController;
  let service: PegawaiService;

  const mockPegawaiService = {
    create: jest.fn(),
    findAll: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [PegawaiController],
      providers: [
        { provide: PegawaiService, useValue: mockPegawaiService },
      ],
    }).compile();

    controller = module.get<PegawaiController>(PegawaiController);
    service = module.get<PegawaiService>(PegawaiService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('create', () => {
    it('should create a pegawai', async () => {
      const dto: CreatePegawaiDto = {
        nama_depan: 'John',
        nama_belakang: 'Doe',
        email: 'john.doe@gmail.com',
        no_hp: '+6281234567890',
        alamat: 'Jl. Merdeka No. 10, Jakarta',
        jenis_kelamin: JenisKelamin.LAKI,
      };

      mockPegawaiService.create.mockResolvedValue({ id: 1, ...dto });

      const result = await controller.create(dto);
      expect(result).toEqual({ id: 1, ...dto });
      expect(service.create).toHaveBeenCalledWith(dto);
    });
  });

  describe('findAll', () => {
    it('should return paginated list of pegawai', async () => {
      const paginationDto: PaginationDto = { page: 1, limit: 10 };
      const mockResult = [{ nama_depan: 'John', email: 'john.doe@gmail.com' }];
      mockPegawaiService.findAll.mockResolvedValue(mockResult);

      const result = await controller.findAll(paginationDto);
      expect(result).toEqual(mockResult);
      expect(service.findAll).toHaveBeenCalledWith(paginationDto.page, paginationDto.limit);
    });
  });

  describe('update', () => {
    it('should update a pegawai by email', async () => {
      const email = 'john.doe@gmail.com';
      const updateDto: UpdatePegawaiDto = { nama_depan: 'Johnny' };
      const mockUpdated = { ...updateDto, email };

      mockPegawaiService.update.mockResolvedValue(mockUpdated);

      const result = await controller.update(email, updateDto);
      expect(result).toEqual(mockUpdated);
      expect(service.update).toHaveBeenCalledWith(email, updateDto);
    });
  });

  describe('remove', () => {
    it('should delete a pegawai by email', async () => {
      const email = 'john.doe@gmail.com';
      mockPegawaiService.delete.mockResolvedValue({ deleted: true });

      const result = await controller.remove(email);
      expect(result).toEqual({ deleted: true });
      expect(service.delete).toHaveBeenCalledWith(email);
    });
  });
});