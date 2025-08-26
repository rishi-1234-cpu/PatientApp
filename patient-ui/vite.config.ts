// vite.config.ts
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
    plugins: [react()],
    server: {
        port: 5173, // fixed port
        strictPort: true // fail if 5173 is in use instead of switching
    }
})