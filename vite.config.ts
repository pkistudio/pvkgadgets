import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { defineConfig } from 'vite';

const packageJson = JSON.parse(readFileSync(resolve(__dirname, 'package.json'), 'utf8')) as { version: string };
const pkistudioOidsPath = resolve(__dirname, 'node_modules/pkistudiojs/app/static/oids.json');

export default defineConfig({
  base: './',
  plugins: [
    {
      name: 'pkistudiojs-oids-url',
      resolveId(id) {
        return id === 'virtual:pkistudiojs-oids-url' ? '\0virtual:pkistudiojs-oids-url' : null;
      },
      load(id) {
        if (id !== '\0virtual:pkistudiojs-oids-url') return null;
        return `import url from ${JSON.stringify(`${pkistudioOidsPath}?url`)}; export default url;`;
      }
    }
  ],
  define: {
    __PVKGADGETS_VERSION__: JSON.stringify(packageJson.version)
  },
  build: {
    rollupOptions: {
      input: {
        main: resolve(__dirname, 'index.html'),
        viewer: resolve(__dirname, 'viewer.html')
      }
    }
  }
});