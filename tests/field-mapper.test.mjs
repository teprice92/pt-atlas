import {test} from 'node:test';
import assert from 'node:assert/strict';
import {mapFields, labelKey} from '../field-mapper.mjs';
const categories=['Therapeutic Exercise','Gait Training'];
test('maps label lines, bold labels, bullets and multi-line sections',()=>{
 const {fields,notes}=mapFields('Intro sentence kept in notes.\nPurpose: Improve hip extension strength\n**Dosage:** 3 x 10\n  hold 2 seconds\n- Equipment: Mat, band\nPrecautions:\nAvoid pain > 3/10\nStop if dizzy\n\nAfter the blank line this is a note.\nSource: Example guideline 2024\nThis line follows a one-line label, so it is a note.',{categories});
 assert.equal(fields.purpose,'Improve hip extension strength');assert.equal(fields.dosage,'3 x 10\n  hold 2 seconds');assert.equal(fields.equipment,'Mat, band');
 assert.equal(fields.precautions,'Avoid pain > 3/10\nStop if dizzy');assert.equal(fields.source,'Example guideline 2024');assert.equal(notes,'Intro sentence kept in notes.\n\nAfter the blank line this is a note.\nThis line follows a one-line label, so it is a note.');
 assert.equal(mapFields('Equipment: Chair\n- band\n1. step\nNot equipment').fields.equipment,'Chair\n- band\n1. step');
});
test('maps heading sections until the next unrecognised heading',()=>{
 const {fields,notes}=mapFields('# Bridge\n## Setup\nSupine, knees bent\n## Steps\n1. Squeeze glutes\n2. Lift hips\n## Clinic notes\nPersonal remark\n### Detail\nmore',{title:'Bridge'});
 assert.equal(fields.setup,'Supine, knees bent');assert.equal(fields.instructions,'1. Squeeze glutes\n2. Lift hips');assert.equal(notes,'## Clinic notes\nPersonal remark\n### Detail\nmore');
});
test('maps two-column table rows from DOCX and Google tables',()=>{
 const {fields}=mapFields('Dosage\t2 sets of 15\nEquipment\tStep\nUnknown\tleft alone');
 assert.equal(fields.dosage,'2 sets of 15');assert.equal(fields.equipment,'Step');assert.equal(Object.keys(fields).length,2);
});
test('leaves ordinary prose, unknown labels and times alone',()=>{
 const text='Note: this stays\nThe goal is to improve gait\nAt 10:30 start session\nhttps://example.org/path\nPatient tolerated well';
 const {fields,notes}=mapFields(text);assert.deepEqual(fields,{});assert.equal(notes,text);
});
test('combines repeated labels, normalises tags and validates category',()=>{
 const {fields,notes}=mapFields('Precautions: one\nTags: strength; hip ,early\nPrecautions: two\nCategory: Something else',{categories});
 assert.equal(fields.precautions,'one\ntwo');assert.equal(fields.tags,'strength, hip, early');assert.equal(fields.category,undefined);assert.match(notes,/Type: Something else/);
 assert.equal(mapFields('Type: gait training',{categories}).fields.category,'Gait Training');
});
test('recognises label variants and ignores case and punctuation',()=>{
 for(const [label,key] of [['Sets & Reps','dosage'],['CONTRAINDICATIONS','precautions'],['Progressions/Regressions','progressions'],['Patient position','setup'],['References:','source'],['Dx','condition']])assert.equal(labelKey(label),key,label);
 assert.equal(labelKey('Notes'),'');
});
test('empty labels and title headings do not leave clutter',()=>{
 const {fields,notes}=mapFields('# Clamshell\nEquipment:\n\nDosage: 2 x 12',{title:'Clamshell'});
 assert.deepEqual(fields,{dosage:'2 x 12'});assert.equal(notes,'');
 assert.equal(mapFields('# Clamshell\nplain text only',{title:'Clamshell'}).notes,'# Clamshell\nplain text only');
});
