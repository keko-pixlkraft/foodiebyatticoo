
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
await size(1440);await goto('/?restaurant=mizora&dish=mizora-03');await run(setup);
await run(async()=>{
check(document.title.includes('MIZORA'),'MIZORA title');
check(!$('.explore .mizora-logo')&&!$('.explore .guest-toggle')&&!$('[data-act=guest-back]'),'compact Explore header');
check($$('.mizora-dock button').length===4&&!$('.table-cart')&&!$('.cart-action'),'four bottom controls');
check($('.nutrition-peek').textContent.includes('350'),'energy entry');
check($('.allergen-peek').textContent.includes('Fish'),'allergen entry');
check(!$('.allergen-peek').matches('button,[data-act],[tabindex]'),'allergens are informative');
check(!$('.review-top-icon')&&!$('.hero-fab-stack'),'no star or photo cart overlay');
check($('.dish-add').parentElement.classList.contains('dish-information'),'cart in information row');
await document.fonts.ready;check(document.fonts.check('500 12px "Instrument Sans"'),'local guest font loaded');
check($('.hero-title-row h1').textContent.includes('Hamachi Crudo'),'first dish');
tap('mode','overview');check($$('.dish-card').length===24,'24 dishes');
check($('.overview .mizora-logo')&&getComputedStyle($('.menu-photo-grid')).gridTemplateColumns.split(' ').length===3,'three-column Overview');
const positions=$$('.menu-photo-card').map(el=>el.querySelector('[data-id]').dataset.id).join(',');
tap('category','tapas');check($$('.dish-card').length===24&&$$('.dish-card:not(.is-muted)').length===3,'category dims nonmatches');
const categoryOrder=$$('.menu-photo-card').map(el=>el.querySelector('[data-id]').dataset.id);
const matchingIds=$$('.menu-photo-card:not(.is-muted)').map(el=>el.querySelector('[data-id]').dataset.id);
check(categoryOrder.slice(0,matchingIds.length).join(',')===matchingIds.join(','),'category matches appear first');
check(categoryOrder.filter(id=>!matchingIds.includes(id)).join(',')===positions.split(',').filter(id=>!matchingIds.includes(id)).join(','),'nonmatches retain relative order');
tap('filters');tap('toggle-diet','vegan');tap('apply-filters');check(!$('.dish-card:not(.is-muted)'),'category combines with diet');
tap('clear-filters');check($$('.dish-card:not(.is-muted)').length===24,'clear categories and dietary filters');

tap('filters');tap('toggle-diet','vegan');tap('toggle-diet','glutenFree');tap('set-calorie','500');tap('toggle-allergen','Milk');tap('apply-filters');
check($$('.dish-card').length===24 && $$('.dish-card:not(.is-muted)').length===1 && $('.dish-card:not(.is-muted)').textContent.includes('Beetroot Tartare'),'stable overview with combined filters');check($('.is-muted button').disabled,'nonmatches disabled');
tap('filters');tap('clear-filters');tap('apply-filters');tap('open',undefined,'mizora-03');
tap('surface','owner');check($('.owner-logo').textContent.includes('Atticoo'),'brand');
});
await size(390,844);
await run(()=>{tap('surface','guest');tap('mode','overview');tap('filters');tap('toggle-diet','vegetarian');tap('apply-filters');});
await screenshot('overview-filtered');
await run(()=>{tap('filters');tap('clear-filters');tap('apply-filters');tap('open',undefined,'mizora-03');});
await run(()=>{tap('surface','guest');tap('mode','explore');check(getComputedStyle($('.hero-image')).objectFit==='contain','full photograph');tap('filters');});
await screenshot('filters-refined');
await run(()=>{
check($$('.allergen-icon-grid .food-icon').length===14,'14 distinct allergen icons');
check(!$('.refine-tabs'),'no filter tabs');
tap('toggle-allergen','Lupin');check($('[data-act=toggle-allergen][data-value=Lupin]').getAttribute('aria-pressed')==='true','lupin toggles');
tap('toggle-allergen','Lupin');
tap('set-spice','2');check($('[data-act=set-spice][data-value="2"]').getAttribute('aria-pressed')==='true','chili control');
tap('set-spice','any');
});
await run(()=>{closeDialog();tap('nutrition');check($('.nutrition-source').textContent.includes('Estimate'),'estimate label');check($$('.nutrition-values div').length===3&&!$('.nutrition-card progress,.nutrition-card meter,.detail-switch'),'compact macro card');});
await screenshot('nutrition-refined');
await run(()=>{closeDialog();tap('nutrition');check($('.nutrition-total').textContent.includes('350'),'nutrition estimate');
check(document.activeElement.classList.contains('icon-close'),'dialog initial focus');
const buttons=[...$('[role=dialog]').querySelectorAll('button')];buttons.at(-1).focus();
document.dispatchEvent(new KeyboardEvent('keydown',{key:'Tab',bubbles:true,cancelable:true}));check(document.activeElement===buttons[0],'dialog focus loop');
closeDialog();check(document.activeElement.dataset.act==='nutrition','dialog return focus');
});
await screenshot('explore');
await run(()=>tap('mode','overview'));await screenshot('overview');
await run(()=>tap('surface','owner'));
await size(1440,900);await screenshot('owner');
await run(()=>{check(!$('[data-act=owner-tab][data-value=appearance]')&&!$('.owner-preview'),'appearance removed');check(getComputedStyle($('.app-wrap')).backgroundColor==='rgb(21, 18, 17)','dark owner palette');});
await run(()=>{
tap('owner-tab','menu');tap('edit',undefined,'mizora-03');
const form=$('#dish-form');form.elements.nutrition_kcal.value='275';form.elements.nutrition_source.value='entered';form.requestSubmit();check(!$('#dish-form'),'save nutrition');
tap('surface','guest');tap('mode','explore');tap('nutrition');check($('.hero-price').textContent.includes('32'),'menu price');check($('.nutrition-total').textContent.includes('275 kcal'),'nutrition');closeDialog();
tap('filters');tap('set-calorie','300');tap('apply-filters');tap('mode','overview');check($$('.dish-card:not(.is-muted)').length===1 && $$('.dish-card').length===24,'calorie dims nonmatches');
tap('filters');tap('clear-filters');tap('apply-filters');
tap('wishlist-toggle',undefined,'mizora-03');tap('wishlist');check($('.wishlist-item').textContent.includes('32'),'wishlist price');
check(!$('.mizora-cart-sheet .sheet-disclaimer')&&!/demo|browser|no order|configured/i.test($('.mizora-cart-sheet').textContent),'no internal wishlist copy');
check(!$('.mizora-cart-sheet [data-act=review]')&&!/Google/.test($('.mizora-cart-sheet').textContent),'wishlist contains no review promotion');
tap('wishlist-remove',undefined,'mizora-03');check($('.empty-wishlist'),'wishlist removal');closeDialog();
for(const lang of ['de','es','en']){tap('language');tap('set-language',lang);check($('.guest-stage').lang===lang,'language '+lang);}
tap('surface','owner');tap('owner-tab','media');const request=$('#media-request-form');request.querySelector('[value=lighting]').checked=true;request.requestSubmit();check($('.media-state').textContent==='Update requested','request');
tap('owner-tab','analytics');check($('.analytics-metrics'),'analytics');tap('owner-tab','qr');check($$('.table-qr').length===12,'QR');
});
for(const width of [320,390,430,1280,1440]){
await size(width,width<500?844:960);
await run(async width=>{
tap('surface','guest');tap('mode','explore');
const checkImages=async label=>{
await Promise.all([...document.images].filter(i=>i.getClientRects().length).map(i=>{i.loading='eager';return i.decode();}));
check(document.documentElement.scrollWidth<=width,label+' overflow '+width);
};
await checkImages('Explore');
const dock=$('.mizora-dock').getBoundingClientRect();
const phone=$('.phone-screen').getBoundingClientRect();
check(Math.abs(dock.bottom-phone.bottom)<2,'dock at phone bottom');
check(dock.width<=phone.width,'dock fits');
const add=$('.dish-add').getBoundingClientRect();
const energy=$('.nutrition-peek').getBoundingClientRect();
check(add.bottom<dock.top&&Math.abs(add.top-energy.top)<6,'cart aligned with energy above dock');
check(add.left>$('.allergen-peek').getBoundingClientRect().right,'cart does not cover allergens');
check(getComputedStyle($('.mizora-dock .is-active')).backgroundColor==='rgb(237, 226, 208)','active navigation tile');
const categories=$('.quick-tabs').getBoundingClientRect(),flag=$('.language-flag-control').getBoundingClientRect();
check(categories.bottom<=flag.top+1&&flag.right<=phone.right,'flag beneath categories');
check($('.language-flag-control .language-flag')&&!$('.language-flag-control').textContent.trim(),'compact flag control');
const row=$('.quick-tabs');row.scrollLeft=60;check(row.scrollLeft>0,'category horizontal scroll');row.scrollLeft=0;
tap('language');await checkImages('Language');
check($$('.language-sheet [data-act=set-language]').length===3,'three language options');
check($('[role=dialog]').getBoundingClientRect().top>=phone.top,'language fits height');closeDialog();
tap('mode','overview');await checkImages('Overview');
check(parseFloat(getComputedStyle($('.quick-tab')).borderRadius)>=10,'Overview category tiles');
tap('filters');check($('[role=dialog]').getBoundingClientRect().top>=phone.top,'filters fit height');closeDialog();
tap('open',undefined,'mizora-03');tap('nutrition');check($('[role=dialog]').getBoundingClientRect().left>=phone.left,'nutrition fits width');closeDialog();
tap('wishlist');await checkImages('Wishlist');
check($('.mizora-cart-sheet').getBoundingClientRect().top>=phone.top,'cart fits height');
check(!$('.mizora-cart-sheet [data-act=review]'),'no review invitation in cart');

tap('surface','owner');
for(const tab of ['menu','media','events','analytics','qr','settings']){tap('owner-tab',tab);await checkImages(tab);}
},width);
console.log('MIZORA layouts and images passed '+width+'px');
}
await size(390,844);await goto('/?restaurant=mizora&embed=guest&dish=mizora-03');await run(setup);
await send('Emulation.setTouchEmulationEnabled',{enabled:true});
const before=await run(()=>$('.hero-title-row h1').textContent);
await send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x:190,y:480}]});
await send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x:190,y:260}]});
await send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});
assert.notEqual(await run(()=>$('.hero-title-row h1').textContent),before,'swipe');
await run(()=>{document.dispatchEvent(new KeyboardEvent('keydown',{key:'ArrowUp'}));check($('.hero-title-row h1').textContent.includes('Hamachi'),'keyboard');tap('mode','overview');});
for(const [id,name] of [['mizora-18','lamb-focus'],['mizora-16','cod-focus'],['mizora-08','salad-focus'],['mizora-11','octopus-focus']]){
await run(id=>{tap('mode','overview');tap('open',undefined,id);},id);await screenshot(name);
}
await goto('/?restaurant=aurel-house');await run(setup);
await run(()=>{check($('.rest-brand strong').textContent==='Aurel House','Aurel branding');tap('mode','overview');check($$('.dish-card').length===17,'Aurel count');check(!$('.dish-card').textContent.includes('Hamachi'),'Aurel menu isolation');});
await goto('/?restaurant=mizora&dish=mizora-03');await run(setup);
await run(()=>{tap('nutrition');check($('.nutrition-total').textContent.includes('275 kcal'),'MIZORA persistence');closeDialog();tap('surface','owner');tap('owner-tab','media');check($('.media-state').textContent==='Update requested','media persistence');});
await run(()=>{
const key='foodie:attico:mizora:demo:v1';
const state=JSON.parse(localStorage.getItem(key));state.menuRevision=1;state.dishes.find(d=>d.id==='mizora-03').name='Old name';
localStorage.setItem(key,JSON.stringify(state));
});
await goto('/?restaurant=mizora&dish=mizora-03');await run(setup);
await run(()=>{
check($('.hero-title-row h1').textContent.includes('Hamachi Crudo'),'menu revision migration');
const backup=JSON.parse(localStorage.getItem('foodie:attico:mizora:demo:v1:before-menu-revision-2'));
check(backup.dishes.some(d=>d.name==='Old name'),'migration backup');
});
for(const language of ['de','es','en']) {
  await run(language=>{tap('language');tap('set-language',language);},language);
  await goto('/?restaurant=mizora&dish=mizora-03');await run(setup);
  await run(language=>{
    check($('.guest-stage').lang===language,'language persists after reload');
    check($('.language-flag-control img').src.endsWith('/'+(language==='en'?'gb':language)+'.svg'),'flag follows language');
  },language);
}
await run(()=>{
  tap('language');
  const buttons=$$('[role=dialog] button');
  check(document.activeElement===buttons[0],'language initial focus');
  buttons.at(-1).focus();document.dispatchEvent(new KeyboardEvent('keydown',{key:'Tab',bubbles:true,cancelable:true}));
  check(document.activeElement===buttons[0],'language focus trap');
  closeDialog();check(document.activeElement.dataset.act==='language','language focus restored');
  tap('surface','owner');tap('owner-tab','settings');
  const form=$('#profile-form');form.elements.reviewUrl.value='https://g.page/r/test-fixture/review';form.requestSubmit();
  tap('surface','guest');tap('wishlist');check(!$('[role=dialog] [data-act=review]'),'configured review stays out of cart');
  closeDialog();tap('mode','overview');tap('guest-information');check($('.restaurant-channels [data-act=review]'),'review in restaurant menu');tap('review');
  const originalOpen=window.open;let opened;
  window.open=(...args)=>{opened=args;return null;};
  try {tap('open-review');check(opened[0]==='https://g.page/r/test-fixture/review'&&opened[2]==='noopener,noreferrer','review navigation remains safe');}
  finally {window.open=originalOpen;}
  tap('guest-information');check($('.restaurant-information-sheet'),'review returns to restaurant menu');closeDialog();
  tap('surface','owner');tap('owner-tab','settings');
  const reset=$('#profile-form');reset.elements.reviewUrl.value='';reset.requestSubmit();
});
assert.deepEqual(errors,[]);assert.deepEqual(network,[]);
console.log('Profile isolation, persistence, nutrition, categories, languages, wishlist, media and analytics passed.');
 } finally {
  if(ws?.readyState===WebSocket.OPEN){ws.send(JSON.stringify({id:999999,method:'Browser.close'}));await Promise.race([once(chrome,'exit'),new Promise(resolve=>setTimeout(resolve,1500))]);}
  ws?.close();if(chrome.exitCode===null)chrome.kill();server.close();
}

