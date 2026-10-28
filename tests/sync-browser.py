import base64, functools, http.server, json, os, re, shutil, threading, time
from pathlib import Path
from playwright.sync_api import sync_playwright
root=Path(__file__).resolve().parents[1]
class Quiet(http.server.SimpleHTTPRequestHandler):
 def log_message(self,*args): pass
server=http.server.ThreadingHTTPServer(('127.0.0.1',0),functools.partial(Quiet,directory=str(root.parent)))
threading.Thread(target=server.serve_forever,daemon=True).start()
SITE_CONFIG="export const SITE_CONFIG={google:{clientId:'site-client.apps.googleusercontent.com',apiKey:'site-key',projectNumber:'999'}};"
# Google Identity Services mock that grants exactly the scopes requested.
GIS='''window.google=window.google||{};window.__revoked=0;window.__scopes=[];window.google.accounts={oauth2:{initTokenClient(config){return {requestAccessToken(){window.__scopes.push(config.scope);queueMicrotask(()=>config.callback({access_token:'sync-token',expires_in:3600,scope:config.scope}))}}},hasGrantedAllScopes(response,...scopes){const granted=String(response.scope).split(' ');return scopes.every(s=>granted.includes(s))},revoke(token,callback){window.__revoked++;callback({})}}};'''
PICKER="window.google=window.google||{};window.gapi={load(name,options){options.callback()}};window.google.picker={};"
PNG=base64.b64decode('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==')
# One shared in-memory Google Drive appDataFolder for both "devices".
# Playwright's sync API runs route handlers on this thread, interleaved inside API calls, so no lock is used (a lock
# held across route.fulfill could deadlock against the next handler).
drive={};counter=[0]
CORS={'access-control-allow-origin':'*','access-control-allow-headers':'Authorization, Content-Type','access-control-allow-methods':'GET, POST, PATCH, DELETE, OPTIONS'}
def handle(route):
 request=route.request;url=request.url;method=request.method
 if method=='OPTIONS':route.fulfill(status=204,headers=CORS);return
 assert request.headers.get('authorization')=='Bearer sync-token'
 file_id=(re.search(r'/files/([^?]+)',url) or [None,None])[1]
 if True:
  if method=='GET' and not file_id:
   assert 'spaces=appDataFolder' in url
   body={'files':[{'id':k,'name':v['name'],'version':str(v['version']),'size':str(len(v['data']))} for k,v in drive.items()]}
   route.fulfill(headers=CORS,content_type='application/json',body=json.dumps(body));return
  if method=='GET' and 'alt=media' in url:
   f=drive.get(file_id)
   if not f:route.fulfill(status=404,headers=CORS,body='');return
   route.fulfill(headers=CORS,body=f['data']);return
  if method=='GET':
   f=drive.get(file_id);route.fulfill(headers=CORS,content_type='application/json',body=json.dumps({'id':file_id,'version':str(f['version'])}));return
  if method=='POST':
   raw=request.post_data_buffer;boundary=request.headers['content-type'].split('boundary=')[1].encode()
   first=raw.index(b'\r\n\r\n')+4;meta_end=raw.index(b'\r\n--'+boundary,first);meta=json.loads(raw[first:meta_end])
   assert meta['parents']==['appDataFolder']
   start=raw.index(b'\r\n\r\n',meta_end)+4;end=raw.rindex(b'\r\n--'+boundary+b'--')
   counter[0]+=1;fid='file%d'%counter[0];drive[fid]={'name':meta['name'],'data':raw[start:end],'version':1}
   route.fulfill(headers=CORS,content_type='application/json',body=json.dumps({'id':fid,'version':'1'}));return
  if method=='PATCH':
   f=drive[file_id];f['data']=request.post_data_buffer;f['version']+=1
   route.fulfill(headers=CORS,content_type='application/json',body=json.dumps({'id':file_id,'version':str(f['version'])}));return
  if method=='DELETE':
   drive.pop(file_id,None);route.fulfill(status=204,headers=CORS,body='');return
 raise AssertionError('unexpected '+method+' '+url)
def library():
 for f in list(drive.values()):
  if f['name']=='pt-atlas-library.json':return json.loads(f['data'])
 return None
pump=[None]  # a page whose event loop handles the routed Drive requests while we wait
def wait_until(check,timeout=20):
 # page.wait_for_timeout keeps Playwright dispatching route handlers; time.sleep would stall the fake Drive.
 end=time.time()+timeout
 while time.time()<end:
  if check():return
  pump[0].wait_for_timeout(200)
 raise AssertionError('condition not met in time')
try:
 with sync_playwright() as p:
  browser=p.chromium.launch(executable_path=shutil.which('chromium') or os.environ.get('PT_ATLAS_CHROMIUM') or None,args=['--no-sandbox'])
  base=f'http://127.0.0.1:{server.server_port}/pt-atlas/';errors=[]
  def device():
   context=browser.new_context();page=context.new_page()
   page.on('pageerror',lambda e:errors.append(str(e)));page.on('dialog',lambda d:d.accept())
   context.route('**/pt-atlas/site-config.mjs',lambda r:r.fulfill(content_type='text/javascript',body=SITE_CONFIG))
   context.route('https://accounts.google.com/gsi/client',lambda r:r.fulfill(content_type='text/javascript',body=GIS))
   context.route('https://apis.google.com/js/api.js',lambda r:r.fulfill(content_type='text/javascript',body=PICKER))
   context.route('https://www.googleapis.com/drive/v3/files**',handle);context.route('https://www.googleapis.com/upload/drive/v3/files**',handle)
   page.goto(base);page.get_by_role('heading',name='Clinical knowledge,').wait_for();return context,page
  def go(page,route):page.goto(base+route);page.wait_for_load_state()
  def click(page,name):page.get_by_role('button',name=name,exact=True).click()
  def count(page,store):return page.evaluate("s=>new Promise(r=>{const q=indexedDB.open('pt-atlas-library');q.onsuccess=()=>{const t=q.result.transaction(s).objectStore(s).count();t.onsuccess=()=>{r(t.result);q.result.close()}}})",store)
  def enable(page):
   go(page,'#/settings');page.get_by_text('Sync is off on this device.').wait_for()
   click(page,'Turn on Google Drive sync');page.get_by_text('Google connection ready. Click Turn on Google Drive sync again',exact=False).wait_for()
   click(page,'Turn on Google Drive sync');page.get_by_text('Synced:',exact=False).first.wait_for()
   assert 'https://www.googleapis.com/auth/drive.appdata' in page.evaluate('window.__scopes.at(-1)')
  def add(page,name,notes):
   go(page,'#/library');click(page,'Add intervention');page.get_by_label('Intervention name').fill(name);page.get_by_label('Personal clinical notes').fill(notes);click(page,'Save intervention');page.locator('#interventionForm').wait_for(state='detached')
  def open_entry(page,name):go(page,'#/library');page.locator('.row',has=page.get_by_role('heading',name=name,exact=True)).locator('[data-open]').click();page.get_by_role('heading',name=name,exact=True).wait_for()
  def synced_notes(name):lib=library();return next((x.get('notes') for x in (lib or {}).get('interventions',[]) if x['name']==name),None)
  # Device A turns sync on: the library (17 starter conditions) is uploaded to the hidden app folder.
  ctx_a,a=device();enable(a)
  pump[0]=a;wait_until(lambda:library() and len(library()['conditions'])==17)
  a.locator('#syncPill').get_by_text('Synced just now').wait_for()
  # A adds an intervention with an attachment; it syncs automatically shortly after saving.
  add(a,'Shared bridge','Written on A');a.locator('#mediaFile').set_input_files({'name':'cue.png','mimeType':'image/png','buffer':PNG});a.get_by_text('Added 1 attachment').wait_for()
  wait_until(lambda:synced_notes('Shared bridge')=='Written on A' and len(library()['media'])==1)
  # Device B turns sync on: receives everything, and its own starter conditions are not duplicated.
  ctx_b,b=device();enable(b)
  assert count(b,'conditions')==17,count(b,'conditions');open_entry(b,'Shared bridge');b.locator('.media-grid img').wait_for()
  assert b.evaluate("document.querySelector('.media-grid img').naturalWidth")==1
  # An edit on B reaches A with "Sync now".
  click(b,'Edit intervention');b.get_by_label('Personal clinical notes').fill('Edited on B');click(b,'Save intervention');b.locator('#interventionForm').wait_for(state='detached')
  wait_until(lambda:synced_notes('Shared bridge')=='Edited on B')
  go(a,'#/settings');click(a,'Sync now');a.get_by_text(re.compile(r'Synced: \d+ changes? received')).wait_for();open_entry(a,'Shared bridge');a.get_by_text('Edited on B').wait_for()
  # Conflict: B edits while offline, A edits and syncs; when B reconnects, the synced version stays and B's edit is kept in history.
  ctx_b.set_offline(True);open_entry(b,'Shared bridge');click(b,'Edit intervention');b.get_by_label('Personal clinical notes').fill('Offline edit on B');click(b,'Save intervention');b.locator('#interventionForm').wait_for(state='detached')
  b.locator('#syncPill').get_by_text('Sync waiting for connection').wait_for(timeout=10000)
  open_entry(a,'Shared bridge');click(a,'Edit intervention');a.get_by_label('Personal clinical notes').fill('Edit on A');click(a,'Save intervention');a.locator('#interventionForm').wait_for(state='detached')
  wait_until(lambda:synced_notes('Shared bridge')=='Edit on A')
  ctx_b.set_offline(False);b.evaluate("window.dispatchEvent(new Event('online'))")
  b.get_by_text('1 conflict resolved',exact=False).wait_for(timeout=20000)
  open_entry(b,'Shared bridge');b.get_by_text('Edit on A').wait_for()
  history=b.locator('.history');history.get_by_text('Version replaced during sync',exact=False).wait_for()
  history.get_by_role('button',name='Restore').first.click();b.get_by_text('Offline edit on B').wait_for()  # the other version is one click away
  wait_until(lambda:synced_notes('Shared bridge')=='Offline edit on B')
  # A deletion on A reaches B.
  go(a,'#/settings');click(a,'Sync now');a.get_by_text('Synced:',exact=False).first.wait_for();open_entry(a,'Shared bridge');click(a,'Delete');a.get_by_role('heading',name='Your library').wait_for()
  wait_until(lambda:synced_notes('Shared bridge') is None and len(library()['media'])==1)
  go(b,'#/settings');click(b,'Sync now');b.get_by_text('Synced:',exact=False).first.wait_for();go(b,'#/library');assert b.get_by_role('heading',name='Shared bridge',exact=True).count()==0
  # After a reload the session token is gone: sync asks to reconnect instead of failing silently.
  b.reload();b.locator('#syncPill').get_by_text('Sync: connect Google to resume').wait_for()
  go(b,'#/settings');click(b,'Turn off sync');b.get_by_text('Sync turned off on this device').wait_for();assert b.locator('#syncPill').count()==0
  # Removing the synced copy empties the app folder and turns sync off on that device.
  go(a,'#/settings');click(a,'Remove synced copy from Google Drive');a.get_by_text('from Google Drive; sync is off',exact=False).wait_for()
  assert not drive,drive
  assert 'sync-token' not in a.evaluate('JSON.stringify(localStorage)')
  assert not errors,errors
  browser.close();print('PASS: two-device Google Drive sync via hidden app folder: enable with incremental drive.appdata consent, upload, auto-sync after edits, receive on second device with starter-condition de-duplication, attachments both ways, edits via Sync now, offline conflict with history and restore, deletions, reconnect prompt after reload, turn off, remove synced copy, no token persistence (mock Google APIs)')
finally: server.shutdown()
