import { Test, TestingModule } from '@nestjs/testing';
import { CutiController } from './cuti.controller';
import { CutiService } from './cuti.service';
import { CreateCutiDto } from './dto/cuti.dto';
import { PaginationDto } from '../admin/dto/pagination.dto';

describe('CutiController', () => {
  let controller: CutiController;
  let service: CutiService;

  const mockCutiService = {
    applyCuti: jest.fn(),
    findByPegawai: jest.fn(),
    findAll: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [CutiController],
      providers: [
        {
          provide: CutiService,
          useValue: mockCutiService,
        },
      ],
    }).compile();

    controller = module.get<CutiController>(CutiController);
    service = module.get<CutiService>(CutiService);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('applyCuti', () => {
    it('should call cutiService.applyCuti with correct DTO', async () => {
      const createCutiDto: CreateCutiDto = {
        alasan: 'Family event',
        tanggal_mulai: '2025-01-01',
        tanggal_selesai: '2025-01-05',
        pegawaiEmail: 'pegawai@example.com',
      };

      const result = { id: 1, ...createCutiDto };
      mockCutiService.applyCuti.mockResolvedValue(result);

      expect(await controller.applyCuti(createCutiDto)).toEqual(result);
      expect(mockCutiService.applyCuti).toHaveBeenCalledWith(createCutiDto);
    });
  });

  describe('getCutiByPegawai', () => {
    it('should return cuti for the given email', async () => {
      const email = 'pegawai@example.com';
      const result = [{ id: 1, alasan: 'Family event', pegawaiEmail: email }];
      mockCutiService.findByPegawai.mockResolvedValue(result);

      expect(await controller.getCutiByPegawai(email)).toEqual(result);
      expect(mockCutiService.findByPegawai).toHaveBeenCalledWith(email);
    });
  });

  describe('findAll', () => {
    it('should return all cuti with pagination', async () => {
      const paginationDto: PaginationDto = { page: 1, limit: 10 };
      const result = [{ id: 1, alasan: 'Family event' }];
      mockCutiService.findAll.mockResolvedValue(result);

      expect(await controller.findAll(paginationDto)).toEqual(result);
      expect(mockCutiService.findAll).toHaveBeenCalledWith(1, 10);
    });

    it('should handle undefined pagination values', async () => {
      const paginationDto: PaginationDto = {};
      const result = [{ id: 1, alasan: 'Family event' }];
      mockCutiService.findAll.mockResolvedValue(result);

      expect(await controller.findAll(paginationDto)).toEqual(result);
      expect(mockCutiService.findAll).toHaveBeenCalledWith(undefined, undefined);
    });
  });
});
