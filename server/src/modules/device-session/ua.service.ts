import { AppException } from '@/common/exceptions/app.exception';
import { HttpStatus, Injectable } from '@nestjs/common';
import { UAParser } from 'ua-parser-js';
@Injectable()
export class UaService {
  private readonly parser = new UAParser();

  parse(userAgent: string) {
    if (!userAgent) {
      throw new AppException(
        'INVALID_USER_AGENT',
        'User-Agent là bắt buộc',
        HttpStatus.BAD_REQUEST,
      );
    }
    const result = this.parser.setUA(userAgent).getResult();
    return {
      browser: result.browser.name ?? null,

      os: result.os.name ?? null,

      deviceType: result.device.type ?? null,
      deviceVendor: result.device.vendor ?? null,
      deviceModel: result.device.model ?? null,
    };
  }
}
