import {test} from 'node:test';
import assert from 'node:assert/strict';
import {documentDrafts,duplicateEntries,sourceURL,importRecord} from '../import-tools.mjs';
test('text and title preserved without inventing fields',()=>{
 const [draft]=documentDrafts('  Original title\r\nClinical source text  ','Chosen title');
 assert.equal(draft.name,'Chosen title');assert.equal(draft.notes,'Original title\nClinical source text');assert.equal(draft.dosage,undefined);
});
test('Markdown sections preserve introductory text and nested headings',()=>{
 const drafts=documentDrafts('Introduction\n\n# First\n- line\n### Detail\nbody\n## Second\nnext','',true);
 assert.equal(drafts.length,3);assert.equal(drafts[1].name,'First');assert.match(drafts[1].notes,/### Detail/);assert.equal(drafts[2].name,'Second');
});
test('duplicates normalize case, Unicode, and spacing but respect region',()=>{
 const existing=[{name:'  HIP   Notes ',region:'Hip'},{name:'Hip Notes',region:'Knee'}];
 assert.deepEqual(duplicateEntries({name:'hip notes',region:'Hip'},existing),[existing[0]]);
});
test('blank and excessive document imports rejected',()=>{
 assert.throws(()=>documentDrafts(' \n'));assert.throws(()=>documentDrafts('x'.repeat(5_000_001)));assert.throws(()=>documentDrafts(Array.from({length:101},(_,i)=>'# '+i).join('\n'),'',true));
});
test('unsafe source schemes rejected',()=>{
 assert.equal(sourceURL(''),'');assert.equal(sourceURL('https://example.org/doc'),'https://example.org/doc');
 for(const url of ['javascript:alert(1)','file:///tmp/a','not a url'])assert.throws(()=>sourceURL(url));
});
test('source provenance is included in a backup-compatible record',()=>{
 const result=importRecord({name:' Entry ',region:'Hip',notes:'verbatim'},{id:'stable',documentTitle:'Doc',source:'https://example.org/',importedAt:'2026-10-28T10:00:00Z',fileName:'notes.md',fileModifiedAt:'2026-10-27T10:00:00Z'});
 assert.equal(result.name,'Entry');assert.equal(result.reviewStatus,'unreviewed');assert.equal(result.sourceFile,'notes.md');assert.equal(result.sourceModifiedAt,'2026-10-27T10:00:00Z');assert.equal(result.notes,'verbatim');assert.equal(result.updated,'2026-10-28');assert.ok(Object.values(result).every(v=>['string','boolean'].includes(typeof v)));
 assert.throws(()=>importRecord({name:'',region:'Hip'},{}));
});
