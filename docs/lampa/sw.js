const cacheName = 'ibulkin-lampa-shell-v1';
const base = self.registration.scope;
const files = ['app.min.js?v=e38581c', 'css/app.css?v=4.56', 'vender/jquery/jquery.js',
    'vender/notify/notify.js', 'vender/scrollbar/jquery.scrollbar.js', 'vender/scrollbar/jquery.scrollbar.css',
    'vender/navigator/navigator.js', 'vender/keypad/keypad.js', 'vender/keypad/style.css', 'webos/webOSTV.js'];
const assets = new Set(files.map(path => new URL(path, base).href));
self.addEventListener('install', event => {
    event.waitUntil(caches.open(cacheName).then(cache => cache.addAll([...assets])));
});
self.addEventListener('fetch', event => {
    if (event.request.method === 'GET' && assets.has(event.request.url)) {
        event.respondWith(caches.open(cacheName).then(cache => cache.match(event.request)).then(hit => hit || fetch(event.request)));
    }
});
