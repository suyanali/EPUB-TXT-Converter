import { defineConfig } from 'vite';
import { VitePWA } from 'vite-plugin-pwa';
import { readFileSync } from 'node:fs';
const pkg = JSON.parse(readFileSync(new URL('./package.json', import.meta.url)));
export default defineConfig(({ mode }) => ({
  base: process.env.BASE_PATH || '/',
  define: { __APP_VERSION__: JSON.stringify(pkg.version) },
  plugins: [VitePWA({
    registerType: 'prompt',
    injectRegister: null,
    includeAssets: ['favicon.svg','apple-touch-icon.png'],
    manifest: { name:'EPUB → TXT 轉換器', short_name:'EPUB轉TXT', description:'離線 EPUB 轉 TXT 與簡繁轉換', theme_color:'#245c82', background_color:'#f6f8fc', display:'standalone', start_url:'.', scope:'.', icons:[{src:'icon-192.png',sizes:'192x192',type:'image/png'},{src:'icon-512.png',sizes:'512x512',type:'image/png'},{src:'icon-512.png',sizes:'512x512',type:'image/png',purpose:'maskable'}] },
    workbox: { globPatterns:['**/*.{js,css,html,svg,png,woff2}'], cleanupOutdatedCaches:true, navigateFallback:'index.html', skipWaiting:false, clientsClaim:true }
  })]
}));
