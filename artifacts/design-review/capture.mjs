import { chromium } from '../../.local-fixtures/visual-tools/node_modules/playwright/index.mjs';
import fs from 'node:fs/promises';
const phase=process.argv[2]||'before';
const browser=await chromium.launch({channel:'chrome',headless:true});
const page=await browser.newPage();
await page.goto('http://localhost:3000/recharge');
await page.evaluate(()=>localStorage.setItem('dth_tamizhan_lang','en'));
for(const width of [360,768,1440]){
 await page.setViewportSize({width,height:width===360?900:1000});
 for(const route of ['recharge','plans']){
  await page.goto('http://localhost:3000/'+route);await page.waitForTimeout(1400);await page.evaluate(()=>document.fonts.ready);
  await page.screenshot({path:`artifacts/design-review/${phase}-${route}-${width}.png`,fullPage:true});
  console.log(phase,route,width,await page.evaluate(()=>({width:innerWidth,scroll:document.documentElement.scrollWidth})));
 }
}
await browser.close();
