// DOCX extraction stays on device. ZIP input is bounded before decompression.
const MAX_FILE = 5_000_000, MAX_XML = 8_000_000;
const decoder = new TextDecoder('utf-8', {fatal:true});
export function crc32(bytes) {
  let crc = 0xffffffff;
  for (const byte of bytes) {crc ^= byte;for(let bit=0;bit<8;bit++)crc=(crc>>>1)^((crc&1)?0xedb88320:0);}
  return (crc^0xffffffff)>>>0;
}
export async function documentXML(buffer) {
  const bytes = new Uint8Array(buffer), view = new DataView(bytes.buffer,bytes.byteOffset,bytes.byteLength);
  if(bytes.length>MAX_FILE)throw Error('DOCX file exceeds the 5 MB limit.');
  const requireBytes=(offset,length)=>{if(offset<0||length<0||offset+length>bytes.length)throw Error('Truncated DOCX archive.');};
  let end=-1;
  for(let offset=bytes.length-22;offset>=Math.max(0,bytes.length-65557);offset--){
    if(view.getUint32(offset,true)===0x06054b50&&offset+22+view.getUint16(offset+20,true)===bytes.length){end=offset;break;}
  }
  if(end<0)throw Error('Not a valid DOCX ZIP archive.');
  if(view.getUint16(end+4,true)||view.getUint16(end+6,true))throw Error('Multi-volume DOCX archives are unsupported.');
  const count=view.getUint16(end+10,true), directorySize=view.getUint32(end+12,true), directoryStart=view.getUint32(end+16,true);
  if(!count||count>4096||count!==view.getUint16(end+8,true)||directoryStart+directorySize!==end)throw Error('Unsupported or invalid DOCX directory.');
  let cursor=directoryStart, target;
  for(let entry=0;entry<count;entry++){
    requireBytes(cursor,46);if(view.getUint32(cursor,true)!==0x02014b50)throw Error('Invalid DOCX directory entry.');
    const flags=view.getUint16(cursor+8,true),method=view.getUint16(cursor+10,true),crc=view.getUint32(cursor+16,true),compressed=view.getUint32(cursor+20,true),expanded=view.getUint32(cursor+24,true);
    const nameLength=view.getUint16(cursor+28,true),extra=view.getUint16(cursor+30,true),comment=view.getUint16(cursor+32,true),offset=view.getUint32(cursor+42,true);
    requireBytes(cursor+46,nameLength+extra+comment);
    const name=decoder.decode(bytes.subarray(cursor+46,cursor+46+nameLength));
    if(name==='word/document.xml'){
      if(target)throw Error('Duplicate document content in DOCX.');
      if(flags&1)throw Error('Encrypted DOCX files are unsupported.');
      if(![0,8].includes(method)||expanded>MAX_XML||compressed>MAX_FILE)throw Error('DOCX content is too large or uses unsupported compression.');
      target={flags,method,crc,compressed,expanded,offset,name};
    }
    cursor+=46+nameLength+extra+comment;if(cursor>end)throw Error('Invalid DOCX directory size.');
  }
  if(cursor!==end||!target)throw Error('DOCX is missing its main document.');
  const t=target;requireBytes(t.offset,30);
  if(view.getUint32(t.offset,true)!==0x04034b50||view.getUint16(t.offset+8,true)!==t.method||view.getUint16(t.offset+6,true)!==t.flags)throw Error('Invalid DOCX content header.');
  const nameLength=view.getUint16(t.offset+26,true),extra=view.getUint16(t.offset+28,true),start=t.offset+30+nameLength+extra;
  requireBytes(t.offset+30,nameLength+extra);requireBytes(start,t.compressed);
  if(start+t.compressed>directoryStart||decoder.decode(bytes.subarray(t.offset+30,t.offset+30+nameLength))!==t.name)throw Error('Invalid DOCX content bounds.');
  let output=bytes.subarray(start,start+t.compressed);
  if(t.method===8){
    if(typeof DecompressionStream==='undefined')throw Error('This browser cannot unpack DOCX. Export the document as text instead.');
    let stream;try{stream=new DecompressionStream('deflate-raw');}catch{throw Error('This browser cannot unpack DOCX. Export the document as text instead.');}
    const reader=new Blob([output]).stream().pipeThrough(stream).getReader(),chunks=[];let size=0;
    try{while(true){const {done,value}=await reader.read();if(done)break;size+=value.length;if(size>MAX_XML||size>t.expanded)throw Error('DOCX expansion limit exceeded.');chunks.push(value);}}
    catch(error){await reader.cancel().catch(()=>{});throw error;}
    output=new Uint8Array(size);let at=0;for(const chunk of chunks){output.set(chunk,at);at+=chunk.length;}
  }
  if(output.length!==t.expanded||crc32(output)!==t.crc)throw Error('DOCX content is damaged (size or checksum mismatch).');
  return decoder.decode(output);
}
export function docxText(xml, Parser=globalThis.DOMParser) {
  if(/<!DOCTYPE|<!ENTITY/i.test(xml))throw Error('DOCX XML declarations with external entities are unsupported.');
  if(!Parser)throw Error('An XML parser is required for DOCX.');
  const document=new Parser().parseFromString(xml,'application/xml');
  if(document.getElementsByTagName('parsererror').length)throw Error('DOCX contains invalid XML.');
  const ns='http://schemas.openxmlformats.org/wordprocessingml/2006/main';
  const body=document.getElementsByTagNameNS(ns,'body')[0];if(!body)throw Error('DOCX has no document body.');
  const descendants=(node,name)=>Array.from(node.getElementsByTagNameNS(ns,name));
  function inline(node){
    if(node.namespaceURI===ns&&node.localName==='del')return '';
    if(node.namespaceURI===ns&&node.localName==='t')return node.textContent;
    if(node.namespaceURI===ns&&node.localName==='tab')return '\t';
    if(node.namespaceURI===ns&&['br','cr'].includes(node.localName))return '\n';
    return Array.from(node.childNodes).map(inline).join('');
  }
  function block(node){
    if(node.namespaceURI!==ns)return '';
    if(node.localName==='p'){
      const text=inline(node),style=descendants(node,'pStyle')[0]?.getAttributeNS(ns,'val')||'';
      const heading=/^Heading([1-6])$/i.exec(style);
      return (heading?'#'.repeat(Number(heading[1]))+' ':descendants(node,'numPr').length?'- ':'')+text;
    }
    if(node.localName==='tbl')return Array.from(node.children).filter(n=>n.localName==='tr').map(row=>Array.from(row.children).filter(n=>n.localName==='tc').map(cell=>Array.from(cell.children).map(block).filter(Boolean).join(' / ')).join('\t')).join('\n');
    return Array.from(node.children).map(block).filter(Boolean).join('\n');
  }
  const text=Array.from(body.children).map(block).filter(Boolean).join('\n\n').trim();
  if(!text)throw Error('No extractable text found. Scanned documents and images are not supported.');
  return text;
}
export async function readDOCX(file){return docxText(await documentXML(await file.arrayBuffer()));}
