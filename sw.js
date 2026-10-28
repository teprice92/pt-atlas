const CACHE='pt-atlas-shell-v6';
const ASSETS=['./','./index.html','./styles.css','./app.js','./import-tools.mjs','./docx-import.mjs','./google-import.mjs','./icons.mjs','./backup.mjs','./icon.svg','./manifest.webmanifest','./icons/icon-192.png','./icons/icon-512.png','./icons/maskable-512.png','./icons/apple-touch-icon.png'];
self.addEventListener('install',event=>event.waitUntil(caches.open(CACHE).then(cache=>cache.addAll(ASSETS)).then(()=>self.skipWaiting())));
self.addEventListener('activate',event=>event.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(key=>key.startsWith('pt-atlas-')&&key!==CACHE).map(key=>caches.delete(key)))).then(()=>self.clients.claim())));
self.addEventListener('fetch',event=>{
 if(event.request.method!=='GET'||!event.request.url.startsWith(self.registration.scope))return;
 event.respondWith(caches.open(CACHE).then(async cache=>{
  try{const response=await fetch(event.request);if(response.ok&&ASSETS.some(path=>new URL(path,self.registration.scope).href===event.request.url))await cache.put(event.request,response.clone());return response}
  catch(error){const cached=await cache.match(event.request);if(cached)return cached;throw error}
 }));
});
