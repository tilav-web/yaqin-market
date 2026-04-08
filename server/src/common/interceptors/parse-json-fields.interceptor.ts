import { CallHandler, ExecutionContext, Injectable, NestInterceptor } from '@nestjs/common';
import { Observable } from 'rxjs';

/**
 * FormData (multipart) body dagi JSON string maydonlarni
 * object ga parse qiladi. ValidationPipe dan OLDIN ishlaydi.
 *
 * Masalan: name: '{"uz":"Olma","ru":"Яблоко"}' → name: { uz: "Olma", ru: "Яблоко" }
 */
@Injectable()
export class ParseJsonFieldsInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const request = context.switchToHttp().getRequest();
    const body = request.body;

    if (body && typeof body === 'object') {
      for (const key of Object.keys(body)) {
        const val = body[key];
        if (typeof val === 'string' && (val.startsWith('{') || val.startsWith('['))) {
          try {
            const parsed = JSON.parse(val);
            if (typeof parsed === 'object' && parsed !== null) {
              body[key] = parsed;
            }
          } catch {
            // not valid JSON, leave as string
          }
        }
      }
    }

    return next.handle();
  }
}
