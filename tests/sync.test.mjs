import {test} from 'node:test';
import assert from 'node:assert/strict';
import {hashRecord, mergeLibraries, runSync, purgeRemote, LIBRARY_FILE, MEDIA_PREFIX} from '../drive-sync.mjs';
import {STORES} from '../backup.mjs';
const builtins=['Hip','Knee'];
const empty=()=>Object.fromEntries(STORES.map(s=>[s,[]]));
// In-memory Google Drive appDataFolder speaking the REST calls drive-sync.mjs makes.
function fakeDrive(){
 const files=new Map();let next=1;const log=[];
 const json=(value,status=200)=>new Response(JSON.stringify(value),{status});
 async function bytesOf(body){if(body==null)return Buffer.alloc(0);if(typeof body==='string')return Buffer.from(body);return Buffer.from(await body.arrayBuffer())}
 const fetcher=async(url,options={})=>{
  const method=options.method||'GET',u=new URL(url);log.push(method+' '+u.pathname);
  assert.match(options.headers.Authorization,/^Bearer /);
  if(drive.failNext){const status=drive.failNext;drive.failNext=0;return new Response('',{status})}
  const id=decodeURIComponent(u.pathname.split('/files/')[1]||'');
  if(method==='GET'&&!id){assert.equal(u.searchParams.get('spaces'),'appDataFolder');return json({files:[...files.entries()].map(([fid,f])=>({id:fid,name:f.name,version:String(f.version),size:String(f.data.length)}))})}
  if(method==='GET'&&u.searchParams.get('alt')==='media'){const f=files.get(id);return f?new Response(f.data):new Response('',{status:404})}
  if(method==='GET'){const f=files.get(id);return f?json({id,version:String(f.version)}):new Response('',{status:404})}
  if(method==='POST'){const raw=await bytesOf(options.body),boundary=options.headers['Content-Type'].split('boundary=')[1];const first=raw.indexOf('\r\n\r\n')+4,metaEnd=raw.indexOf('\r\n--'+boundary,first);const meta=JSON.parse(raw.subarray(first,metaEnd).toString());assert.deepEqual(meta.parents,['appDataFolder']);const start=raw.indexOf('\r\n\r\n',metaEnd)+4,end=raw.lastIndexOf('\r\n--'+boundary+'--');const fid='f'+next++;files.set(fid,{name:meta.name,data:raw.subarray(start,end),version:1});return json({id:fid,version:'1'})}
  if(method==='PATCH'){const f=files.get(id);f.data=await bytesOf(options.body);f.version++;return json({id,version:String(f.version)})}
  if(method==='DELETE'){files.delete(id);return new Response(null,{status:204})}
  throw Error('unexpected '+method+' '+url);
 };
 const drive={files,fetcher,log,failNext:0,library:()=>{const f=[...files.values()].find(f=>f.name===LIBRARY_FILE);return f&&JSON.parse(f.data.toString())}};
 return drive;
}
function device(name){
 const d={name,stores:empty(),media:[],state:{}};
 d.io={readLocal:async()=>({stores:structuredClone(d.stores),media:d.media.map(({blob,...m})=>m)}),loadState:async()=>structuredClone(d.state),saveState:async s=>{d.state=structuredClone(s)},
  applyLocal:async(changes,media,downloads)=>{for(const s of STORES){const del=new Set(changes[s].del),put=new Map(changes[s].put.map(r=>[r.id,r]));d.stores[s]=[...d.stores[s].filter(r=>!del.has(r.id)&&!put.has(r.id)),...put.values()]}d.media=d.media.filter(m=>!media.deleteLocal.includes(m.id));for(const [id,bytes] of downloads){const meta=media.keep.find(m=>m.id===id);d.media.push({...meta,blob:new Blob([bytes],{type:meta.type})})}},
  mediaBlob:async id=>d.media.find(m=>m.id===id)?.blob};
 d.sync=drive=>runSync(d.io,{bearer:'t',fetcher:drive.fetcher,builtins,deviceId:name,now:()=>d.clock||'2026-10-28T12:00:00Z'});
 d.get=(store,id)=>d.stores[store].find(r=>r.id===id);
 return d;
}
const PNG=new Uint8Array([0x89,0x50,0x4e,0x47,0x0d,0x0a,0x1a,0x0a,1,2,3,4]);
test('record hashes ignore key order and change with content',()=>{
 assert.equal(hashRecord({a:1,b:[ 'x'],c:'z'}),hashRecord({c:'z',b:['x'],a:1}));assert.notEqual(hashRecord({a:1}),hashRecord({a:2}));
});
test('two devices exchange additions, edits, deletions and attachments',async()=>{
 const drive=fakeDrive(),a=device('A'),b=device('B');
 a.stores.interventions.push({id:'i1',name:'Bridge',region:'Hip',notes:'v1',updated:'2026-10-01'},{id:'i2',name:'Clam',region:'Hip',updated:'2026-10-01'});
 a.media.push({id:'m1',interventionId:'i1',name:'cue.png',type:'image/png',size:PNG.length,created:'',blob:new Blob([PNG],{type:'image/png'})});
 const first=await a.sync(drive);assert.equal(first.sent,2);assert.equal(first.mediaOut,1);assert.ok([...drive.files.values()].some(f=>f.name===MEDIA_PREFIX+'m1'));
 const second=await b.sync(drive);assert.equal(second.received,2);assert.equal(second.mediaIn,1);
 assert.deepEqual(new Uint8Array(await b.media[0].blob.arrayBuffer()),PNG);
 // B edits i1 and deletes i2; A adds i3 without syncing yet.
 b.get('interventions','i1').notes='v2 from B';b.stores.interventions=b.stores.interventions.filter(r=>r.id!=='i2');
 a.stores.interventions.push({id:'i3',name:'Step up',region:'Knee',updated:'2026-10-02'});
 await b.sync(drive);const back=await a.sync(drive);
 assert.equal(a.get('interventions','i1').notes,'v2 from B');assert.equal(a.get('interventions','i2'),undefined);assert.ok(a.get('interventions','i3'));assert.equal(back.conflicts,0);
 await b.sync(drive);assert.ok(b.get('interventions','i3'));
 // Attachment deletion propagates and removes the Drive file.
 a.media=[];await a.sync(drive);await b.sync(drive);assert.equal(b.media.length,0);assert.ok(![...drive.files.values()].some(f=>f.name.startsWith(MEDIA_PREFIX)));
 // Nothing to do: no writes.
 const before=drive.log.length;const idle=await a.sync(drive);assert.equal(idle.sent+idle.received,0);assert.ok(drive.log.slice(before).every(l=>l.startsWith('GET')));
});
test('conflicting edits keep the newer version and preserve the other in history',async()=>{
 const drive=fakeDrive(),a=device('A'),b=device('B');
 a.stores.interventions.push({id:'i1',name:'Bridge',region:'Hip',notes:'base',updated:'2026-10-01'});await a.sync(drive);await b.sync(drive);
 a.get('interventions','i1').notes='A edit';a.get('interventions','i1').updated='2026-10-05';
 b.get('interventions','i1').notes='B edit (newer)';b.get('interventions','i1').updated='2026-10-06';
 await a.sync(drive);const result=await b.sync(drive);
 assert.equal(result.conflicts,1);assert.equal(b.get('interventions','i1').notes,'B edit (newer)');
 const saved=b.stores.revisions.find(r=>r.summary==='Replaced by sync');assert.equal(JSON.parse(saved.snapshot).record.notes,'A edit');
 await a.sync(drive);assert.equal(a.get('interventions','i1').notes,'B edit (newer)');assert.ok(a.stores.revisions.some(r=>r.id===saved.id));
});
test('an edit wins over a deletion on the other device',async()=>{
 const drive=fakeDrive(),a=device('A'),b=device('B');
 a.stores.interventions.push({id:'i1',name:'Bridge',region:'Hip',notes:'base'});await a.sync(drive);await b.sync(drive);
 a.stores.interventions=[];b.get('interventions','i1').notes='kept';await a.sync(drive);await b.sync(drive);await a.sync(drive);
 assert.equal(a.get('interventions','i1').notes,'kept');
});
test('starter conditions and custom regions created on each device are not duplicated',async()=>{
 const drive=fakeDrive(),a=device('A'),b=device('B');
 a.stores.conditions.push({id:'ca',name:'Low Back Pain',region:'Hip',overview:''});a.stores.regions.push({id:'ra',name:'Pelvic Health'});
 b.stores.conditions.push({id:'cb',name:'Low Back Pain',region:'Hip',overview:''},{id:'cc',name:'Hip OA',region:'Hip',overview:'mine'});b.stores.regions.push({id:'rb',name:'pelvic health'});
 await a.sync(drive);await b.sync(drive);
 assert.deepEqual(b.stores.conditions.map(c=>c.id).sort(),['ca','cc']);assert.deepEqual(b.stores.regions.map(r=>r.id),['ra']);
 // Duplicates with content are both kept.
 const c=device('C');c.stores.conditions.push({id:'cd',name:'Low Back Pain',region:'Hip',overview:'my notes'});await c.sync(drive);
 // The empty starter copy is dropped in favour of the one with notes, everywhere.
 assert.deepEqual(c.stores.conditions.map(x=>x.id).sort(),['cc','cd']);await a.sync(drive);assert.deepEqual(a.stores.conditions.map(x=>x.id).sort(),['cc','cd']);
});
test('a concurrent write from another device triggers a fresh merge instead of overwriting',async()=>{
 const drive=fakeDrive(),a=device('A'),b=device('B');
 a.stores.interventions.push({id:'i1',name:'One',region:'Hip'});await a.sync(drive);await b.sync(drive);
 b.stores.interventions.push({id:'iB',name:'From B',region:'Hip'});
 // Simulate A writing between B's download and B's upload by bumping the version during B's version check.
 const original=drive.fetcher;let bumped=false;drive.fetcher=async(url,o={})=>{if(!bumped&&(o.method||'GET')==='GET'&&url.endsWith('?fields=id,version')){bumped=true;const lib=[...drive.files.values()].find(f=>f.name===LIBRARY_FILE);const data=JSON.parse(lib.data.toString());data.interventions.push({id:'iA',name:'From A',region:'Hip'});lib.data=Buffer.from(JSON.stringify(data));lib.version++}return original(url,o)};
 const result=await b.sync(drive);assert.equal(result.attempts,2);
 const ids=drive.library().interventions.map(r=>r.id).sort();assert.deepEqual(ids,['i1','iA','iB']);assert.ok(b.get('interventions','iA'));
});
test('errors are actionable and a malformed Drive copy is rejected before anything changes',async()=>{
 const drive=fakeDrive(),a=device('A');a.stores.interventions.push({id:'i1',name:'One',region:'Hip'});
 drive.failNext=401;await assert.rejects(()=>a.sync(drive),/expired/);drive.failNext=403;await assert.rejects(()=>a.sync(drive),/denied/);
 drive.files.set('x',{name:LIBRARY_FILE,data:Buffer.from('{"format":"pt-atlas-sync","version":1,"interventions":[{"id":"bad","name":"x","region":"Mars"}],"conditions":[]}'),version:1});
 await assert.rejects(()=>a.sync(drive),/Invalid record/);assert.equal(a.stores.interventions.length,1);
 assert.equal(await purgeRemote('t',drive.fetcher),1);assert.equal(drive.files.size,0);
});
test('merge reports nothing to send when both sides already match',()=>{
 const stores={...empty(),interventions:[{id:'i',name:'n',region:'Hip'}]};
 const first=mergeLibraries({local:stores,remote:null});assert.equal(first.remoteChanged,true);
 const second=mergeLibraries({local:stores,remote:stores,base:first.base,localMedia:[],remoteMedia:[]});assert.equal(second.remoteChanged,false);assert.equal(second.summary.received,0);
});
