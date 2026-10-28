// Deterministic label matching for imported text: no AI, no network. A section is mapped to a field only when it is
// introduced by a recognised label, either as a heading ("## Dosage"), a label line ("Dosage: 3 x 10", "**Precautions:**",
// "- Equipment: band") or a two-column table row ("Dosage<TAB>3 x 10"). Everything else stays in notes, word for word.
export const FIELD_LABELS={
 purpose:['purpose','clinical purpose','goal','goals','indication','indications','target impairment','target impairments','rationale','objective','objectives','aim','aims'],
 setup:['setup','set up','set-up','position','positioning','patient position','starting position','start position','setup and positioning'],
 instructions:['instructions','instruction','steps','procedure','technique','how to','how to perform','directions','method','execution','performance','cues','cueing','description'],
 dosage:['dosage','dose','dosing','sets','reps','sets and reps','sets/reps','frequency','parameters','prescription','volume','duration','intensity','sets reps'],
 equipment:['equipment','materials','supplies','tools','equipment needed','what you need'],
 progressions:['progressions','progression','regressions','regression','progressions and regressions','progressions/regressions','progression/regression','modifications','variations','advance','advancement'],
 precautions:['precautions','precaution','contraindications','contraindication','precautions and contraindications','cautions','caution','warnings','warning','red flags','safety','restrictions'],
 source:['source','sources','references','reference','evidence','citation','citations','bibliography','evidence and references'],
 tags:['tags','tag','keywords'],
 condition:['condition','diagnosis','dx'],
 category:['category','intervention type','type']
};
export const FIELD_NAMES={purpose:'Clinical purpose',setup:'Setup & positioning',instructions:'Instructions',dosage:'Dosage',equipment:'Equipment',progressions:'Progressions & regressions',precautions:'Precautions & contraindications',source:'Evidence & references',tags:'Tags',condition:'Condition',category:'Intervention type'};
const normalize=text=>String(text).replace(/\*\*|__/g,'').replace(/&/g,' and ').replace(/[\s:]+$/,'').replace(/\s+/g,' ').trim().toLowerCase();
const lookup=new Map(Object.entries(FIELD_LABELS).flatMap(([key,labels])=>labels.map(label=>[normalize(label),key])));
export function labelKey(text){return lookup.get(normalize(text))||''}
// Returns the field for a line that opens a labelled section, plus any value written on the same line.
function opener(line){
 const heading=line.match(/^(#{1,6})\s+(.+?)\s*$/);
 if(heading){const key=labelKey(heading[2]);return key?{key,value:'',level:heading[1].length}:null}
 const cells=line.split('\t');
 if(cells.length===2){const key=labelKey(cells[0]);if(key)return {key,value:cells[1].trim(),row:true}}
 const labelled=line.match(/^\s*(?:[-*•]\s+)?(?:\*\*|__)?([A-Za-z][A-Za-z /&-]{0,38}?)(?:\*\*|__)?\s*:(?:\*\*|__)?\s*(.*)$/);
 if(labelled){const key=labelKey(labelled[1]);if(key)return {key,value:labelled[2].trim()}}
 return null;
}
export function mapFields(text,{title='',categories=[]}={}){
 const lines=String(text??'').replace(/\r\n?/g,'\n').split('\n');
 const fields={},notes=[];let current=null,mode='',headingLevel=0;
 const add=(key,value)=>{fields[key]=fields[key]?fields[key]+'\n'+value:value};
 for(const line of lines){
  const open=opener(line);
  // How far a section reaches: a table row ends with its row; "Label: value" continues only through indented or list
  // lines; a bare "Label:" runs to the next blank line; a heading runs to the next heading of the same or higher level.
  if(open){current=open.row?null:open.key;mode=open.level?'heading':open.value?'inline':'block';headingLevel=open.level||0;if(open.value)add(open.key,open.value);else if(!(open.key in fields))fields[open.key]='';continue}
  const heading=line.match(/^(#{1,6})\s+/);
  if(current&&heading&&(mode!=='heading'||heading[1].length<=headingLevel))current=null;
  else if(current&&mode==='inline'&&!/^(\s+\S|\s*([-*•]|\d+[.)])\s)/.test(line))current=null;
  else if(current&&mode==='block'&&!line.trim()&&fields[current])current=null;
  if(current)add(current,line);else notes.push(line);
 }
 for(const key of Object.keys(fields)){fields[key]=fields[key].replace(/^\n+|\s+$/g,'');if(!fields[key])delete fields[key]}
 // Short, single-value fields only keep values that make sense for them.
 if(fields.category){const match=categories.find(c=>c.toLowerCase()===fields.category.toLowerCase());if(match)fields.category=match;else{notes.push('Type: '+fields.category);delete fields.category}}
 for(const key of ['condition','tags'])if(fields[key]&&(fields[key].includes('\n')||fields[key].length>160)){notes.push(FIELD_NAMES[key]+': '+fields[key]);delete fields[key]}
 if(fields.tags)fields.tags=fields.tags.split(/[,;]/).map(t=>t.trim()).filter(Boolean).join(', ');
 let remaining=notes.join('\n').replace(/\n{3,}/g,'\n\n').trim();
 // When fields were found, drop a leading heading that only repeats the entry title.
 if(Object.keys(fields).length&&title){const first=remaining.split('\n')[0]||'';if(/^#{1,6}\s+/.test(first)&&normalize(first.replace(/^#+\s+/,''))===normalize(title))remaining=remaining.split('\n').slice(1).join('\n').trim()}
 return {fields,notes:remaining};
}
export const MAPPABLE=Object.keys(FIELD_LABELS);
