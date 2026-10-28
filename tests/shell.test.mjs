import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync, existsSync} from 'node:fs';
const root=new URL('../',import.meta.url);
const read=path=>readFileSync(new URL(path,root),'utf8');
test('every service-worker shell asset exists and every local module import is cached',()=>{
 const assets=JSON.parse(read('sw.js').match(/const ASSETS=(\[[^\]]*\])/)[1].replace(/'/g,'"'));
 for(const asset of assets)if(asset!=='./')assert.ok(existsSync(new URL(asset,root)),asset);
 for(const file of ['app.js','import-tools.mjs','docx-import.mjs','google-import.mjs','icons.mjs','backup.mjs','media.mjs','markdown.mjs','site-config.mjs','field-mapper.mjs'])
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
 for(const file of ['index.html','app.js','import-tools.mjs','docx-import.mjs','google-import.mjs','icons.mjs','backup.mjs','media.mjs','markdown.mjs','site-config.mjs','field-mapper.mjs','styles.css','sw.js','manifest.webmanifest','icon.svg','icons'])assert.match(workflow,new RegExp(`[ /]${file.replace('.','\\.')}[ /]`),file);
});
test('site config ships blank and holds only public Google values',async()=>{
 const {SITE_CONFIG}=await import('../site-config.mjs');
 assert.deepEqual(Object.keys(SITE_CONFIG.google).sort(),['apiKey','clientId','projectNumber']);
 assert.doesNotMatch(read('site-config.mjs'),/GOCSPX|client_secret|private_key/i);
});
