import base64, functools, http.server, json, os, shutil, threading
from pathlib import Path
from playwright.sync_api import sync_playwright
root=Path(__file__).resolve().parents[1]
class Quiet(http.server.SimpleHTTPRequestHandler):
 def log_message(self,*args): pass
server=http.server.ThreadingHTTPServer(('127.0.0.1',0),functools.partial(Quiet,directory=str(root.parent)))
threading.Thread(target=server.serve_forever,daemon=True).start()
# 1x1 PNG and a minimal PDF; an SVG renamed to .png must be refused because the type comes from the bytes.
PNG=base64.b64decode('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==')
PDF=b'%PDF-1.4\n1 0 obj<<>>endobj\ntrailer<<>>\n%%EOF'
SVG=b'<svg xmlns="http://www.w3.org/2000/svg" onload="alert(1)"></svg>'
try:
 with sync_playwright() as p:
  browser=p.chromium.launch(executable_path=shutil.which('chromium') or os.environ.get('PT_ATLAS_CHROMIUM') or None,args=['--no-sandbox'])
  context=browser.new_context(accept_downloads=True)
  page=context.new_page();errors=[];alerts=[]
  page.on('pageerror',lambda e:errors.append(str(e)));page.on('dialog',lambda d:(alerts.append(d.message),d.accept()))
  base=f'http://127.0.0.1:{server.server_port}/pt-atlas/'
  def go(route):page.goto(base+route);page.wait_for_load_state()
  def action(name):page.get_by_role('button',name=name,exact=True).click()
  go('');page.get_by_role('heading',name='Clinical knowledge,').wait_for()
  # The logo and name return home, on desktop and mobile.
  go('#/settings');page.get_by_role('heading',name='Settings').wait_for()
  page.get_by_role('link',name='PT Atlas home').click();page.get_by_role('heading',name='Clinical knowledge,').wait_for();assert page.evaluate('location.hash')=='#/'
  page.set_viewport_size({'width':390,'height':844});go('#/library');page.get_by_role('heading',name='Your library').wait_for()
  page.get_by_role('link',name='PT Atlas home').click();page.get_by_role('heading',name='Clinical knowledge,').wait_for()
  page.set_viewport_size({'width':1280,'height':900})
  # Custom regions: add, duplicate refused, appear in library and editor, rename cascades, delete blocked while used.
  go('#/settings');page.get_by_label('New body region name').fill('Pelvic Health');action('Add region');page.get_by_text('Added region Pelvic Health').wait_for();page.locator('.region-list').get_by_text('0 entries',exact=True).wait_for()
  page.get_by_label('New body region name').fill('hip');action('Add region');page.wait_for_timeout(200);assert any('already exists' in a for a in alerts),alerts
  go('#/library');page.locator('[data-region="Pelvic Health"]').click();page.get_by_role('heading',name='Pelvic Health',exact=True).wait_for()
  action('Add condition');page.get_by_label('Condition name').fill('Pelvic Floor Dysfunction');assert page.get_by_label('Body region').input_value()=='Pelvic Health';action('Save condition');page.get_by_role('heading',name='Pelvic Floor Dysfunction',exact=True).wait_for()
  action('Add intervention');page.get_by_label('Intervention name').fill('Diaphragmatic breathing')
  page.get_by_label('Personal clinical notes').fill('# Cues\n- **Slow** exhale\n- _Relax_ the jaw\n\nSee [reference](https://example.org/ref) and <img src=x onerror=alert(2)>')
  action('Save intervention');page.get_by_role('heading',name='Diaphragmatic breathing',exact=True).wait_for()
  notes=page.locator('.numbered').filter(has_text='Personal notes')
  assert notes.locator('h3',has_text='Cues').count()==1 and notes.locator('li strong',has_text='Slow').count()==1 and notes.locator('li em',has_text='Relax').count()==1
  link=notes.get_by_role('link',name='reference');assert link.get_attribute('href')=='https://example.org/ref' and link.get_attribute('rel')=='noopener noreferrer'
  assert notes.locator('img').count()==0 and '<img src=x' in notes.inner_text()
  go('#/settings');assert page.get_by_role('button',name='Delete region Pelvic Health').is_disabled()
  page.get_by_label('Name for Pelvic Health').fill("Pelvic & Women's Health");action('Rename');page.get_by_text("Renamed region to Pelvic & Women's Health").wait_for()
  go("#/region/Pelvic%20%26%20Women's%20Health");page.reload();page.get_by_role('heading',name="Pelvic & Women's Health",exact=True).wait_for();page.get_by_role('heading',name='Diaphragmatic breathing').wait_for()
  # Attachments: PNG and PDF accepted by content, disguised SVG refused, persisted, exported.
  page.locator('[data-open]').first.click();page.get_by_role('heading',name='Diaphragmatic breathing',exact=True).wait_for()
  page.locator('#mediaFile').set_input_files([{'name':'cue.png','mimeType':'image/png','buffer':PNG},{'name':'handout.pdf','mimeType':'application/pdf','buffer':PDF},{'name':'trick.png','mimeType':'image/png','buffer':SVG}])
  page.get_by_text('Added 2 attachments').wait_for();page.get_by_text('Skipped: trick.png',exact=False).wait_for()
  page.reload();page.locator('.media-grid li').nth(1).wait_for();assert page.locator('.media-grid li').count()==2
  img=page.locator('.media-grid img');img.wait_for();assert page.evaluate("document.querySelector('.media-grid img').naturalWidth")==1
  assert page.locator('.media-thumb.pdf').get_attribute('href').startswith('blob:')
  go('#/settings');page.get_by_text('2 attachments using',exact=False).wait_for()
  with page.expect_download() as downloaded: action('Export JSON backup')
  data=json.loads(Path(downloaded.value.path()).read_text());assert data['version']==3 and len(data['media'])==2 and data['regions'][0]['name']=="Pelvic & Women's Health"
  assert {m['type'] for m in data['media']}=={'image/png','application/pdf'};assert base64.b64decode([m for m in data['media'] if m['type']=='image/png'][0]['data'])==PNG
  # Restore into a fresh profile: region, entry and attachments come back.
  fresh=browser.new_context();other=fresh.new_page();other.on('dialog',lambda d:d.accept());other.on('pageerror',lambda e:errors.append(str(e)))
  other.goto(base+'#/import');other.locator('#restoreFile').set_input_files({'name':'v3.json','mimeType':'application/json','buffer':json.dumps(data).encode()});other.get_by_text('Backup imported successfully').wait_for()
  other.goto(base+"#/region/Pelvic%20%26%20Women's%20Health");other.locator('[data-open]').first.click();other.locator('.media-grid img').wait_for();assert other.locator('.media-grid li').count()==2
  fresh.close()
  # Deleting the intervention keeps attachments for restore until purged.
  go('#/library');page.locator('[data-region="Pelvic & Women\'s Health"]').click();page.locator('[data-open]').first.click();action('Delete');page.get_by_role('heading',name='Your library').wait_for()
  go('#/settings');page.get_by_text('belong to deleted interventions',exact=False).wait_for()
  page.get_by_role('button',name='Restore Diaphragmatic breathing').click();page.locator('.media-grid img').wait_for()
  page.get_by_role('button',name='Delete',exact=True).click();page.get_by_role('heading',name='Your library').wait_for();go('#/settings');action('Remove attachments of deleted entries');page.get_by_text('Removed 2 attachments').wait_for();page.get_by_text('No attachments yet.').wait_for()
  # A region still holding a condition cannot be deleted; once empty it can.
  page.get_by_role('button',name="Delete region Pelvic & Women's Health").wait_for();assert page.get_by_role('button',name="Delete region Pelvic & Women's Health").is_disabled()
  go("#/condition/Pelvic%20%26%20Women's%20Health/Pelvic%20Floor%20Dysfunction");action('Edit condition');action('Delete condition');page.wait_for_timeout(300)
  go('#/settings');page.get_by_role('button',name="Delete region Pelvic & Women's Health").click();page.get_by_text('Region deleted').wait_for()
  page.set_viewport_size({'width':390,'height':844});go('#/settings');assert page.evaluate('document.documentElement.scrollWidth <= window.innerWidth')
  assert not errors,errors
  browser.close();print('PASS: logo/name link home (desktop, mobile); custom regions add/duplicate refusal/rename cascade/deep link/delete guard; safe Markdown notes; attachments sniffed by content with SVG refused, persisted, exported and restored; orphan retention, restore and purge; mobile overflow')
finally: server.shutdown()
