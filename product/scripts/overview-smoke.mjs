
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
await size(390,844);await goto('/?restaurant=mizora&embed=guest');await run(setup);
await run(()=>{
 tap('mode','overview');
 window.order=()=>$$('.menu-photo-card .dish-card-main').map(el=>el.dataset.id);
 window.originalOrder=order();
 $('#overview-scroll').scrollTop=450;
 tap('category','desserts');
 check(order().slice(0,3).join(',')==='mizora-20,mizora-21,mizora-22','desserts must appear first');
 check($('#overview-scroll').scrollTop===0,'category resets Overview scroll');
 check($$('.is-muted').length===21,'nonmatches remain visible and muted');
 check(order().slice(3).join(',')===originalOrder.filter(id=>!['mizora-20','mizora-21','mizora-22'].includes(id)).join(','),'nonmatches preserve relative order');
 $('#overview-scroll').scrollTop=180;const top=$('#overview-scroll').scrollTop;
 tap('wishlist-toggle',undefined,'mizora-20');check($('#overview-scroll').scrollTop===top,'cart addition preserves scroll');
 tap('language');tap('set-language','de');check($('#overview-scroll').scrollTop===top,'language change preserves scroll');
 tap('category','all');check(order().join(',')===originalOrder.join(','),'All restores original menu order');
 $('#overview-scroll').scrollTop=450;tap('filters');tap('toggle-diet','vegan');tap('toggle-diet','glutenFree');tap('set-calorie','500');tap('toggle-allergen','Milk');tap('apply-filters');
 check(order()[0]==='mizora-12'&&$$('.menu-photo-card:not(.is-muted)').length===1,'combined filter matches come first');
 check($('#overview-scroll').scrollTop===0,'applying filters resets scroll');
 tap('category','desserts');check($('.no-match-note')&&$$('.is-muted').length===24,'empty intersection is explicit');
 $('#overview-scroll').scrollTop=300;tap('clear-filters');check(order().join(',')===originalOrder.join(',')&&$('#overview-scroll').scrollTop===0,'reset restores menu and scroll');
});
if(process.env.FOODIE_SCREENSHOTS){await run(()=>tap('category','desserts'));await screenshot('overview-desserts-first');await run(()=>tap('clear-filters'));}
await run(async()=>{
 const key='foodie:attico:mizora:demo:v1',db=JSON.parse(localStorage.getItem(key));
 // Simulate the previous release's locally stored English placeholder names.
 for(const d of db.dishes)for(const lang of ['de','es'])d.translations[lang].name=d.name;
 db.dishes.find(d=>d.id==='mizora-03').translations.de.name='Hamachi nach Art des Hauses';
 db.dishes.find(d=>d.id==='mizora-09').price=44;
 db.carts['07']={'mizora-09':2};delete db.wishlist;
 localStorage.setItem(key,JSON.stringify(db));
});
await goto('/?restaurant=mizora&embed=guest');await run(setup);
for(const [lang,name] of [['de','Schneekrabbensalat'],['es','Ensalada de cangrejo de las nieves'],['en','Snow Crab Salad']]){
 await run(({lang,name})=>{
 tap('language');tap('set-language',lang);tap('mode','overview');
 const card=$('[data-act=open][data-id=mizora-09]');check(card.textContent.includes(name),'translated Overview name '+lang);
 card.click();check($('.hero-title-row h1').textContent.includes(name),'translated Explore name '+lang);
 tap('wishlist');check($('.wishlist-items').textContent.includes(name)&&$('.wishlist-items').textContent.includes('44'),'translated wishlist name and retained price '+lang);closeDialog();
 },{lang,name});
 if(process.env.FOODIE_SCREENSHOTS&&lang==='es')await screenshot('snow-crab-es');
}
await run(()=>{
 tap('language');tap('set-language','de');tap('mode','overview');tap('open',undefined,'mizora-03');
 check($('.hero-title-row h1').textContent.includes('Hamachi nach Art des Hauses'),'custom translation preserved');
 const stored=JSON.parse(localStorage.getItem('foodie:attico:mizora:demo:v1'));
 check(stored.dishes.find(d=>d.id==='mizora-09').translations.es.name==='Ensalada de cangrejo de las nieves','default translation persists after migration');
});
await goto('/?restaurant=mizora&embed=owner');await run(setup);
await run(()=>check(document.body.textContent.includes('Snow Crab Salad'),'owner retains official English names'));
await goto('/?restaurant=mizora&embed=guest');await run(setup);
await run(()=>{tap('mode','overview');tap('category','salads');});
for(const width of [320,390,430,1280,1440]){
 await size(width,width<500?844:960);
 await run(async width=>{
 await Promise.all([...document.images].filter(i=>i.getClientRects().length).map(i=>{i.loading='eager';return i.decode();}));
 check(document.documentElement.scrollWidth<=width,'no translated layout overflow '+width);
 check($$('.menu-photo-card:not(.is-muted)').length===3,'salad matches '+width);
 check($('.menu-photo-card:not(.is-muted)').querySelector('[data-id]').dataset.id==='mizora-08','first salad '+width);
 for(const title of $$('.menu-photo-card strong'))check(title.scrollWidth<=title.clientWidth+1,'translated name fits card '+width+': '+title.textContent);
 },width);
}
await size(320,740);
await run(async()=>{
 const profile=await fetch('./mizora.json').then(r=>r.json());
 for(const lang of ['de','es']){
  tap('language');tap('set-language',lang);tap('mode','overview');tap('category','all');
  for(const dish of profile.dishes){
   tap('mode','overview');tap('open',undefined,dish.id);
   const title=$('.hero-title-row h1');check(title.scrollWidth<=title.clientWidth+1,'Explore title fits 320px '+lang+': '+title.textContent);
  }
 }
});
assert.deepEqual(errors,[],'browser exceptions');assert.deepEqual(network,[],'failed requests');
console.log('Overview/languages passed: stable matches-first categories and combined filters; reset vs retained scroll; empty state; DE/ES names in Overview/Explore/cart; previous-release storage upgrade preserves custom names, price and cart; Owner official names; 320/390/430/1280/1440px; no console errors or broken images.');
 } finally {
  if(ws?.readyState===WebSocket.OPEN){ws.send(JSON.stringify({id:999999,method:'Browser.close'}));await Promise.race([once(chrome,'exit'),new Promise(resolve=>setTimeout(resolve,1500))]);}
  ws?.close();if(chrome.exitCode===null)chrome.kill();server.close();
}

