import {
  Injectable,
  Logger,
  InternalServerErrorException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as fs from 'fs/promises';
import * as fsSync from 'fs';
import * as path from 'path';
import sharp from 'sharp';
import { UploadFolderEnum } from './enums/upload-folder.enum';

interface MulterMemoryFile {
  buffer: Buffer;
  originalname: string;
  mimetype: string;
  size: number;
  fieldname: string;
  encoding: string;
}

@Injectable()
export class ImageService {
  private readonly logger = new Logger(ImageService.name);
  private readonly uploadPath: string;
  private readonly serverUrl: string;

  constructor(private readonly configService: ConfigService) {
    this.uploadPath = path.resolve(process.cwd(), 'uploads');
    this.serverUrl = this.configService.get<string>(
      'SERVER_URL',
      'http://localhost:3000',
    );

    // Constructor ichida sinxron mkdir — ilova start bo'lishidan oldin kerak
    if (!fsSync.existsSync(this.uploadPath)) {
      fsSync.mkdirSync(this.uploadPath, { recursive: true });
    }
  }

  /**
   * Rasmni qayta ishlaydi: webp ga o'giradi, siqadi, papkaga saqlaydi va to'liq URL qaytaradi.
   * @param file Yuklangan fayl buffer
   * @param folder Maqsad papka (UploadFolderEnum dan)
   * @returns Saqlangan rasmning to'liq URL manzili
   */
  async processAndSaveImage(
    file: MulterMemoryFile,
    folder: UploadFolderEnum,
  ): Promise<string> {
    const targetFolder = path.join(this.uploadPath, folder);

    await fs.mkdir(targetFolder, { recursive: true });

    const uniqueSuffix = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
    const fileName = `${uniqueSuffix}.webp`;
    const filePath = path.join(targetFolder, fileName);

    try {
      await sharp(file.buffer).webp({ quality: 80 }).toFile(filePath);

      this.logger.log(`Rasm saqlandi: ${folder}/${fileName}`);

      return `${this.serverUrl}/uploads/${folder}/${fileName}`;
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "Noma'lum xato";
      const stack = error instanceof Error ? error.stack : undefined;

      this.logger.error(`Rasmni qayta ishlashda xato: ${message}`, stack);
      throw new InternalServerErrorException('Rasmni saqlashda xato yuz berdi');
    }
  }

  /**
   * URL orqali rasmni uploads papkasidan o'chiradi.
   * @param imageUrl Rasmning to'liq URL manzili
   */
  async deleteImage(imageUrl: string): Promise<void> {
    if (!imageUrl) return;

    const urlParts = imageUrl.split('/uploads/');
    if (urlParts.length < 2) return;

    const relativePath = urlParts[1]; // masalan: category/filename.webp
    const filePath = path.join(this.uploadPath, relativePath);

    try {
      await fs.unlink(filePath);
      this.logger.log(`Rasm o'chirildi: ${relativePath}`);
    } catch (error: unknown) {
      // ENOENT — fayl yo'q, ogohlantirib o'tamiz, lekin exception otmaymiz
      if (
        error instanceof Error &&
        'code' in error &&
        (error as NodeJS.ErrnoException).code === 'ENOENT'
      ) {
        this.logger.warn(`O'chiriladigan rasm topilmadi: ${relativePath}`);
        return;
      }

      const stack = error instanceof Error ? error.stack : undefined;
      this.logger.error(`Rasmni o'chirishda xato: ${imageUrl}`, stack);
    }
  }
}
