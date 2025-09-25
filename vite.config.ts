import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    port: 3000,
    open: true
  },
  assetsInclude: ['**/*.ttf', '**/*.otf', '**/*.woff', '**/*.woff2']
})
