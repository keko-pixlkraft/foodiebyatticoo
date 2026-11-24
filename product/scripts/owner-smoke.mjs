
import { spawn } from 'node:child_process';
import { mkdtemp, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { once } from 'node:events';
import assert from 'node:assert/strict';
import { createPreviewServer } from './dev.mjs';

const server=createPreviewServer().listen(0,'127.0.0.1');
await once(server,'listening');
const base='http://127.0.0.1:'+server.address().port;
const chrome=spawn('C:/Program Files/Google/Chrome/Application/chrome.exe',[
'--headless=new','--no-first-run','--remote-debugging-port=0',
'--user-data-dir='+await mkdtemp(join(tmpdir(),'mizora-')),'about:blank'
],{windowsHide:true,stdio:['ignore','ignore','pipe']});
let ws;
try {
const port=await new Promise((resolve,reject)=>{
const timer=setTimeout(()=>reject(Error('Chrome timeout')),10000);
chrome.stderr.on('data',chunk=>{const p=String(chunk).match(/DevTools listening on ws:\/\/127.0.0.1:(\d+)/)?.[1];if(p){clearTimeout(timer);resolve(p);}});
});
const pages=await (await fetch('http://127.0.0.1:'+port+'/json/list')).json();
ws=new WebSocket(pages.find(p=>p.type==='page').webSocketDebuggerUrl);await once(ws,'open');
let id=0;const pending=new Map();const errors=[];const network=[];
ws.addEventListener('message',e=>{
const msg=JSON.parse(e.data);
if(pending.has(msg.id)){const {ok,fail}=pending.get(msg.id);pending.delete(msg.id);msg.error?fail(Error(msg.error.message)):ok(msg.result);}
if(msg.method==='Runtime.exceptionThrown')errors.push(msg.params.exceptionDetails.exception?.description);
if(msg.method==='Network.responseReceived'&&msg.params.response.url.startsWith(base)&&msg.params.response.status>=400)network.push(msg.params.response.url);
});
const send=(method,params={})=>new Promise((ok,fail)=>{pending.set(++id,{ok,fail});ws.send(JSON.stringify({id,method,params}));});
const run=async(fn,data=null)=>{const r=await send('Runtime.evaluate',{expression:'('+fn+')('+JSON.stringify(data)+')',awaitPromise:true,returnByValue:true});if(r.exceptionDetails)throw Error(r.exceptionDetails.exception.description);return r.result.value;};
await send('Runtime.enable');await send('Page.enable');await send('Network.enable');
const goto=async(path)=>{
await send('Page.navigate',{url:base+path});
for(let i=0;i<120;i++){if(await run(()=>!!document.querySelector('.phone-screen,.owner-main')))return;await new Promise(r=>setTimeout(r,100));}throw Error('App boot timeout '+errors+' '+JSON.stringify(await run(()=>({url:location.href,state:document.readyState,body:document.body?.innerHTML.slice(0,400)}))));
};
const size=async(w,h=900)=>send('Emulation.setDeviceMetricsOverride',{width:w,height:h,deviceScaleFactor:1,mobile:w<500});
const screenshot=async(name)=>{
await run(async()=>{await Promise.all([...document.images].filter(i=>i.getClientRects().length).map(i=>{i.loading='eager';return i.decode();}));window.scrollTo(0,0);await document.fonts.ready;await Promise.all(document.getAnimations().map(animation=>animation.finished.catch(()=>{})));await new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve)));});
await new Promise(resolve=>setTimeout(resolve,200));
const r=await send('Page.captureScreenshot',{format:'png'});
await writeFile(join(process.env.FOODIE_SCREENSHOTS||process.env.TEMP,'mizora-'+name+'.png'),Buffer.from(r.data,'base64'));
};
const setup=()=>{
window.$=s=>document.querySelector(s);
window.$$=s=>[...document.querySelectorAll(s)];
window.check=(ok,msg)=>{if(!ok)throw Error(msg);};
window.tap=(a,v,id)=>{const s='[data-act="'+a+'"]'+(v===undefined?'':'[data-value="'+v+'"]')+(id===undefined?'':'[data-id="'+id+'"]');const el=$$(s).find(e=>e.getClientRects().length);check(el,s);el.click();};
window.closeDialog=()=>document.dispatchEvent(new KeyboardEvent('keydown',{key:'Escape'}));
};
await size(1440,960);await goto('/?restaurant=mizora&embed=owner');await run(setup);
await run(()=>{
check(!$('.owner-nav [data-value=appearance]')&&!$('.owner-preview'),'focused owner navigation');
check($$('.owner-menu-table tbody tr').length===24,'24 menu rows');
check(getComputedStyle($('.app-wrap')).backgroundColor==='rgb(21, 18, 17)','dark palette');
tap('toggle-dish',undefined,'mizora-03');check($('[data-act=toggle-dish][data-id=mizora-03]').getAttribute('aria-checked')==='false','availability toggles');
});
await goto('/?restaurant=mizora&embed=owner');await run(setup);
await run(()=>{check($('[data-act=toggle-dish][data-id=mizora-03]').getAttribute('aria-checked')==='false','availability persists');tap('toggle-dish',undefined,'mizora-03');
const search=$('#owner-search');search.value='Hamachi';search.dispatchEvent(new Event('input',{bubbles:true}));check($$('.owner-menu-table tbody tr').length===2,'search');tap('filter','tapas');check($$('.owner-menu-table tbody tr').length===3,'category filter resets search as before');tap('filter','all');
const reset=$('#owner-search');reset.value='';reset.dispatchEvent(new Event('input',{bubbles:true}));});
await screenshot('owner-menu-dark');
await run(()=>{tap('edit',undefined,'mizora-03');check($$('.owner-allergen-options [name=allergen]').length===14,'14 allergen controls');check($$('.owner-allergen-options [name=allergen]').every(el=>el.parentElement.querySelector('svg')),'allergen icons');check(document.activeElement.classList.contains('icon-close'),'editor initial focus');});
await screenshot('owner-editor-dark');
await run(()=>$('.allergen-editor:not(.dietary-editor)').scrollIntoView({block:'start'}));await screenshot('owner-allergens-dark');
await run(()=>{const form=$('#dish-form');form.elements.price.value='33.5';form.elements.nutrition_kcal.value='275';form.elements.nutrition_source.value='entered';form.querySelector('[name=allergen][value="Tree nuts"]').checked=true;form.requestSubmit();check(!$('#dish-form'),'save editor');check($('[data-act=edit][data-id=mizora-03]').closest('tr').textContent.includes('33.5'),'price saved');});
await goto('/?restaurant=mizora&embed=owner');await run(setup);
await run(()=>{tap('edit',undefined,'mizora-03');const form=$('#dish-form');check(form.elements.nutrition_kcal.value==='275'&&form.querySelector('[name=allergen][value="Tree nuts"]').checked,'nutrition/allergen persistence');form.elements.price.value='32';form.elements.nutrition_kcal.value='350';form.elements.nutrition_source.value='sample';form.querySelector('[name=allergen][value="Tree nuts"]').checked=false;form.requestSubmit();tap('owner-tab','qr');});
await screenshot('owner-qr-dark');
const decoder=await (await import('node:fs/promises')).readFile(new URL('./vendor/jsQR.cjs',import.meta.url),'utf8');
await send('Runtime.evaluate',{expression:decoder});
await run(async base=>{
for(let table=1;table<=24;table++){
const number=String(table).padStart(2,'0'),image=new Image();image.src=base+'/assets/qr-mizora/table-'+number+'.svg';await image.decode();
const canvas=document.createElement('canvas');canvas.width=600;canvas.height=600;const context=canvas.getContext('2d');context.drawImage(image,0,0,600,600);const data=context.getImageData(0,0,600,600);
const code=jsQR(data.data,600,600);check(code?.data==='https://example.com/mizora?table='+number,'branded QR decodes '+number);
}
},base);
console.log('All 24 branded QR images decoded with the restaurant logo.');
await run(()=>{window.downloadUrl='';HTMLAnchorElement.prototype.click=function(){window.downloadUrl=this.href;window.downloadName=this.download;};tap('download-qr','7');});
for(let attempt=0;attempt<40;attempt++){if(await run(()=>!!window.downloadUrl))break;await new Promise(resolve=>setTimeout(resolve,25));}
await run(async()=>{check(downloadName.endsWith('_DEMO.png'),'PNG download filename');const blob=await (await fetch(downloadUrl)).blob();check(blob.type==='image/png','PNG format');const image=await createImageBitmap(blob),canvas=document.createElement('canvas');canvas.width=1024;canvas.height=1024;const context=canvas.getContext('2d');context.drawImage(image,0,0);const pixels=context.getImageData(0,0,1024,1024);check(jsQR(pixels.data,1024,1024)?.data==='https://example.com/mizora?table=07','downloaded PNG decodes');tap('new-table');check($$('.table-qr').length===13,'add table');tap('toggle-table','7');check($('[data-act=test-table][data-value="7"]').disabled,'paused table');tap('toggle-table','7');});
await goto('/?restaurant=mizora');await run(setup);
await run(()=>{tap('mode','overview');for(const id of ['mizora-03','mizora-03','mizora-16','mizora-08']){tap('mode','overview');tap('open',undefined,id);}tap('language');tap('set-language','de');tap('language');tap('set-language','en');tap('mode','overview');tap('open',undefined,'mizora-03');tap('add',undefined,'mizora-03');tap('surface','owner');tap('owner-tab','analytics');check($('.language-stat').textContent.includes('English'),'language analytics');tap('analytics-view','local');check($('.traffic-summary').textContent.includes('local'),'local traffic');tap('analytics-view','sample');check($('.traffic-summary').textContent.includes('illustrative'),'sample traffic clearly marked');});
await goto('/?restaurant=mizora&embed=owner');await run(setup);await run(()=>tap('owner-tab','analytics'));
await screenshot('owner-analytics-dark');
for(const width of [320,390,430,1280,1440]){
await size(width,width<500?844:960);
await run(async width=>{for(const tab of ['menu','media','events','qr','analytics','settings']){tap('owner-tab',tab);await Promise.all([...document.images].filter(image=>image.getClientRects().length).map(image=>{image.loading='eager';return image.decode();}));check(document.documentElement.scrollWidth<=width,'owner overflow '+tab+' '+width);}tap('owner-tab','menu');tap('edit',undefined,'mizora-03');check($('[role=dialog]').getBoundingClientRect().width<=width,'editor fits '+width);closeDialog();},width);
if(width===390)await screenshot('owner-menu-mobile');console.log('Owner layouts passed '+width+'px');
}
await goto('/?restaurant=aurel-house&embed=owner');await run(setup);await run(()=>{check($$('.owner-menu-table tbody tr').length===17,'Aurel menu isolation');check(getComputedStyle($('.app-wrap')).backgroundColor==='rgb(21, 18, 17)','standard owner palette across restaurants');});
assert.deepEqual(errors,[]);assert.deepEqual(network,[]);console.log('Owner availability, editor, QR downloads, analytics, persistence and profile isolation passed.');
 } finally {
  if(ws?.readyState===WebSocket.OPEN){ws.send(JSON.stringify({id:999999,method:'Browser.close'}));await Promise.race([once(chrome,'exit'),new Promise(resolve=>setTimeout(resolve,1500))]);}
  ws?.close();if(chrome.exitCode===null)chrome.kill();server.close();
}
