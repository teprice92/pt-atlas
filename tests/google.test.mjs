import {test} from 'node:test';
import assert from 'node:assert/strict';
import {DRIVE_SCOPE,validateGoogleConfig,googleDocumentText,readGoogleDocuments,checkGoogleUpdates,MAX_DOCS} from '../google-import.mjs';
import {lineDiff,syncPlan,importRecord} from '../import-tools.mjs';
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
 await assert.rejects(()=>readGoogleDocuments(Array(MAX_DOCS+1).fill({id:'a'}),'token'),/at most 25/);
 await assert.rejects(()=>readGoogleDocuments([{id:'abc'}],'token',{fetcher:async()=>new Response(JSON.stringify({mimeType:'application/pdf'}))}),/native Google Docs/);
});
test('update check compares Drive modified times and reports unreadable files without failing',async()=>{
 const calls=[];const fetcher=async url=>{calls.push(url);if(url.includes('gone'))return new Response('',{status:404});const id=url.match(/files\/([^?]+)/)[1];return new Response(JSON.stringify({id,name:id,mimeType:'application/vnd.google-apps.document',modifiedTime:id==='newer'?'2026-10-28T12:00:00Z':'2026-10-01T00:00:00Z'}))};
 const linked=[{sourceDocumentId:'newer',sourceModifiedAt:'2026-10-01T00:00:00Z'},{sourceDocumentId:'newer',sourceModifiedAt:'2026-10-01T00:00:00Z'},{sourceDocumentId:'same',sourceModifiedAt:'2026-10-01T00:00:00Z'},{sourceDocumentId:'gone',sourceModifiedAt:'x'},{sourceDocumentId:'bad/id'}];
 const results=await checkGoogleUpdates(linked,'token',{fetcher});
 assert.equal(calls.length,3);assert.deepEqual(results.map(r=>[r.id,r.status]),[['newer','changed'],['same','current'],['gone','unavailable']]);
 await assert.rejects(()=>checkGoogleUpdates([{sourceDocumentId:'a'}],'token',{fetcher:async()=>new Response('',{status:401})}),/expired/);
});
test('line diff marks additions and removals in order',()=>{
 assert.deepEqual(lineDiff('a\nb\nc','a\nc\nd').map(l=>l.type+l.text),['samea','delb','samec','addd']);
 assert.equal(lineDiff('x'.repeat(3)+'\n'.repeat(1200),'y\n'.repeat(1200)).length>0,true);
});
test('sync plan matches sections to imported entries without applying anything',()=>{
 const meta={id:'',documentTitle:'Doc',source:'',importedAt:'2026-10-01T00:00:00Z',sourceDocumentId:'d',sourceType:'google-doc'};
 const a=importRecord({name:'Alpha',region:'Hip',notes:'# Alpha\nold'},{...meta,id:'a'}),b=importRecord({name:'Beta',region:'Hip',notes:'# Beta\nsame'},{...meta,id:'b'}),gone=importRecord({name:'Gamma',region:'Hip',notes:'# Gamma\nx'},{...meta,id:'g'});
 a.notes+='\nmy own edit';
 const plan=syncPlan([a,b,gone],'# Alpha\nnew\n# Beta\nsame\n# Delta\nfresh','Doc');
 assert.deepEqual(plan.map(i=>i.kind+':'+(i.entry?.id||i.section.name)),['changed:a','unchanged:b','new:Delta','missing:g']);
 assert.equal(plan[0].edited,true);assert.deepEqual(plan[0].diff.filter(l=>l.type!=='same').map(l=>l.type+l.text),['delold','addnew']);
 const single=importRecord({name:'Renamed by me',region:'Hip',notes:'whole doc'},{...meta,id:'s'});
 assert.deepEqual(syncPlan([single],'whole doc\nmore','Doc').map(i=>i.kind+':'+i.entry.id),['changed:s']);
});
