import {createRequire} from 'node:module';
import {tmpdir} from 'node:os';
import path from 'node:path';
import fs from 'node:fs';
const require=createRequire(import.meta.url);
const puppeteer=require(path.join(tmpdir(),'hallmark-audit-tools/node_modules/puppeteer-core'));
const browser=await puppeteer.launch({executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe',headless:true});
try {
 const page=await browser.newPage();
 page.on('pageerror',e=>console.log('PAGE ERROR',e.message));
 await page.setViewport({width:1280,height:900,deviceScaleFactor:1});
 await page.setRequestInterception(true);
 page.on('request', request => {
   if(request.url().includes('/api/operators')) return request.respond({contentType:'application/json',body:JSON.stringify({success:true,operators:[{id:'sun_direct',name:'Sun Direct',shortName:'Sun Direct',tamilName:'Sun Direct',isEnabled:true,cardPattern:'^[0-9]{11}$',cardName:'Smart card',cardLengthDesc:'11 digits',sampleId:'40000000001'}]})});
   if(request.url().includes('/api/admin/plans')) return request.respond({contentType:'application/json',body:JSON.stringify({success:true,plans:JSON.parse(fs.readFileSync('data/plan_catalog.json','utf8'))})});
   if(!request.url().startsWith('http://127.0.0.1:3015') && !request.url().startsWith('data:')) return request.abort();
   request.continue();
 });
 await page.goto('http://127.0.0.1:3015/',{waitUntil:'domcontentloaded',timeout:60000});
 await page.waitForSelector('#change-plan-tab',{timeout:15000}).catch(async e=>{console.log((await page.content()).slice(-3000));throw e;});
 await page.click('#change-plan-tab');
 await page.waitForSelector('.all-packs-card');
 await page.$eval('.bouquet-explore',e=>e.scrollIntoView());
 fs.mkdirSync('.hallmark/all-packs-shots',{recursive:true});
 await page.screenshot({path:'.hallmark/all-packs-shots/desktop.png'});
 await page.click('.all-packs-select');
 if(await page.$eval('.all-packs-select',e=>e.getAttribute('aria-pressed'))!=='true')throw Error('Selection failed');
 const channel=await page.$('.all-packs-channels > button');
 if(channel){await channel.click();if(await channel.evaluate(e=>e.getAttribute('aria-expanded'))!=='true')throw Error('Channel expansion failed');}
 await page.setViewport({width:375,height:844,deviceScaleFactor:1});
 await page.$eval('.bouquet-explore',e=>e.scrollIntoView());
 if(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth))throw Error('Horizontal overflow');
 await page.screenshot({path:'.hallmark/all-packs-shots/phone.png'});
 console.log('Passed: pack selection, channel expansion, mobile overflow; captured desktop and phone.');
} finally {await browser.close();}
