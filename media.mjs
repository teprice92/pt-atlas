// Attachment safety: only raster images and PDFs, identified by their leading bytes rather than the
// browser-reported type. SVG and HTML are refused because they can carry script when opened.
export const MEDIA_LIMIT=10*1024*1024;
const SIGNATURES=[
 ['image/png',[0x89,0x50,0x4e,0x47,0x0d,0x0a,0x1a,0x0a]],
 ['image/jpeg',[0xff,0xd8,0xff]],
 ['image/gif',[0x47,0x49,0x46,0x38]],
 ['application/pdf',[0x25,0x50,0x44,0x46,0x2d]]
];
export function sniffType(bytes){
 const b=bytes instanceof Uint8Array?bytes:new Uint8Array(bytes);
 for(const [type,sig] of SIGNATURES)if(sig.every((v,i)=>b[i]===v))return type;
 if(b.length>=12&&String.fromCharCode(...b.slice(0,4))==='RIFF'&&String.fromCharCode(...b.slice(8,12))==='WEBP')return 'image/webp';
 return '';
}
export const ALLOWED_TYPES=['image/png','image/jpeg','image/gif','image/webp','application/pdf'];
export function bytesToBase64(bytes){let out='';const b=bytes instanceof Uint8Array?bytes:new Uint8Array(bytes);for(let i=0;i<b.length;i+=0x8000)out+=String.fromCharCode(...b.subarray(i,i+0x8000));return btoa(out)}
export function base64ToBytes(text){const raw=atob(text);const b=new Uint8Array(raw.length);for(let i=0;i<raw.length;i++)b[i]=raw.charCodeAt(i);return b}
// Validates a backup media entry and returns {record, bytes} with the type taken from the bytes themselves.
export function readMediaEntry(entry){
 if(!entry||typeof entry!=='object'||Array.isArray(entry))throw Error('Invalid attachment in backup');
 for(const key of ['id','interventionId','name','data'])if(typeof entry[key]!=='string'||!entry[key])throw Error('Invalid attachment in backup');
 let bytes;try{bytes=base64ToBytes(entry.data)}catch{throw Error('Invalid attachment data in backup')}
 if(bytes.length>MEDIA_LIMIT)throw Error('Attachment too large in backup');
 const type=sniffType(bytes);if(!type)throw Error('Unsupported attachment type in backup');
 return {record:{id:entry.id,interventionId:entry.interventionId,name:entry.name.slice(0,200),type,size:bytes.length,created:typeof entry.created==='string'?entry.created:''},bytes};
}
