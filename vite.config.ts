import { defineConfig } from 'vite'

export default defineConfig({
  // Sub-path used when deployed to GitHub Pages at
  // https://eliseyrotar.github.io/Eli6Subnets/
  base: '/Eli6Subnets/',

  build: {
    outDir: 'dist',
    emptyOutDir: true,
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
