
import { spawn } from 'node:child_process';
import { mkdtemp, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { once } from 'node:events';
import assert from 'node:assert/strict';
import { createPreviewServer } from './dev.mjs';

const server=createPreviewServer({built:true}).listen(0,'127.0.0.1');
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
await send('Runtime.enable');await send('Page.enable');await send('Network.enable');
const goto=async(path)=>{
await send('Page.navigate',{url:base+path});
for(let i=0;i<80;i++){if(await run(()=>!!document.querySelector('.phone-screen,.owner-main,.experiences')))return;await new Promise(r=>setTimeout(r,100));}throw Error('App boot timeout '+errors);
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

for(const width of [320,390,430,1280,1440]) {
  await size(width);await goto('/');await run(setup);
  await run(()=>{
    check($('.experiences'),'entry choice');
    check($('a.guest').getAttribute('href')==='/guest?restaurant=mizora','guest route');
    check($('a.owner').getAttribute('href')==='/owner?restaurant=mizora','owner route');
    check(document.documentElement.scrollWidth<=innerWidth,'entry overflow');
  });
  await screenshot('presentation-'+width);
  await goto('/guest?restaurant=mizora');await run(setup);
  await run(async()=>{
    await Promise.all([...document.images].filter(i=>i.getClientRects().length).map(i=>i.decode()));
    check(document.body.dataset.embed==='guest','standalone guest route');
    check(!$('.topbar')?.getClientRects().length,'no prototype toolbar');
    check(document.documentElement.scrollWidth<=innerWidth,'guest overflow');
    tap('mode','overview');check($$('.dish-card').length===24,'all 24 dishes');
    tap('category','tapas');check($$('.dish-card:not(.is-muted)').length===3,'category filter');
    tap('clear-filters');tap('add',undefined,'mizora-03');tap('cart');
    check($('.sheet-total').textContent.includes('32'),'cart');closeDialog();
    tap('cart');tap('decrease',undefined,'mizora-03');closeDialog();
    tap('language');tap('set-language','de');check($('.guest-stage').lang==='de','language');
    tap('language');tap('set-language','en');
  });
  await screenshot('public-guest-'+width);
  await goto('/owner?restaurant=mizora');await run(setup);
  await run(()=>{
    check(document.body.dataset.embed==='owner'&&$('.owner-main'),'standalone owner route');
    check(document.documentElement.scrollWidth<=innerWidth,'owner overflow');
    check($('[target=_blank][href*=embed]'),'owner guest preview link');
    tap('owner-tab','analytics');check($('.analytics-metrics'),'analytics');
  });
  await screenshot('public-owner-'+width);
}
await goto('/guest?restaurant=aurel-house');await run(setup);
await run(()=>check(document.title.includes('Aurel'),'Aurel House preserved'));
assert.deepEqual(errors,[],'browser exceptions');assert.deepEqual(network,[],'failed requests');
console.log('Presentation passed: root, guest, owner; 320/390/430/1280/1440px; images, cart, filters, language, analytics, Aurel House; no console exceptions or failed requests.');
 } finally {
  if(ws?.readyState===WebSocket.OPEN){ws.send(JSON.stringify({id:999999,method:'Browser.close'}));await Promise.race([once(chrome,'exit'),new Promise(resolve=>setTimeout(resolve,1500))]);}
  ws?.close();if(chrome.exitCode===null)chrome.kill();server.close();
}

