import { defineConfig } from 'vite';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  plugins: [
    VitePWA({
      registerType: 'autoUpdate', // le SW se met à jour tout seul
      manifest: {
        name: 'Révision Masquée',
        short_name: 'Révision',
        description: 'Synthèses de cours avec mots masqués à deviner',
        lang: 'fr',
        start_url: '/',
        display: 'standalone',
        theme_color: '#6366f1',
        background_color: '#0f1115',
        icons: [
          { src: 'icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'icon-512.png', sizes: '512x512', type: 'image/png' },
          { src: 'icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' }
        ]
      },
      // Précache de tout l'app shell => fonctionnement 100 % hors-ligne
      workbox: { globPatterns: ['**/*.{js,css,html,png}'], navigateFallback: '/index.html' }
    })
  ]
});
