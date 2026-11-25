
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
'--headless=new','--no-first-run','--disable-popup-blocking','--remote-debugging-port=0',
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
window.waitFor=async(predicate,message)=>{for(let i=0;i<60;i++){if(predicate())return;await new Promise(resolve=>setTimeout(resolve,15));}throw Error(message);};
window.tap=(a,v,id)=>{const s='[data-act="'+a+'"]'+(v===undefined?'':'[data-value="'+v+'"]')+(id===undefined?'':'[data-id="'+id+'"]');const el=$$(s).find(e=>e.getClientRects().length);check(el,s);el.click();};
window.closeDialog=()=>document.dispatchEvent(new KeyboardEvent('keydown',{key:'Escape'}));
};
const guest = '/?restaurant=mizora&embed=guest&table=';
const owner = '/?restaurant=mizora&embed=owner';
const shot = async name => {if(process.env.FOODIE_SCREENSHOTS)await screenshot('gx-'+name);};
await size(390,844);await goto(guest+7);await run(setup);
await run(()=>{
 tap('guest-information');check(!$('.gx-links')&&$('.guest-events-empty').textContent==='No upcoming events announced','unconfigured links and events stay empty');
});
await goto(owner);await run(setup);
await run(()=>{
 tap('owner-tab','analytics');check($('.gx-owner-feedback').textContent.includes('No private feedback yet'),'empty feedback analytics');
 tap('owner-tab','settings');const settings=$('#profile-form');
 settings.elements.websiteUrl.value='https://example.com/mizora';
 settings.elements.instagramUrl.value='https://www.instagram.com/mizora_fixture/';
 settings.elements.reviewUrl.value='https://g.page/r/test-fixture/review';settings.requestSubmit();
 const key='foodie:attico:mizora:demo:v1',db=JSON.parse(localStorage.getItem(key));
 db.restaurantEvents=[{id:'future',title:'Tasting evening',date:'2099-12-12',time:'19:30',description:'Seasonal menu preview',published:true},{id:'past',title:'Past event',date:'2000-01-02',published:true},{id:'draft',title:'Draft event',date:'2099-12-12',published:false}];
 db.wishlist=['mizora-03','mizora-09'];db.carts={'07':{'mizora-03':2},'08':{'mizora-20':3}};
 localStorage.setItem(key,JSON.stringify(db));
 localStorage.removeItem(key+':table-visits:v1');
});
await goto(guest+7);await run(setup);
await run(()=>{
 tap('guest-information');check($('.nutrition-card.gx-sheet h2').textContent==='Your experience','experience uses nutrition-card surface');
 check(document.activeElement.classList.contains('icon-close'),'initial dialog focus');
 const links=$$('.gx-links a');check(links.map(a=>a.href).join('|')==='https://example.com/mizora|https://www.instagram.com/mizora_fixture/|https://g.page/r/test-fixture/review','configured restaurant URLs');
 check(links.every(a=>a.target==='_blank'&&a.rel==='noopener noreferrer'),'safe links');
 check($('.guest-events').textContent.includes('Tasting evening')&&!/Past event|Draft event/.test($('.guest-events').textContent),'published upcoming events only');
 check($('#gx-feedback-form [type=submit]').disabled,'rating required');
 check(!$('.gx-categories [aria-pressed=true]'),'no default category');
});
await shot('experience');
await run(()=>{
 for(let i=1;i<=5;i++){$('.gx-stars input[value="'+i+'"]').click();check($$('.gx-stars input:checked').length===1&&$('.gx-stars input:checked').value===String(i),'single overall rating '+i);}
 tap('feedback-category','food');tap('feedback-category','service');check($$('.gx-categories [aria-pressed=true]').length===1,'single category');
 tap('feedback-category','service');check(!$('.gx-categories [aria-pressed=true]'),'optional category can clear');
 tap('feedback-category','food');
 const text=$('#gx-feedback-message');check(text.maxLength===500,'native 500 character constraint');text.value='a'.repeat(500);text.dispatchEvent(new Event('input',{bubbles:true}));check($('#gx-feedback-count').value==='500 / 500','live counter');
 text.value='a'.repeat(501);$('#gx-feedback-form').requestSubmit();check(!$('.gx-confirmation'),'submission rejects 501 characters');
 text.value='Wonderful food. Glad we could share the table.';text.dispatchEvent(new Event('input',{bubbles:true}));
});
await shot('feedback-selected');
await run(()=>{
 const form=$('#gx-feedback-form');form.requestSubmit();form.dispatchEvent(new Event('submit',{bubbles:true,cancelable:true}));
 check($('.gx-confirmation').textContent.includes('saved in this demo browser'),'truthful confirmation');check($$('.gx-links a').length===3,'review link independent after rating');
 const records=JSON.parse(localStorage.getItem('foodie:attico:mizora:demo:v1:guest-feedback:v1'));
 check(records.length===1&&records[0].table===7&&records[0].visitId&&records[0].category==='food','single feedback with table and visit');
});
await shot('feedback-saved');
await goto(guest+7);await run(setup);
await run(()=>{
 tap('guest-information');$('.gx-stars input[value="1"]').click();$('#gx-feedback-form').requestSubmit();
 check($('.gx-confirmation')&&$('.gx-links a[href*="g.page"]'),'rating-only submission with independent Google link');
 closeDialog();check(document.activeElement.dataset.act==='guest-information','escape restores hamburger focus');
});
await size(1440,900);await goto(owner);await run(setup);
await run(()=>{
 tap('owner-tab','analytics');const panel=$('.gx-owner-feedback');
 check(panel.querySelector('.gx-owner-feedback-summary').textContent.includes('3.0 / 5'),'average 3 from 1 and 5');
 check([...panel.querySelectorAll('meter')].map(m=>m.value).join(',')==='1,0,0,0,1','correct rating distribution');
 check(panel.querySelector('.gx-owner-feedback-insights section:last-child li').textContent.trim()==='Food1','category count');
 check(panel.querySelector('.gx-owner-feedback-message').textContent.includes('Wonderful food'),'saved message');
 const select=panel.querySelector('[data-feedback-status]');
 for(const status of ['review','resolved']){select.value=status;select.dispatchEvent(new Event('change',{bubbles:true}));}
 panel.scrollIntoView({block:'start'});
});
if(process.env.FOODIE_SCREENSHOTS){
 const panel=await run(()=>{const el=$('.gx-owner-feedback'),r=el.getBoundingClientRect();return {x:r.left+scrollX,y:r.top+scrollY,width:r.width,height:r.height,scale:1};});
 const r=await send('Page.captureScreenshot',{format:'png',captureBeyondViewport:true,clip:panel});
 await writeFile(join(process.env.FOODIE_SCREENSHOTS,'mizora-gx-owner-feedback.png'),Buffer.from(r.data,'base64'));
}
await goto(owner);await run(setup);
await run(()=>{tap('owner-tab','analytics');check($('[data-feedback-status]').value==='resolved','status persisted');});
await size(390,844);await goto(guest+7);await run(setup);
await run(async()=>{
 const totals=()=>$('.gx-wishlist-totals').textContent;
 tap('wishlist');check($('.gx-eyebrow').textContent.includes('07')&&totals().includes('$102'),'legacy basket and personal selection merged once');closeDialog();
 tap('open',undefined,'mizora-03');tap('wishlist-toggle',undefined,'mizora-03');tap('menu-return');tap('wishlist-toggle',undefined,'mizora-20');tap('wishlist');
 await waitFor(()=>totals().includes('$153'),'Explore and Overview additions');
 tap('wishlist-increase',undefined,'mizora-20');await waitFor(()=>totals().includes('$172'),'plus adds a unit');
 tap('wishlist-decrease',undefined,'mizora-20');await waitFor(()=>totals().includes('$153'),'minus subtracts a unit');
 check(!$( '[data-act=checkout]')&&$('.gx-wishlist-footer').textContent.includes('For planning only'),'planning footer');
});
await shot('wishlist');
await run(async()=>{
 const other=window.open(location.href,'gx-second-tab');
 try{
  await waitFor(()=>other?.document.querySelector('[data-act=wishlist-toggle][data-id=mizora-20]'),'second tab ready');
  other.document.querySelector('[data-act=wishlist-toggle][data-id=mizora-20]').click();
  await waitFor(()=>$('.gx-wishlist-totals').textContent.includes('$172'),'open wishlist updates from a second tab');
  tap('wishlist-decrease',undefined,'mizora-20');
  await waitFor(()=>$('.gx-wishlist-totals').textContent.includes('$153'),'restore screenshot quantities');
 }finally{other?.close();}
 tap('wishlist-decrease',undefined,'mizora-20');await waitFor(()=>!$('[data-act=wishlist-remove][data-id=mizora-20]'),'reaching zero removes row');
 tap('wishlist-remove',undefined,'mizora-03');await waitFor(()=>!$('[data-act=wishlist-remove][data-id=mizora-03]'),'explicit removal clears line');
 window.confirm=()=>true;tap('wishlist-reset');await waitFor(()=>$('.empty-wishlist'),'new visit clears selection');
});
await shot('wishlist-empty');
await goto(guest+8);await run(setup);
await run(()=>{tap('wishlist');check($('.gx-eyebrow').textContent.includes('08')&&$('.gx-wishlist-totals').textContent.includes('$57'),'other table retains independent selection');});
await run(()=>{
 const key='foodie:attico:mizora:demo:v1:table-visits:v1',state=JSON.parse(localStorage.getItem(key));
 window.expiredId=state.visits[8].id;state.visits[8].updatedAt=Date.now()-5*60*60*1000;localStorage.setItem(key,JSON.stringify(state));
});
await goto(guest+8);await run(setup);
await run(()=>{tap('wishlist');check($('.empty-wishlist'),'expired visit does not inherit earlier guests or reimport legacy data');});
for(const width of [320,390,430,768,1440]){
 await size(width,width<=768?740:900);
 await run(async()=>{
  closeDialog();tap('guest-information');
  for(const dialog of ['.restaurant-information-sheet','.wishlist-sheet']){
   const sheet=$(dialog),body=sheet.querySelector('.gx-scroll');
   check(sheet.getBoundingClientRect().top>=0&&sheet.getBoundingClientRect().bottom<=innerHeight+1,'sheet fits viewport');
   check(body.scrollWidth<=body.clientWidth+1&&document.documentElement.scrollWidth<=innerWidth,'no horizontal overflow');
   body.scrollTop=body.scrollHeight;check(body.scrollHeight-body.clientHeight-body.scrollTop<=1,'sheet bottom reachable');
   closeDialog();if(dialog==='.restaurant-information-sheet')tap('wishlist');
  }
  await Promise.all([...document.images].filter(i=>i.getClientRects().length).map(i=>i.decode()));
 });
}
await size(390,844);await send('Emulation.setTouchEmulationEnabled',{enabled:true,maxTouchPoints:1});
const trigger=await run(()=>{const r=$('[data-act=guest-information]').getBoundingClientRect();return {x:r.left+r.width/2,y:r.top+r.height/2};});
await send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[trigger]});await send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});
await run(()=>check($('.restaurant-information-sheet'),'touch opens experience'));
const first=await run(()=>{const r=$('.gx-stars input').getBoundingClientRect();return {x:r.left+r.width/2,y:r.top+r.height/2};});
await send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[first]});await send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});
await run(()=>check($('.gx-stars input:checked')?.value==='1','touch selects star'));
await send('Input.dispatchKeyEvent',{type:'keyDown',key:'ArrowRight',code:'ArrowRight',windowsVirtualKeyCode:39});
await send('Input.dispatchKeyEvent',{type:'keyUp',key:'ArrowRight',code:'ArrowRight',windowsVirtualKeyCode:39});
await run(()=>check($('.gx-stars input:checked')?.value==='2','keyboard changes rating'));
assert.deepEqual(errors,[],'browser exceptions');assert.deepEqual(network,[],'failed requests');
console.log('GX-01/02/03 passed: local feedback, configured links/events, analytics and statuses, wishlist quantities/totals and legacy/visit isolation, keyboard/touch and five viewports.');
 } finally {
  if(ws?.readyState===WebSocket.OPEN){ws.send(JSON.stringify({id:999999,method:'Browser.close'}));await Promise.race([once(chrome,'exit'),new Promise(resolve=>setTimeout(resolve,1500))]);}
  ws?.close();if(chrome.exitCode===null)chrome.kill();server.close();
}
