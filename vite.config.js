import { defineConfig } from 'vite'
import { svelte } from '@sveltejs/vite-plugin-svelte'

export default defineConfig({
  plugins: [svelte()],
  server: {
    proxy: {
      // Any request from the Svelte app starting with /api is forwarded
      // to the Express server. No CORS issues, no hardcoded ports in components.
      '/api': 'http://localhost:3001',
    },
  },
})
