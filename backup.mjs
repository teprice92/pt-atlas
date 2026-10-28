import {readMediaEntry} from './media.mjs';
// Backup format and validation. Version 2 adds links, protocol phases, collections and revisions; version 3 adds custom
// body regions and attachments (base64). Versions 1 and 2 still import.
export const BACKUP_VERSION=3;
export const STORES=['regions','interventions','conditions','links','phases','collections','revisions'];
const REQUIRED={regions:['id','name'],interventions:['id','name','region'],conditions:['id','name','region'],links:['id','interventionId','conditionId'],phases:['id','conditionId','name'],collections:['id','name'],revisions:['id','entityType','entityId','at','snapshot']};
const LIMIT=20000,MEDIA_COUNT=500;
function cleanValue(value){
 if(typeof value==='string'||typeof value==='boolean')return value;
 if(typeof value==='number'&&Number.isFinite(value))return value;
 if(Array.isArray(value)&&value.length<=1000&&value.every(v=>typeof v==='string'))return [...value];
 throw Error('Invalid field type');
}
// builtins: fixed region names; existing: custom region names already on this device.
export function validateBackup(obj,builtins,existing=[]){
 if(!obj||typeof obj!=='object'||obj.format!=='pt-atlas'||![1,2,3].includes(obj.version)||!Array.isArray(obj.interventions)||!Array.isArray(obj.conditions))throw Error('Expected a PT Atlas version 1, 2 or 3 backup');
 const result={};
 for(const store of STORES){
  const list=obj[store]===undefined&&!['interventions','conditions'].includes(store)?[]:obj[store];
  if(!Array.isArray(list))throw Error('Invalid '+store+' list in backup');
  result[store]=list;
 }
 if(STORES.reduce((n,store)=>n+result[store].length,0)>LIMIT)throw Error('Too many records');
 const custom=new Set(result.regions.map(r=>r&&typeof r.name==='string'?r.name.trim():'')),allowed=new Set([...builtins,...existing,...custom]);
 for(const store of STORES){
  const ids=new Set();
  result[store]=result[store].map(entry=>{
   if(!entry||typeof entry!=='object'||Array.isArray(entry))throw Error('Invalid record in backup');
   for(const key of REQUIRED[store])if(typeof entry[key]!=='string'||!entry[key].trim())throw Error('Invalid record in backup');
   if(['interventions','conditions'].includes(store)&&!allowed.has(entry.region))throw Error('Invalid record in backup');
   if(store==='regions'&&(entry.name.trim().length>60||builtins.includes(entry.name.trim())))throw Error('Invalid body region in backup');
   if(ids.has(entry.id))throw Error('Duplicate record ID in backup');ids.add(entry.id);
   const clean={};
   for(const [key,value] of Object.entries(entry)){if(['__proto__','constructor','prototype'].includes(key))throw Error('Invalid field');clean[key]=cleanValue(value)}
   return clean;
  });
 }
 const media=obj.media===undefined?[]:obj.media;
 if(!Array.isArray(media)||media.length>MEDIA_COUNT)throw Error('Invalid attachments in backup');
 const mediaIds=new Set();
 result.media=media.map(entry=>{const parsed=readMediaEntry(entry);if(mediaIds.has(parsed.record.id))throw Error('Duplicate attachment ID in backup');mediaIds.add(parsed.record.id);return parsed});
 return result;
}
export function backupPayload(data,exportedAt=new Date().toISOString()){return {format:'pt-atlas',version:BACKUP_VERSION,exportedAt,...Object.fromEntries(STORES.map(store=>[store,data[store]||[]])),media:data.media||[]}}

// Search ranking: title hits outrank organizational fields, which outrank body text.
export function searchScore(record,query,fields=['name']){
 const q=String(query).trim().toLowerCase();if(!q)return 0;
 const has=value=>typeof value==='string'&&value.toLowerCase().includes(q);
 let score=0;
 if(has(record.name))score+=record.name.toLowerCase().startsWith(q)?12:8;
 for(const key of ['condition','region','category','tags'])if(has(record[key]))score+=3;
 for(const [key,value] of Object.entries(record))if(!fields.includes(key)&&!['condition','region','category','tags','id'].includes(key)&&has(value)){score+=1;break}
 return score;
}

// Review is due when a reviewed entry has not been re-reviewed within the interval (default 12 months).
export function reviewDue(record,now=new Date(),months=12){
 if(record.reviewStatus!=='reviewed'||!record.reviewedAt)return false;
 const reviewed=new Date(record.reviewedAt+'T00:00:00Z');if(Number.isNaN(reviewed.getTime()))return false;
 const due=new Date(reviewed);due.setUTCMonth(due.getUTCMonth()+months);
 return now>=due;
}
