
import { spawn } from 'node:child_process';
import { mkdtemp, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { once } from 'node:events';
import assert from 'node:assert/strict';
import { createPreviewServer } from './dev.mjs';

const server=createPreviewServer().listen(0,'127.0.0.1');
await once(server,'listening');
const base=process.env.FOODIE_BASE_URL||'http://127.0.0.1:'+server.address().port;
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
await send('Runtime.enable');await send('Page.enable');await send('Network.enable');await send('Emulation.setFocusEmulationEnabled',{enabled:true});
const goto=async(path)=>{
if(process.env.FOODIE_BASE_URL&&path.startsWith('/?'))path='/app.html'+path.slice(1);
await send('Page.navigate',{url:base+path});
for(let i=0;i<120;i++){if(await run(()=>document.readyState==='complete'&&!!document.querySelector('.phone-screen,.owner-main')))return;await new Promise(r=>setTimeout(r,100));}throw Error('App boot timeout '+errors+' '+JSON.stringify(await run(()=>({url:location.href,state:document.readyState,body:document.body?.innerHTML.slice(0,400)}))));
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

await size(1586,992);await goto('/?restaurant=mizora&embed=owner');await run(setup);
await run(async()=>{await document.fonts.ready;check(document.fonts.check('400 40px "Libre Caslon Text"'),'serif loaded');check($$('.owner-menu-table tbody tr').length===24,'24 real dishes');});
await screenshot('OC-01_Menu_Editing_IMPLEMENTED');
await run(()=>{const price=$('[data-dish-price=mizora-03]');price.value='34.75';price.dispatchEvent(new Event('change',{bubbles:true}));const category=$('[data-dish-category=mizora-03]');category.value='tapas';category.dispatchEvent(new Event('change',{bubbles:true}));});
await goto('/?restaurant=mizora&embed=guest&dish=mizora-03');await run(setup);await run(()=>{check($('.hero-price').textContent.includes('34.75'),'inline price sync to guest');tap('mode','overview');tap('category','tapas');check($('.dish-card:not(.is-muted) [data-id=mizora-03]'),'inline category sync to guest');});
await goto('/?restaurant=mizora&embed=owner');await run(setup);await run(()=>{const price=$('[data-dish-price=mizora-03]');check(price.value==='34.75','inline price persisted');price.value='32';price.dispatchEvent(new Event('change',{bubbles:true}));const category=$('[data-dish-category=mizora-03]');category.value='raw';category.dispatchEvent(new Event('change',{bubbles:true}));});
await run(()=>tap('owner-tab','media'));await screenshot('OC-02_Media_Requests_IMPLEMENTED');
await run(()=>{
  const form=$('#media-request-form');form.requestSubmit();check(!$('#media-request-error').hidden,'request requires changes');
  const next=$('#media-request-form');next.querySelector('[value=lighting]').checked=true;next.querySelector('[value=crop]').checked=true;next.elements.note.value='QA: keep the real ingredients unchanged';next.requestSubmit();
  check($('.media-request-row').textContent.includes('Hamachi Crudo'),'request attached to selected dish');
  check($('.media-state').textContent==='Update requested','request status');
});
await goto('/?restaurant=mizora&embed=owner');await run(setup);await run(()=>{tap('owner-tab','media');check($('.media-request-row').textContent.includes('QA:'),'request persistence');tap('media-filter','open');check($$('.media-request-row').length===1,'status filter');tap('media-progress',undefined,$('.media-request-row [data-id]').dataset.id);check(!$('.media-request-row'),'open filter excludes production');tap('media-filter','production');check($$('.media-request-row').length===1,'production status');});

await run(()=>tap('owner-tab','events'));await screenshot('OC-03_Events_IMPLEMENTED');
await run(()=>{const input=$('#event-form [name=date]');input.value='2028-02-28';input.focus();});
await send('Input.dispatchKeyEvent',{type:'keyDown',key:'ArrowUp',code:'ArrowUp',windowsVirtualKeyCode:38});
await send('Input.dispatchKeyEvent',{type:'keyUp',key:'ArrowUp',code:'ArrowUp',windowsVirtualKeyCode:38});
await run(()=>{const input=$('#event-form [name=date]');check(input.value!=='2028-02-28'&&input.checkValidity(),'native date keyboard editing');});
const dateBox=await run(()=>{const rect=$('#event-form [name=date]').getBoundingClientRect();return{x:rect.right-18,y:rect.y+rect.height/2};});
await send('Input.dispatchMouseEvent',{type:'mousePressed',button:'left',clickCount:1,...dateBox});await send('Input.dispatchMouseEvent',{type:'mouseReleased',button:'left',clickCount:1,...dateBox});
await send('Input.dispatchKeyEvent',{type:'keyDown',key:'Escape',code:'Escape',windowsVirtualKeyCode:27});await send('Input.dispatchKeyEvent',{type:'keyUp',key:'Escape',code:'Escape',windowsVirtualKeyCode:27});
await run(()=>{
 const form=$('#event-form');form.elements.title.value='Omakase evening · QA sample';form.elements.date.value='2028-02-29';form.elements.time.value='18:30';form.elements.description.value='Sample event for interaction testing. Not a scheduled restaurant event.';form.requestSubmit();
 check($('.owner-event-row').textContent.includes('QA sample'),'event created');check($('.event-guest-preview').textContent.includes('2028'),'leap day preview');
 window.savedEventId=$('.owner-event-row [data-act=edit-event]').dataset.id;tap('event-filter','upcoming');check($$('.owner-event-row').length===1,'upcoming timing');tap('event-filter','past');check(!$('.owner-event-row'),'timing filter');tap('event-filter','all');
});await screenshot('OC-03_Events_POPULATED_QA');
await goto('/?restaurant=mizora&embed=owner');await run(setup);await run(()=>{tap('owner-tab','events');check($('.owner-event-row').textContent.includes('QA sample'),'event persists');tap('edit-event',undefined,$('.owner-event-row [data-act=edit-event]').dataset.id);check($('#event-form').elements.date.value==='2028-02-29','leap date persists');tap('owner-tab','qr');});
await screenshot('OC-04_QR_Tables_IMPLEMENTED');
await run(async()=>{
 check($$('.table-qr').length===12,'table count');const input=$('#table-search');input.value='07';input.dispatchEvent(new Event('input',{bubbles:true}));check($$('.table-qr').length===1,'table search');
 tap('toggle-table','7');check($('[data-act=test-table]').disabled,'paused preview');tap('qr-filter','active');check(!$('.table-qr'),'combined status search');tap('qr-filter','paused');check($$('.table-qr').length===1,'paused filter');tap('toggle-table','7');tap('qr-filter','all');
 const search=$('#table-search');search.value='';search.dispatchEvent(new Event('input',{bubbles:true}));tap('qr-layout','list');check($('.qr-list-layout'),'list layout');tap('qr-layout','grid');
 Object.defineProperty(navigator,'clipboard',{configurable:true,value:{writeText:async text=>{window.copiedQr=text;}}});tap('copy-qr','7');await new Promise(resolve=>setTimeout(resolve,30));check(window.copiedQr==='https://foodiebyatticoo.vercel.app/guest?restaurant=mizora&table=7','public table menu link');
});

// Drive actual guest interactions to populate local analytics without invented figures.
await goto('/?restaurant=mizora');await run(setup);await run(()=>{tap('mode','overview');for(const id of ['mizora-01','mizora-03','mizora-03','mizora-02']){tap('mode','overview');tap('open',undefined,id);}tap('surface','owner');tap('owner-tab','analytics');check($('.traffic-summary').textContent.includes('local menu opens'),'default chart is local');tap('analytics-view','sample');});
await goto('/?restaurant=mizora&embed=owner');await run(setup);await run(()=>{tap('owner-tab','analytics');tap('analytics-view','sample');});await screenshot('OC-05_Analytics_IMPLEMENTED');
await run(async()=>{
 const point=$('.chart-point');point.focus();check(getComputedStyle(point.querySelector('.chart-callout')).display!=='none','chart keyboard tooltip '+JSON.stringify({active:document.activeElement.className.baseVal,focus:point.matches(':focus'),has:document.hasFocus(),display:getComputedStyle(point.querySelector('.chart-callout')).display}));
 window.downloads=[];window.originalAnchorClick=HTMLAnchorElement.prototype.click;HTMLAnchorElement.prototype.click=function(){window.downloads.push({url:this.href,name:this.download});};
 tap('analytics-export');await new Promise(r=>setTimeout(r,25));const example=JSON.parse(await(await fetch(window.downloads.at(-1).url)).text());check(example.source==='illustrative sample'&&example.total===3501,'example export matches selected series');
 tap('analytics-view','local');tap('analytics-export');await new Promise(r=>setTimeout(r,25));const local=JSON.parse(await(await fetch(window.downloads.at(-1).url)).text());check(local.source==='local browser activity'&&local.total===local.daily.reduce((s,d)=>s+d.value,0)&&local.total<3501,'local export contains measured counts');
 HTMLAnchorElement.prototype.click=window.originalAnchorClick;tap('owner-tab','settings');
});
await screenshot('OC-06_Settings_IMPLEMENTED');
await run(()=>{
 const profile=$('#profile-form');profile.elements.reviewUrl.value='https://example.com/review';profile.requestSubmit();check(!profile.elements.reviewUrl.checkValidity(),'invalid Google URL rejected');
 profile.elements.reviewUrl.value='https://g.page/r/qa-sample/review';profile.elements.reviewUrl.dispatchEvent(new Event('input',{bubbles:true}));profile.elements.instagramUrl.value='https://www.instagram.com/qa-sample/';profile.requestSubmit();
 tap('owner-translations');check($('#dish-form')&&$('.editor-language-group'),'translations open real editor');closeDialog();tap('owner-tab','settings');
 window.confirmCalls=0;window.confirm=()=>{window.confirmCalls++;return false;};tap('reset');check(window.confirmCalls===1&&$('#profile-form').elements.reviewUrl.value.includes('qa-sample'),'reset cancellation retains data');
});
await goto('/?restaurant=mizora&embed=owner');await run(setup);await run(()=>{tap('owner-tab','settings');check($('#profile-form').elements.instagramUrl.value.includes('qa-sample'),'settings persist');});
for(const width of [320,390,430,1280,1586]){
 await size(width,width<500?844:992);
 await run(async width=>{for(const tab of ['menu','media','events','qr','analytics','settings']){tap('owner-tab',tab);await Promise.all([...document.images].filter(i=>i.getClientRects().length).map(i=>{i.loading='eager';return i.decode();}));check(document.documentElement.scrollWidth<=width,'2026 overflow '+tab+' '+width);} },width);
 await run(()=>tap('owner-tab','menu'));if(width===390)await screenshot('Owner_Menu_MOBILE_390');
 console.log('Owner 2026 all six pages fit '+width+'px');
}
// Exercise translated dish edits and complete new-dish lifecycle.
await size(1586,992);await goto('/?restaurant=mizora&embed=owner');await run(setup);
await run(()=>{tap('edit',undefined,'mizora-01');});const previousGerman=await run(()=>$('#dish-form').elements.de_name.value);
await run(()=>{const form=$('#dish-form');form.elements.de_name.value='Prüfgericht · QA';form.requestSubmit();});
await goto('/?restaurant=mizora&embed=guest&dish=mizora-03');await run(setup);await run(()=>{tap('language');tap('set-language','de');tap('mode','overview');tap('open',undefined,'mizora-01');check($('.hero-title-row').textContent.includes('Prüfgericht'),'edited translation reaches guest');});
await goto('/?restaurant=mizora&embed=owner');await run(setup);await run(original=>{tap('edit',undefined,'mizora-01');$('#dish-form').elements.de_name.value=original;$('#dish-form').requestSubmit();tap('new-dish');const form=$('#dish-form');form.elements.name.value='QA temporary dish';form.elements.summary.value='Temporary isolated test record';form.elements.price.value='19.5';form.requestSubmit();check($$('.owner-menu-table tbody tr').length===25,'create dish');const item=$$('.dish-row-name').find(el=>el.textContent.includes('QA temporary dish'));check(item,'new dish visible');item.click();window.confirm=()=>false;tap('delete-dish',undefined,$('[data-act=delete-dish]').dataset.id);check($('#dish-form'),'cancel dish deletion');window.confirm=()=>true;tap('delete-dish',undefined,$('[data-act=delete-dish]').dataset.id);check($$('.owner-menu-table tbody tr').length===24,'delete dish');tap('owner-tab','media');const picker=$('#media-dish-select');picker.value='mizora-01';picker.dispatchEvent(new Event('change',{bubbles:true}));check($('.media-cover').src.includes('dish-01-overview')&&$('#media-request-form').dataset.dish==='mizora-01','media picker selects associated real photo');const log=JSON.parse(localStorage.getItem('foodie:attico:mizora:demo:v1')).mediaRequestLog;check(log[0].restaurantId==='mizora'&&log[0].mediaId.includes('dish-03-overview')&&log[0].requestedChanges.length===2&&log[0].note.includes('QA:')&&Number.isFinite(Date.parse(log[0].createdAt)),'structured media fields persisted');},previousGerman);

// Reset in one restaurant cannot affect the other restaurant's local workspace.
await goto('/?restaurant=aurel-house&embed=owner');await run(setup);await run(()=>{window.aurelBefore=localStorage.getItem('foodie.menu:aurel:demo:v8');});
await run(()=>{const price=$('[data-dish-price]');price.value='42.75';price.dispatchEvent(new Event('change',{bubbles:true}));});
const aurelBefore=await run(()=>localStorage.getItem('foodie.menu:aurel:demo:v8'));
await goto('/?restaurant=mizora&embed=owner');await run(setup);await run(()=>{tap('owner-tab','settings');window.confirm=()=>true;tap('reset');check($('#profile-form').elements.reviewUrl.value==='','MIZORA reset');});
assert.equal(await run(()=>localStorage.getItem('foodie.menu:aurel:demo:v8')),aurelBefore,'other restaurant unchanged');

// Existing saved profiles without the additive request log retain their data.
await run(()=>{const key='foodie:attico:mizora:demo:v1',data=JSON.parse(localStorage.getItem(key));delete data.mediaRequestLog;data.mediaRequests['mizora-03']='production';data.dishes.find(d=>d.id==='mizora-03').price=37.25;localStorage.setItem(key,JSON.stringify(data));});
await goto('/?restaurant=mizora&embed=owner');await run(setup);await run(()=>{check($('[data-dish-price=mizora-03]').value==='37.25','legacy menu edit retained');tap('owner-tab','media');check($('.media-state').textContent==='In production'&&!$('.media-request-row'),'legacy media status retained without invented request history');});
await send('Emulation.setEmulatedMedia',{features:[{name:'prefers-reduced-motion',value:'reduce'}]});
await run(()=>check(getComputedStyle($('[data-act=new-media-request]')).transitionDuration==='0s','reduced motion'));
assert.deepEqual(errors,[]);assert.deepEqual(network,[]);console.log('Owner 2026: all six screens, structured requests, event timing, QR tools, chart focus, dataset exports, settings validation, reset confirmation and profile isolation passed.');
 } finally {
  if(ws?.readyState===WebSocket.OPEN){ws.send(JSON.stringify({id:999999,method:'Browser.close'}));await Promise.race([once(chrome,'exit'),new Promise(resolve=>setTimeout(resolve,1500))]);}
  ws?.close();if(chrome.exitCode===null)chrome.kill();server.close();
}
