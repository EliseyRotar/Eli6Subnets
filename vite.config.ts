import { defineConfig } from 'vite'

export default defineConfig({
  // Sub-path used when deployed to GitHub Pages at
  // https://eliseyrotar.github.io/Eli6Subnets/
  base: '/Eli6Subnets/',

  build: {
    outDir: 'dist',
    emptyOutDir: true,
    rollupOptions: {
      output: {
        // ECharts dwarfs the app chunk; keep it in its own file so the
        // shell stays small and the library gets its own long-lived cache.
        manualChunks(id): string | undefined {
          if (id.includes('node_modules/echarts') || id.includes('node_modules\\echarts')) {
            return 'echarts'
          }
          return undefined
        },
      },
    },
  },

  test: {
    environment: 'node',
    include: ['tests/**/*.test.ts'],
    coverage: {
      provider: 'v8',
      include: ['src/calc/**'],
      thresholds: {
        lines: 90,
      },
    },
  },
})
