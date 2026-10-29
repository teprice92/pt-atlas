import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync, existsSync} from 'node:fs';
const root=new URL('../',import.meta.url);
const read=path=>readFileSync(new URL(path,root),'utf8');
test('every service-worker shell asset exists and every local module import is cached',()=>{
 const assets=JSON.parse(read('sw.js').match(/const ASSETS=(\[[^\]]*\])/)[1].replace(/'/g,'"'));
 for(const asset of assets)if(asset!=='./')assert.ok(existsSync(new URL(asset,root)),asset);
 for(const file of ['app.js','import-tools.mjs','docx-import.mjs','google-import.mjs','icons.mjs','backup.mjs','media.mjs','markdown.mjs','site-config.mjs','field-mapper.mjs','drive-sync.mjs'])
  for(const [,path] of read(file).matchAll(/from '(\.\/[^']+)'/g))assert.ok(assets.includes(path),`${file} imports ${path} which is not cached`);
});
test('manifest icons exist and paths are relative for the /pt-atlas/ subpath',()=>{
 const manifest=JSON.parse(read('manifest.webmanifest'));
 assert.equal(manifest.short_name,'ATLAS');assert.equal(manifest.start_url,'./');assert.equal(manifest.scope,'./');
 for(const icon of manifest.icons){assert.ok(!icon.src.startsWith('/'));assert.ok(existsSync(new URL(icon.src,root)),icon.src)}
 assert.ok(manifest.icons.some(icon=>icon.purpose==='maskable'));
 for(const [,ref] of read('index.html').matchAll(/(?:href|src)="([^"]+)"/g))assert.ok(!ref.startsWith('/')&&!/^https?:/.test(ref),ref);
});
test('no third-party fonts, trackers or remote stylesheets in the app shell',()=>{
 for(const file of ['index.html','styles.css'])assert.doesNotMatch(read(file),/https?:\/\//,file);
});
test('Pages workflow publishes every shell asset',()=>{
 const workflow=read('.github/workflows/deploy.yml');
 for(const file of ['index.html','app.js','import-tools.mjs','docx-import.mjs','google-import.mjs','icons.mjs','backup.mjs','media.mjs','markdown.mjs','site-config.mjs','field-mapper.mjs','drive-sync.mjs','styles.css','sw.js','manifest.webmanifest','icon.svg','icons','fonts'])assert.match(workflow,new RegExp(`[ /]${file.replace('.','\\.')}[ /]`),file);
});
test('site config ships blank and holds only public Google values',async()=>{
 const {SITE_CONFIG}=await import('../site-config.mjs');
 assert.deepEqual(Object.keys(SITE_CONFIG.google).sort(),['apiKey','clientId','projectNumber']);
 assert.doesNotMatch(read('site-config.mjs'),/GOCSPX|client_secret|private_key/i);
});
test('privacy and terms pages are cached, published, local-only and contain required disclosures',()=>{
 const assets=read('sw.js'),workflow=read('.github/workflows/deploy.yml');
 for(const page of ['privacy.html','terms.html']){
  const html=read(page);assert.ok(assets.includes(`'./${page}'`),page+' cached');assert.match(workflow,new RegExp(` ${page.replace('.','\\.')} `),page+' published');
  for(const [,ref] of html.matchAll(/<(?:script|link|img)\b[^>]*\b(?:src|href)="([^"]+)"/g))assert.ok(!/^https?:|^\/\//.test(ref),`${page} loads ${ref}`);
  assert.match(html,/Effective October 28, 2026/);assert.match(html,/href="\.\/#\/"/);assert.doesNotMatch(html,/@gmail\.com/);
 }
 const privacy=read('privacy.html');
 assert.match(privacy,/use and transfer of information received from Google APIs adheres to the <a href="https:\/\/developers\.google\.com\/terms\/api-services-user-data-policy">Google API Services User Data Policy<\/a>, including the Limited Use requirements/);
 for(const scope of ['drive.file','drive.appdata'])assert.match(privacy,new RegExp(scope.replace('.','\\.')));
 assert.match(read('terms.html'),/not medical advice/i);
});
test('self-hosted Roboto for the Google sign-in button is cached, licensed and a real WOFF2 file',()=>{
 const font=readFileSync(new URL('fonts/roboto-latin-500-normal.woff2',root));assert.equal(font.subarray(0,4).toString(),'wOF2');assert.ok(font.length<60000);
 assert.ok(read('sw.js').includes("'./fonts/roboto-latin-500-normal.woff2'"));assert.match(read('fonts/LICENSE-Roboto.txt'),/Apache License/);
 assert.match(read('styles.css'),/url\('fonts\/roboto-latin-500-normal\.woff2'\)/);
});
