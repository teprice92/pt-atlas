export const DRIVE_SCOPE='https://www.googleapis.com/auth/drive.file';
export const APPDATA_SCOPE='https://www.googleapis.com/auth/drive.appdata';
const DOC_MIME='application/vnd.google-apps.document';
export const MAX_DOCS=25,MAX_SYNC_DOCS=100;
let readyPromise, accessToken='', expiresAt=0, session=0, granted=false, grantedScopes=new Set();
export function validateGoogleConfig(config){
  if(!/^[a-zA-Z0-9._-]+\.apps\.googleusercontent\.com$/.test(config?.clientId?.trim()||'')||!config.apiKey?.trim()||!/^\d+$/.test(config.projectNumber?.trim()||''))throw Error('Enter a web OAuth client ID, Picker API key, and numeric Google Cloud project number.');
  return {clientId:config.clientId.trim(),apiKey:config.apiKey.trim(),projectNumber:config.projectNumber.trim()};
}
export function googleReady(){return !!globalThis.google?.accounts?.oauth2&&!!globalThis.google?.picker;}
function script(url){return new Promise((resolve,reject)=>{
  const element=document.createElement('script');element.src=url;element.async=true;
  const timer=setTimeout(()=>{element.remove();reject(Error('Google libraries timed out. Check your connection and retry.'));},20000);
  element.onload=()=>{clearTimeout(timer);resolve();};element.onerror=()=>{clearTimeout(timer);element.remove();reject(Error('Google libraries could not load. Check your connection.'));};document.head.append(element);
});}
export function prepareGoogle(){
  if(googleReady())return Promise.resolve();
  if(!readyPromise)readyPromise=Promise.all([script('https://accounts.google.com/gsi/client'),script('https://apis.google.com/js/api.js')]).then(()=>new Promise((resolve,reject)=>{
    const timer=setTimeout(()=>reject(Error('Google Picker timed out.')),20000);
    globalThis.gapi.load('picker',{callback:()=>{clearTimeout(timer);resolve();},onerror:()=>{clearTimeout(timer);reject(Error('Google Picker could not load.'));}});
  })).catch(error=>{readyPromise=null;throw error;});
  return readyPromise;
}
// Access tokens are kept in memory only. Scopes are requested incrementally: imports need drive.file; sync adds
// drive.appdata (the hidden per-app folder) only when the user turns sync on.
function token(config,scopes=[DRIVE_SCOPE]){
  if(accessToken&&Date.now()<expiresAt&&scopes.every(scope=>grantedScopes.has(scope)))return Promise.resolve(accessToken);
  const wanted=[...new Set([...grantedScopes,...scopes])],adding=scopes.some(scope=>!grantedScopes.has(scope));
  return new Promise((resolve,reject)=>{
    const attempt=session;let settled=false;const fail=message=>{if(settled)return;settled=true;clearTimeout(timer);reject(Error(message));};const timer=setTimeout(()=>fail('Google sign-in timed out. Please retry.'),120000);
    const client=google.accounts.oauth2.initTokenClient({client_id:config.clientId,scope:wanted.join(' '),include_granted_scopes:true,
      callback:response=>{if(settled)return;clearTimeout(timer);if(attempt!==session)return reject(Error('Google access was disconnected.'));
        if(response.error||!response.access_token)return fail('Google access was denied. Nothing was imported or synced.');
        if(!google.accounts.oauth2.hasGrantedAllScopes(response,...scopes))return fail(scopes.includes(APPDATA_SCOPE)?'Google did not grant access to the PT Atlas sync folder.':'Google did not grant access to selected files.');
        settled=true;granted=true;accessToken=response.access_token;grantedScopes=new Set([...grantedScopes,...String(response.scope||scopes.join(' ')).split(' ').filter(Boolean)]);expiresAt=Date.now()+Math.max(0,Number(response.expires_in||0)-60)*1000;resolve(accessToken);
      },error_callback:()=>fail('Google sign-in was cancelled or the popup was blocked. Please retry.')});
    // Ask for consent the first time in a session or when adding a permission; otherwise Google reuses the grant.
    client.requestAccessToken({prompt:granted&&!adding?'':'consent'});
  });
}
function picker(config,bearer){return new Promise((resolve,reject)=>{
  const view=new google.picker.DocsView(google.picker.ViewId.DOCS).setMimeTypes(DOC_MIME).setIncludeFolders(true).setSelectFolderEnabled(false);
  const dialog=new google.picker.PickerBuilder().setDeveloperKey(config.apiKey).setAppId(config.projectNumber).setOAuthToken(bearer).setOrigin(location.origin).addView(view).enableFeature(google.picker.Feature.MULTISELECT_ENABLED).setCallback(data=>{
    if(data.action===google.picker.Action.CANCEL){dialog.setVisible(false);resolve([]);}
    if(data.action===google.picker.Action.PICKED){dialog.setVisible(false);const docs=data.docs||[];if(docs.length>MAX_DOCS)return reject(Error(`Choose at most ${MAX_DOCS} Google Docs per import.`));if(docs.some(doc=>doc.mimeType&&doc.mimeType!==DOC_MIME))return reject(Error('Choose Google Docs documents only.'));resolve(docs);}
    if(data.action==='error'){dialog.setVisible(false);reject(Error('Google Picker failed. Check Google Cloud API and key settings.'));}
  }).build();dialog.setVisible(true);
});}
export function googleDocumentText(document){
  function elements(content=[]){return content.map(element=>{
    if(element.paragraph){const p=element.paragraph,text=(p.elements||[]).map(e=>e.textRun?.content||'').join('').trimEnd();const heading=/^HEADING_([1-6])$/.exec(p.paragraphStyle?.namedStyleType||'');return (heading?'#'.repeat(Number(heading[1]))+' ':p.bullet?'- ':'')+text;}
    if(element.table)return (element.table.tableRows||[]).map(row=>(row.tableCells||[]).map(cell=>elements(cell.content).replace(/\n+/g,' / ')).join('\t')).join('\n');
    if(element.tableOfContents)return elements(element.tableOfContents.content);
    return '';
  }).filter(Boolean).join('\n\n');}
  function tabs(list=[]){return list.map(tab=>[elements(tab.documentTab?.body?.content),tabs(tab.childTabs)].filter(Boolean).join('\n\n')).filter(Boolean).join('\n\n');}
  const text=document.tabs?.length?tabs(document.tabs):elements(document.body?.content);
  if(!text.trim())throw Error('No text found in the selected Google Doc.');
  if(text.length>5_000_000)throw Error('Google Doc exceeds the 5 MB text limit.');
  return text.trim();
}
async function json(url,bearer,fetcher){
  const response=await fetcher(url,{headers:{Authorization:'Bearer '+bearer},cache:'no-store',signal:AbortSignal.timeout(30000)});
  if(!response.ok){if(response.status===401){accessToken='';expiresAt=0;throw Error('Google access expired. Reconnect and retry.');}if(response.status===403)throw Error('Google denied document access. Check API setup and select the file again.');if(response.status===429)throw Error('Google rate limit reached. Wait and retry.');throw Error('Unable to read Google document (HTTP '+response.status+').');}
  // Bound API responses as well as extracted text.
  const reader=response.body.getReader(),chunks=[];let size=0;
  try{while(true){const {done,value}=await reader.read();if(done)break;size+=value.length;if(size>12_000_000)throw Error('Google document response is too large.');chunks.push(value);}}
  catch(error){await reader.cancel().catch(()=>{});throw error;}
  const bytes=new Uint8Array(size);let offset=0;for(const chunk of chunks){bytes.set(chunk,offset);offset+=chunk.length;}return JSON.parse(new TextDecoder().decode(bytes));
}
export async function readGoogleDocuments(selected,bearer,{fetcher=fetch,split=false,now=new Date().toISOString()}={}){
  if(selected.length>MAX_DOCS)throw Error(`Choose at most ${MAX_DOCS} Google Docs per import.`);
  const documents=[];
  for(const selection of selected){
    if(!/^[\w-]+$/.test(selection.id||''))throw Error('Invalid Google document ID.');
    const id=encodeURIComponent(selection.id);
    const metadata=await json('https://www.googleapis.com/drive/v3/files/'+id+'?fields=id,name,mimeType,modifiedTime,webViewLink',bearer,fetcher);
    if(metadata.mimeType!==DOC_MIME)throw Error('Only native Google Docs documents are supported.');
    const content=await json('https://docs.googleapis.com/v1/documents/'+id+'?includeTabsContent=true&suggestionsViewMode=PREVIEW_WITHOUT_SUGGESTIONS',bearer,fetcher);
    documents.push({text:googleDocumentText(content),split,metadata:{documentTitle:metadata.name||content.title||'Google Doc',source:'https://docs.google.com/document/d/'+id+'/edit',fileName:metadata.name||'',fileModifiedAt:metadata.modifiedTime||'',sourceDocumentId:selection.id,importedAt:now,sourceType:'google-doc'}});
  }
  return documents;
}
export async function chooseGoogleDocuments(configuration,{split=false}={}){
  const config=validateGoogleConfig(configuration);if(!googleReady())throw Error('Load Google connection first.');
  const attempt=session,bearer=await token(config),selected=await picker(config,bearer);
  if(attempt!==session)throw Error('Google import was disconnected.');
  const documents=await readGoogleDocuments(selected,bearer,{split});if(attempt!==session)throw Error('Google import was disconnected.');return documents;
}
export const googleConnected=()=>!!accessToken&&Date.now()<expiresAt;
// Signs in (or reuses a live token) without opening Picker. Must run from a click so the popup is allowed.
export async function connectGoogle(configuration,scopes=[DRIVE_SCOPE]){const config=validateGoogleConfig(configuration);if(!googleReady())throw Error('Load Google connection first.');await token(config,scopes);return true}
// One-way re-sync: compares Drive modified times for documents imported earlier. drive.file keeps access to files
// this app was given through Picker, so no broader Drive permission is needed. Unavailable files are reported, not fatal.
export async function checkGoogleUpdates(linked,bearer,{fetcher=fetch}={}){
  const byId=new Map();for(const entry of linked){if(!/^[\w-]+$/.test(entry.sourceDocumentId||''))continue;const known=byId.get(entry.sourceDocumentId);if(!known||(entry.sourceModifiedAt||'')<known)byId.set(entry.sourceDocumentId,entry.sourceModifiedAt||'')}
  if(byId.size>MAX_SYNC_DOCS)throw Error(`Check at most ${MAX_SYNC_DOCS} linked Google Docs at once.`);
  const results=[];
  for(const [id,known] of byId){
    try{const meta=await json('https://www.googleapis.com/drive/v3/files/'+encodeURIComponent(id)+'?fields=id,name,mimeType,modifiedTime,trashed',bearer,fetcher);
      if(meta.trashed||meta.mimeType!==DOC_MIME){results.push({id,name:meta.name||'',status:'unavailable'});continue}
      results.push({id,name:meta.name||'',modifiedTime:meta.modifiedTime||'',status:(meta.modifiedTime||'')>known?'changed':'current'});
    }catch(error){if(/expired|rate limit/.test(error.message))throw error;results.push({id,name:'',status:'unavailable',reason:error.message})}
  }
  return results;
}
export async function googleToken(configuration,scopes=[DRIVE_SCOPE]){const config=validateGoogleConfig(configuration);if(!googleReady())throw Error('Load Google connection first.');return token(config,scopes)}
export const googleHasScope=scope=>googleConnected()&&grantedScopes.has(scope);
export function disconnectGoogle(){
  granted=false;grantedScopes=new Set();
  session++;const previous=accessToken;accessToken='';expiresAt=0;
  if(previous&&globalThis.google?.accounts?.oauth2)google.accounts.oauth2.revoke(previous,()=>{});
}
