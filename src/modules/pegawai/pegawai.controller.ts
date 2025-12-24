import { Controller, Get, Post, Put, Body, Param, Delete, HttpStatus, Query } from '@nestjs/common';
import { PegawaiService } from './pegawai.service'; 
import { CreatePegawaiDto, UpdatePegawaiDto } from './dto/pegawai.dto';
import { PaginationDto } from '../admin/dto/pagination.dto';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';

@ApiTags('pegawai')
@ApiBearerAuth('access-token')
@Controller('pegawai')
export class PegawaiController {
    constructor(private readonly pegawaiService: PegawaiService) {}

    @Post()
    async create(@Body() createPegawaiDto: CreatePegawaiDto) {
        return await this.pegawaiService.create(createPegawaiDto);
    }

    @Get()
    async findAll(@Query() paginationDto: PaginationDto) {
        const { page, limit } = paginationDto;
        return await this.pegawaiService.findAll(page, limit);
    }

    @Put(':email')
    async update(@Param('email') email: string, @Body() updatePegawaiDto: UpdatePegawaiDto) {
        return await this.pegawaiService.update(email, updatePegawaiDto);
    }

    @Delete(':email')
    async remove(@Param('email') email: string) {
        return await this.pegawaiService.delete(email);
    }
}
