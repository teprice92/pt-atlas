import functools, http.server, json, os, shutil, threading
from pathlib import Path
from playwright.sync_api import sync_playwright
root=Path(__file__).resolve().parents[1]
class Quiet(http.server.SimpleHTTPRequestHandler):
 def log_message(self,*args): pass
server=http.server.ThreadingHTTPServer(('127.0.0.1',0),functools.partial(Quiet,directory=str(root.parent)))
threading.Thread(target=server.serve_forever,daemon=True).start()
# A database written by v0.5 (schema version 1) must upgrade in place without losing records.
SEED_V1='''()=>new Promise((resolve,reject)=>{const r=indexedDB.open('pt-atlas-library',1);r.onupgradeneeded=()=>{const d=r.result;d.createObjectStore('interventions',{keyPath:'id'});d.createObjectStore('conditions',{keyPath:'id'})};
r.onsuccess=()=>{const d=r.result,t=d.transaction(['interventions','conditions'],'readwrite');
t.objectStore('conditions').put({id:'c-tha',name:'Total Hip Arthroplasty (THA)',region:'Hip',overview:'',precautions:'',protocol:'Legacy protocol text',source:''});
t.objectStore('conditions').put({id:'c-oa',name:'Hip Osteoarthritis',region:'Hip',overview:'',precautions:'',protocol:'',source:''});
t.objectStore('interventions').put({id:'i-bridge',name:'Bridge',region:'Hip',condition:'Total Hip Arthroplasty (THA)',category:'Therapeutic Exercise',notes:'Legacy note',favorite:false,updated:'2026-01-01'});
t.objectStore('interventions').put({id:'i-old',name:'Annual check item',region:'Hip',condition:'',category:'Other',reviewStatus:'reviewed',reviewedAt:'2020-01-01',favorite:false,updated:'2020-01-01'});
t.oncomplete=()=>{d.close();resolve()};t.onerror=()=>reject(t.error)}})'''
try:
 with sync_playwright() as p:
  browser=p.chromium.launch(executable_path=shutil.which('chromium') or os.environ.get('PT_ATLAS_CHROMIUM') or None,args=['--no-sandbox'])
  context=browser.new_context(accept_downloads=True)
  page=context.new_page();errors=[];page.on('pageerror',lambda e:errors.append(str(e)));page.on('dialog',lambda dialog:dialog.accept())
  base=f'http://127.0.0.1:{server.server_port}/pt-atlas/'
  page.goto(base+'icon.svg');page.evaluate(SEED_V1)
  page.goto(base);page.get_by_role('heading',name='Clinical knowledge,').wait_for()
  assert page.evaluate("new Promise(r=>{const q=indexedDB.open('pt-atlas-library');q.onsuccess=()=>{r([q.result.version,[...q.result.objectStoreNames].sort().join(',')]);q.result.close()}})")==[4,'collections,conditions,interventions,links,media,meta,phases,regions,revisions']
  def go(route):page.goto(base+route);page.wait_for_load_state()
  def action(name):page.get_by_role('button',name=name,exact=True).click()
  # Review-due indicator and filter.
  go('#/library');page.locator('.badge',has_text='Review due').first.wait_for()
  page.locator('[data-filter="status"]').select_option('due');assert page.locator('.list [data-open]').count()==1;page.get_by_role('heading',name='Annual check item').wait_for()
  # Many-to-many: link Bridge to a second condition with condition-specific details.
  go('#/intervention/i-bridge');page.get_by_role('heading',name='Bridge',exact=True).wait_for()
  action('Link to a condition');page.get_by_label('Linked condition').select_option(label='Hip Osteoarthritis')
  page.get_by_label('Condition-specific dosage').fill('Dosage from OA source');page.get_by_label('Condition-specific restrictions').fill('OA-only restriction');action('Save link')
  page.get_by_text('OA-only restriction',exact=True).wait_for()
  go('#/condition/Hip/Hip%20Osteoarthritis');page.get_by_role('tab',name='Interventions').click();page.get_by_role('heading',name='Bridge').wait_for();page.get_by_text('Dosage from OA source').wait_for()
  go('#/condition/Hip/Total%20Hip%20Arthroplasty%20(THA)');page.get_by_role('tab',name='Interventions').click();page.get_by_role('heading',name='Bridge').wait_for();assert page.get_by_text('Dosage from OA source').count()==0
  # Structured protocol phases with linked interventions and ordering; legacy protocol text is preserved.
  page.get_by_role('tab',name='Protocols').click();page.get_by_text('Legacy protocol text').wait_for()
  for name,frame in [('Protection','As written: first period'),('Strength','As written: second period')]:
   action('Add phase');page.get_by_label('Phase name').fill(name);page.get_by_label('Timeframe').fill(frame);page.get_by_label('Criteria to progress').fill(name+' criteria from surgeon protocol');page.get_by_label('Source / protocol name').fill('Surgeon protocol');page.get_by_label('Bridge').check();action('Save phase')
   page.get_by_role('heading',name=name,exact=True).wait_for()
  titles=lambda:page.locator('.phase h3').all_inner_texts()
  assert titles()==['Protection','Strength'];page.get_by_role('button',name='Move Strength earlier').click();page.wait_for_function("document.querySelector('.phase h3').textContent==='Strength'")
  assert titles()==['Strength','Protection'];assert page.locator('.phase').first.get_by_role('button',name='Bridge').count()==1
  page.reload();page.get_by_role('tab',name='Protocols').click();assert titles()==['Strength','Protection']
  # Revision history: edit, then restore the earlier version.
  go('#/intervention/i-bridge');action('Edit intervention');page.get_by_label('Intervention name').fill('Bridge (edited)');action('Save intervention');page.get_by_role('heading',name='Bridge (edited)',exact=True).wait_for()
  page.locator('.history').get_by_role('button',name='Restore').first.click();page.get_by_role('heading',name='Bridge',exact=True).wait_for()
  assert page.locator('.history li').count()==2  # before-edit and before-restore versions
  # Collections: create from the detail page, add another item, reorder, print view is available.
  action('New collection');page.get_by_label('Collection name').fill('Hip set');action('Save collection');page.get_by_role('heading',name='Hip set').wait_for();assert page.locator('.collection-list > li').count()==1
  go('#/intervention/i-old');page.locator('#collectionPick').select_option(label='Hip set');action('Add to collection');page.get_by_text('Added to Hip set').wait_for()
  go('#/collections');page.locator('[data-collection]').first.click();order=lambda:page.locator('.collection-list .no-print h3').all_inner_texts()
  assert order()==['Bridge','Annual check item'];page.get_by_role('button',name='Move Annual check item up').click();page.wait_for_function("document.querySelector('.collection-list .no-print h3').textContent==='Annual check item'")
  page.emulate_media(media='print');assert page.locator('.print-only').first.is_visible() and not page.locator('.topbar').is_visible();page.emulate_media(media='screen')
  # Search reaches condition-link text and ranks title matches first.
  page.get_by_label('Search library').fill('OA-only');page.get_by_role('heading',name='Bridge').wait_for()
  page.get_by_label('Search library').fill('bridge');assert page.locator('.list [data-open]').count()>=1;assert page.locator('mark').first.inner_text().lower()=='bridge'
  page.get_by_label('Search library').fill('')
  # Delete and recover with links; deleting a condition removes and restores its phases.
  go('#/intervention/i-bridge');action('Delete');page.get_by_role('heading',name='Your library').wait_for()
  go('#/settings');page.get_by_role('button',name='Restore Bridge').click();page.get_by_role('heading',name='Bridge',exact=True).wait_for();page.get_by_text('OA-only restriction',exact=True).wait_for()
  go('#/condition/Hip/Total%20Hip%20Arthroplasty%20(THA)');action('Edit condition');action('Delete condition');page.get_by_role('heading',name='Hip',exact=True).wait_for()
  assert page.evaluate("new Promise(r=>{const q=indexedDB.open('pt-atlas-library');q.onsuccess=()=>{const t=q.result.transaction('phases').objectStore('phases').count();t.onsuccess=()=>{r(t.result);q.result.close()}}})")==0
  go('#/settings');page.get_by_role('button',name='Restore Total Hip Arthroplasty (THA)').click();page.get_by_role('heading',name='Total Hip Arthroplasty (THA)',exact=True).wait_for()
  page.get_by_role('tab',name='Protocols').click();assert titles()==['Strength','Protection']
  # Version 2 backup round trip into a clean profile.
  go('#/settings')
  with page.expect_download() as downloaded: action('Export JSON backup')
  data=json.loads(Path(downloaded.value.path()).read_text());assert data['version']==3
  assert len(data['links'])==1 and len(data['phases'])==2 and len(data['collections'])==1 and len(data['revisions'])>=3
  fresh=browser.new_context();other=fresh.new_page();alerts=[];other.on('dialog',lambda d:(alerts.append(d.message),d.accept()));other.on('pageerror',lambda e:errors.append(str(e)))
  # A starter condition that the user has filled in must not be silently duplicated or overwritten.
  other.goto(base+'#/condition/Hip/Hip%20Osteoarthritis');other.get_by_role('button',name='Edit condition',exact=True).click();other.get_by_label('Clinical overview').fill('My own overview');other.get_by_role('button',name='Save condition',exact=True).click();other.locator('#conditionForm').wait_for(state='detached')
  other.goto(base+'#/import');other.locator('#restoreFile').set_input_files({'name':'v2.json','mimeType':'application/json','buffer':json.dumps(data).encode()});other.wait_for_function('true');other.wait_for_timeout(300)
  assert any('already exist with different content: Hip Osteoarthritis' in a for a in alerts),alerts
  assert other.evaluate("new Promise(r=>{const q=indexedDB.open('pt-atlas-library');q.onsuccess=()=>{const t=q.result.transaction('phases').objectStore('phases').count();t.onsuccess=()=>{r(t.result);q.result.close()}}})")==0
  other.goto(base+'#/condition/Hip/Hip%20Osteoarthritis');other.get_by_role('button',name='Edit condition',exact=True).click();other.get_by_role('button',name='Delete condition',exact=True).click();other.get_by_role('heading',name='Hip',exact=True).wait_for()
  other.goto(base+'#/import');other.locator('#restoreFile').set_input_files({'name':'v2.json','mimeType':'application/json','buffer':json.dumps(data).encode()});other.get_by_text('Backup imported successfully').wait_for()
  other.goto(base+'#/condition/Hip/Total%20Hip%20Arthroplasty%20(THA)');other.get_by_role('tab',name='Protocols').click();assert other.locator('.phase h3').all_inner_texts()==['Strength','Protection']
  other.goto(base+'#/collections');other.get_by_role('heading',name='Hip set').wait_for()
  fresh.close()
  page.set_viewport_size({'width':390,'height':844});go('#/condition/Hip/Total%20Hip%20Arthroplasty%20(THA)');page.get_by_role('tab',name='Protocols').click();assert page.evaluate('document.documentElement.scrollWidth <= window.innerWidth')
  assert not errors,errors
  browser.close();print('PASS: v1→v4 schema upgrade; review-due indicator/filter; many-to-many condition links with condition-specific details; structured protocol phases with ordering and linked interventions; revision restore; collections with ordering and print view; search over links with highlighting; delete/recover interventions and conditions with links and phases; v2 backup round trip with starter-condition de-duplication and conflict refusal; mobile overflow')
finally: server.shutdown()
