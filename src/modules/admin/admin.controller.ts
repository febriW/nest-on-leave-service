import { Controller, Get, Post, Put, Body, Param, Delete, Query } from '@nestjs/common';
import { AdminService } from './admin.service';
import { CreateAdminDto, UpdateAdminDto } from './dto/admin.dto';
import { PaginationDto } from './dto/pagination.dto';
import { ApiBearerAuth, ApiTags, ApiResponse } from '@nestjs/swagger';

@ApiTags('admin')
@ApiBearerAuth('access-token')
@Controller('admin')
export class AdminController {
    constructor(private readonly adminService: AdminService) {}

    @Post()
    async create(@Body() createAdminDto: CreateAdminDto) {
        return this.adminService.create(createAdminDto);
    }

    @Get()
    async findAll(@Query() paginationDto: PaginationDto) {
        const { page, limit } = paginationDto;
        return this.adminService.findAll(page, limit);
    }

    @Put(':email')
    async update(@Param('email') email: string, @Body() updateAdminDto: UpdateAdminDto) {
        return this.adminService.update(email, updateAdminDto);
    }

    @Delete(':email')
    async remove(@Param('email') email: string) {
        return await this.adminService.delete(email);
    }
}
