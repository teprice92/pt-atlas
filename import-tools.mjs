// Conservative parsing: preserve source text; never infer clinical instructions.
export function documentDrafts(text, title = '', split = false) {
  const source = String(text).replace(/\r\n?/g, '\n').trim();
  if (!source) throw new Error('Add document text before reviewing.');
  if (source.length > 5_000_000) throw new Error('Document exceeds the 5 MB text limit.');
  const sections = split ? source.split(/(?=^#{1,2}\s+\S)/m).filter(s => s.trim()) : [source];
  if (sections.length > 100) throw new Error('Review at most 100 sections at once.');
  return sections.map((section, index) => ({
    name: (!split && title.trim() ? title.trim() : section.trim().split('\n')[0].replace(/^#+\s*/, '')).slice(0, 160),
    notes: section.trim(), index
  }));
}
export function duplicateEntries(draft, entries) {
  const normalize = value => String(value || '').normalize('NFKC').trim().replace(/\s+/g, ' ').toLowerCase();
  return entries.filter(entry => normalize(entry.name) === normalize(draft.name) && entry.region === draft.region);
}
export function sourceURL(value) {
  if (!value.trim()) return '';
  let url;try { url = new URL(value); } catch { throw new Error('Source link must be a complete HTTPS or HTTP URL.'); }
  if (!['https:', 'http:'].includes(url.protocol)) throw new Error('Source link must use HTTPS or HTTP.');
  return url.href;
}
export function importRecord(draft, {id, documentTitle, source, importedAt, fileName = '', fileModifiedAt = '', sourceDocumentId = '', sourceType = ''}) {
  if (!draft.name.trim() || !draft.region) throw new Error('Each entry needs a title and body region.');
  // Mapped fields come first so the core identity and provenance fields below always win.
  const fields = draft.fields && typeof draft.fields === 'object' ? draft.fields : {};
  return {...fields, ...(Object.keys(fields).length ? {mappedFields: Object.keys(fields)} : {}), id, name: draft.name.trim(), region: draft.region, condition: draft.condition || '', notes: draft.notes,
    // A mapped "References" section and the document link share the source field; keep both.
    sourceDocumentId, sourceType, source: [fields.source, source].filter(Boolean).join('\n'), sourceTitle: documentTitle, sourceFile: fileName, sourceModifiedAt: fileModifiedAt,
    importedAt, reviewStatus: 'unreviewed', updated: importedAt.slice(0,10), favorite: false, sourceText: typeof draft.sourceText === 'string' ? draft.sourceText : draft.notes};
}

const normalizeTitle = value => String(value || '').normalize('NFKC').trim().replace(/\s+/g, ' ').toLowerCase();
// Line diff (longest common subsequence). Very large inputs fall back to "all removed, all added" to stay responsive.
export function lineDiff(before, after) {
  const a = String(before || '').split('\n'), b = String(after || '').split('\n');
  if (a.length * b.length > 1_000_000) return [...a.map(text => ({type: 'del', text})), ...b.map(text => ({type: 'add', text}))];
  const table = Array.from({length: a.length + 1}, () => new Uint32Array(b.length + 1));
  for (let i = a.length - 1; i >= 0; i--) for (let j = b.length - 1; j >= 0; j--) table[i][j] = a[i] === b[j] ? table[i + 1][j + 1] + 1 : Math.max(table[i + 1][j], table[i][j + 1]);
  const out = [];let i = 0, j = 0;
  while (i < a.length && j < b.length) {
    if (a[i] === b[j]) {out.push({type: 'same', text: a[i]});i++;j++;}
    else if (table[i + 1][j] >= table[i][j + 1]) out.push({type: 'del', text: a[i++]});
    else out.push({type: 'add', text: b[j++]});
  }
  while (i < a.length) out.push({type: 'del', text: a[i++]});
  while (j < b.length) out.push({type: 'add', text: b[j++]});
  return out;
}
// Matches a re-read Google Doc against the entries imported from it. A document imported as one entry maps to that
// entry; a document split by headings maps section titles to entry titles. Nothing is applied here: the result is a
// plan for the review screen.
export function syncPlan(entries, text, title, {pristine} = {}) {
  const split = entries.length > 1;
  const sections = documentDrafts(text, title, split);
  const items = [], matched = new Set();
  for (const section of sections) {
    const entry = split ? entries.find(e => !matched.has(e.id) && normalizeTitle(e.name) === normalizeTitle(section.name)) : entries[0];
    if (!entry) {items.push({kind: 'new', section});continue;}
    matched.add(entry.id);
    const base = typeof entry.sourceText === 'string' ? entry.sourceText : entry.notes || '';
    const edited = pristine ? !pristine(entry) : typeof entry.sourceText === 'string' && (entry.notes || '') !== entry.sourceText;
    items.push(base.trim() === section.notes.trim() ? {kind: 'unchanged', entry, section} : {kind: 'changed', entry, section, edited, diff: lineDiff(base.trim(), section.notes.trim())});
  }
  for (const entry of entries) if (!matched.has(entry.id)) items.push({kind: 'missing', entry});
  return items;
}
