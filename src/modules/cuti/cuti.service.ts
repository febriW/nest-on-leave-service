import { BadRequestException, Injectable, InternalServerErrorException, Logger, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Cuti } from './cuti.entity';
import { Repository, DataSource, Between } from 'typeorm';
import { Pegawai } from '../pegawai/pegawai.entity';
import { CreateCutiDto, UpdateCutiDto } from './dto/cuti.dto';
import dayjs from 'dayjs';

@Injectable()
export class CutiService {
    private readonly logger = new Logger(CutiService.name);

    constructor(
        @InjectRepository(Cuti)
        private readonly cutiRepository: Repository<Cuti>,
        @InjectRepository(Pegawai)
        private readonly pegawaiRepository: Repository<Pegawai>,
        private readonly dataSource: DataSource
    ) {}

    async applyCuti(createCutiDto: CreateCutiDto) {
        return await this.dataSource.transaction(async (manager) => {
            try {
                const cutiRepo = manager.getRepository(Cuti);
                const pegawaiRepo = manager.getRepository(Pegawai);

                const pegawai = await pegawaiRepo.findOne({ where: { email: createCutiDto.pegawaiEmail } });
                if (!pegawai) throw new NotFoundException('Pegawai not found');

                const startDate = dayjs(createCutiDto.tanggal_mulai).startOf('day');
                const endDate = dayjs(createCutiDto.tanggal_selesai).startOf('day');

                await this.validateCutiRules(cutiRepo, createCutiDto.pegawaiEmail, startDate, endDate);

                const cuti = cutiRepo.create({
                    pegawai: pegawai,
                    tanggal_mulai: startDate.toDate(),
                    tanggal_selesai: endDate.toDate(),
                    alasan: createCutiDto.alasan,
                });

                return await cutiRepo.save(cuti);
            } catch (error) {
                if (error instanceof NotFoundException || error instanceof BadRequestException) throw error;
                this.logger.error(`Apply Cuti Unexpected Error: ${error.message}`, error.stack);
                throw new InternalServerErrorException('System failure on applying leave');
            }
        });
    }

    async updateCuti(id: number, updateCutiDto: UpdateCutiDto) {
        return await this.dataSource.transaction(async (manager) => {
            try {
                const cutiRepo = manager.getRepository(Cuti);
                const cuti = await cutiRepo.findOne({
                    where: { id },
                    relations: ['pegawai'],
                });

                if (!cuti) throw new NotFoundException('Leave record not found');

                const today = dayjs().startOf('day');
                const leaveStart = dayjs(cuti.tanggal_mulai);
                const leaveEnd = dayjs(cuti.tanggal_selesai);

                if (today.isAfter(leaveStart.subtract(1, 'day')) && today.isBefore(leaveEnd.add(1, 'day'))) {
                    throw new BadRequestException('Ongoing leave records cannot be updated');
                }

                const startDate = updateCutiDto.tanggal_mulai ? dayjs(updateCutiDto.tanggal_mulai) : dayjs(cuti.tanggal_mulai);
                const endDate = updateCutiDto.tanggal_selesai ? dayjs(updateCutiDto.tanggal_selesai) : dayjs(cuti.tanggal_selesai);

                await this.validateCutiRules(cutiRepo, cuti.pegawai.email, startDate, endDate, id);

                cuti.tanggal_mulai = startDate.toDate();
                cuti.tanggal_selesai = endDate.toDate();
                if (updateCutiDto.alasan) cuti.alasan = updateCutiDto.alasan;

                return await cutiRepo.save(cuti);
            } catch (error) {
                if (error instanceof NotFoundException || error instanceof BadRequestException) throw error;
                this.logger.error(`Update Cuti Unexpected Error: ${error.message}`, error.stack);
                throw new InternalServerErrorException('System failure on updating leave');
            }
        });
    }

    private async validateCutiRules(
        repo: Repository<Cuti>,
        email: string,
        startDate: dayjs.Dayjs,
        endDate: dayjs.Dayjs,
        excludeId?: number
    ) {
        if (endDate.isBefore(startDate)) {
            throw new BadRequestException('End date cannot be earlier than start date');
        }

        const daysRequested = endDate.diff(startDate, 'days') + 1;
        if (daysRequested > 1) {
            throw new BadRequestException('You are only allowed to take a maximum of 1 day leave per month');
        }

        const overlap = await repo.createQueryBuilder('cuti')
            .innerJoin('cuti.pegawai', 'pegawai')
            .where('pegawai.email = :email', { email })
            .andWhere('(:start <= cuti.tanggal_selesai AND :end >= cuti.tanggal_mulai)', {
                start: startDate.toDate(),
                end: endDate.toDate()
            })
            .andWhere(excludeId ? 'cuti.id != :id' : '1=1', { id: excludeId })
            .getOne();

        if (overlap) {
            throw new BadRequestException('The employee already has a leave scheduled on the selected date');
        }

        const startOfMonth = startDate.startOf('month').toDate();
        const endOfMonth = startDate.endOf('month').toDate();

        const cutiInMonth = await repo.createQueryBuilder('cuti')
            .innerJoin('cuti.pegawai', 'pegawai')
            .where('pegawai.email = :email', { email })
            .andWhere('cuti.tanggal_mulai BETWEEN :start AND :end', { 
                start: startOfMonth, 
                end: endOfMonth 
            })
            .andWhere(excludeId ? 'cuti.id != :id' : '1=1', { id: excludeId })
            .getMany();

        const totalDaysTakenThisMonth = cutiInMonth.reduce((acc, c) => {
            return acc + dayjs(c.tanggal_selesai).diff(dayjs(c.tanggal_mulai), 'days') + 1;
        }, 0);

        if (totalDaysTakenThisMonth + daysRequested > 1) {
            throw new BadRequestException(
                `Monthly leave limit reached. You have already taken ${totalDaysTakenThisMonth} day(s) of leave this month.`
            );
        }

        const startOfYear = startDate.startOf('year').toDate();
        const endOfYear = startDate.endOf('year').toDate();

        const cutiThisYear = await repo.createQueryBuilder('cuti')
            .innerJoin('cuti.pegawai', 'pegawai')
            .where('pegawai.email = :email', { email })
            .andWhere('cuti.tanggal_mulai BETWEEN :start AND :end', { start: startOfYear, end: endOfYear })
            .andWhere(excludeId ? 'cuti.id != :id' : '1=1', { id: excludeId })
            .getMany();

        const totalDaysThisYear = cutiThisYear.reduce((acc, c) => {
            return acc + dayjs(c.tanggal_selesai).diff(dayjs(c.tanggal_mulai), 'days') + 1;
        }, 0);

        if (totalDaysThisYear + daysRequested > 12) {
            throw new BadRequestException('Yearly leave limit (12 days) has been exceeded');
        }
    }

    async findByPegawai(pegawaiEmail: string) {
        try {
            const pegawai = await this.pegawaiRepository.findOne({ where: { email: pegawaiEmail } });
            if (!pegawai) throw new NotFoundException('Pegawai not found');

            const cutiList = await this.cutiRepository.find({
                where: { pegawai: { email: pegawaiEmail } },
                relations: ['pegawai'],
                order: { tanggal_mulai: 'DESC' }
            });

            if (!cutiList || cutiList.length === 0) {
                return {
                    status: 'success',
                    message: 'No leave records found for this employee',
                    data: [],
                };
            }

            return { status: 'success', data: cutiList };
        } catch (error) {
            if (error instanceof NotFoundException) throw error;
            this.logger.error(`Find By Pegawai Error: ${error.message}`, error.stack);
            throw new InternalServerErrorException('Failed to fetch employee leave records');
        }
    }

    async findAll(page: number = 1, limit: number = 10) {
        try {
            const [data, total] = await this.cutiRepository.findAndCount({
                relations: ['pegawai'],
                order: { tanggal_mulai: 'DESC' },
                skip: (page - 1) * limit,
                take: limit,
            });
            return { 
                status: 'success',
                data, 
                total, 
                page, 
                limit 
            };
        } catch (error) {
            this.logger.error(`Find All Cuti Error: ${error.message}`, error.stack);
            throw new InternalServerErrorException('Failed to fetch leave list');
        }
    }

    async deleteCuti(id: number) {
        try {
            const cuti = await this.cutiRepository.findOne({ where: { id } });
            if (!cuti) throw new NotFoundException('Leave record not found');

            const today = dayjs().startOf('day');
            if (today.isAfter(dayjs(cuti.tanggal_mulai).subtract(1, 'day')) && today.isBefore(dayjs(cuti.tanggal_selesai).add(1, 'day'))) {
                throw new BadRequestException('Ongoing leave records cannot be deleted');
            }

            await this.cutiRepository.remove(cuti);
            return { 
                status: 'success', 
                message: 'Leave record deleted successfully' 
            };
        } catch (error) {
            if (error instanceof NotFoundException || error instanceof BadRequestException) {
                throw error;
            }
            this.logger.error(`Delete Cuti Error: ${error.message}`, error.stack);
            throw new InternalServerErrorException('Failed to delete leave record');
        }
    }
}