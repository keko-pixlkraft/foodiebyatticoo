
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
await size(390,844);
await send('Emulation.setTouchEmulationEnabled',{enabled:true,maxTouchPoints:2});
await goto('/?restaurant=mizora&embed=guest');await run(setup);
const selected=()=>run(()=>document.querySelector('.hero-title-row h1').textContent);
const swipe=async(x,y,endX,endY)=>{
 await send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x,y}]});
 for(let i=1;i<=6;i++)await send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x:x+(endX-x)*i/6,y:y+(endY-y)*i/6}]});
 await send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});
};
const first=await selected();
await swipe(280,360,100,365);
assert.notEqual(await selected(),first,'left swipe must advance the dish');
await swipe(100,360,280,365);
assert.equal(await selected(),first,'right swipe must restore the previous dish');
await run(()=>{
 const dock=$('.mizora-dock').getBoundingClientRect();
 check(dock.bottom<=innerHeight+1&&dock.top>0,'dock visible after horizontal swipes');
});
if(process.env.FOODIE_SCREENSHOTS)await screenshot('horizontal-explore-390');
await swipe(190,450,190,220);
assert.equal(await selected(),first,'vertical swipe must not switch dishes');
await swipe(190,220,190,450);
assert.equal(await selected(),first,'pull-down must not switch dishes');
await run(()=>check(window.scrollY===0&&document.documentElement.scrollHeight<=innerHeight,'guest document stays within viewport'));
await swipe(180,360,120,450);
assert.equal(await selected(),first,'diagonal swipe must not switch dishes');
await swipe(5,360,180,360);
assert.equal(await selected(),first,'screen-edge swipe is not dish navigation');
await run(()=>{
 const hero=$('.hero-image');
 const emit=(type,points)=>hero.dispatchEvent(new TouchEvent(type,{bubbles:true,cancelable:true,touches:points,changedTouches:points}));
 const a=new Touch({identifier:1,target:hero,clientX:280,clientY:360});
 emit('touchstart',[a]);emit('touchcancel',[a]);
 emit('touchend',[new Touch({identifier:1,target:hero,clientX:100,clientY:360})]);
});
assert.equal(await selected(),first,'cancelled gesture must not switch dishes');
await run(()=>{
 const hero=$('.hero-image');
 const points=[1,2].map((identifier,i)=>new Touch({identifier,target:hero,clientX:280+i*10,clientY:360}));
 hero.dispatchEvent(new TouchEvent('touchstart',{bubbles:true,touches:points,changedTouches:points}));
 hero.dispatchEvent(new TouchEvent('touchend',{bubbles:true,touches:[],changedTouches:[new Touch({identifier:1,target:hero,clientX:80,clientY:360})]}));
});
assert.equal(await selected(),first,'pinch gesture must not switch dishes');
await run(()=>tap('next-dish'));
assert.notEqual(await selected(),first,'next button');
await run(()=>tap('previous-dish'));
assert.equal(await selected(),first,'previous button');
await send('Input.dispatchKeyEvent',{type:'keyDown',key:'ArrowRight',code:'ArrowRight'});
assert.notEqual(await selected(),first,'right arrow key');
await send('Input.dispatchKeyEvent',{type:'keyDown',key:'ArrowLeft',code:'ArrowLeft'});
assert.equal(await selected(),first,'left arrow key');
await run(()=>tap('nutrition'));
await swipe(280,360,100,365);
assert.equal(await selected(),first,'modal blocks dish swipe');
await run(()=>closeDialog());
const tabs=await run(()=>{const r=$('#quick-tabs').getBoundingClientRect();return {y:r.y+r.height/2,x:$('#quick-tabs').scrollLeft};});
await swipe(280,tabs.y,100,tabs.y);
assert.equal(await selected(),first,'category strip must not switch dishes');
await run(x=>check($('#quick-tabs').scrollLeft>x,'category strip remains scrollable'),tabs.x);
await run(()=>tap('mode','overview'));
const before=await run(()=>$('#overview-scroll').scrollTop);
await swipe(190,650,190,280);
await run(before=>check($('#overview-scroll').scrollTop>before,'Overview remains vertically scrollable'),before);
await run(()=>tap('mode','explore'));
for(const width of [320,390,430]){
 await size(width,740);
 await run(width=>{
 const dock=$('.mizora-dock').getBoundingClientRect();
 check(document.documentElement.scrollWidth<=width,'no horizontal overflow '+width);
 check(document.documentElement.scrollHeight<=innerHeight,'no document scrolling '+width);
 check(dock.bottom<=innerHeight+1&&dock.top>0,'visible dock '+width);
 check(getComputedStyle($('.explore-hero')).touchAction.includes('pinch-zoom'),'pinch zoom retained');
 },width);
}
assert.deepEqual(errors,[],'browser exceptions');assert.deepEqual(network,[],'failed requests');
console.log('Explore gestures passed: real Chrome touch input left/right, vertical/diagonal/edge rejection, cancel/pinch, buttons, keyboard, modal/category isolation, Overview scrolling, 320/390/430px viewport containment. iPhone Safari requires physical-device verification.');
 } finally {
  if(ws?.readyState===WebSocket.OPEN){ws.send(JSON.stringify({id:999999,method:'Browser.close'}));await Promise.race([once(chrome,'exit'),new Promise(resolve=>setTimeout(resolve,1500))]);}
  ws?.close();if(chrome.exitCode===null)chrome.kill();server.close();
}

