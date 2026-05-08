import { getRequestConfig } from 'next-intl/server';

const DEFAULT_LOCALE = 'th';

export default getRequestConfig(async () => {
  const locale = DEFAULT_LOCALE;
  const messages = (await import(`../messages/${locale}.json`)).default;
  return {
    locale,
    messages,
    timeZone: 'Asia/Bangkok',
  };
});
