
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
await send('Runtime.enable');await send('Page.enable');await send('Network.enable');
const goto=async(path)=>{
await send('Page.navigate',{url:base+(process.env.FOODIE_BASE_URL&&path.startsWith('/?')?'/app.html'+path.slice(1):path)});
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
await size(390,844);await goto('/?restaurant=mizora&embed=guest&table=7');await run(setup);
await run(()=>{
 check($('.phone-screen.overview'),'QR/menu entry starts with Overview');
 $('#overview-scroll').scrollTop=200;window.returnTop=$('#overview-scroll').scrollTop;
 tap('open',undefined,'mizora-09');check($('.phone-screen.explore'),'dish opens Explore');
 check($('[data-act=menu-return]')&&!$('.explore-navigation,.swipe-indicator'),'compact menu return, no swipe text');
 tap('menu-return');check($('#overview-scroll').scrollTop===returnTop,'Menu restores Overview position');
 tap('open',undefined,'mizora-09');tap('wishlist-toggle',undefined,'mizora-09');
 check($('[data-act=wishlist-toggle]').getAttribute('aria-pressed')==='true','saved heart state');
 const metrics=JSON.parse(localStorage.getItem('foodie:attico:mizora:demo:v1')).events;
 check(metrics.wishlistAdds===1&&metrics.adds===0,'wishlist saves do not fabricate cart analytics');
 tap('wishlist');check($$('.wishlist-item').length===1&&!$('.quantity,.sheet-total'),'unique wishlist without quantities or subtotal');
 check($('.wishlist-item').textContent.includes('Snow Crab Salad'),'wishlist name');closeDialog();
 tap('wishlist');check($('.wishlist-item strong').getBoundingClientRect().width>100,'wishlist name has readable width');closeDialog();
});
await goto('/?restaurant=mizora&embed=guest&table=8');await run(setup);
await run(()=>{tap('wishlist');check($$('.wishlist-item').length===1,'personal wishlist survives table change/reload');tap('wishlist-remove',undefined,'mizora-09');check($('.empty-wishlist'),'remove item');closeDialog();});
await goto('/?restaurant=mizora&embed=guest&dish=mizora-09&lang=es&table=7');await run(setup);
await run(async()=>{
 check($('.phone-screen.explore')&&$('.guest-stage').lang==='es','shared dish opens Explore in requested language');
 check($('.hero-title-row h1').textContent.includes('Ensalada de cangrejo'),'shared dish selected');
 Object.defineProperty(navigator,'share',{configurable:true,value:async data=>{window.shared=data;}});
 tap('share-dish');await new Promise(r=>setTimeout(r,30));
 check(shared.title.includes('MIZORA')&&shared.text.includes('Ensalada'),'share title and localized text');
 const url=new URL(shared.url);check(url.pathname==='/guest'&&url.searchParams.get('dish')==='mizora-09'&&url.searchParams.get('lang')==='es'&&!url.searchParams.has('table'),'dish share excludes table');
 Object.defineProperty(navigator,'share',{configurable:true,value:undefined});
 Object.defineProperty(navigator,'clipboard',{configurable:true,value:{writeText:async text=>{window.copied=text;}}});
 tap('share-dish');await new Promise(r=>setTimeout(r,30));check(copied===shared.url,'clipboard fallback');
 window.copied=null;
 Object.defineProperty(navigator,'share',{configurable:true,value:async()=>{throw new DOMException('Cancelled','AbortError');}});
 tap('share-dish');await new Promise(r=>setTimeout(r,30));check(copied===null,'share cancellation is silent');
 Object.defineProperty(navigator,'share',{configurable:true,value:undefined});
 Object.defineProperty(navigator,'clipboard',{configurable:true,value:{writeText:async()=>{throw new Error('Denied');}}});
 tap('share-dish');await new Promise(r=>setTimeout(r,30));
 check($('.floating-toast').textContent.includes('No se pudo')&&!$('[data-act=share-dish]').disabled,'copy failure is truthful and share re-enables');
 tap('wishlist-toggle',undefined,'mizora-09');tap('wishlist');check($('.wishlist-item').textContent.includes('Ensalada'),'localized wishlist');closeDialog();
});
await goto('/?restaurant=mizora&embed=guest&dish=missing&lang=invalid');await run(setup);
await run(()=>check($('.phone-screen.overview'),'invalid dish falls back to Overview'));
await run(()=>{
 const key='foodie:attico:mizora:demo:v1',db=JSON.parse(localStorage.getItem(key));delete db.wishlist;db.carts={'07':{'mizora-03':3},'08':{'mizora-03':1,'mizora-09':2}};localStorage.setItem(key,JSON.stringify(db));
});
await goto('/?restaurant=mizora&embed=guest');await run(setup);
await run(()=>{
 tap('wishlist');check($$('.wishlist-item').length===2,'legacy carts migrate to unique favorites');
 const db=JSON.parse(localStorage.getItem('foodie:attico:mizora:demo:v1'));check(db.carts['07']['mizora-03']===3,'legacy carts retained');
 tap('wishlist-remove',undefined,'mizora-03');tap('wishlist-remove',undefined,'mizora-09');closeDialog();
});
await goto('/?restaurant=mizora&embed=guest');await run(setup);
await run(()=>{tap('wishlist');check($('.empty-wishlist'),'removed migrated items stay removed');closeDialog();});
for(const width of [320,390,430,1280,1440]){
 await size(width,width<500?740:900);
 await run(async width=>{
 tap('mode','explore');await document.fonts.ready;
 check(document.documentElement.scrollWidth<=width,'no horizontal overflow '+width);
 const menu=$('[data-act=menu-return]').getBoundingClientRect(),lang=$('[data-act=language]').getBoundingClientRect();
 check(menu.right<lang.left&&Math.abs(menu.top-lang.top)<2,'Menu/language aligned '+width);
 const dock=$('.mizora-dock').getBoundingClientRect();check(dock.bottom<=innerHeight+1,'visible dock '+width);
 tap('wishlist');check($('[role=dialog]').getBoundingClientRect().top>=0,'wishlist fits '+width);
 check($('.cart-continue').getBoundingClientRect().bottom<=$('.phone-screen').getBoundingClientRect().bottom+1,'wishlist footer visible '+width);
 for(const title of $$('.wishlist-item strong'))check(title.getBoundingClientRect().width>100&&title.scrollWidth<=title.clientWidth+1,'wishlist text fits '+width);
 closeDialog();
 },width);
 if(process.env.FOODIE_SCREENSHOTS&&width===390){await screenshot('guest-explore-vertical');await run(()=>{tap('wishlist-toggle',undefined,'mizora-03');tap('wishlist');});await screenshot('guest-wishlist');await run(()=>closeDialog());}
}
assert.deepEqual(errors,[],'browser exceptions');assert.deepEqual(network,[],'failed requests');
console.log('Guest journey passed: Overview entry, Menu return/scroll, unique persistent personal wishlist and legacy migration, localized dish deep links, native share/cancel/copy fallback without table, layouts 320/390/430/1280/1440px.');
 } finally {
  if(ws?.readyState===WebSocket.OPEN){ws.send(JSON.stringify({id:999999,method:'Browser.close'}));await Promise.race([once(chrome,'exit'),new Promise(resolve=>setTimeout(resolve,1500))]);}
  ws?.close();if(chrome.exitCode===null)chrome.kill();server.close();
}

