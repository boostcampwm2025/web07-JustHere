import { fileURLToPath, URL } from 'node:url'
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react-swc'
import tailwindcss from '@tailwindcss/vite'
import svgr from 'vite-plugin-svgr'
import { sentryVitePlugin } from '@sentry/vite-plugin'
import { visualizer } from 'rollup-plugin-visualizer'

// https://vite.dev/config/
export default defineConfig(() => {
  const plugins = [react(), tailwindcss(), svgr()]
  const releaseName = process.env.VITE_SENTRY_RELEASE ?? process.env.SENTRY_RELEASE

  plugins.push(
    sentryVitePlugin({
      org: process.env.SENTRY_ORG,
      project: process.env.SENTRY_PROJECT,
      authToken: process.env.SENTRY_AUTH_TOKEN,
      release: releaseName ? { name: releaseName } : undefined,
      sourcemaps: {
        assets: './dist/**',
      },
      disable: !process.env.SENTRY_AUTH_TOKEN,
    }),
  )

  if (process.env.ANALYZE) {
    plugins.push(
      visualizer({
        open: true,
        filename: 'dist/stats.html',
        gzipSize: true,
        brotliSize: true,
      }),
    )
  }

  return {
    plugins,
    build: {
      sourcemap: true,
      rollupOptions: {
        output: {
          manualChunks: {
            'vendor-canvas': ['konva', 'react-konva', 'react-konva-utils'],
            'vendor-collab': ['yjs', 'socket.io-client'],
            'vendor-map': ['@vis.gl/react-google-maps'],
            'vendor-sentry': ['@sentry/react'],
          },
        },
      },
    },
    resolve: {
      alias: {
        '@': fileURLToPath(new URL('./src', import.meta.url)),
      },
    },
    server: {
      proxy: {
        '/api': {
          target: 'http://localhost:3000',
          changeOrigin: true,
        },
        '/socket.io': {
          target: 'http://localhost:3000',
          ws: true,
          changeOrigin: true,
        },
      },
    },
  }
})
