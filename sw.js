const CACHE_NAME = 'sharetext-vault-v8';
const ASSETS_TO_CACHE = [
    './',
    './index.html',
    './style.css',
    './manifest.json',
    'https://cdnjs.cloudflare.com/ajax/libs/prism/1.29.0/themes/prism-tomorrow.min.css',
    'https://cdnjs.cloudflare.com/ajax/libs/prism/1.29.0/prism.min.js',
    'https://cdn.jsdelivr.net/npm/marked/marked.min.js',
    'https://cdnjs.cloudflare.com/ajax/libs/qrcodejs/1.0.0/qrcode.min.js'
];

self.addEventListener('install', event => {
    event.waitUntil(
        caches.open(CACHE_NAME).then(cache => {
            return cache.addAll(ASSETS_TO_CACHE);
        })
    );
});

self.addEventListener('activate', event => {
    event.waitUntil(
        caches.keys().then(cacheNames => {
            return Promise.all(
                cacheNames.filter(name => name !== CACHE_NAME)
                .map(name => caches.delete(name))
            );
        })
    );
});

self.addEventListener('fetch', event => {
    if (event.request.method !== 'GET' || event.request.url.includes('supabase.co')) {
        return; 
    }
    
    event.respondWith(
        fetch(event.request).catch(() => {
            return caches.match(event.request);
        })
    );
});