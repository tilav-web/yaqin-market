import {
  Injectable,
  Logger,
  InternalServerErrorException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as fs from 'fs/promises';
import * as fsSync from 'fs';
import { createRequire } from 'node:module';
import * as path from 'path';
import { UploadFolderEnum } from './enums/upload-folder.enum';

const nodeRequire = createRequire(__filename);

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
  private sharpModulePromise?: Promise<SharpLike | null>;

  constructor(private readonly configService: ConfigService) {
    this.uploadPath = path.resolve(process.cwd(), 'uploads');
    this.serverUrl = this.configService.get<string>(
      'SERVER_URL',
      'http://localhost:5000',
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
    const sharpModule = await this.getSharpModule();
    const fileExtension = sharpModule
      ? '.webp'
      : this.resolveFallbackExtension(file.originalname, file.mimetype);
    const fileName = `${uniqueSuffix}${fileExtension}`;
    const filePath = path.join(targetFolder, fileName);

    try {
      if (sharpModule) {
        await sharpModule(file.buffer).webp({ quality: 80 }).toFile(filePath);
      } else {
        await fs.writeFile(filePath, file.buffer);
      }

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

  private async getSharpModule(): Promise<SharpLike | null> {
    if (!this.sharpModulePromise) {
      this.sharpModulePromise = Promise.resolve()
        .then(() => {
          const requiredModule = nodeRequire('sharp') as
            | SharpLike
            | { default?: SharpLike };
          return (
            (typeof requiredModule === 'function'
              ? requiredModule
              : requiredModule.default) ?? null
          );
        })
        .catch((error: unknown) => {
          const message =
            error instanceof Error ? error.message : 'unknown sharp error';
          this.logger.warn(
            `Sharp ishlamadi, fallback original fayl saqlanadi: ${message}`,
          );
          return null;
        });
    }

    return this.sharpModulePromise;
  }

  private resolveFallbackExtension(
    originalName: string,
    mimeType: string,
  ): string {
    const originalExtension = path.extname(originalName).toLowerCase();
    if (/^\.[a-z0-9]{2,5}$/i.test(originalExtension)) {
      return originalExtension;
    }

    if (mimeType === 'image/png') return '.png';
    if (mimeType === 'image/webp') return '.webp';
    if (mimeType === 'image/gif') return '.gif';

    return '.jpg';
  }
}

type SharpLike = (input?: Buffer) => {
  webp: (options?: { quality?: number }) => {
    toFile: (outputPath: string) => Promise<unknown>;
  };
};
