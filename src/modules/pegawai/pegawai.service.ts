import { ConflictException, Injectable, NotFoundException } from '@nestjs/common'
import { CreatePegawaiDto, UpdatePegawaiDto } from './dto/pegawai.dto'
import { EntityManager, Repository } from 'typeorm'
import { Pegawai } from './pegawai.entity'
import { InjectRepository } from '@nestjs/typeorm'

export interface response {
    msg: string;
    data?: any;
}

@Injectable()
export class PegawaiService {
    constructor(
        @InjectRepository(Pegawai)
        private readonly pegawaiRepository: Repository<Pegawai>,
        private readonly entityManager: EntityManager,
    ) {}

    async findByEmail(email: string): Promise<Pegawai | null>{
        return this.pegawaiRepository.findOne({
            where: {email}
        })
    }

    async findAll(page: number = 1 , limit: number = 10){
        const q = this.pegawaiRepository
            .createQueryBuilder('pegawai')
            .orderBy('pegawai.created_at', 'DESC')
            .skip((page - 1) * limit)
            .take(limit)
        
        const [data, total] = await q.getManyAndCount();

        return { data, total, page, limit};
    }

    async create(createPegawaiDto: CreatePegawaiDto): Promise<response> {
        return this.entityManager.transaction(async (transactionEntity) => {
            const existingAccount =  await transactionEntity.findOne(Pegawai, {
                where: { email: createPegawaiDto.email },
            })

            if (existingAccount) throw new ConflictException('Data already created with this Email.')
            
            const pegawai = transactionEntity.create(Pegawai, createPegawaiDto)   
            await transactionEntity.save(pegawai)

            return { msg: 'Pegawai created successfully', data: pegawai }
        })
    }

    async update(email: string, updatePegawaiDto: UpdatePegawaiDto): Promise<response>{
        return this.entityManager.transaction(async (transactionEntity) => {
            const pegawai = await this.findByEmail(email)

            if(!pegawai) throw new NotFoundException('Account not found')

            Object.assign(pegawai, updatePegawaiDto)

            await transactionEntity.save(Pegawai, pegawai)

            return {
                msg: 'Pegawai updated successfully',
                data: pegawai
            };
        })
    }
    
    async delete(email: string): Promise<response> {
        const pegawai = await this.findByEmail(email)

        if(!pegawai) throw new NotFoundException('Data pegawai not found')

        await this.pegawaiRepository.remove(pegawai);

        return { msg: 'Data pegawai deleted successfully' };
    }
}
