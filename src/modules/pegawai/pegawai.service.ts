import { 
    ConflictException, 
    Injectable, 
    InternalServerErrorException, 
    Logger, 
    NotFoundException 
} from '@nestjs/common';
import { CreatePegawaiDto, UpdatePegawaiDto } from './dto/pegawai.dto';
import { EntityManager, Repository } from 'typeorm';
import { Pegawai } from './pegawai.entity';
import { InjectRepository } from '@nestjs/typeorm';

export interface response {
    msg: string;
    data?: any;
}

@Injectable()
export class PegawaiService {
    private readonly logger = new Logger(PegawaiService.name);
    constructor(
        @InjectRepository(Pegawai)
        private readonly pegawaiRepository: Repository<Pegawai>,
        private readonly entityManager: EntityManager,
    ) {}

    async findByEmail(email: string, manager: EntityManager = this.entityManager): Promise<Pegawai | null> {
        return manager.findOne(Pegawai, {
            where: { email }
        });
    }

    async findAll(page: number = 1, limit: number = 10) {
        try {
            const [data, total] = await this.pegawaiRepository.findAndCount({
                order: { created_at: 'DESC' },
                skip: (page - 1) * limit,
                take: limit,
            });

            return { data, total, page, limit };
        } catch (error) {
            this.logger.error(`Failed to fetch all pegawai: ${error.message}`, error.stack);
            throw new InternalServerErrorException('Failed to fetch pegawai list');
        }
    }

    async create(createPegawaiDto: CreatePegawaiDto): Promise<response> {
        return this.entityManager.transaction(async (transactionEntity) => {
            try {
                const existingAccount = await this.findByEmail(createPegawaiDto.email, transactionEntity);
                if (existingAccount) {
                    throw new ConflictException('Data already created with this Email.');
                }

                const pegawai = transactionEntity.create(Pegawai, createPegawaiDto);
                const savedPegawai = await transactionEntity.save(pegawai);

                return { msg: 'Pegawai created successfully', data: savedPegawai };
            } catch (error) {
                if (error instanceof ConflictException) throw error;
                this.logger.error(`Create Pegawai Error: ${error.message}`, error.stack);
                throw new InternalServerErrorException('Transaction failed while creating pegawai');
            }
        });
    }

    async update(email: string, updatePegawaiDto: UpdatePegawaiDto): Promise<response> {
        return this.entityManager.transaction(async (transactionEntity) => {
            try {
                const pegawai = await this.findByEmail(email, transactionEntity);
                if (!pegawai) throw new NotFoundException('Account not found');

                Object.assign(pegawai, updatePegawaiDto);
                const updatedPegawai = await transactionEntity.save(Pegawai, pegawai);

                return {
                    msg: 'Pegawai updated successfully',
                    data: updatedPegawai
                };
            } catch (error) {
                if (error instanceof NotFoundException) throw error;

                this.logger.error(`Update Pegawai Error: ${error.message}`, error.stack);
                throw new InternalServerErrorException('Transaction failed while updating pegawai');
            }
        });
    }

    async delete(email: string): Promise<response> {
        return this.entityManager.transaction(async (transactionEntity) => {
            try {
                const pegawai = await this.findByEmail(email, transactionEntity);
                if (!pegawai) throw new NotFoundException('Data pegawai not found');

                await transactionEntity.remove(Pegawai, pegawai);

                return { msg: 'Data pegawai deleted successfully' };
            } catch (error) {
                if (error instanceof NotFoundException) throw error;
                this.logger.error(`Delete Pegawai Error: ${error.message}`, error.stack);
                throw new InternalServerErrorException('Transaction failed while deleting pegawai');
            }
        });
    }
}