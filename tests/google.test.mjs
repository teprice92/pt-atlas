import {test} from 'node:test';
import assert from 'node:assert/strict';
import {DRIVE_SCOPE,validateGoogleConfig,googleDocumentText,readGoogleDocuments} from '../google-import.mjs';
const paragraph=(text,style,bullet)=>({paragraph:{elements:[{textRun:{content:text+'\n'}}],paragraphStyle:{namedStyleType:style},bullet}});
const example={tabs:[{documentTab:{body:{content:[paragraph('Title','HEADING_1'),paragraph('Item',undefined,{}),{table:{tableRows:[{tableCells:[{content:[paragraph('Cell A')]},{content:[paragraph('Cell B')]}]}]}}]}},childTabs:[{documentTab:{body:{content:[paragraph('Child text')]}}}]}]};
test('requires public browser configuration and uses selected-file scope',()=>{
 assert.deepEqual(validateGoogleConfig({clientId:'web.apps.googleusercontent.com',apiKey:'public-key',projectNumber:'123'}),{clientId:'web.apps.googleusercontent.com',apiKey:'public-key',projectNumber:'123'});
 assert.throws(()=>validateGoogleConfig({}));assert.throws(()=>validateGoogleConfig({clientId:'web.apps.googleusercontent.com',apiKey:'key',projectNumber:'name'}));assert.equal(DRIVE_SCOPE,'https://www.googleapis.com/auth/drive.file');
});
test('preserves Google Doc headings, lists, tables and child tabs',()=>{
 const text=googleDocumentText(example);assert.match(text,/# Title/);assert.match(text,/- Item/);assert.match(text,/Cell A\tCell B/);assert.match(text,/Child text/);
 assert.throws(()=>googleDocumentText({body:{content:[]}}),/No text/);
});
test('selected Google Doc uses authorized calls and stable source provenance',async()=>{
 const calls=[];const fetcher=async(url,options)=>{calls.push({url,options});return new Response(JSON.stringify(url.includes('/drive/')?{name:'Original title',mimeType:'application/vnd.google-apps.document',modifiedTime:'2026-10-27T10:00:00Z'}:example),{status:200});};
 const [doc]=await readGoogleDocuments([{id:'abc-123'}],'memory-token',{fetcher,split:true,now:'2026-10-28T10:00:00Z'});
 assert.equal(calls.length,2);assert.ok(calls.every(c=>c.options.headers.Authorization==='Bearer memory-token'&&c.options.cache==='no-store'));assert.equal(doc.metadata.sourceDocumentId,'abc-123');assert.equal(doc.metadata.fileModifiedAt,'2026-10-27T10:00:00Z');assert.equal(doc.metadata.source,'https://docs.google.com/document/d/abc-123/edit');assert.equal(doc.split,true);assert.match(doc.text,/# Title/);
});
test('permission, expiry and rate errors are actionable; batches fail before review',async()=>{
 for(const [status,message] of [[401,/expired/],[403,/denied/],[429,/rate limit/],[500,/HTTP 500/]])await assert.rejects(()=>readGoogleDocuments([{id:'abc'}],'token',{fetcher:async()=>new Response('',{status})}),message);
 await assert.rejects(()=>readGoogleDocuments([{id:'invalid/id'}],'token'),/Invalid/);
 await assert.rejects(()=>readGoogleDocuments(Array(11).fill({id:'a'}),'token'),/at most 10/);
 await assert.rejects(()=>readGoogleDocuments([{id:'abc'}],'token',{fetcher:async()=>new Response(JSON.stringify({mimeType:'application/pdf'}))}),/native Google Docs/);
});
