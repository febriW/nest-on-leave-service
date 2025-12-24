import { Body, Controller, Delete, Get, Param, ParseIntPipe, Patch, Post, Query } from '@nestjs/common';
import { CutiService } from './cuti.service';
import { CreateCutiDto, UpdateCutiDto } from './dto/cuti.dto';
import { PaginationDto } from '../admin/dto/pagination.dto';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';

@ApiTags('cuti')
@ApiBearerAuth('access-token')
@Controller('cuti')
export class CutiController {
    constructor(private readonly cutiService: CutiService) {}

    @Post()
    async applyCuti(@Body() createCutiDto: CreateCutiDto) {
        return await this.cutiService.applyCuti(createCutiDto);
    }

    @Get(':email')
    async getCutiByPegawai(@Param('email') email: string) {
        return await this.cutiService.findByPegawai(email);
    }

    @Get()
    async findAll(@Query() paginationDto: PaginationDto) {
        const { page, limit } = paginationDto;
        return await this.cutiService.findAll(page, limit);
    }

    @Patch(':id')
    async updateCuti(
        @Param('id', ParseIntPipe) id: number,
        @Body() updateCutiDto: UpdateCutiDto,
    ) {
        return this.cutiService.updateCuti(id, updateCutiDto)
    }

    @Delete(':id')
    async deleteCuti(@Param('id', ParseIntPipe) id: number) {
        return this.cutiService.deleteCuti(id)
    }
}
