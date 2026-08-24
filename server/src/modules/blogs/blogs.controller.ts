import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  Patch,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiCookieAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { UserRole } from '@prisma/client';

import type { AuthenticatedUser } from '@/common/auth/auth.types';
import { CurrentUser } from '@/common/decorators/current-user.decorator';
import { Roles } from '@/common/decorators/roles.decorator';
import { RolesGuard } from '@/common/guards/roles.guard';
import { TenantGuard } from '@/common/guards/tenant.guard';
import { ZodValidationPipe } from '@/common/pipes/zod-validation.pipe';
import {
  blogParamSchema,
  createBlogSchema,
  listBlogsQuerySchema,
  updateBlogSchema,
  type CreateBlogInput,
  type ListBlogsQuery,
  type UpdateBlogInput,
} from '@/modules/blogs/schemas/blog.schema';
import { BlogsService } from '@/modules/blogs/blogs.service';
import z from 'zod';

@ApiTags('Blogs')
@ApiCookieAuth('access_token')
@Controller('blogs')
@UseGuards(TenantGuard, RolesGuard)
@Roles(UserRole.SCHOOL_ADMIN)
export class BlogsController {
  constructor(private readonly blogsService: BlogsService) {}

  @Roles(
    UserRole.SCHOOL_ADMIN,
    UserRole.TEACHER,
    UserRole.STUDENT,
    UserRole.PARENT,
  )
  @Get()
  @ApiOperation({ summary: 'Danh sách bài viết' })
  async list(
    @CurrentUser() user: AuthenticatedUser,
    @Query(new ZodValidationPipe(listBlogsQuerySchema))
    query: ListBlogsQuery,
  ) {
    const result = await this.blogsService.list(user.activeSchoolId, query);

    return {
      success: true,
      data: result.items,
      meta: result.meta,
      message: null,
    };
  }

  @Roles(
    UserRole.SCHOOL_ADMIN,
    UserRole.TEACHER,
    UserRole.STUDENT,
    UserRole.PARENT,
  )
  @Get(':slug')
  @ApiOperation({ summary: 'Chi tiết bài viết' })
  async findById(
    @CurrentUser() user: AuthenticatedUser,
    @Param('slug', new ZodValidationPipe(z.string())) slug: string,
  ) {
    const data = await this.blogsService.findById(user.activeSchoolId, slug);

    return {
      success: true,
      data,
      message: null,
    };
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Tạo bài viết mới' })
  async create(
    @CurrentUser() user: AuthenticatedUser,
    @Body(new ZodValidationPipe(createBlogSchema)) body: CreateBlogInput,
  ) {
    const data = await this.blogsService.create(
      user.activeSchoolId,
      user.id,
      body,
    );

    return {
      success: true,
      data,
      message: 'Tạo bài viết thành công',
    };
  }

  @Patch(':slug')
  @ApiOperation({ summary: 'Cập nhật bài viết' })
  async update(
    @CurrentUser() user: AuthenticatedUser,
    @Param('slug', new ZodValidationPipe(blogParamSchema)) slug: string,
    @Body(new ZodValidationPipe(updateBlogSchema)) body: UpdateBlogInput,
  ) {
    const data = await this.blogsService.update(
      user.activeSchoolId,
      slug,
      body,
    );

    return {
      success: true,
      data,
      message: 'Cập nhật bài viết thành công',
    };
  }

  @Delete(':slug')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Xóa bài viết' })
  async delete(
    @CurrentUser() user: AuthenticatedUser,
    @Param('slug', new ZodValidationPipe(blogParamSchema)) slug: string,
  ) {
    await this.blogsService.delete(user.activeSchoolId, slug);

    return {
      success: true,
      data: null,
      message: 'Xóa bài viết thành công',
    };
  }
}
