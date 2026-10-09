import { defineConfig } from 'astro/config';
import node from '@astrojs/node';

export default defineConfig({
  site: 'https://direct.reconcept.ru',
  output: 'static',
  adapter: node({ mode: 'middleware' }),
  trailingSlash: 'never',
  build: { format: 'file', inlineStylesheets: 'always' },
  compressHTML: true,
  security: { checkOrigin: true },
});
