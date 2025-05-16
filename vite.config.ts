import { defineConfig } from 'vite';

export default defineConfig({
  base: './', // or '/3mc/' if your site is at https://cybercyril.com/3mc/
  assetsInclude: ['**/*.vert', '**/*.frag'],
});