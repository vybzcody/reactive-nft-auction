import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import tailwindcss from '@tailwindcss/vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    vue(), 
    tailwindcss(),
    {
      name: 'buffer-polyfill',
      transformIndexHtml(html) {
        return html.replace(
          '<head>',
          `<head><script>
            window.global = window;
            window.Buffer = {
              from: function(arg) {
                if (typeof arg === 'string') return new Uint8Array([...arg].map(c => c.charCodeAt(0)));
                if (ArrayBuffer.isView(arg)) return new Uint8Array(arg.buffer, arg.byteOffset, arg.byteLength);
                return new Uint8Array(arg);
              },
              isBuffer: function() { return false; },
              alloc: function() { return new Uint8Array(arguments[0]); }
            };
          </script>`
        )
      }
    }
  ],
  define: {
    global: 'globalThis',
    'process.env': {},
  },
  resolve: {
    alias: {
      buffer: 'buffer',
    },
  },
  optimizeDeps: {
    esbuildOptions: {
      define: {
        global: 'globalThis',
      },
      plugins: [],
    },
  },
  build: {
    commonjsOptions: {
      transformMixedEsModules: true,
    },
  },
})
