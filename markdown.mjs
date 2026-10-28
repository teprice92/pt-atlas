// Minimal, safe Markdown subset for user notes: headings, bullet and numbered lists, bold, italic,
// inline code and http(s) links. All input is HTML-escaped first; no raw HTML is ever rendered.
const escapeHTML=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
function inline(text){
 const codes=[];
 let out=escapeHTML(text).replace(/`([^`]+)`/g,(_,code)=>{codes.push(code);return `\u0000${codes.length-1}\u0000`});
 out=out.replace(/\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)/g,(_,label,url)=>`<a href="${url}" target="_blank" rel="noopener noreferrer">${label}</a>`);
 out=out.replace(/\*\*([^*]+)\*\*/g,'<strong>$1</strong>').replace(/(^|[\s(])_([^_]+)_(?=[\s).,;:!?]|$)/g,'$1<em>$2</em>').replace(/(^|[\s(])\*([^*\s][^*]*)\*(?=[\s).,;:!?]|$)/g,'$1<em>$2</em>');
 return out.replace(/\u0000(\d+)\u0000/g,(_,i)=>`<code>${codes[i]}</code>`);
}
export function renderMarkdown(source){
 const lines=String(source??'').replace(/\r\n?/g,'\n').split('\n');
 const html=[];let list=null,para=[];
 const flushPara=()=>{if(para.length){html.push(`<p>${para.map(inline).join('<br>')}</p>`);para=[]}};
 const closeList=()=>{if(list){html.push(`</${list}>`);list=null}};
 for(const raw of lines){
  const line=raw.trimEnd();
  const heading=line.match(/^(#{1,3})\s+(.+)$/),bullet=line.match(/^\s*[-*•]\s+(.+)$/),numbered=line.match(/^\s*\d+[.)]\s+(.+)$/);
  if(!line.trim()){flushPara();closeList();continue}
  if(heading){flushPara();closeList();const level=Math.min(heading[1].length+2,5);html.push(`<h${level}>${inline(heading[2])}</h${level}>`);continue}
  if(bullet||numbered){flushPara();const tag=bullet?'ul':'ol';if(list!==tag){closeList();html.push(`<${tag}>`);list=tag}html.push(`<li>${inline((bullet||numbered)[1])}</li>`);continue}
  closeList();para.push(line);
 }
 flushPara();closeList();
 return html.join('');
}
