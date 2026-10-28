import {test} from 'node:test';
import assert from 'node:assert/strict';
import {deflateRawSync} from 'node:zlib';
import {documentXML,crc32,docxText} from '../docx-import.mjs';
function archive(content,{method=8,name='word/document.xml',crc,expanded,flags=0}={}){
 const text=Buffer.from(content),filename=Buffer.from(name),payload=method===8?deflateRawSync(text):text;
 const local=Buffer.alloc(30);local.writeUInt32LE(0x04034b50);local.writeUInt16LE(flags,6);local.writeUInt16LE(method,8);local.writeUInt32LE(crc??crc32(text),14);local.writeUInt32LE(payload.length,18);local.writeUInt32LE(expanded??text.length,22);local.writeUInt16LE(filename.length,26);
 const central=Buffer.alloc(46);central.writeUInt32LE(0x02014b50);central.writeUInt16LE(flags,8);central.writeUInt16LE(method,10);central.writeUInt32LE(crc??crc32(text),16);central.writeUInt32LE(payload.length,20);central.writeUInt32LE(expanded??text.length,24);central.writeUInt16LE(filename.length,28);
 const end=Buffer.alloc(22);end.writeUInt32LE(0x06054b50);end.writeUInt16LE(1,8);end.writeUInt16LE(1,10);end.writeUInt32LE(central.length+filename.length,12);end.writeUInt32LE(local.length+filename.length+payload.length,16);
 return Buffer.concat([local,filename,payload,central,filename,end]);
}
function bytes(buffer){return buffer.buffer.slice(buffer.byteOffset,buffer.byteOffset+buffer.byteLength);}
test('extracts compressed and stored DOCX document XML',async()=>{
 for(const method of [0,8])assert.equal(await documentXML(bytes(archive('<document>Verbatim &amp; text</document>',{method}))),'<document>Verbatim &amp; text</document>');
});
test('rejects truncated, non-DOCX, encrypted and corrupt archives',async()=>{
 for(const data of [Buffer.from('not a zip'),archive('xml',{name:'other.xml'}),archive('xml',{flags:1}),archive('xml',{crc:0}),archive('xml').subarray(0,40)])await assert.rejects(()=>documentXML(bytes(data)));
});
test('bounds expansion rather than trusting ZIP metadata',async()=>{
 await assert.rejects(()=>documentXML(bytes(archive('x'.repeat(10000),{expanded:1}))),/expansion limit/);
 await assert.rejects(()=>documentXML(bytes(archive('x',{expanded:8_000_001}))),/too large/);
 await assert.rejects(()=>documentXML(new ArrayBuffer(5_000_001)),/5 MB/);
});
test('rejects unsafe XML declarations before parsing',()=>{
 assert.throws(()=>docxText('<!DOCTYPE x [<!ENTITY x SYSTEM "file:///private">]><x/>'),/external entities/);
});
