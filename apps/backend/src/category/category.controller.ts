import { Controller, Post, Delete, Body, Param, Query, HttpCode, HttpStatus } from '@nestjs/common'
import { ApiTags, ApiOperation, ApiResponse, ApiParam, ApiQuery } from '@nestjs/swagger'
import { CategoryService } from './category.service'
import { CreateCategoryDto } from './dto/create-category.dto'
import { DeleteCategoryQueryDto } from './dto/delete-category.dto'
import { CategoryResponseDto, DeleteCategoryResponseDto } from './dto/category-response.dto'

@ApiTags('category')
@Controller('category')
export class CategoryController {
  constructor(private readonly categoryService: CategoryService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: '카테고리 생성',
    description: '새로운 카테고리를 생성합니다.',
  })
  @ApiResponse({
    status: 201,
    description: '카테고리 생성 성공',
    type: CategoryResponseDto,
  })
  @ApiResponse({
    status: 400,
    description: '카테고리 개수 제한 초과',
    schema: {
      type: 'object',
      properties: {
        statusCode: { type: 'number', example: 400 },
        message: { type: 'string', example: '카테고리 개수 제한을 초과했습니다. (최대 10개)' },
        error: { type: 'string', example: 'Bad Request' },
      },
    },
  })
  @ApiResponse({
    status: 403,
    description: '해당 방에 대한 권한이 없습니다.',
    schema: {
      type: 'object',
      properties: {
        statusCode: { type: 'number', example: 403 },
        message: { type: 'string', example: '해당 방에 대한 권한이 없습니다.' },
        error: { type: 'string', example: 'Forbidden' },
      },
    },
  })
  @ApiResponse({
    status: 404,
    description: '방을 찾을 수 없습니다.',
    schema: {
      type: 'object',
      properties: {
        statusCode: { type: 'number', example: 404 },
        message: { type: 'string', example: '방을 찾을 수 없습니다.' },
        error: { type: 'string', example: 'Not Found' },
      },
    },
  })
  async createCategory(@Body() dto: CreateCategoryDto): Promise<CategoryResponseDto> {
    const category = await this.categoryService.create(dto.room_id, dto.name, dto.user_id)

    return {
      category_id: category.id,
      room_id: category.roomId,
      name: category.title,
      order: category.orderIndex,
      created_at: category.createdAt,
    }
  }

  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: '카테고리 삭제',
    description: '카테고리를 삭제합니다.',
  })
  @ApiParam({
    name: 'id',
    description: '카테고리 ID',
    example: 'f2d84f18-aee3-4395-a8e0-e97cbf15ed3a',
  })
  @ApiQuery({
    name: 'room_id',
    description: '방 Slug 또는 방 ID',
    required: true,
    example: 'a3k9m2x7',
  })
  @ApiQuery({
    name: 'user_id',
    description: '사용자 ID',
    required: true,
    example: '550e8400-e29b-41d4-a716-446655440000',
  })
  @ApiResponse({
    status: 200,
    description: '카테고리 삭제 성공',
    type: DeleteCategoryResponseDto,
  })
  @ApiResponse({
    status: 400,
    description: '최소 카테고리 개수 미만',
    schema: {
      type: 'object',
      properties: {
        statusCode: { type: 'number', example: 400 },
        message: { type: 'string', example: '최소 1개의 카테고리는 유지해야 합니다.' },
        error: { type: 'string', example: 'Bad Request' },
      },
    },
  })
  @ApiResponse({
    status: 403,
    description: '해당 방에 대한 권한이 없습니다.',
    schema: {
      type: 'object',
      properties: {
        statusCode: { type: 'number', example: 403 },
        message: { type: 'string', example: '해당 방에 대한 권한이 없습니다.' },
        error: { type: 'string', example: 'Forbidden' },
      },
    },
  })
  @ApiResponse({
    status: 404,
    description: '방 또는 카테고리를 찾을 수 없습니다.',
    schema: {
      oneOf: [
        {
          properties: {
            statusCode: { type: 'number', example: 404 },
            message: { type: 'string', example: '방을 찾을 수 없습니다.' },
            error: { type: 'string', example: 'Not Found' },
          },
        },
        {
          properties: {
            statusCode: { type: 'number', example: 404 },
            message: { type: 'string', example: '카테고리를 찾을 수 없습니다.' },
            error: { type: 'string', example: 'Not Found' },
          },
        },
      ],
    },
  })
  async deleteCategory(@Param('id') id: string, @Query() query: DeleteCategoryQueryDto): Promise<DeleteCategoryResponseDto> {
    const category = await this.categoryService.delete(id, query.room_id, query.user_id)

    return {
      category_id: category.id,
      deleted_at: new Date(),
    }
  }
}
