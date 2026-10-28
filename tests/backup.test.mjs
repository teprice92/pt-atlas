import {test} from 'node:test';
import assert from 'node:assert/strict';
import {validateBackup, backupPayload, searchScore, reviewDue, STORES} from '../backup.mjs';
const regions=['Hip','Knee'];
const base={format:'pt-atlas',version:2,interventions:[{id:'i1',name:'Bridge',region:'Hip',favorite:false}],conditions:[{id:'c1',name:'THA',region:'Hip'}],links:[{id:'l1',interventionId:'i1',conditionId:'c1',dosage:'As written'}],phases:[{id:'p1',conditionId:'c1',name:'Phase 1',order:0,interventionIds:['i1']}],collections:[{id:'k1',name:'Set',interventionIds:['i1']}],revisions:[{id:'r1',entityType:'intervention',entityId:'i1',at:'2026-10-28T00:00:00Z',snapshot:'{}',summary:'Edited'}]};
const clone=value=>JSON.parse(JSON.stringify(value));
test('accepts a version 2 backup with every store and keeps arrays and numbers',()=>{
 const result=validateBackup(clone(base),regions);
 for(const store of STORES)assert.equal(result[store].length,1,store);
 assert.deepEqual(result.phases[0].interventionIds,['i1']);assert.equal(result.phases[0].order,0);
});
test('imports version 1 backups with empty new stores',()=>{
 const result=validateBackup({format:'pt-atlas',version:1,interventions:base.interventions,conditions:base.conditions},regions);
 assert.equal(result.links.length,0);assert.equal(result.phases.length,0);assert.equal(result.collections.length,0);assert.equal(result.revisions.length,0);
});
test('rejects malformed records, unknown regions, duplicates, prototype keys and nested objects',()=>{
 const cases=[
  b=>{b.version=3},b=>{b.interventions[0].region='Mars'},b=>{b.links[0].conditionId=''},b=>{b.phases[0].name=undefined},
  b=>{b.collections.push(clone(b.collections[0]))},b=>{b.links[0].extra={nested:true}},b=>{b.phases[0].interventionIds=[1]},
  b=>{b.revisions[0].snapshot=5},b=>{b.links='nope'},b=>{b.phases[0].order=Infinity}
 ];
 for(const mutate of cases){const b=clone(base);mutate(b);assert.throws(()=>validateBackup(b,regions))}
 const polluted=JSON.parse('{"format":"pt-atlas","version":2,"interventions":[{"id":"x","name":"y","region":"Hip","__proto__":"z"}],"conditions":[]}');
 assert.throws(()=>validateBackup(polluted,regions),/Invalid field/);
});
test('backup payload is version 2 and includes every store',()=>{
 const payload=backupPayload({interventions:[1]},'2026-10-28T00:00:00Z');
 assert.equal(payload.version,2);assert.equal(payload.format,'pt-atlas');for(const store of STORES)assert.ok(Array.isArray(payload[store]),store);
});
test('search ranks title matches above field and body matches',()=>{
 const title=searchScore({name:'Hip bridge'},'bridge'),tag=searchScore({name:'Clam',tags:'bridge'},'bridge'),body=searchScore({name:'Clam',notes:'after bridge'},'bridge');
 assert.ok(title>tag&&tag>body&&body>0);assert.equal(searchScore({name:'Clam'},'bridge'),0);
 assert.ok(searchScore({name:'Bridge'},'bri')>searchScore({name:'Glute bridge'},'bri'));
});
test('review is due twelve months after the last review of a reviewed entry',()=>{
 const now=new Date('2026-10-28T12:00:00Z');
 assert.equal(reviewDue({reviewStatus:'reviewed',reviewedAt:'2025-10-27'},now),true);
 assert.equal(reviewDue({reviewStatus:'reviewed',reviewedAt:'2026-01-01'},now),false);
 assert.equal(reviewDue({reviewStatus:'unreviewed',reviewedAt:'2020-01-01'},now),false);
 assert.equal(reviewDue({reviewStatus:'reviewed',reviewedAt:'not a date'},now),false);
});
