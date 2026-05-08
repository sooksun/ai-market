import { Controller, Get } from '@nestjs/common';
import { Public } from '../common/decorators/public.decorator';

@Controller('healthz')
export class HealthController {
  @Public()
  @Get()
  check() {
    return {
      status: 'ok',
      service: 'ai-market-api',
      uptime: process.uptime(),
      timestamp: new Date().toISOString(),
    };
  }
}
