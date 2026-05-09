import { SetMetadata } from '@nestjs/common';

export const IS_CSRF_EXEMPT_KEY = 'isCsrfExempt';
export const CsrfExempt = (): MethodDecorator & ClassDecorator =>
  SetMetadata(IS_CSRF_EXEMPT_KEY, true);
