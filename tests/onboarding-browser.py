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
  context=blank_config(browser.new_context(accept_downloads=True));page=context.new_page();errors=[]
  page.on('pageerror',lambda e:errors.append(str(e)));page.on('dialog',lambda d:d.accept())
  base=f'http://127.0.0.1:{server.server_port}/pt-atlas/'
  def go(route):page.goto(base+route);page.wait_for_load_state()
  def action(name):page.get_by_role('button',name=name,exact=True).click()
  go('');page.get_by_role('heading',name='Clinical knowledge,').wait_for()
  guide=page.locator('section.guide');guide.get_by_text('0 of 3 done').wait_for()
  # The tour is optional, keyboard friendly and closes with Escape.
  guide.get_by_role('button',name='Take the tour').click();tour=page.get_by_role('dialog');tour.get_by_role('heading',name='Welcome to PT Atlas').wait_for()
  for title in ['Organize the way you think','Bring in what you already have','Keep it safe and everywhere']:
   page.keyboard.press('Enter');tour.get_by_role('heading',name=title).wait_for()  # focus sits on Next
  tour.get_by_role('button',name='Back').click();tour.get_by_role('heading',name='Bring in what you already have').wait_for()
  page.keyboard.press('Escape');tour.wait_for(state='detached');page.wait_for_function("localStorage.getItem('atlas-tour')==='done'&&!document.querySelector('dialog')")
  # The Word template downloads from the checklist and imports with every labelled field filled.
  with page.expect_download() as downloaded: guide.get_by_role('link',name='Get the template').click()
  docx=Path(downloaded.value.path()).read_bytes();assert docx[:2]==b'PK' and downloaded.value.suggested_filename=='PT Atlas template.docx'
  go('#/import');page.get_by_role('heading',name='Start with the template').wait_for()
  page.locator('#textFile').set_input_files({'name':'PT Atlas template.docx','mimeType':'application/vnd.openxmlformats-officedocument.wordprocessingml.document','buffer':docx})
  page.get_by_text('DOCX text extracted locally.',exact=False).wait_for();text=page.locator('#importText').input_value()
  assert 'Each Heading 1 becomes' not in text  # guidance lives in comments and is never imported
  page.locator('#splitSections').check();action('Review batch import');assert page.locator('[data-draft]').count()==2
  value=lambda name:page.locator(f'[name="{name}"]').input_value()
  assert value('title-0')=='[Intervention name]';assert value('f-category-0')=='Therapeutic Exercise'
  for key,placeholder in [('purpose','[Clinical purpose'),('setup','[Starting position'),('instructions','[Steps and cues'),('dosage','[Dosage exactly'),('equipment','[Equipment'),('progressions','[How to progress'),('precautions','[Precautions and'),('source','[Citations')]:
   assert value(f'f-{key}-0').startswith(placeholder),key
  assert value('notes-0')=='[Optional summary. Text without a label stays in Notes.]';assert value('f-dosage-1').startswith('[Dosage exactly')
  page.locator('[name="title-0"]').fill('Template entry');action('Confirm import');page.get_by_text('Imported 2 entries locally',exact=False).wait_for()
  # The Markdown template maps the same way.
  go('#/import')
  with page.expect_download() as downloaded: page.get_by_role('link',name='Plain-text template (.md)').click()
  md=Path(downloaded.value.path()).read_text();go('#/import');page.locator('#importText').fill(md);page.locator('#splitSections').check();action('Review batch import')
  assert page.locator('[name="f-precautions-0"]').input_value().startswith('[Precautions and');action('Cancel import')
  # Checklist progress: entries and imports are done; exporting a backup completes it, and it is remembered.
  go('');guide.get_by_text('2 of 3 done').wait_for()
  with page.expect_download(): guide.get_by_role('button',name='Export a backup').click()
  page.reload();assert page.locator('section.guide').count()==0  # all required steps done: the card retires itself
  go('#/settings');page.get_by_text('Last backup exported',exact=False).wait_for();action('Show getting-started checklist');page.locator('section.guide').get_by_text('3 of 3 done').wait_for()
  page.get_by_role('button',name='Hide getting-started checklist').click();page.get_by_text('Checklist hidden.',exact=False).wait_for();page.reload();assert page.locator('section.guide').count()==0
  go('#/settings');action('Take the tour');page.get_by_role('dialog').get_by_role('heading',name='Welcome to PT Atlas').wait_for();page.get_by_role('button',name='Skip tour').click();page.get_by_role('dialog').wait_for(state='detached')
  # Mobile layout keeps the checklist and tour within the screen.
  page.set_viewport_size({'width':390,'height':844});go('#/settings');action('Show getting-started checklist');page.locator('section.guide').wait_for();assert page.evaluate('document.documentElement.scrollWidth <= window.innerWidth')
  page.locator('section.guide').get_by_role('button',name='Take the tour').click();box=page.get_by_role('dialog').bounding_box();assert box['x']>=0 and box['x']+box['width']<=390
  # Every checklist button stays inside its card at phone, tablet and desktop widths, including with enlarged text.
  OVERFLOW="()=>[...document.querySelectorAll('.guide-steps li')].flatMap(li=>{const r=li.getBoundingClientRect();return [...li.querySelectorAll('.btn')].filter(b=>{const x=b.getBoundingClientRect();return x.right>r.right+0.5||x.left<r.left-0.5}).map(b=>b.textContent.trim())})"
  for width in [320,390,768,1024,1280]:
   for scale in ['100%','130%']:
    page.set_viewport_size({'width':width,'height':900});go('');page.locator('section.guide').wait_for()
    if scale!='100%':page.add_style_tag(content='.guide *{font-size:%s !important}'%scale)
    assert page.evaluate(OVERFLOW)==[],(width,scale,page.evaluate(OVERFLOW))
  assert not errors,errors
  browser.close();print('PASS: getting-started checklist (progress, auto-retire, hide/show), keyboard tour with Escape, Word template download and round-trip import with all fields mapped and comments excluded, Markdown template, last-backup record, mobile layout, checklist buttons contained at 320–1280px and 130% text')
finally: server.shutdown()
