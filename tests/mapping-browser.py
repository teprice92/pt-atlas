import functools, http.server, io, json, os, re, shutil, threading, zipfile
from pathlib import Path
from playwright.sync_api import sync_playwright
root=Path(__file__).resolve().parents[1]
class Quiet(http.server.SimpleHTTPRequestHandler):
 def log_message(self,*args): pass
server=http.server.ThreadingHTTPServer(('127.0.0.1',0),functools.partial(Quiet,directory=str(root.parent)))
threading.Thread(target=server.serve_forever,daemon=True).start()
source=(root/'tests'/'import-browser.py').read_text()
gis=re.search(r"^gis='''(.*?)'''$",source,re.M|re.S).group(1)
picker=re.search(r"^picker='''(.*?)'''$",source,re.M|re.S).group(1)
SITE_CONFIG="export const SITE_CONFIG={google:{clientId:'site-client.apps.googleusercontent.com',apiKey:'site-key',projectNumber:'999'}};"
LABELLED='''# Bridge
Hip extension drill used after clearance.
Purpose: Improve hip extension strength
### Setup
Supine, knees bent
**Dosage:**
3 x 10
hold 2 seconds
- Equipment: Mat
Precautions:
Avoid pain above 3/10
References: Example guideline 2024
Tags: glutes; strength
# Clamshell
Dosage\t2 x 15
Clinic remark kept as a note'''
def paragraph(text,style=None):return {'paragraph':{'paragraphStyle':{'namedStyleType':style} if style else {},'elements':[{'textRun':{'content':text+'\n'}}]}}
docs={'doc-one':{'name':'Clam program','modified':'2026-10-01T00:00:00Z','lines':['Dosage: 2 x 10','Precautions: Stop if painful','Free note']}}
def doc_body(doc):return [paragraph(line) for line in doc['lines']]
try:
 with sync_playwright() as p:
  browser=p.chromium.launch(executable_path=shutil.which('chromium') or os.environ.get('PT_ATLAS_CHROMIUM') or None,args=['--no-sandbox'])
  context=browser.new_context(accept_downloads=True);page=context.new_page();errors=[];requests=[]
  page.on('pageerror',lambda e:errors.append(str(e)));page.on('dialog',lambda d:d.accept());page.on('request',lambda r:requests.append(r.url))
  context.route('**/pt-atlas/site-config.mjs',lambda route:route.fulfill(content_type='text/javascript',body=SITE_CONFIG))
  context.route('https://accounts.google.com/gsi/client',lambda route:route.fulfill(content_type='text/javascript',body=gis))
  context.route('https://apis.google.com/js/api.js',lambda route:route.fulfill(content_type='text/javascript',body=picker.replace("{id:'doc-two',mimeType:'application/vnd.google-apps.document'}","")))
  def api(route):
   request=route.request;cors={'access-control-allow-origin':'*','access-control-allow-headers':'Authorization','access-control-allow-methods':'GET, OPTIONS'}
   if request.method=='OPTIONS':route.fulfill(status=204,headers=cors);return
   doc=docs['doc-one']
   body={'id':'doc-one','name':doc['name'],'mimeType':'application/vnd.google-apps.document','modifiedTime':doc['modified']} if '/drive/' in request.url else {'title':doc['name'],'body':{'content':doc_body(doc)}}
   route.fulfill(headers=cors,content_type='application/json',body=json.dumps(body))
  context.route('https://www.googleapis.com/drive/v3/files/*',api);context.route('https://docs.googleapis.com/v1/documents/*',api)
  base=f'http://127.0.0.1:{server.server_port}/pt-atlas/'
  def go(route):page.goto(base+route);page.wait_for_load_state()
  def action(name):page.get_by_role('button',name=name,exact=True).click()
  def open_entry(text):page.get_by_label('Search library').fill(text);page.locator('[data-open]').first.click();page.get_by_label('Search library').wait_for()
  def section(title):return page.locator('.numbered').filter(has=page.get_by_role('heading',name=title,exact=True))
  # Batch import maps labelled sections into fields; unlabelled text stays in notes.
  go('#/import');assert page.locator('#mapLabels').is_checked()
  page.locator('#importText').fill(LABELLED);page.locator('#splitSections').check();action('Review batch import')
  first=page.locator('[data-draft="0"]');first.get_by_text('Fields found from labels').wait_for()
  assert first.locator('[name="f-dosage-0"]').input_value()=='3 x 10\nhold 2 seconds';assert first.locator('[name="f-setup-0"]').input_value()=='Supine, knees bent'
  assert first.locator('[name="f-tags-0"]').input_value()=='glutes, strength';assert first.locator('[name="notes-0"]').input_value()=='Hip extension drill used after clearance.'
  assert page.locator('[name="f-dosage-1"]').input_value()=='2 x 15';assert page.locator('[name="notes-1"]').input_value()=='Clinic remark kept as a note'
  first.locator('[name="f-equipment-0"]').fill('Mat or bed')  # reviewer edit wins
  action('Confirm import');page.get_by_text('Imported 2 entries locally; 0 skipped.').wait_for()
  open_entry('Hip extension drill');page.get_by_role('heading',name='Bridge',exact=True).wait_for()
  assert 'Improve hip extension strength' in section('Clinical purpose').inner_text();assert 'Supine, knees bent' in section('Setup & positioning').inner_text()
  assert 'hold 2 seconds' in section('Dosage').inner_text();assert 'Mat or bed' in section('Equipment').inner_text();assert 'Avoid pain above 3/10' in section('Precautions & contraindications').inner_text()
  assert 'Example guideline 2024' in section('Evidence & references').inner_text();page.get_by_text('glutes, strength').wait_for()
  # Single review path fills the editor form.
  go('#/import');page.locator('#importText').fill('Sit to stand\nDosage: 5 reps\nEquipment: Chair\nAnything else stays');action('Review as new intervention')
  assert page.get_by_label('Dosage / frequency').input_value()=='5 reps';assert page.get_by_label('Equipment').input_value()=='Chair'
  assert page.get_by_label('Personal clinical notes').input_value()=='Sit to stand\nAnything else stays';page.get_by_text('Filled 2 fields from labels',exact=False).wait_for()
  action('Save intervention');page.locator('#interventionForm').wait_for(state='detached')
  # Turning matching off keeps the raw text and the choice is remembered.
  go('#/import');page.locator('#mapLabels').uncheck();page.reload();assert not page.locator('#mapLabels').is_checked()
  page.locator('#importText').fill('Raw\nDosage: 1 x 1');action('Review batch import');assert page.locator('fieldset.mapped').count()==0;assert page.locator('[name="notes-0"]').input_value()=='Raw\nDosage: 1 x 1';action('Cancel import')
  page.locator('#mapLabels').check()
  # Google import maps too; untouched entries re-sync without an edit warning and fields are re-mapped on replace.
  go('#/import');action('Choose Google Docs');page.wait_for_timeout(200);action('Choose Google Docs');page.get_by_role('heading',name='Review imported entries').wait_for()
  assert page.locator('[name="f-dosage-0"]').input_value()=='2 x 10';action('Confirm import');page.get_by_text('Imported 1 entries locally',exact=False).wait_for()
  docs['doc-one']['modified']='2026-10-28T09:00:00Z';docs['doc-one']['lines']=['Dosage: 3 x 10','Free note']
  go('#/import');action('Check imported Docs for updates');page.get_by_role('heading',name='Review document updates').wait_for()
  assert page.get_by_text('You edited this entry after importing it',exact=False).count()==0
  page.get_by_label('What to do with “Clam program”').select_option('replace');action('Apply selected updates');page.get_by_text('Applied Google Docs updates',exact=False).wait_for()
  open_entry('Free note');page.get_by_role('heading',name='Clam program',exact=True).wait_for()
  assert '3 x 10' in section('Dosage').inner_text();assert section('Precautions & contraindications').count()==0  # removed upstream, cleared
  # Editing a mapped field afterwards is detected as a local edit.
  action('Edit intervention');page.get_by_label('Dosage / frequency').fill('My own dosage');action('Save intervention');page.locator('#interventionForm').wait_for(state='detached')
  docs['doc-one']['modified']='2026-10-28T10:00:00Z';docs['doc-one']['lines']=['Dosage: 4 x 10','Free note']
  go('#/import');action('Check imported Docs for updates');page.get_by_text('You edited this entry after importing it',exact=False).wait_for();action('Cancel')
  external=[u for u in requests if not u.startswith(('http://127.0.0.1','data:','blob:','https://accounts.google.com/gsi/client','https://apis.google.com/js/api.js','https://www.googleapis.com/drive/','https://docs.googleapis.com/'))]
  assert not external,external  # matching never calls any other service
  assert not errors,errors
  browser.close();print('PASS: label matching in batch review (headings, label lines, bold, bullets, tables), reviewer edits, unlabelled text kept, single-entry editor fill, off switch remembered, Google import mapping, pristine re-sync without warning, re-mapped replace clears removed fields, local field edits detected, no extra network calls')
finally: server.shutdown()
