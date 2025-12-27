import { 
    ConflictException, 
    Injectable, 
    InternalServerErrorException, 
    Logger, 
    NotFoundException 
} from '@nestjs/common';
import { CreateAdminDto, UpdateAdminDto } from './dto/admin.dto';
import { EntityManager, Repository } from 'typeorm';
import { Admin } from './admin.entity';
import { InjectRepository } from '@nestjs/typeorm';
import * as bcrypt from 'bcrypt';

export interface Response {
    msg: string;
    data?: any;
}

@Injectable()
export class AdminService {
    private readonly logger = new Logger(AdminService.name);

    constructor(
        @InjectRepository(Admin)
        private readonly adminRepository: Repository<Admin>,
        private readonly entityManager: EntityManager,
    ) {}

    async findByEmail(email: string, manager: EntityManager = this.entityManager): Promise<Admin | null> {
        return manager.findOne(Admin, { where: { email } });
    }

    async findAll(page: number = 1, limit: number = 10) {
        try {
            const [data, total] = await this.adminRepository.findAndCount({
                order: { created_at: 'DESC' },
                skip: (page - 1) * limit,
                take: limit,
            });

            const sanitizedData = data.map(({ password, ...rest }) => rest);

            return { data: sanitizedData, total, page, limit };
        } catch (error) {
            this.logger.error(`Failed to fetch admins: ${error.message}`);
            throw new InternalServerErrorException('Failed to fetch admin list');
        }
    }

    async create(createAdminDto: CreateAdminDto): Promise<Response> {
        return this.entityManager.transaction(async (transactionalEntityManager) => {
            try {
                const existingAccount = await this.findByEmail(createAdminDto.email, transactionalEntityManager);
                if (existingAccount) {
                    throw new ConflictException('Account already registered with this email.');
                }

                const salt = await bcrypt.genSalt();
                const hashedPassword = await bcrypt.hash(createAdminDto.password, salt);

                const admin = transactionalEntityManager.create(Admin, {
                    ...createAdminDto,
                    password: hashedPassword,
                });

                const savedAdmin = await transactionalEntityManager.save(admin);
                
                const { password, ...result } = savedAdmin;

                return { msg: 'Admin created successfully', data: result };
            } catch (error) {
                if (error instanceof ConflictException) throw error;
                this.logger.error(`Unexpected Create Admin Error: ${error.message}`, error.stack);
                throw new InternalServerErrorException('Could not create admin due to system error');
        }
        });
    }

    async update(email: string, updateAdminDto: UpdateAdminDto): Promise<Response> {
        return this.entityManager.transaction(async (transactionalEntityManager) => {
            try {
                const admin = await this.findByEmail(email, transactionalEntityManager);
                if (!admin) throw new NotFoundException('Account not found');

                if (updateAdminDto.password) {
                    const salt = await bcrypt.genSalt();
                    updateAdminDto.password = await bcrypt.hash(updateAdminDto.password, salt);
                }

                Object.assign(admin, updateAdminDto);
                const updatedAdmin = await transactionalEntityManager.save(Admin, admin);

                const { password, ...result } = updatedAdmin;

                return {
                    msg: 'Admin updated successfully',
                    data: result
                };
            } catch (error) {
                if (error instanceof NotFoundException) throw error;
                this.logger.error(`Unexpected Update Admin Error: ${error.message}`, error.stack);
                throw new InternalServerErrorException('Transaction failed, could not update admin');
            }
        });
    }

    async delete(email: string): Promise<Response> {
        return this.entityManager.transaction(async (transactionalEntityManager) => {
            try {
                const admin = await this.findByEmail(email, transactionalEntityManager);
                if (!admin) throw new NotFoundException('Account not found');

                await transactionalEntityManager.remove(Admin, admin);

                return { msg: 'Admin deleted successfully' };
            } catch (error) {
                if (error instanceof NotFoundException) throw error;
                this.logger.error(`Unexpected Delete Admin Error: ${error.message}`, error.stack);
                throw new InternalServerErrorException('Transaction failed, could not delete admin');
            }
        });
    }
}