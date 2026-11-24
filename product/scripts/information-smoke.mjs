
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
for(let i=0;i<80;i++){if(await run(()=>!!document.querySelector('.phone-screen,.owner-main')))return;await new Promise(r=>setTimeout(r,100));}throw Error('App boot timeout '+errors);
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
await size(1440,960);await goto('/?restaurant=mizora');await run(setup);
await run(()=>{tap('surface','owner');tap('owner-tab','events');const form=$('#event-form');form.elements.title.value='Test evening';form.elements.date.value='2026-12-12';form.elements.time.value='19:30';form.elements.description.value='Local QA event';form.requestSubmit();check($$('.owner-event-row').length===1,'create event');const id=$('.owner-event-row [data-id]').dataset.id;window.eventId=id;tap('edit-event',undefined,id);$('#event-form').elements.title.value='Updated evening';$('#event-form').requestSubmit();tap('owner-tab','settings');const profile=$('#profile-form');profile.elements.instagramUrl.value='https://www.instagram.com/test-fixture/';profile.elements.reviewUrl.value='https://g.page/r/test-fixture/review';profile.requestSubmit();});
await goto('/?restaurant=mizora');await run(setup);
await run(()=>{tap('surface','owner');tap('owner-tab','events');check($('.owner-event-row').textContent.includes('Updated evening'),'event persists');window.eventId=$('.owner-event-row [data-id]').dataset.id;});
await screenshot('events-admin');
await run(()=>tap('surface','guest'));
for(const width of [320,390,430]){
await size(width,844);await run(()=>{tap('mode','overview');check(getComputedStyle($('.phone-screen')).backgroundImage.includes('slate-background.png'),'slate background');const menu=$('.guest-information-trigger').getBoundingClientRect(),flag=$('.language-flag-control').getBoundingClientRect();check(menu.right<=flag.left&&menu.top>=0,'header controls separate');});
if(width===390)await screenshot('slate-overview');
await run(()=>{tap('guest-information');check($('.guest-event').textContent.includes('Updated evening'),'guest event');const link=$('.restaurant-channel[href]');check(link.href==='https://www.instagram.com/test-fixture/'&&link.rel.includes('noopener'),'Instagram link');check(document.activeElement.classList.contains('icon-close'),'initial focus');const controls=$$('[role=dialog] button,[role=dialog] a');controls.at(-1).focus();document.dispatchEvent(new KeyboardEvent('keydown',{key:'Tab',bubbles:true,cancelable:true}));check(document.activeElement===controls[0],'focus trap');check(document.documentElement.scrollWidth<=innerWidth,'no overflow');});
if(width===390)await screenshot('restaurant-information');
await run(()=>{tap('review');check($('[data-act=open-review]'),'review action');tap('guest-information');check($('.restaurant-information-sheet'),'review return');closeDialog();check(document.activeElement.dataset.act==='guest-information','focus restore');});
console.log('Information popup passed '+width+'px');
}
await size(1440,960);
await run(()=>{tap('surface','owner');tap('owner-tab','events');tap('toggle-event',undefined,eventId);tap('surface','guest');tap('mode','overview');tap('guest-information');check(!$('.guest-event'),'draft hidden');closeDialog();tap('surface','owner');tap('owner-tab','events');tap('toggle-event',undefined,eventId);window.confirm=()=>true;tap('delete-event',undefined,eventId);check(!$('.owner-event-row'),'delete');tap('owner-tab','settings');const form=$('#profile-form');form.elements.instagramUrl.value='https://example.com/';form.requestSubmit();check(!form.elements.instagramUrl.checkValidity(),'invalid Instagram rejected');});
await goto('/?restaurant=aurel-house&embed=owner');await run(setup);await run(()=>{tap('owner-tab','events');check(!$('.owner-event-row'),'profile isolation');});
assert.deepEqual(errors,[]);assert.deepEqual(network,[]);console.log('Event CRUD/publication/persistence, links, focus and profile isolation passed.');
} finally {
  if(ws?.readyState===WebSocket.OPEN){ws.send(JSON.stringify({id:999999,method:'Browser.close'}));await Promise.race([once(chrome,'exit'),new Promise(resolve=>setTimeout(resolve,1500))]);}
  ws?.close();if(chrome.exitCode===null)chrome.kill();server.close();
}
