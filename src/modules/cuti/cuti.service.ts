import { BadRequestException, Injectable } from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { Cuti } from './cuti.entity'
import { Repository } from 'typeorm'
import { Pegawai } from '../pegawai/pegawai.entity'
import { CreateCutiDto, UpdateCutiDto } from './dto/cuti.dto'
import dayjs from 'dayjs'

@Injectable()
export class CutiService {
    constructor(
        @InjectRepository(Cuti)
        private readonly cutiRepository: Repository<Cuti>,
        @InjectRepository(Pegawai)
        private readonly pegawaiRepository: Repository<Pegawai>
    ) {}

    async applyCuti(createCutiDto: CreateCutiDto){
        const pegawai = await this.pegawaiRepository.findOne({ where: { email: createCutiDto.pegawaiEmail } })
        if (!pegawai) throw new BadRequestException('Pegawai not found')

        const startDate = dayjs(createCutiDto.tanggal_mulai)
        const endDate = dayjs(createCutiDto.tanggal_selesai)

        if(endDate.isBefore(startDate)) throw new BadRequestException('End date cannot be before start date')

        const daysRequested = endDate.diff(startDate, 'days') + 1
        const startOfYear = dayjs().startOf('year').toDate()
        const endOfYear = dayjs().endOf('year').toDate()

        const totalCutiThisYear = await this.cutiRepository
            .createQueryBuilder('cuti')
            .innerJoin('cuti.pegawai', 'pegawai')
            .where('pegawai.email = :email', { email: createCutiDto.pegawaiEmail })
            .andWhere('cuti.tanggal_mulai BETWEEN :startOfYear AND :endOfYear', { startOfYear, endOfYear })
            .getMany()

        const totalDaysThisYear = totalCutiThisYear.reduce((acc, c) => {
        const s = dayjs(c.tanggal_mulai)
        const e = dayjs(c.tanggal_selesai)
        return acc + e.diff(s, 'days') + 1
        }, 0)

        if (totalDaysThisYear + daysRequested > 12){
            throw new BadRequestException('Pegawai exceeded yearly leave limit of 12 days')
        }

        const requestedMonth = startDate.month() // 0 = Jan
        const cutiInMonth = await this.cutiRepository
            .createQueryBuilder('cuti')
            .innerJoin('cuti.pegawai', 'pegawai')
            .where('pegawai.email = :email', { email: createCutiDto.pegawaiEmail })
            .andWhere('MONTH(cuti.tanggal_mulai) = :month', { month: requestedMonth + 1 })
            .getCount()

        if (cutiInMonth > 0) throw new BadRequestException('Pegawai can only take 1 day leave per month')
        const cuti = this.cutiRepository.create({
            pegawai: pegawai,
            tanggal_mulai: startDate.toDate(),
            tanggal_selesai: endDate.toDate(),
            alasan: createCutiDto.alasan,
        })

        await this.cutiRepository.save(cuti)
    }

    async findByPegawai(pegawaiEmail: string){
        const pegawai = await this.pegawaiRepository.findOne({ where: { email: pegawaiEmail } })
        if(!pegawai) throw new BadRequestException('Pegawai not found')

        const cutiList = await this.cutiRepository.createQueryBuilder('cuti')
            .leftJoinAndSelect('cuti.pegawai', 'pegawai')
            .where('pegawai.email = :email', { email: pegawaiEmail })
            .orderBy('cuti.tanggal_mulai', 'DESC')
            .getMany();

        if(!cutiList || cutiList.length === 0) {
            return {
                status: 'success',
                message: 'No leave data found for this pegawai',
                data: [],
            };
        }

        return {
            status: 'success',
            data: cutiList,
        };
    }

    async findAll(page: number = 1 , limit: number = 10) {
        const q = this.cutiRepository
            .createQueryBuilder('cuti')
            .leftJoinAndSelect('cuti.pegawai', 'pegawai')
            .orderBy('cuti.tanggal_mulai', 'DESC')
            .skip((page - 1) * limit)
            .take(limit);
        
        const [data, total] = await q.getManyAndCount();

        return { data, total, page, limit};
    }

    async updateCuti(id: number, updateCutiDto: UpdateCutiDto) {
        const cuti = await this.cutiRepository.findOne({
            where: { id },
            relations: ['pegawai'],
        })

        if (!cuti) {
            throw new BadRequestException({
                statusCode: 400,
                message: 'Cuti not found',
            })
        }

        const today = dayjs()

        if (
            today.isAfter(dayjs(cuti.tanggal_mulai)) &&
            today.isBefore(dayjs(cuti.tanggal_selesai).add(1, 'day'))
        ) {
            throw new BadRequestException({
                statusCode: 400,
                message: 'Cuti cannot be updated while it is ongoing',
            })
        }

        const startDate = updateCutiDto.tanggal_mulai
            ? dayjs(updateCutiDto.tanggal_mulai)
            : dayjs(cuti.tanggal_mulai)

        const endDate = updateCutiDto.tanggal_selesai
            ? dayjs(updateCutiDto.tanggal_selesai)
            : dayjs(cuti.tanggal_selesai)

        if (endDate.isBefore(startDate)) {
            throw new BadRequestException({
                statusCode: 400,
                message: 'End date cannot be before start date',
            })
        }

        const daysRequested = endDate.diff(startDate, 'days') + 1
        const pegawaiEmail = cuti.pegawai.email

        // =======================
        // VALIDASI 12 HARI / TAHUN
        // =======================
        const startOfYear = dayjs().startOf('year').toDate()
        const endOfYear = dayjs().endOf('year').toDate()

        const cutiThisYear = await this.cutiRepository
            .createQueryBuilder('cuti')
            .innerJoin('cuti.pegawai', 'pegawai')
            .where('pegawai.email = :email', { email: pegawaiEmail })
            .andWhere('cuti.id != :id', { id })
            .andWhere('cuti.tanggal_mulai BETWEEN :start AND :end', {
                start: startOfYear,
                end: endOfYear,
            })
            .getMany()

        const totalDaysThisYear = cutiThisYear.reduce((acc, c) => {
            return acc + dayjs(c.tanggal_selesai).diff(dayjs(c.tanggal_mulai), 'days') + 1
        }, 0)

        if (totalDaysThisYear + daysRequested > 12) {
            throw new BadRequestException({
                statusCode: 400,
                message: 'Pegawai exceeded yearly leave limit of 12 days',
            })
        }

        // =========================
        // VALIDASI 1 CUTI / BULAN
        // =========================
        const requestedMonth = startDate.month() + 1

        const cutiInMonth = await this.cutiRepository
            .createQueryBuilder('cuti')
            .innerJoin('cuti.pegawai', 'pegawai')
            .where('pegawai.email = :email', { email: pegawaiEmail })
            .andWhere('cuti.id != :id', { id })
            .andWhere('MONTH(cuti.tanggal_mulai) = :month', { month: requestedMonth })
            .getCount()

        if (cutiInMonth > 0) {
            throw new BadRequestException({
                statusCode: 400,
                message: 'Pegawai can only take 1 leave per month',
            })
        }

        // ===================
        // UPDATE DATA
        // ===================
        cuti.tanggal_mulai = startDate.toDate()
        cuti.tanggal_selesai = endDate.toDate()
        if (updateCutiDto.alasan) cuti.alasan = updateCutiDto.alasan

        await this.cutiRepository.save(cuti)

        return {
            status: 'success',
            message: 'Cuti updated successfully',
            data: cuti,
        }
    }

    async deleteCuti(id: number) {
        const cuti = await this.cutiRepository.findOne({
            where: { id },
            relations: ['pegawai'],
        })

        if (!cuti) {
            throw new BadRequestException({
                statusCode: 400,
                message: 'Cuti not found',
            })
        }

        const today = dayjs()

        if (
            today.isAfter(dayjs(cuti.tanggal_mulai)) &&
            today.isBefore(dayjs(cuti.tanggal_selesai).add(1, 'day'))
        ) {
            throw new BadRequestException({
                statusCode: 400,
                message: 'Cuti cannot be deleted while it is ongoing',
            })
        }

        await this.cutiRepository.remove(cuti)

        return {
            status: 'success',
            message: 'Cuti deleted successfully',
        }
    }
}
