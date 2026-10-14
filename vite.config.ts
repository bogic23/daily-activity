/// <reference types="vitest" />

import legacy from '@vitejs/plugin-legacy'
import vue from '@vitejs/plugin-vue'
import path from 'path'
import { defineConfig } from 'vite'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    vue(),
    legacy()
  ],
  resolve: {
    alias: {
      '@': path.resolve(import.meta.dirname, './src'),
    },
  },
  build: {
    // The `vendor-ionic` chunk (~1.1 MB min / ~240 kB gzip) is the Ionic
    // framework itself (all Ion* web components ship as one package and
    // can't be tree-shaken further). It is downloaded once and cached,
    // while page chunks below are only a few kB each — so a higher limit
    // here is intentional, not a regression hiding spot.
    chunkSizeWarningLimit: 1300,
    rolldownOptions: {
      output: {
        // Split big node_modules deps into shared chunks so the
        // initial page bundle stays small and each framework chunk
        // is cached independently between deploys.
        codeSplitting: {
          groups: [
            {
              name: 'vendor-vue',
              test: /node_modules[\\/](vue|vue-router|@vue)[\\/]/,
            },
            {
              name: 'vendor-ionic',
              test: /node_modules[\\/]@ionic[\\/]/,
            },
            {
              name: 'vendor-capacitor',
              test: /node_modules[\\/]@capacitor[\\/]/,
            },
            {
              name: 'vendor-icons',
              test: /node_modules[\\/]ionicons[\\/]/,
            },
            {
              name: 'vendor-firebase',
              test: /node_modules[\\/](firebase|@firebase)[\\/]/,
            },
          ],
        },
      },
    },
  },
  test: {
    globals: true,
    environment: 'jsdom'
  }
})
