// Google Drive sync through the hidden per-app folder (drive.appdata). No server: each device merges its library with
// the copy in Drive using a three-way comparison against the version it last synced (the "base"), so it can tell who
// changed what. Edits on one side win over an untouched other side; deletions propagate; when both sides edited the
// same record, the newer one wins and the other is kept in revision history.
import {validateBackup, STORES} from './backup.mjs';
import {ALLOWED_TYPES, MEDIA_LIMIT, sniffType} from './media.mjs';
export const LIBRARY_FILE='pt-atlas-library.json',MEDIA_PREFIX='pt-atlas-media-';
const API='https://www.googleapis.com/drive/v3/files',UPLOAD='https://www.googleapis.com/upload/drive/v3/files';
const LIBRARY_LIMIT=150*1024*1024,CONTENT_KEYS=['overview','precautions','protocol','source','notes'];

// ——— Hashing ———
function stable(value){if(Array.isArray(value))return '['+value.map(stable).join(',')+']';if(value&&typeof value==='object')return '{'+Object.keys(value).sort().map(k=>JSON.stringify(k)+':'+stable(value[k])).join(',')+'}';return JSON.stringify(value)}
export function hashRecord(record){const text=stable(record);let h1=0xdeadbeef,h2=0x41c6ce57;for(let i=0;i<text.length;i++){const c=text.charCodeAt(i);h1=Math.imul(h1^c,2654435761);h2=Math.imul(h2^c,1597334677)}h1=Math.imul(h1^(h1>>>16),2246822507)^Math.imul(h2^(h2>>>13),3266489909);h2=Math.imul(h2^(h2>>>16),2246822507)^Math.imul(h1^(h1>>>13),3266489909);return (4294967296*(2097151&h2)+(h1>>>0)).toString(36)}

// ——— Merge ———
// local/remote: {store:[records]} (remote null on first sync); base: {store:{id:hash}}; media: arrays of metadata.
export function mergeLibraries({local,remote,base={},localMedia=[],remoteMedia=null,mediaBase=[],now=new Date().toISOString()}){
 const merged={},localChanges={},conflicts=[];let received=0,sent=0;
 for(const store of STORES){
  const L=new Map((local[store]||[]).map(r=>[r.id,r])),R=new Map((remote?.[store]||[]).map(r=>[r.id,r])),B=base[store]||{};
  const out=new Map();
  for(const id of new Set([...L.keys(),...R.keys(),...Object.keys(B)])){
   const l=L.get(id),r=R.get(id),lh=l&&hashRecord(l),rh=r&&hashRecord(r),bh=B[id];
   let pick;
   if(lh===rh)pick=l;
   else if(lh===bh)pick=r;                       // only the remote side changed (or deleted it)
   else if(rh===bh)pick=l;                       // only this device changed (or deleted it)
   else if(!l)pick=r;else if(!r)pick=l;          // edited on one side, deleted on the other: keep the edit
   else{const remoteWins=(r.updated||'')>=(l.updated||'');pick=remoteWins?r:l;conflicts.push({store,id,kept:pick,replaced:remoteWins?l:r})}
   if(pick)out.set(id,pick);
  }
  merged[store]=out;
 }
 // Keep the losing side of a conflict in revision history so nothing is lost.
 for(const c of conflicts)if(c.store==='interventions'||c.store==='conditions'){const id='sync-'+c.id+'-'+hashRecord(c.replaced);merged.revisions.set(id,{id,entityType:c.store==='conditions'?'condition':'intervention',entityId:c.id,entityName:c.replaced.name,at:now,summary:'Replaced by sync',snapshot:JSON.stringify({record:c.replaced})})}
 dedupe(merged,remote);
 const result=Object.fromEntries(STORES.map(store=>[store,[...merged[store].values()]]));
 for(const store of STORES){
  const L=new Map((local[store]||[]).map(r=>[r.id,hashRecord(r)])),R=new Map((remote?.[store]||[]).map(r=>[r.id,hashRecord(r)]));
  const put=result[store].filter(r=>L.get(r.id)!==hashRecord(r)),del=[...L.keys()].filter(id=>!merged[store].has(id));
  localChanges[store]={put,del};received+=put.length+del.length;
  sent+=result[store].filter(r=>R.get(r.id)!==hashRecord(r)).length+[...R.keys()].filter(id=>!merged[store].has(id)).length;
 }
 // Attachments are immutable: add or delete only.
 const LM=new Map(localMedia.map(m=>[m.id,m])),RM=new Map((remoteMedia||[]).map(m=>[m.id,m])),MB=new Set(mediaBase);
 const media={keep:[],upload:[],download:[],deleteLocal:[],deleteRemote:[]};
 for(const id of new Set([...LM.keys(),...RM.keys()])){
  const l=LM.get(id),r=RM.get(id);
  if(l&&r)media.keep.push(l);
  else if(l){if(MB.has(id))media.deleteLocal.push(id);else{media.keep.push(l);media.upload.push(id)}}
  else{if(MB.has(id))media.deleteRemote.push(id);else{media.keep.push(r);media.download.push(id)}}
 }
 const newBase=Object.fromEntries(STORES.map(store=>[store,Object.fromEntries(result[store].map(r=>[r.id,hashRecord(r)]))]));
 const mediaChanged=!remoteMedia||media.upload.length||media.deleteRemote.length;
 return {result,localChanges,conflicts,media,base:newBase,mediaBase:media.keep.map(m=>m.id),remoteChanged:!remote||sent>0||!!mediaChanged,summary:{received,sent,conflicts:conflicts.length,mediaIn:media.download.length,mediaOut:media.upload.length}};
}
// Each device seeds starter conditions with its own IDs, and custom regions are identified by name. Collapse duplicates
// that carry no content, preferring the copy already in Drive; anything with content is kept.
function dedupe(merged,remote){
 const inRemote=(store,id)=>(remote?.[store]||[]).some(r=>r.id===id);
 const groups=new Map();for(const c of merged.conditions.values()){const key=c.region+'\u0000'+String(c.name).trim().toLowerCase();groups.set(key,[...(groups.get(key)||[]),c])}
 const used=id=>[...merged.phases.values()].some(p=>p.conditionId===id)||[...merged.links.values()].some(l=>l.conditionId===id);
 for(const group of groups.values()){if(group.length<2)continue;const keep=group.filter(c=>used(c.id)||CONTENT_KEYS.some(k=>c[k]));if(!keep.length)keep.push(group.find(c=>inRemote('conditions',c.id))||group.sort((a,b)=>a.id.localeCompare(b.id))[0]);for(const c of group)if(!keep.includes(c))merged.conditions.delete(c.id)}
 const regions=new Map();for(const r of merged.regions.values()){const key=String(r.name).trim().toLowerCase();regions.set(key,[...(regions.get(key)||[]),r])}
 for(const group of regions.values()){if(group.length<2)continue;const keep=group.find(r=>inRemote('regions',r.id))||group.sort((a,b)=>a.id.localeCompare(b.id))[0];for(const r of group)if(r!==keep)merged.regions.delete(r.id)}
}

// ——— Snapshot format ———
export function buildSnapshot(result,media,deviceId,now){return JSON.stringify({format:'pt-atlas-sync',version:1,writtenAt:now,deviceId,...result,media:media.map(({id,interventionId,name,type,size,created})=>({id,interventionId,name,type,size,created:created||''}))})}
export function parseSnapshot(text,builtins,existing=[]){
 let obj;try{obj=JSON.parse(text)}catch{throw Error('The synced library in Google Drive is not valid JSON.')}
 if(!obj||obj.format!=='pt-atlas-sync'||obj.version!==1)throw Error('The synced library in Google Drive has an unknown format. Update PT Atlas on this device.');
 const stores=validateBackup({...obj,format:'pt-atlas',version:3,media:[]},builtins,existing);
 const media=Array.isArray(obj.media)?obj.media:[];
 if(media.length>500)throw Error('Too many synced attachments.');
 for(const m of media)if(!m||!/^[\w-]+$/.test(m.id||'')||typeof m.interventionId!=='string'||typeof m.name!=='string'||!ALLOWED_TYPES.includes(m.type)||!Number.isFinite(m.size))throw Error('Invalid attachment in the synced library.');
 delete stores.media;return {stores,media};
}

// ——— Drive REST (appDataFolder) ———
async function call(url,bearer,fetcher,{method='GET',body,headers={},limit=0,expect='json'}={}){
 const response=await fetcher(url,{method,body,headers:{Authorization:'Bearer '+bearer,...headers},cache:'no-store',signal:AbortSignal.timeout(120000)});
 if(!response.ok){if(response.status===404&&method==='DELETE')return null;if(response.status===401)throw Error('Google access expired. Reconnect to continue syncing.');if(response.status===403)throw Error('Google denied access to the PT Atlas sync folder. Reconnect and allow access.');if(response.status===429||response.status>=500)throw Error('Google Drive is busy (HTTP '+response.status+'). Sync will retry later.');throw Error('Google Drive request failed (HTTP '+response.status+').')}
 if(expect==='none')return null;
 const reader=response.body.getReader(),chunks=[];let size=0;
 try{while(true){const {done,value}=await reader.read();if(done)break;size+=value.length;if(limit&&size>limit)throw Error('Synced file is larger than expected.');chunks.push(value)}}catch(error){await reader.cancel().catch(()=>{});throw error}
 const bytes=new Uint8Array(size);let offset=0;for(const c of chunks){bytes.set(c,offset);offset+=c.length}
 return expect==='bytes'?bytes:expect==='text'?new TextDecoder().decode(bytes):JSON.parse(new TextDecoder().decode(bytes));
}
export async function listFiles(bearer,fetcher=fetch){const files=[];let token='';do{const data=await call(`${API}?spaces=appDataFolder&pageSize=1000&fields=${encodeURIComponent('nextPageToken,files(id,name,version,size)')}${token?'&pageToken='+encodeURIComponent(token):''}`,bearer,fetcher,{limit:20e6});files.push(...(data.files||[]));token=data.nextPageToken||''}while(token);return files}
const multipart=(name,content,type)=>{const boundary='ptatlas'+Math.random().toString(36).slice(2);return {headers:{'Content-Type':'multipart/related; boundary='+boundary},body:new Blob([`--${boundary}\r\nContent-Type: application/json; charset=UTF-8\r\n\r\n${JSON.stringify({name,parents:['appDataFolder']})}\r\n--${boundary}\r\nContent-Type: ${type}\r\n\r\n`,content,`\r\n--${boundary}--`])}};
export const createFile=(name,content,type,bearer,fetcher=fetch)=>call(`${UPLOAD}?uploadType=multipart&fields=id,version`,bearer,fetcher,{method:'POST',...multipart(name,content,type)});
export const updateFile=(id,content,type,bearer,fetcher=fetch)=>call(`${UPLOAD}/${encodeURIComponent(id)}?uploadType=media&fields=id,version`,bearer,fetcher,{method:'PATCH',body:content,headers:{'Content-Type':type}});
export const fileVersion=async(id,bearer,fetcher=fetch)=>(await call(`${API}/${encodeURIComponent(id)}?fields=id,version`,bearer,fetcher)).version;
export const downloadFile=(id,bearer,fetcher=fetch,limit,expect='text')=>call(`${API}/${encodeURIComponent(id)}?alt=media`,bearer,fetcher,{limit,expect});
export const deleteFile=(id,bearer,fetcher=fetch)=>call(`${API}/${encodeURIComponent(id)}`,bearer,fetcher,{method:'DELETE',expect:'none'});

// ——— One sync pass ———
// io: readLocal() -> {stores, media}; loadState()/saveState(state); applyLocal(changes, mediaPlan, downloads); mediaBlob(id).
export async function runSync(io,{bearer,fetcher=fetch,builtins,deviceId,now=()=>new Date().toISOString(),attempts=3}){
 for(let attempt=1;attempt<=attempts;attempt++){
  const files=await listFiles(bearer,fetcher),library=files.find(f=>f.name===LIBRARY_FILE);
  const local=await io.readLocal(),state=await io.loadState();
  let remote=null;if(library)remote=parseSnapshot(await downloadFile(library.id,bearer,fetcher,LIBRARY_LIMIT),builtins,(local.stores.regions||[]).map(r=>r.name));
  const plan=mergeLibraries({local:local.stores,remote:remote?.stores||null,base:state.base||{},localMedia:local.media,remoteMedia:remote?remote.media:null,mediaBase:state.mediaBase||[],now:now()});
  const byName=new Map(files.map(f=>[f.name,f])),downloads=new Map();
  for(const id of plan.media.download){const file=byName.get(MEDIA_PREFIX+id);if(!file){plan.media.keep=plan.media.keep.filter(m=>m.id!==id);continue}const bytes=await downloadFile(file.id,bearer,fetcher,MEDIA_LIMIT+1024,'bytes');const meta=remote.media.find(m=>m.id===id);if(sniffType(bytes)!==meta.type){plan.media.keep=plan.media.keep.filter(m=>m.id!==id);continue}downloads.set(id,bytes)}
  await io.applyLocal(plan.localChanges,plan.media,downloads);
  for(const id of plan.media.upload)if(!byName.has(MEDIA_PREFIX+id)){const blob=await io.mediaBlob(id);if(blob)await createFile(MEDIA_PREFIX+id,blob,blob.type||'application/octet-stream',bearer,fetcher)}
  for(const id of plan.media.deleteRemote){const file=byName.get(MEDIA_PREFIX+id);if(file)await deleteFile(file.id,bearer,fetcher)}
  if(plan.remoteChanged){
   const snapshot=buildSnapshot(plan.result,plan.media.keep,deviceId,now());
   if(library){if(await fileVersion(library.id,bearer,fetcher)!==library.version)continue;await updateFile(library.id,snapshot,'application/json',bearer,fetcher)}  // another device wrote meanwhile: merge again
   else await createFile(LIBRARY_FILE,snapshot,'application/json',bearer,fetcher);
  }
  await io.saveState({...state,base:plan.base,mediaBase:plan.media.keep.map(m=>m.id),lastSync:now()});
  return {...plan.summary,attempts:attempt};
 }
 throw Error('Another device kept changing the synced library. Try again in a moment.');
}
// Removes every PT Atlas file from the hidden app folder (used by "Remove synced copy").
export async function purgeRemote(bearer,fetcher=fetch){const files=await listFiles(bearer,fetcher);for(const f of files)if(f.name===LIBRARY_FILE||f.name.startsWith(MEDIA_PREFIX))await deleteFile(f.id,bearer,fetcher);return files.length}
