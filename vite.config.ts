
import path from 'path';
import { defineConfig, loadEnv } from 'vite';

export default defineConfig(({ mode }) => {
    const env = loadEnv(mode, '.', '');
    return {
      define: {
        // Keep old Gemini key definitions for potential backward compatibility or overlooked references
        'process.env.API_KEY': JSON.stringify(env.VITE_GEMINI_API_KEY || env.GEMINI_API_KEY), 
        'process.env.GEMINI_API_KEY': JSON.stringify(env.VITE_GEMINI_API_KEY || env.GEMINI_API_KEY),
        // Define OPENAI_API_KEY using the VITE_ prefixed variable from .env files
        'process.env.OPENAI_API_KEY': JSON.stringify(env.VITE_OPENAI_API_KEY)
      },
      resolve: {
        alias: {
          '@': path.resolve(__dirname, '.'), 
        }
      }
    };
});
