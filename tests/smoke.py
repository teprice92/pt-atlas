import functools, http.server, json, os, shutil, threading
from pathlib import Path
from playwright.sync_api import sync_playwright
root=Path(__file__).resolve().parents[1]
class Quiet(http.server.SimpleHTTPRequestHandler):
 def log_message(self,*args): pass
server=http.server.ThreadingHTTPServer(('127.0.0.1',0),functools.partial(Quiet,directory=str(root.parent)))
threading.Thread(target=server.serve_forever,daemon=True).start()
try:
 with sync_playwright() as p:
  browser=p.chromium.launch(executable_path=shutil.which('chromium') or None,args=['--no-sandbox'])
  context=browser.new_context(accept_downloads=True)
  page=context.new_page();errors=[];page.on('pageerror',lambda e:errors.append(str(e)))
  page.on('dialog',lambda dialog:dialog.accept())
  page.goto(f'http://127.0.0.1:{server.server_port}/pt-atlas/')
  page.get_by_role('heading',name='Clinical knowledge,').wait_for()
  page.wait_for_function('navigator.serviceWorker.controller !== null')
  def action(name):
   page.get_by_role('button',name=name,exact=True).click()
   if name=='Save intervention': page.locator('#interventionForm').wait_for(state='detached')
   if name=='Save condition': page.locator('#conditionForm').wait_for(state='detached')
  action('＋ Add intervention');page.get_by_label('Intervention name').fill('Test entry');page.get_by_label('Condition',exact=True).fill('Hip Osteoarthritis');page.get_by_label('Personal clinical notes').fill('Persisted note');action('Save intervention')
  page.get_by_role('heading',name='Test entry',exact=True).wait_for()
  action('Edit intervention');page.get_by_label('Intervention name').fill('Updated entry');action('Save intervention');action('♡ Favorite');page.get_by_role('button',name='♥ Favorited',exact=True).wait_for()
  page.reload();page.locator('[data-nav="favorites"]').first.click();page.get_by_role('heading',name='Updated entry').wait_for()
  page.locator('[data-nav="library"]').first.click();page.locator('[data-condition="Hip Osteoarthritis"]').click();action('Edit condition');page.get_by_label('Condition name').fill('Renamed condition');page.get_by_label('Personal notes',exact=True).fill('Condition note');action('Save condition');page.get_by_text('Condition note',exact=True).wait_for();page.get_by_role('heading',name='Updated entry').wait_for()
  page.locator('[data-nav="settings"]').first.click()
  with page.expect_download() as downloaded: action('↓ Export JSON backup')
  backup=json.loads(Path(downloaded.value.path()).read_text());assert len(backup['interventions'])==1;assert backup['interventions'][0]['condition']=='Renamed condition'
  page.locator('[data-nav="library"]').first.click();page.locator('[data-open]').first.click();action('Delete');page.get_by_role('heading',name='Your library',exact=True).wait_for();assert page.locator('[data-open]').count()==0
  page.locator('[data-nav="import"]').first.click();page.locator('#restoreFile').set_input_files({'name':'backup.json','mimeType':'application/json','buffer':json.dumps(backup).encode()});page.get_by_text('Backup imported successfully').wait_for()
  malformed=json.loads(json.dumps(backup));malformed['interventions'][0]['name']='Must not persist';malformed['conditions'].append({'id':'bad'})
  page.locator('#restoreFile').set_input_files({'name':'invalid.json','mimeType':'application/json','buffer':json.dumps(malformed).encode()})
  page.locator('[data-nav="library"]').first.click();page.get_by_role('heading',name='Updated entry').wait_for();assert page.get_by_text('Must not persist',exact=True).count()==0
  page.get_by_label('Search library').fill('Persisted note');page.get_by_role('heading',name='Updated entry').wait_for()
  page.locator('[data-nav="import"]').first.click();page.locator('#importText').fill('Imported title\nSource text');action('Review as new intervention →');assert page.get_by_label('Intervention name').input_value()=='Imported title';assert page.get_by_label('Personal clinical notes').input_value()=='Imported title\nSource text';action('Save intervention')
  page.locator('[data-nav="import"]').first.click();page.locator('#importText').fill('# Batch A\nOriginal A\n## Batch B\nOriginal B');page.locator('#splitSections').check();action('Review batch import');assert page.locator('[data-draft]').count()==2;action('Confirm import');page.get_by_text('Imported 2 entries locally; 0 skipped.').wait_for()
  page.locator('[data-nav="import"]').first.click();page.locator('#importText').fill('# Batch A\nAdditional source');action('Review batch import');action('Confirm import');page.get_by_text('No entries to import. 1 skipped.').wait_for();page.locator('[name="decision-0"]').select_option('merge');action('Confirm import');page.locator('[data-open]').filter(has_text='View').first.wait_for()
  context.set_offline(True);page.reload();page.locator('[data-nav="library"]').first.click();page.get_by_role('heading',name='Updated entry').wait_for();action('＋ Add intervention');page.get_by_label('Intervention name').fill('Offline entry');action('Save intervention');page.reload();page.locator('[data-nav="library"]').first.click();page.get_by_role('heading',name='Offline entry').wait_for()
  page.set_viewport_size({'width':390,'height':844});assert page.evaluate('document.documentElement.scrollWidth <= window.innerWidth');page.screenshot(path='/tmp/pt-atlas-mobile.png',full_page=True)
  assert not errors,errors
  browser.close();print('PASS: subpath loading; intervention CRUD; favorites; condition rename/notes; persistence; export/import; malformed backup atomicity; search; paste review; offline reload/CRUD; mobile layout; no JS errors')
finally: server.shutdown()
