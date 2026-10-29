// Generates the import templates in templates/: a Word document (also opens in Google Docs) and a Markdown file.
// Run with `npm run templates`. Output is deterministic so tests can check the committed files are current.
// The templates contain placeholders only, never clinical content. Guidance lives in Word comments, which the
// importer ignores, so it can never be imported as an entry.
import {deflateRawSync} from 'node:zlib';
import {writeFileSync, mkdirSync} from 'node:fs';
import {crc32} from '../docx-import.mjs';

const FIELDS=[
 ['Purpose','[Clinical purpose or target impairment, from your source]'],
 ['Setup & positioning','[Starting position and setup]'],
 ['Instructions','[Steps and cues, one per line]'],
 ['Dosage','[Dosage exactly as written in your source]'],
 ['Equipment','[Equipment needed]'],
 ['Progressions & regressions','[How to progress or regress]'],
 ['Precautions & contraindications','[Precautions and contraindications from your source]'],
 ['References','[Citations, guideline names or links]']
];
const COMMENTS=[
 'Each Heading 1 becomes one intervention when you tick the option to split headings into separate entries in PT Atlas. Copy this whole block, from this heading to the next Heading 1, for every intervention, and replace the name.',
 'Optional lines. Condition: type the condition name exactly as it appears in PT Atlas. Type: one of PT Atlas’s intervention types (for example Therapeutic Exercise, Gait Training, Manual Therapy). Tags: separate with commas. Leave blank to fill in later.',
 'Keep these Heading 3 labels as they are: text under each one fills the matching field in PT Atlas. Delete sections you don’t need. Anything without a label stays in Notes.',
 'Enter dosage exactly as written in your source. PT Atlas never suggests dosages.'
];

export function markdownTemplate(){
 return ['# [Intervention name]','','[Optional summary. Text without a label stays in Notes.]','','Condition: ','Type: Therapeutic Exercise','Tags: ','',
  ...FIELDS.flatMap(([label,placeholder])=>['### '+label,placeholder,'']),
  '# [Next intervention name]','','### Dosage','[Dosage exactly as written in your source]',''].join('\n');
}

const esc=s=>s.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
const W='xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"';
const run=text=>`<w:r><w:t xml:space="preserve">${esc(text)}</w:t></w:r>`;
const commented=(id,inner)=>`<w:commentRangeStart w:id="${id}"/>${inner}<w:commentRangeEnd w:id="${id}"/><w:r><w:rPr><w:rStyle w:val="CommentReference"/></w:rPr><w:commentReference w:id="${id}"/></w:r>`;
const para=(text,{style,comment}={})=>`<w:p>${style?`<w:pPr><w:pStyle w:val="${style}"/></w:pPr>`:''}${comment===undefined?run(text):commented(comment,run(text))}</w:p>`;
function documentXML(){
 const body=[
  para('[Intervention name]',{style:'Heading1',comment:0}),
  para('[Optional summary. Text without a label stays in Notes.]'),
  para('Condition: ',{comment:1}),para('Type: Therapeutic Exercise'),para('Tags: '),
  ...FIELDS.flatMap(([label,placeholder],i)=>[para(label,{style:'Heading3',comment:i===0?2:label==='Dosage'?3:undefined}),para(placeholder)]),
  para('[Next intervention name]',{style:'Heading1'}),para('Dosage',{style:'Heading3'}),para('[Dosage exactly as written in your source]')
 ].join('');
 return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><w:document ${W}><w:body>${body}<w:sectPr><w:pgSz w:w="12240" w:h="15840"/><w:pgMar w:top="1440" w:right="1440" w:bottom="1440" w:left="1440" w:header="720" w:footer="720" w:gutter="0"/></w:sectPr></w:body></w:document>`;
}
const heading=(id,name,level,size,color)=>`<w:style w:type="paragraph" w:styleId="${id}"><w:name w:val="${name}"/><w:basedOn w:val="Normal"/><w:next w:val="Normal"/><w:uiPriority w:val="9"/><w:qFormat/><w:pPr><w:keepNext/><w:spacing w:before="${level===0?360:240}" w:after="80"/><w:outlineLvl w:val="${level}"/></w:pPr><w:rPr><w:b/><w:color w:val="${color}"/><w:sz w:val="${size}"/></w:rPr></w:style>`;
const stylesXML=()=>`<?xml version="1.0" encoding="UTF-8" standalone="yes"?><w:styles ${W}><w:docDefaults><w:rPrDefault><w:rPr><w:rFonts w:ascii="Arial" w:hAnsi="Arial" w:cs="Arial"/><w:sz w:val="22"/></w:rPr></w:rPrDefault><w:pPrDefault><w:pPr><w:spacing w:after="120" w:line="276" w:lineRule="auto"/></w:pPr></w:pPrDefault></w:docDefaults><w:style w:type="paragraph" w:default="1" w:styleId="Normal"><w:name w:val="Normal"/><w:qFormat/></w:style>${heading('Heading1','heading 1',0,36,'101827')}${heading('Heading3','heading 3',2,26,'0B7D71')}<w:style w:type="character" w:styleId="CommentReference"><w:name w:val="annotation reference"/><w:rPr><w:sz w:val="16"/></w:rPr></w:style></w:styles>`;
const commentsXML=()=>`<?xml version="1.0" encoding="UTF-8" standalone="yes"?><w:comments ${W}>${COMMENTS.map((text,id)=>`<w:comment w:id="${id}" w:author="PT Atlas" w:initials="PT" w:date="2026-10-29T00:00:00Z"><w:p>${run(text)}</w:p></w:comment>`).join('')}</w:comments>`;
const FILES=()=>[
 ['[Content_Types].xml','<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/><Override PartName="/word/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.styles+xml"/><Override PartName="/word/comments.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.comments+xml"/><Override PartName="/docProps/core.xml" ContentType="application/vnd.openxmlformats-package.core-properties+xml"/></Types>'],
 ['_rels/.rels','<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/><Relationship Id="rId2" Type="http://schemas.openxmlformats.org/package/2006/relationships/metadata/core-properties" Target="docProps/core.xml"/></Relationships>'],
 ['docProps/core.xml','<?xml version="1.0" encoding="UTF-8" standalone="yes"?><cp:coreProperties xmlns:cp="http://schemas.openxmlformats.org/package/2006/metadata/core-properties" xmlns:dc="http://purl.org/dc/elements/1.1/"><dc:title>PT Atlas intervention template</dc:title><dc:creator>PT Atlas</dc:creator></cp:coreProperties>'],
 ['word/_rels/document.xml.rels','<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/><Relationship Id="rId2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/comments" Target="comments.xml"/></Relationships>'],
 ['word/document.xml',documentXML()],
 ['word/styles.xml',stylesXML()],
 ['word/comments.xml',commentsXML()]
];
// Minimal ZIP writer (deflate, fixed 2026-10-29 timestamp for reproducible output).
export function docxTemplate(){
 const time=0,date=((2026-1980)<<9)|(10<<5)|29,locals=[],centrals=[];let offset=0;
 for(const [name,content] of FILES()){
  const raw=Buffer.from(content),data=deflateRawSync(raw),file=Buffer.from(name),crc=crc32(raw);
  const local=Buffer.alloc(30);local.writeUInt32LE(0x04034b50);local.writeUInt16LE(20,4);local.writeUInt16LE(0x0800,6);local.writeUInt16LE(8,8);local.writeUInt16LE(time,10);local.writeUInt16LE(date,12);local.writeUInt32LE(crc,14);local.writeUInt32LE(data.length,18);local.writeUInt32LE(raw.length,22);local.writeUInt16LE(file.length,26);
  const central=Buffer.alloc(46);central.writeUInt32LE(0x02014b50);central.writeUInt16LE(20,4);central.writeUInt16LE(20,6);central.writeUInt16LE(0x0800,8);central.writeUInt16LE(8,10);central.writeUInt16LE(time,12);central.writeUInt16LE(date,14);central.writeUInt32LE(crc,16);central.writeUInt32LE(data.length,20);central.writeUInt32LE(raw.length,24);central.writeUInt16LE(file.length,28);central.writeUInt32LE(offset,42);
  locals.push(local,file,data);centrals.push(central,file);offset+=30+file.length+data.length;
 }
 const centralDir=Buffer.concat(centrals),end=Buffer.alloc(22);end.writeUInt32LE(0x06054b50);end.writeUInt16LE(FILES().length,8);end.writeUInt16LE(FILES().length,10);end.writeUInt32LE(centralDir.length,12);end.writeUInt32LE(offset,16);
 return Buffer.concat([...locals,centralDir,end]);
}
if(import.meta.url===`file://${process.argv[1]}`){
 const dir=new URL('../templates/',import.meta.url);mkdirSync(dir,{recursive:true});
 writeFileSync(new URL('pt-atlas-template.docx',dir),docxTemplate());writeFileSync(new URL('pt-atlas-template.md',dir),markdownTemplate());
 console.log('Wrote templates/pt-atlas-template.docx and templates/pt-atlas-template.md');
}
