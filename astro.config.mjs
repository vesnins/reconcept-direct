import { defineConfig } from 'astro/config';

export default defineConfig({
  site: 'https://direct.reconcept.ru',
  output: 'static',
  trailingSlash: 'never',
  build: { format: 'file', inlineStylesheets: 'always' },
  compressHTML: true,
});
