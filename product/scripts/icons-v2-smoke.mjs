
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
await size(390,844);await goto('/?restaurant=mizora&embed=guest&dish=mizora-09');await run(setup);
if(process.env.FOODIE_ICON_BEFORE){
 await screenshot('icons-v2-before-explore');await run(()=>tap('filters'));await screenshot('icons-v2-before-filters');
}else{
 await run(()=>{tap('filters');check($$('.diet-icon-grid img.foodie-filter-icon').length===5,'five supplied preference SVGs');check($$('.allergen-icon-grid img.foodie-filter-icon').length===14,'14 supplied allergen SVGs');check(new Set($$('.filter-scroll img').map(i=>i.src)).size===21,'all 21 unique supplied assets in the real Filters UI');check($$('[data-act=set-price]').length===8,'eight per-dish price limits');});
 await run(async()=>{
 window.kit=await fetch('assets/icons-v2/ICON_MANIFEST.json').then(r=>r.json());
 await Promise.all([...kit.allergens,...kit.preferences,...kit.utility].map(entry=>new Promise((resolve,reject)=>{const image=new Image();image.onload=()=>{check(image.naturalWidth>0,'SVG decoded '+entry.key);resolve();};image.onerror=()=>reject(Error('SVG failed '+entry.key));image.src='assets/icons-v2/'+entry.file.replace('assets/','');})));
 for(const [lang,short] of [['en','Crust.'],['de','Krebst.'],['es','Crust.']]){
  closeDialog();tap('language');tap('set-language',lang);
  const badge=$('[data-allergen=Crustaceans]');check(badge.querySelector('span').textContent===short,'manifest micro label '+lang);
  check(badge.querySelector('span').getBoundingClientRect().top>=badge.querySelector('img').getBoundingClientRect().bottom,'label directly below icon '+lang);
  tap('filters');check($('[data-act=toggle-allergen][data-value=Crustaceans]').textContent.includes(kit.allergens.find(a=>a.key==='crustaceans').full[lang]),'full filter label '+lang);
 }
 closeDialog();tap('language');tap('set-language','en');tap('filters');
 tap('toggle-allergen','Milk');tap('apply-filters');tap('mode','overview');
 check(!$('.dish-card:not(.is-muted)'),'unverified restaurant data cannot pass allergen exclusion');
 tap('filters');tap('clear-filters');tap('toggle-diet','vegan');tap('apply-filters');check(!$('.dish-card:not(.is-muted)'),'unverified dietary claims do not pass preference filter');
 tap('clear-filters');tap('filters');tap('set-price','20');tap('apply-filters');
 check($$('.dish-card:not(.is-muted)').length===2,'USD 20 max uses actual dish prices');
 check($$('.dish-card:not(.is-muted)').every(el=>['mizora-20','mizora-22'].includes(el.querySelector('[data-id]').dataset.id)),'budget is per dish');
 tap('clear-filters');
 // Isolated explicitly declared fixture; production restaurant data is never marked verified.
 const key='foodie:attico:mizora:demo:v1',db=JSON.parse(localStorage.getItem(key)),d=db.dishes.find(d=>d.id==='mizora-12');
 Object.assign(d,{price:20,allergens:['Sesame','Soy'],allergensVerified:true,dietaryVerified:true,dietary:{vegan:true,vegetarian:true,glutenFree:true,lactoseFree:true,spice:0},nutrition:{kcal:299,source:'sample'}});
 db.dishes.find(d=>d.id==='mizora-05').allergens=['Crustaceans','Peanuts','Tree nuts','Sulphites','Lupin'];
 localStorage.setItem(key,JSON.stringify(db));
 });
 await goto('/?restaurant=mizora&embed=guest');await run(setup);
 await run(async()=>{window.kit=await fetch('assets/icons-v2/ICON_MANIFEST.json').then(r=>r.json());});
 await run(()=>{
 tap('filters');tap('toggle-diet','vegan');tap('toggle-diet','glutenFree');tap('set-price','20');tap('set-calorie','300');tap('set-spice','0');tap('toggle-allergen','Milk');tap('apply-filters');
 check($$('.dish-card:not(.is-muted)').length===1&&$('.dish-card:not(.is-muted) [data-id]').dataset.id==='mizora-12','AND combines confirmed attributes, kcal, spice and inclusive price');
 tap('open',undefined,'mizora-12');check($('[data-icon-key=vegan]'),'only confirmed preference badge is shown');
 tap('details');check($('.allergen-card').textContent.includes('Sesame seeds'),'full allergen name in Details');closeDialog();
 tap('menu-return');tap('clear-filters');check($$('.dish-card:not(.is-muted)').length===24,'Clear All resets budget and other filters');
 });
 for(const width of [320,390,430,1280]){
  await size(width,width<500?844:960);
  for(const lang of ['en','de','es']){
   await run(async({width,lang})=>{
    tap('language');tap('set-language',lang);tap('mode','overview');tap('open',undefined,'mizora-09');
    await Promise.all([...document.images].filter(i=>i.getClientRects().length).map(i=>i.decode()));
    check(document.documentElement.scrollWidth<=width,'Explore overflow '+width+lang);
    const checkStrip=(count,extra)=>{
     const strip=$('.badge-strip'),badges=$$('.foodie-micro-badge');
     const stripBox=strip.getBoundingClientRect(),heart=$('.dish-add').getBoundingClientRect(),nutrition=$('.nutrition-peek').getBoundingClientRect();
     check(badges.length===count,'visible allergen count '+width+lang);
     check(($('.badge-overflow')?.textContent||'')===extra,'overflow count '+width+lang);
     check(stripBox.left>=nutrition.right&&stripBox.right<=heart.left,'allergens stay between nutrition and the wishlist');
     check(Math.abs((stripBox.top+stripBox.bottom)/2-(nutrition.top+nutrition.bottom)/2)<1,'allergens and nutrition share a row');
     check(!$('.badge-context'),'Explore omits the separate Details control');
     for(const badge of [...badges,...$$('.badge-overflow')]){
      const box=badge.getBoundingClientRect();
      check(box.width>0&&Math.abs(box.top-stripBox.top)<1&&box.right<=stripBox.right+1,'allergens and overflow fit on one row '+width+lang);
      check(getComputedStyle(badge).borderTopWidth==='0px','Explore badges are borderless');
     }
    };
    checkStrip(3,'');
    for(const badge of $$('.foodie-micro-badge').filter(el=>el.getClientRects().length)){
     const label=badge.querySelector('span'),image=badge.querySelector('img'),rect=badge.getBoundingClientRect();
     check(label.scrollWidth<=label.clientWidth+1,'micro label clipped '+width+lang+label.textContent);
     check(label.getBoundingClientRect().bottom<=rect.bottom,'label inside badge');
     check(getComputedStyle(image).filter==='none','SVG colours unmodified');
    }
    tap('menu-return');tap('open',undefined,'mizora-20');checkStrip(4,'');
    tap('menu-return');tap('open',undefined,'mizora-05');checkStrip(4,'+1');
    $('.badge-overflow').click();
    check($('.allergen-card').textContent.includes(kit.allergens.find(a=>a.key==='lupin').full[lang]),'overflow opens full allergen list '+lang);
    const details=$$('.guest-allergen-icons .allergen-icon-pill');
    check(details.length===5,'Details shows all five allergens');
    for(const entry of details){
     const label=entry.querySelector('em'),image=entry.querySelector('img');
     check(getComputedStyle(entry).borderTopWidth==='0px'&&label.getBoundingClientRect().top>=image.getBoundingClientRect().bottom,'Details uses borderless icons over full labels');
     check(label.scrollWidth<=label.clientWidth+1,'Details label fits '+width+lang);
    }
    closeDialog();check(document.activeElement.classList.contains('badge-overflow'),'focus returns to +1');
    const strip=$('.badge-strip'),original=[...strip.children];
    try{
     for(const entry of [...kit.allergens,...kit.preferences]){
      const badges=Array.from({length:4},()=>{const badge=original[0].cloneNode(true);badge.querySelector('span').textContent=entry.short[lang];return badge;});
      strip.replaceChildren(...badges,...original.filter(el=>el.classList.contains('badge-overflow')));
      checkStrip(4,'+1');
      for(const badge of badges){
       const label=badge.querySelector('span');check(label.scrollWidth<=label.clientWidth+1,'all manifest short labels fit '+entry.key+width+lang);
      }
     }
    }finally{strip.replaceChildren(...original);}
    tap('menu-return');tap('open',undefined,'mizora-20');
    tap('filters');await Promise.all([...document.querySelectorAll('.filter-scroll img')].map(i=>i.decode()));
    check(getComputedStyle($('.allergen-icon-grid')).gridTemplateColumns.split(' ').length===5,'five allergy filter columns');
    const tiles=$$('.allergen-icon-grid .icon-filter');
    check(tiles.every(tile=>Math.abs(tile.offsetHeight-tiles[0].offsetHeight)<=1),'uniform allergen filter tile heights');
    if(lang==='en'){
     for(const [key,label] of [['Gluten','Gluten'],['Sulphites','Sulfur'],['Sesame','Sesame']]){
      const tile=$(`.allergen-icon-grid [data-value="${key}"]`);
      check(tile.textContent.trim()===label&&tile.title.length>label.length,'short visible filter label and full title '+key);
     }
    }
    check($('[data-act=set-price]').getBoundingClientRect().height>=36,'budget tap target');
    check(getComputedStyle($('.budget-options')).gridTemplateColumns.split(' ').length===4,'2x4 budget grid');
    for(const label of $$('.icon-filter span'))check(label.scrollWidth<=label.clientWidth+1,'filter label fits '+width+lang);
    check(document.documentElement.scrollWidth<=width,'Filters overflow '+width+lang);
   },{width,lang});
   if(process.env.FOODIE_SCREENSHOTS&&lang==='en'){
    await screenshot('icons-v2-filters-'+width);
    await run(()=>{const scroller=$('.filter-scroll');scroller.scrollTop=scroller.scrollHeight;});await screenshot('icons-v2-allergens-'+width);
   }
   await run(()=>closeDialog());
   if(process.env.FOODIE_SCREENSHOTS&&lang==='en')await screenshot('icons-v2-explore-'+width);
  }
 }
 assert.deepEqual(errors,[],'browser exceptions');assert.deepEqual(network,[],'failed requests');
 console.log('Icon V2 passed: all 21 SVGs decoded; EN/DE/ES manifest labels; strict declared-data filtering; inclusive per-dish budget and combined filters; Details; badge/text containment at 320/390/430/1280px; no broken assets or browser errors.');
}
 } finally {
  if(ws?.readyState===WebSocket.OPEN){ws.send(JSON.stringify({id:999999,method:'Browser.close'}));await Promise.race([once(chrome,'exit'),new Promise(resolve=>setTimeout(resolve,1500))]);}
  ws?.close();if(chrome.exitCode===null)chrome.kill();server.close();
}
