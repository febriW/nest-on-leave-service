import { ConflictException, Injectable, NotFoundException } from '@nestjs/common'
import { CreateAdminDto, UpdateAdminDto } from './dto/admin.dto'
import { EntityManager, Repository } from 'typeorm'
import { Admin } from './admin.entity'
import { InjectRepository } from '@nestjs/typeorm'

export interface response {
    msg: string;
    data?: any;
}

@Injectable()
export class AdminService {
    constructor(
        @InjectRepository(Admin)
        private readonly adminRepository: Repository<Admin>,
        private readonly entityManager: EntityManager,
    ) {}

    async findByEmail(email: string): Promise<Admin | null>{
        return this.adminRepository.findOne({
            where: {email}
        })
    }

    async findAll(page: number = 1 , limit: number = 10){
        const q = this.adminRepository
            .createQueryBuilder('admin')
            .orderBy('admin.created_at', 'DESC')
            .skip((page - 1) * limit)
            .take(limit)
        
        const [data, total] = await q.getManyAndCount();

        return { data, total, page, limit};
    }

    async create(createAdminDto: CreateAdminDto): Promise<response> {
        return this.entityManager.transaction(async (transactionEntity) => {
            const existingAccount =  await transactionEntity.findOne(Admin, {
                where: { email: createAdminDto.email },
            })

            if (existingAccount) throw new ConflictException('Account already registered with this email.')
            
            const admin = transactionEntity.create(Admin, createAdminDto)   
            await transactionEntity.save(admin)

            return { msg: 'Admin created successfully', data: admin };
        })
    }

    async update(email: string, updateAdminDto: UpdateAdminDto): Promise<response>{
        return this.entityManager.transaction(async (transactionEntity) => {
            const admin = await this.findByEmail(email)

            if(!admin) throw new NotFoundException('Account not found')

            Object.assign(admin, updateAdminDto)

            await transactionEntity.save(Admin, admin)

            return {
                msg: 'Admin updated successfully',
                data: admin
            };
        })
    }
    
    async delete(email: string): Promise<response> {
        const admin = await this.findByEmail(email)

        if(!admin) throw new NotFoundException('Account not found')

        await this.adminRepository.remove(admin);

        return { msg: 'Admin deleted successfully' };
    }

}
