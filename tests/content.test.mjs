import {test} from 'node:test';
import assert from 'node:assert/strict';
import {renderMarkdown} from '../markdown.mjs';
import {sniffType, readMediaEntry, bytesToBase64, base64ToBytes} from '../media.mjs';
test('renders headings, lists, emphasis, code and safe links',()=>{
 const html=renderMarkdown('# Phase notes\nIntro **bold** and _italic_ with `code`.\n- one\n- two\n\n1. first\n2. second\nSee [guide](https://example.org/a?b=1).');
 assert.match(html,/<h3>Phase notes<\/h3>/);assert.match(html,/<strong>bold<\/strong>/);assert.match(html,/<em>italic<\/em>/);assert.match(html,/<code>code<\/code>/);
 assert.match(html,/<ul><li>one<\/li><li>two<\/li><\/ul>/);assert.match(html,/<ol><li>first<\/li><li>second<\/li><\/ol>/);
 assert.match(html,/<a href="https:\/\/example.org\/a\?b=1" target="_blank" rel="noopener noreferrer">guide<\/a>/);
});
test('never renders raw HTML or script URLs',()=>{
 const html=renderMarkdown('<img src=x onerror=alert(1)>\n[x](javascript:alert(1))\n**<script>**\n[y](https://e.org/"onmouseover="alert(1))');
 assert.doesNotMatch(html,/<img|<script|href="javascript|onmouseover="/);assert.match(html,/&lt;img/);
});
test('keeps snake_case and multiplication text intact',()=>{
 assert.equal(renderMarkdown('use file_name_here and 3 * 4 * 5'),'<p>use file_name_here and 3 * 4 * 5</p>');
});
test('identifies attachments by content and rejects SVG, HTML and mislabelled files',()=>{
 assert.equal(sniffType([0xff,0xd8,0xff,0xe0]),'image/jpeg');assert.equal(sniffType(new TextEncoder().encode('%PDF-1.7')),'application/pdf');
 assert.equal(sniffType(new TextEncoder().encode('RIFF\0\0\0\0WEBPVP8 ')),'image/webp');
 assert.equal(sniffType(new TextEncoder().encode('<svg xmlns="http://www.w3.org/2000/svg">')),'');assert.equal(sniffType(new TextEncoder().encode('<html>')),'');
 const bytes=new Uint8Array(3000).map((_,i)=>i%256);bytes.set([0x47,0x49,0x46,0x38]);assert.deepEqual(base64ToBytes(bytesToBase64(bytes)),bytes);
 const parsed=readMediaEntry({id:'m',interventionId:'i',name:'x.gif',type:'text/html',data:bytesToBase64(bytes)});assert.equal(parsed.record.type,'image/gif');
});
