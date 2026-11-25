import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {createRequire} from 'node:module';
import {guestLink,publicGuestOrigin} from '../src/prototype.ts';

const require=createRequire(import.meta.url);
const qrcode=require('./vendor/qrcode-generator.cjs');
const output=new URL('../public/assets/qr-mizora/',import.meta.url);
const logo=(await readFile(new URL('../public/assets/mizora/logo-transparent.png',import.meta.url))).toString('base64');
await mkdir(output,{recursive:true});
for(let table=1;table<=24;table++) {
  const number=String(table).padStart(2,'0');
  const code=qrcode(0,'H');
  const destination=guestLink(publicGuestOrigin,'mizora',{table});
  code.addData(destination);code.make();
  const count=code.getModuleCount(),side=count+8;
  let path='';
  for(let row=0;row<count;row++)for(let col=0;col<count;col++)if(code.isDark(row,col))path+=`M${col+4} ${row+4}h1v1h-1z`;
  const width=count*.28,height=count*.14,x=(side-width)/2,y=(side-height)/2;
  const svg=`<svg xmlns="http://www.w3.org/2000/svg" width="600" height="600" viewBox="0 0 ${side} ${side}" role="img" aria-label="MIZORA table ${number} placeholder QR"><rect width="${side}" height="${side}" fill="#fff"/><path d="${path}" fill="#151211" shape-rendering="crispEdges"/><rect x="${x-.7}" y="${y-.7}" width="${width+1.4}" height="${height+1.4}" rx="1" fill="#fff"/><rect x="${x}" y="${y}" width="${width}" height="${height}" rx=".6" fill="#151211"/><image x="${x+.8}" y="${y+.6}" width="${width-1.6}" height="${height-1.2}" href="data:image/png;base64,${logo}" preserveAspectRatio="xMidYMid meet"/></svg>`;
  await writeFile(new URL(`table-${number}.svg`,output),svg.replace('placeholder QR','menu QR').replace('><rect','><metadata>'+destination.replaceAll('&','&amp;')+'</metadata><rect'));
}
console.log('Generated 24 MIZORA table QR SVGs with level-H correction and the original restaurant logo.');
