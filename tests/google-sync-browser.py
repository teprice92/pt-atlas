import functools, http.server, json, os, re, shutil, threading
from pathlib import Path
from playwright.sync_api import sync_playwright
root=Path(__file__).resolve().parents[1]
class Quiet(http.server.SimpleHTTPRequestHandler):
 def log_message(self,*args): pass
server=http.server.ThreadingHTTPServer(('127.0.0.1',0),functools.partial(Quiet,directory=str(root.parent)))
threading.Thread(target=server.serve_forever,daemon=True).start()
# Google Identity Services and Picker are mocked; no real Google endpoint is contacted.
source=(root/'tests'/'import-browser.py').read_text()
gis=re.search(r"^gis='''(.*?)'''$",source,re.M|re.S).group(1)
picker=re.search(r"^picker='''(.*?)'''$",source,re.M|re.S).group(1)
SITE_CONFIG="export const SITE_CONFIG={google:{clientId:'site-client.apps.googleusercontent.com',apiKey:'site-key',projectNumber:'999'}};"
def paragraph(text,style=None):return {'paragraph':{'paragraphStyle':{'namedStyleType':style} if style else {},'elements':[{'textRun':{'content':text+'\n'}}]}}
docs={'doc-one':{'name':'Hip program','modified':'2026-10-01T00:00:00Z','body':[paragraph('Section A','HEADING_1'),paragraph('Step one'),paragraph('Section B','HEADING_1'),paragraph('Keep this')]},
      'doc-two':{'name':'Knee notes','modified':'2026-10-01T00:00:00Z','body':[paragraph('Knee cue','HEADING_1'),paragraph('Stable text')]}}
try:
 with sync_playwright() as p:
  browser=p.chromium.launch(executable_path=shutil.which('chromium') or os.environ.get('PT_ATLAS_CHROMIUM') or None,args=['--no-sandbox'])
  context=browser.new_context();page=context.new_page();errors=[];alerts=[]
  page.on('pageerror',lambda e:errors.append(str(e)));page.on('dialog',lambda d:(alerts.append(d.message),d.accept()))
  context.route('**/pt-atlas/site-config.mjs',lambda route:route.fulfill(content_type='text/javascript',body=SITE_CONFIG))
  context.route('https://accounts.google.com/gsi/client',lambda route:route.fulfill(content_type='text/javascript',body=gis))
  context.route('https://apis.google.com/js/api.js',lambda route:route.fulfill(content_type='text/javascript',body=picker))
  def api(route):
   request=route.request;cors={'access-control-allow-origin':'*','access-control-allow-headers':'Authorization','access-control-allow-methods':'GET, OPTIONS'}
   if request.method=='OPTIONS':route.fulfill(status=204,headers=cors);return
   assert request.headers.get('authorization')=='Bearer test-memory-token'
   doc_id=re.search(r'(?:files|documents)/([\w-]+)',request.url).group(1);doc=docs.get(doc_id)
   if not doc or doc.get('gone'):route.fulfill(status=404,headers=cors,body='');return
   body={'id':doc_id,'name':doc['name'],'mimeType':'application/vnd.google-apps.document','modifiedTime':doc['modified']} if '/drive/' in request.url else {'title':doc['name'],'body':{'content':doc['body']}}
   route.fulfill(headers=cors,content_type='application/json',body=json.dumps(body))
  context.route('https://www.googleapis.com/drive/v3/files/*',api);context.route('https://docs.googleapis.com/v1/documents/*',api)
  base=f'http://127.0.0.1:{server.server_port}/pt-atlas/'
  def go(route):page.goto(base+route);page.wait_for_load_state()
  def action(name):page.get_by_role('button',name=name,exact=True).click()
  # Site-wide configuration is used without any per-browser setup.
  go('#/import');page.get_by_text('Google is set up for this site.').wait_for()
  go('#/settings');page.get_by_text('Google is set up for this site.').wait_for();page.get_by_text('Not connected.',exact=False).wait_for()
  action('Connect Google account');page.get_by_text('Google connection ready. Click Connect Google account again',exact=False).wait_for()
  action('Connect Google account');page.get_by_text('Connected to Google for this session.').first.wait_for()
  assert page.evaluate('window.__oauthConfig.client_id')=='site-client.apps.googleusercontent.com';assert page.evaluate('window.__oauthConfig.scope')=='https://www.googleapis.com/auth/drive.file'
  page.get_by_role('button',name='Reconnect Google').wait_for()
  action('Disconnect Google');page.get_by_text('Google access disconnected.',exact=False).first.wait_for();assert page.evaluate('window.__revoked')==1;page.get_by_role('button',name='Connect Google account').wait_for()
  # Import both docs with heading splitting.
  go('#/import');page.locator('#googleSplit').check();action('Choose Google Docs');page.get_by_role('heading',name='Review imported entries').wait_for()
  assert page.locator('[data-draft]').count()==3;action('Confirm import');page.get_by_text('Imported 3 entries locally; 0 skipped.').wait_for()
  # Nothing changed yet.
  go('#/import');action('Check imported Docs for updates');page.get_by_text('Up to date: 2 linked Google Docs checked',exact=False).wait_for()
  # The doc changes in Google: Section A edited, Section B removed, Section C added.
  docs['doc-one']['modified']='2026-10-28T09:00:00Z';docs['doc-one']['body']=[paragraph('Section A','HEADING_1'),paragraph('Step one'),paragraph('Step two added'),paragraph('Section C','HEADING_1'),paragraph('Brand new')]
  action('Check imported Docs for updates');page.get_by_role('heading',name='Review document updates').wait_for()
  page.locator('.diff ins',has_text='Step two added').wait_for();page.get_by_text('“Section B” is no longer a section in this document',exact=False).wait_for()
  assert page.get_by_label('What to do with “Section A”').input_value()=='skip'  # nothing is applied by default
  page.get_by_label('What to do with “Section A”').select_option('replace');page.get_by_label('What to do with the new section “Section C”').select_option('create')
  action('Apply selected updates');page.get_by_text('Applied Google Docs updates: 1 entry updated, 1 new entry.').wait_for()
  assert any('1 replacement' in a and '1 new entry' in a for a in alerts),alerts
  page.get_by_label('Search library').fill('Step two added');page.get_by_role('heading',name='Section A').wait_for();page.locator('[data-open]').first.click()
  page.locator('.history').get_by_text('Before Google sync').wait_for();page.locator('.badge',has_text='Needs review').first.wait_for()
  page.get_by_label('Search library').fill('Brand new');page.get_by_role('heading',name='Section C').wait_for()
  page.get_by_label('Search library').fill('Keep this');page.get_by_role('heading',name='Section B').wait_for()  # removed section's entry is untouched
  page.get_by_label('Search library').fill('')
  # After applying, the doc is current; a deleted doc is reported without failing the check.
  docs['doc-two']['gone']=True
  go('#/import');action('Check imported Docs for updates');page.get_by_text('Up to date: 1 linked Google Doc checked',exact=False).wait_for();page.get_by_text('couldn’t be read',exact=False).wait_for()
  # Skipped updates are offered again next time; edited entries warn before replace.
  docs['doc-one']['modified']='2026-10-28T10:00:00Z';docs['doc-one']['body'][2]=paragraph('Step two revised')
  page.get_by_label('Search library').fill('Step two added');page.locator('[data-open]').first.click();action('Edit intervention');page.get_by_label('Personal clinical notes').fill('My own rewrite');action('Save intervention');page.locator('#interventionForm').wait_for(state='detached')
  go('#/import');action('Check imported Docs for updates');page.get_by_text('You edited this entry after importing it',exact=False).wait_for();action('Cancel')
  go('#/import');action('Check imported Docs for updates');page.get_by_role('heading',name='Review document updates').wait_for();action('Apply selected updates');page.get_by_text('No content updates applied.').wait_for()
  go('#/import');action('Check imported Docs for updates');page.get_by_role('heading',name='Review document updates').wait_for();action('Cancel')
  # A browser-level project overrides the site config and can be cleared.
  go('#/import');page.locator('details').evaluate('(element)=>element.open=true');page.get_by_label('Web OAuth client ID').fill('mine.apps.googleusercontent.com');page.get_by_label('Picker API key').fill('my-key');page.get_by_label('Google Cloud project number').fill('42');action('Save Google setup')
  page.get_by_text('Google setup saved in this browser.').wait_for();go('#/settings');page.get_by_text('Using the Google project saved in this browser.').wait_for()
  go('#/import');action('Clear browser setup');page.get_by_text('Browser setup cleared. Google is set up for this site.').wait_for()
  go('#/settings');page.get_by_text('Not connected.',exact=False).wait_for()
  assert 'test-memory-token' not in page.evaluate('JSON.stringify(localStorage)')
  assert not errors,errors
  browser.close();print('PASS: site-wide Google config; account connect/reconnect/disconnect; selected-file scope; split import; update check (current, changed, unreadable); diff review with skip default; replace with revision; new and removed sections; edited-entry warning; skipped updates re-offered; browser override and clear; no token persistence (mock Google APIs)')
finally: server.shutdown()
