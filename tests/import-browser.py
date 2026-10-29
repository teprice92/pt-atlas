import functools, http.server, io, json, os, shutil, threading, zipfile
from pathlib import Path
from playwright.sync_api import sync_playwright
root=Path(__file__).resolve().parents[1]
class Quiet(http.server.SimpleHTTPRequestHandler):
 def log_message(self,*args): pass
server=http.server.ThreadingHTTPServer(('127.0.0.1',0),functools.partial(Quiet,directory=str(root.parent)))
threading.Thread(target=server.serve_forever,daemon=True).start()
def docx(xml):
 data=io.BytesIO()
 with zipfile.ZipFile(data,'w',compression=zipfile.ZIP_DEFLATED) as archive: archive.writestr('word/document.xml',xml)
 return data.getvalue()
xml='''<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:body><w:p><w:pPr><w:pStyle w:val="Heading1"/></w:pPr><w:r><w:t>DOCX Heading</w:t></w:r></w:p><w:p><w:pPr><w:numPr><w:numId w:val="1"/></w:numPr></w:pPr><w:r><w:t>List source &amp; literal &lt;script&gt;</w:t></w:r><w:del><w:r><w:delText>Deleted source</w:delText></w:r></w:del></w:p><w:tbl><w:tr><w:tc><w:p><w:r><w:t>Cell A</w:t></w:r></w:p></w:tc><w:tc><w:p><w:r><w:t>Cell B</w:t></w:r></w:p></w:tc></w:tr></w:tbl><w:p><w:pPr><w:pStyle w:val="Heading2"/></w:pPr><w:r><w:t>Second DOCX Heading</w:t></w:r></w:p><w:p><w:r><w:t>Second source</w:t></w:r></w:p></w:body></w:document>'''
gis='''window.google=window.google||{};window.__authCalls=0;window.__revoked=0;window.google.accounts={oauth2:{initTokenClient(config){window.__oauthConfig=config;return {requestAccessToken(){window.__authCalls++;queueMicrotask(()=>{if(window.__oauthMode==='denied')config.callback({error:'access_denied'});else if(window.__oauthMode==='popup')config.error_callback({type:'popup_closed'});else config.callback({access_token:'test-memory-token',expires_in:3600,scope:'https://www.googleapis.com/auth/drive.file'});});}};},hasGrantedAllScopes(response,scope){return response.scope===scope;},revoke(token,callback){window.__revoked++;callback({});}}};'''
picker='''window.google=window.google||{};window.gapi={load(name,options){options.callback();}};window.google.picker={ViewId:{DOCS:'docs'},Feature:{MULTISELECT_ENABLED:'multi'},Action:{PICKED:'picked',CANCEL:'cancel'},DocsView:class{setMimeTypes(value){window.__mime=value;return this;}setIncludeFolders(){return this;}setSelectFolderEnabled(value){window.__foldersSelectable=value;return this;}},PickerBuilder:class{setDeveloperKey(){return this;}setAppId(){return this;}setOAuthToken(){return this;}setOrigin(){return this;}addView(){return this;}enableFeature(){return this;}setCallback(callback){this.callback=callback;return this;}build(){const callback=this.callback;return {setVisible(visible){if(visible)queueMicrotask(()=>callback(window.__pickerCancel?{action:'cancel'}:{action:'picked',docs:[{id:'doc-one',mimeType:'application/vnd.google-apps.document'},{id:'doc-two',mimeType:'application/vnd.google-apps.document'}]}));}};}}};'''
# Tests run against a blank Google config so the deployed site-config.mjs never changes their behaviour.
BLANK_CONFIG="export const SITE_CONFIG={google:{clientId:'',apiKey:'',projectNumber:''}};"
def blank_config(context):
 context.route('**/pt-atlas/site-config.mjs',lambda route:route.fulfill(content_type='text/javascript',body=BLANK_CONFIG));return context
try:
 with sync_playwright() as p:
  browser=p.chromium.launch(executable_path=shutil.which('chromium') or os.environ.get('PT_ATLAS_CHROMIUM') or None,args=['--no-sandbox'])
  context=blank_config(browser.new_context(accept_downloads=True));page=context.new_page();errors=[];requests=[]
  page.on('pageerror',lambda error:errors.append(str(error)))
  page.on('request',lambda request:requests.append(request.url))
  page.on('dialog',lambda dialog:dialog.accept())
  context.route('https://accounts.google.com/gsi/client',lambda route:route.fulfill(content_type='text/javascript',body=gis))
  context.route('https://apis.google.com/js/api.js',lambda route:route.fulfill(content_type='text/javascript',body=picker))
  def api(route):
   request=route.request
   cors={'access-control-allow-origin':'*','access-control-allow-headers':'Authorization','access-control-allow-methods':'GET, OPTIONS'}
   if request.method=='OPTIONS':route.fulfill(status=204,headers=cors);return
   assert request.headers.get('authorization')=='Bearer test-memory-token'
   if page.evaluate('Boolean(window.__apiFail)'): route.fulfill(status=403,headers=cors,content_type='application/json',body='{}');return
   first='doc-one' in request.url
   if '/drive/' in request.url: result={'name':'Google Source One' if first else 'Google Source Two','mimeType':'application/vnd.google-apps.document','modifiedTime':'2026-10-28T01:00:00Z'}
   else: result={'body':{'content':[{'paragraph':{'paragraphStyle':{'namedStyleType':'HEADING_1'},'elements':[{'textRun':{'content':'Google Heading One\n' if first else 'Google Heading Two\n'}}]}},{'paragraph':{'elements':[{'textRun':{'content':'Original Google source text\n'}}]}}]}}
   route.fulfill(headers=cors,content_type='application/json',body=json.dumps(result))
  context.route('https://www.googleapis.com/drive/v3/files/*',api)
  context.route('https://docs.googleapis.com/v1/documents/*',api)
  page.goto(f'http://127.0.0.1:{server.server_port}/pt-atlas/');page.wait_for_function('navigator.serviceWorker.controller !== null')
  def action(label):page.get_by_role('button',name=label,exact=True).click()
  def importer():page.locator('[data-nav="import"]').first.click()
  def upload(data,name='sample.docx'):page.locator('#textFile').set_input_files({'name':name,'mimeType':'application/vnd.openxmlformats-officedocument.wordprocessingml.document','buffer':data})
  importer();assert not any(url.startswith(('https://accounts.google.com/','https://apis.google.com/','https://www.googleapis.com/','https://docs.googleapis.com/')) for url in requests)
  upload(docx(xml));page.get_by_text('DOCX text extracted locally.',exact=False).wait_for();text=page.locator('#importText').input_value();assert '# DOCX Heading' in text and '- List source & literal <script>' in text and 'Cell A\tCell B' in text and 'Deleted source' not in text
  page.locator('#splitSections').check();action('Review batch import');assert page.locator('[data-draft]').count()==2;action('Confirm import');page.get_by_text('Imported 2 entries locally; 0 skipped.').wait_for()
  importer();upload(b'broken zip');page.get_by_text('Import failed: Not a valid DOCX ZIP archive.').wait_for();assert page.locator('#importText').input_value()==''
  upload(docx('<!DOCTYPE a [<!ENTITY e SYSTEM "https://invalid.example/">]><a/>'));page.get_by_text('Import failed:',exact=False).wait_for();assert not any('invalid.example' in url for url in requests)
  action('Choose Google Docs');page.get_by_text('Enter a web OAuth client ID',exact=False).wait_for();assert not any('accounts.google.com' in url for url in requests)
  page.locator('details').evaluate('(element)=>element.open=true');page.get_by_label('Web OAuth client ID').fill('web.apps.googleusercontent.com');page.get_by_label('Picker API key').fill('public-key');page.get_by_label('Google Cloud project number').fill('12345');action('Save Google setup');action('Choose Google Docs');page.get_by_text('Google connection ready.',exact=False).wait_for()
  page.evaluate('window.__oauthMode="denied"');action('Choose Google Docs');page.get_by_text('Google import failed: Google access was denied.',exact=False).wait_for()
  page.evaluate('window.__oauthMode="popup"');action('Choose Google Docs');page.get_by_text('Google import failed: Google sign-in was cancelled',exact=False).wait_for()
  page.evaluate('window.__oauthMode="success";window.__pickerCancel=true');action('Choose Google Docs');page.get_by_text('Selection cancelled.',exact=False).wait_for()
  assert page.evaluate('window.__oauthConfig.scope')=='https://www.googleapis.com/auth/drive.file';assert page.evaluate('window.__foldersSelectable') is False
  page.evaluate('window.__pickerCancel=false;window.__apiFail=true');action('Choose Google Docs');page.get_by_text('Google import failed: Google denied document access.',exact=False).wait_for();assert page.locator('#batchForm').count()==0
  page.evaluate('window.__apiFail=false');page.locator('#googleSplit').check();action('Choose Google Docs');page.get_by_role('heading',name='Review imported entries').wait_for();assert page.locator('[data-draft]').count()==2;page.get_by_text('Source: Google Source One',exact=False).wait_for();action('Confirm import');page.get_by_text('Imported 2 entries locally; 0 skipped.').wait_for()
  page.locator('[data-nav="settings"]').first.click()
  with page.expect_download() as download:action('Export JSON backup')
  data=json.loads(Path(download.value.path()).read_text());google=[entry for entry in data['interventions'] if entry.get('sourceType')=='google-doc'];assert len(google)==2;assert {entry['sourceDocumentId'] for entry in google}=={'doc-one','doc-two'};assert all(entry['sourceModifiedAt']=='2026-10-28T01:00:00Z' for entry in google)
  stored=page.evaluate('JSON.stringify(localStorage)');assert 'test-memory-token' not in stored;assert 'test-memory-token' not in json.dumps(data)
  importer();action('Disconnect Google');page.get_by_text('Google access disconnected.',exact=False).wait_for();assert page.evaluate('window.__revoked')==1
  context.set_offline(True);upload(docx(xml),'offline.docx');page.get_by_text('DOCX text extracted locally.',exact=False).wait_for();action('Choose Google Docs');page.get_by_text('Google import failed: Google import needs an internet connection.',exact=False).wait_for();action('Review batch import');page.get_by_role('heading',name='Review imported entries').wait_for();action('Cancel import');assert page.locator('#batchForm').count()==0
  assert not errors,errors
  browser.close();print('PASS: DOCX headings/lists/tables/escaping, corrupt ZIP and XML rejection, offline DOCX; Google on-demand libraries, setup validation, denied/popup/cancel/403 flows, selected-file scope, reviewed multi-doc import and provenance, token privacy and disconnect (mock APIs).')
finally:server.shutdown()
