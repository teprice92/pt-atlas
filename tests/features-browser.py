import functools, http.server, json, os, shutil, threading
from pathlib import Path
from playwright.sync_api import sync_playwright
root=Path(__file__).resolve().parents[1]
class Quiet(http.server.SimpleHTTPRequestHandler):
 def log_message(self,*args): pass
server=http.server.ThreadingHTTPServer(('127.0.0.1',0),functools.partial(Quiet,directory=str(root.parent)))
threading.Thread(target=server.serve_forever,daemon=True).start()
# Tests run against a blank Google config so the deployed site-config.mjs never changes their behaviour.
BLANK_CONFIG="export const SITE_CONFIG={google:{clientId:'',apiKey:'',projectNumber:''}};"
def blank_config(context):
 context.route('**/pt-atlas/site-config.mjs',lambda route:route.fulfill(content_type='text/javascript',body=BLANK_CONFIG));return context
try:
 with sync_playwright() as p:
  browser=p.chromium.launch(executable_path=shutil.which('chromium') or os.environ.get('PT_ATLAS_CHROMIUM') or None,args=['--no-sandbox'])
  context=blank_config(browser.new_context(accept_downloads=True,color_scheme='dark'))
  page=context.new_page();errors=[];external=[]
  page.on('pageerror',lambda e:errors.append(str(e)));page.on('dialog',lambda dialog:dialog.accept())
  page.on('request',lambda r:external.append(r.url) if not r.url.startswith(('http://127.0.0.1','data:','blob:')) else None)
  page.goto(f'http://127.0.0.1:{server.server_port}/pt-atlas/')
  page.get_by_role('heading',name='Clinical knowledge,').wait_for()
  # System theme follows the OS; explicit choices persist across reloads.
  assert page.evaluate('document.documentElement.dataset.theme')=='dark'
  page.locator('[data-nav="settings"]').first.click();page.get_by_role('button',name='Light',exact=True).click()
  assert page.evaluate('document.documentElement.dataset.theme')=='light';page.reload();page.get_by_role('heading',name='Settings').wait_for()
  assert page.evaluate('document.documentElement.dataset.theme')=='light';assert page.get_by_role('button',name='Light',exact=True).get_attribute('aria-pressed')=='true'
  page.get_by_text('Storage is',exact=False).wait_for()
  def add(name,region,condition,category,status=None,setup=''):
   page.locator('[data-nav="library"]').first.click();page.get_by_role('button',name='Add intervention',exact=True).click()
   page.get_by_label('Intervention name').fill(name);page.get_by_label('Body region').select_option(region);page.get_by_label('Condition',exact=True).fill(condition);page.get_by_label('Intervention type').select_option(category)
   if setup:page.get_by_label('Setup & positioning').fill(setup)
   if status:page.get_by_label('Review status').select_option(status)
   page.get_by_role('button',name='Save intervention',exact=True).click();page.locator('#interventionForm').wait_for(state='detached')
  add('Alpha drill','Hip','Hip Osteoarthritis','Therapeutic Exercise','reviewed','Supine, hook-lying')
  page.get_by_text('Supine, hook-lying',exact=True).wait_for();page.get_by_text('Reviewed',exact=False).first.wait_for()
  assert page.locator('dd',has_text='Reviewed ·').count()==1  # reviewed date auto-filled
  add('Beta drill','Knee','Patellofemoral Pain','Gait Training')
  page.get_by_role('button',name='Favorite',exact=True).click();page.get_by_role('button',name='Favorited',exact=True).wait_for()
  # Library filters narrow interventions by type, review status and favorites.
  page.locator('[data-nav="library"]').first.click();rows=lambda:page.locator('.list [data-open]').count()
  assert rows()==2
  page.locator('[data-filter="category"]').select_option('Gait Training');assert rows()==1;page.get_by_role('heading',name='Beta drill').wait_for()
  page.locator('[data-filter="category"]').select_option('');page.locator('[data-filter="status"]').select_option('reviewed');assert rows()==1;page.get_by_role('heading',name='Alpha drill').wait_for()
  page.locator('[data-filter="status"]').select_option('');page.locator('[data-filter="favorites"]').check();assert rows()==1;page.get_by_role('heading',name='Beta drill').wait_for()
  # Search across fields with region filter.
  page.locator('[data-filter="favorites"]').uncheck()
  page.get_by_label('Search library').fill('drill');page.get_by_role('heading',name='Results for',exact=False).wait_for();assert rows()==2
  page.locator('[data-filter="region"]').select_option('Hip');assert rows()==1;page.get_by_role('heading',name='Alpha drill').wait_for()
  page.get_by_label('Search library').press('Escape');page.get_by_role('heading',name='Your library').wait_for()
  # Region page and condition tabs with keyboard navigation.
  page.locator('[data-region="Hip"]').first.click();page.get_by_role('heading',name='Hip',exact=True).wait_for()
  page.locator('[data-condition="Hip Osteoarthritis"]').click()
  overview=page.get_by_role('tab',name='Overview');assert overview.get_attribute('aria-selected')=='true'
  overview.focus();page.keyboard.press('ArrowRight');assert page.get_by_role('tab',name='Precautions').get_attribute('aria-selected')=='true'
  assert page.evaluate("document.activeElement.id")=='tab-precautions';page.get_by_text('Always verify patient-specific orders',exact=False).wait_for()
  page.keyboard.press('End');page.get_by_role('tab',name='Notes').wait_for();assert page.get_by_role('tab',name='Notes').get_attribute('aria-selected')=='true'
  page.get_by_role('tab',name='Protocols').click();page.get_by_text('depend on the treating surgeon',exact=False).wait_for()
  page.get_by_role('tab',name='Interventions').click();page.get_by_role('heading',name='Alpha drill').wait_for()
  # Hash routes survive refresh and support back navigation and deep links.
  assert page.evaluate('location.hash')=='#/condition/Hip/Hip%20Osteoarthritis';page.reload();page.get_by_role('heading',name='Hip Osteoarthritis',exact=True).wait_for()
  page.go_back();page.get_by_role('heading',name='Hip',exact=True).wait_for()
  page.goto(f'http://127.0.0.1:{server.server_port}/pt-atlas/#/favorites');page.get_by_role('heading',name='Your favorites').wait_for();page.get_by_role('heading',name='Beta drill').wait_for()
  # New fields survive export.
  page.locator('[data-nav="settings"]').first.click()
  with page.expect_download() as downloaded: page.get_by_role('button',name='Export JSON backup',exact=True).click()
  data=json.loads(Path(downloaded.value.path()).read_text());alpha=[x for x in data['interventions'] if x['name']=='Alpha drill'][0]
  assert alpha['setup']=='Supine, hook-lying' and alpha['reviewStatus']=='reviewed' and alpha['reviewedAt']
  # Sidebar collapse persists; keyboard shortcut focuses search.
  page.get_by_role('button',name='Collapse sidebar').click();page.reload();page.get_by_role('button',name='Expand sidebar').wait_for()
  page.locator('body').press('/');assert page.evaluate("document.activeElement.id")=='globalSearch'
  # Privacy and terms pages are reachable from the app and load offline once cached.
  page.goto(f'http://127.0.0.1:{server.server_port}/pt-atlas/#/settings');page.locator('.footer').get_by_role('link',name='Privacy').click();page.get_by_role('heading',name='Privacy Policy',exact=True).wait_for()
  page.get_by_text('including the Limited Use requirements',exact=False).wait_for();page.locator('.legal-top').get_by_role('link',name='Terms').click();page.get_by_role('heading',name='Terms of Service',exact=True).wait_for()
  context.set_offline(True);page.reload();page.get_by_role('heading',name='Terms of Service',exact=True).wait_for();page.goto(f'http://127.0.0.1:{server.server_port}/pt-atlas/privacy.html');page.get_by_role('heading',name='Privacy Policy',exact=True).wait_for();context.set_offline(False)
  page.get_by_role('link',name='PT Atlas home').click();page.get_by_role('heading',name='Clinical knowledge,').wait_for()
  assert not external,external
  assert not errors,errors
  browser.close();print('PASS: theme persistence; storage status; setup/review fields; library and search filters; region page; condition tabs with keyboard; hash routing refresh/back/deep link; export of new fields; sidebar collapse; search shortcut; privacy/terms pages incl. offline; no third-party requests')
finally: server.shutdown()
