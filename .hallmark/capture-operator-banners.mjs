import {createRequire} from 'node:module';
import {tmpdir} from 'node:os';
import path from 'node:path';
import fs from 'node:fs';
const require=createRequire(import.meta.url);
const p=require(path.join(tmpdir(),'hallmark-audit-tools/node_modules/puppeteer-core'));
const b=await p.launch({executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe',headless:true});
fs.mkdirSync('.hallmark/operator-banner-shots',{recursive:true});
try{for(const op of ['sun_direct','tata_play','airtel_dth','dish_tv']){
 const page=await b.newPage();await page.setViewport({width:1280,height:800});
 await page.evaluateOnNewDocument(value=>localStorage.setItem('dth_selected_operator',value),op);
 await page.goto('http://localhost:3012/',{waitUntil:'networkidle2'});
 await page.evaluate(()=>document.fonts.ready);
 await (await page.$('.recharge-heading')).screenshot({path:'.hallmark/operator-banner-shots/'+op+'.png'});
 await page.close();
}console.log('Captured all four operator banners.');}finally{await b.close();}
