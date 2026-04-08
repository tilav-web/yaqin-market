import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { CategoryService } from './category.service';
import { CreateCategoryDto } from './dto/create-category.dto';
import { UpdateCategoryDto } from './dto/update-category.dto';
import { AuthGuard } from '@nestjs/passport';
import { Roles } from '../auth/decorators/roles.decorator';
import { AuthRoleEnum } from 'src/enums/auth-role.enum';
import { RolesGuard } from '../auth/guard/roles.guard';
import { FileInterceptor } from '@nestjs/platform-express';
import { ImageService } from '../image/image.service';
import { UploadFolderEnum } from '../image/enums/upload-folder.enum';
import { ParseJsonFieldsInterceptor } from 'src/common/interceptors/parse-json-fields.interceptor';

@Controller('categories')
export class CategoryController {
  constructor(
    private readonly categoryService: CategoryService,
    private readonly imageService: ImageService,
  ) {}

  @Get()
  async findAll() {
    return this.categoryService.findAll();
  }

  @Get(':id')
  async findOne(@Param('id', new ParseUUIDPipe()) id: string) {
    return this.categoryService.findOne(id);
  }

  @Post()
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles(AuthRoleEnum.SUPER_ADMIN)
  @UseInterceptors(FileInterceptor('image'), ParseJsonFieldsInterceptor)
  async create(
    @Body() dto: CreateCategoryDto,
    @UploadedFile() file: Express.Multer.File,
  ) {
    let imageUrl: string | undefined;
    if (file) {
      imageUrl = await this.imageService.processAndSaveImage(
        file,
        UploadFolderEnum.CATEGORY,
      );
    }
    return this.categoryService.create(dto, imageUrl);
  }

  @Patch(':id')
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles(AuthRoleEnum.SUPER_ADMIN)
  @UseInterceptors(FileInterceptor('image'), ParseJsonFieldsInterceptor)
  async update(
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body() dto: UpdateCategoryDto,
    @UploadedFile() file: Express.Multer.File,
  ) {
    let imageUrl: string | undefined;
    if (file) {
      imageUrl = await this.imageService.processAndSaveImage(
        file,
        UploadFolderEnum.CATEGORY,
      );
    }
    return this.categoryService.update(id, dto, imageUrl);
  }

  @Delete(':id')
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles(AuthRoleEnum.SUPER_ADMIN)
  async remove(@Param('id', new ParseUUIDPipe()) id: string) {
    return this.categoryService.remove(id);
  }
}
