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
export function importRecord(draft, {id, documentTitle, source, importedAt, fileName = '', fileModifiedAt = ''}) {
  if (!draft.name.trim() || !draft.region) throw new Error('Each entry needs a title and body region.');
  return {id, name: draft.name.trim(), region: draft.region, condition: draft.condition || '', notes: draft.notes,
    source, sourceTitle: documentTitle, sourceFile: fileName, sourceModifiedAt: fileModifiedAt,
    importedAt, reviewStatus: 'unreviewed', updated: importedAt.slice(0,10), favorite: false};
}
