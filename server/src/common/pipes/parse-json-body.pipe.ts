import { Injectable, PipeTransform } from '@nestjs/common';

/**
 * Multer/FormData orqali kelgan body dagi JSON string maydonlarni
 * object ga parse qiladi. ValidationPipe dan OLDIN ishlaydi.
 *
 * Masalan: name: '{"uz":"Olma","ru":"Яблоко"}' → name: { uz: "Olma", ru: "Яблоко" }
 */
@Injectable()
export class ParseJsonBodyPipe implements PipeTransform {
  transform(value: any) {
    if (!value || typeof value !== 'object') return value;

    const result = { ...value };
    for (const key of Object.keys(result)) {
      if (typeof result[key] === 'string' && result[key].startsWith('{')) {
        try {
          const parsed = JSON.parse(result[key]);
          if (typeof parsed === 'object' && parsed !== null) {
            result[key] = parsed;
          }
        } catch {
          // not JSON, leave as is
        }
      }
    }
    return result;
  }
}
