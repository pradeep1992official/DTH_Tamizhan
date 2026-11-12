import {chromium} from '../../.local-fixtures/visual-tools/node_modules/playwright/index.mjs';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
const browser=await chromium.launch({channel:'chrome',headless:true});
const page=await browser.newPage();const results=[];let paymentPosts=0;
await page.route('**/api/payments/config',r=>r.fulfill({json:{mode:'sandbox'}}));
await page.route('**/api/payments/session',r=>r.fulfill({json:{session:{id:'TEST-DESIGN-REVIEW',mode:'sandbox',status:'ready',provider:'Local sandbox simulator',packName:'Economy HD',validity:'6 months',amountPaise:139900,expiresAt:Date.now()+180000}}}));
await page.route('**/api/recharge/create',r=>{paymentPosts++;return r.abort();});
await page.goto('http://localhost:3000/recharge');
await page.evaluate(()=>{localStorage.setItem('dth_tamizhan_lang','en');localStorage.setItem('dth_selected_operator','sun_direct');});
for(const lang of ['en','ta'])for(const width of [360,768,1440]){
 await page.setViewportSize({width,height:width===360?900:1000});
 await page.evaluate(l=>localStorage.setItem('dth_tamizhan_lang',l),lang);
 for(const route of ['recharge','plans']){
  await page.goto('http://localhost:3000/'+route);await page.waitForTimeout(1400);await page.evaluate(()=>document.fonts.ready);
  const dims=await page.evaluate(()=>({viewport:innerWidth,document:document.documentElement.scrollWidth,lang:document.documentElement.lang}));
  assert.equal(dims.document,width);assert.equal(dims.lang,lang);
  if(route==='recharge') assert.equal(await page.evaluate(()=>{const i=document.querySelector('#smart-card-input').getBoundingClientRect();const t=document.querySelector('.recharge-checkout');return !t.classList.contains('is-sticky') || i.bottom<=t.getBoundingClientRect().top;}),true,'Sticky total must not cover the ID field');
  await page.screenshot({path:`artifacts/design-review/after-${route}-${width}${lang==='ta'?'-ta':''}-viewport.png`});
  results.push({route,width,lang,...dims});
 }
}
await page.setViewportSize({width:360,height:900});await page.evaluate(()=>localStorage.setItem('dth_tamizhan_lang','en'));await page.goto('http://localhost:3000/recharge');await page.waitForTimeout(1000);
await page.locator('#smart-card-input').fill('123');await page.locator('#proceed-to-pay-btn').click();
assert.equal(await page.locator('#smart-card-input').evaluate(e=>e===document.activeElement),true);assert.equal(await page.locator('[role=dialog]').count(),0);
await page.screenshot({path:'artifacts/design-review/invalid-id-360.png'});
await page.locator('#smart-card-input').fill('41289456123');await page.locator('#proceed-to-pay-btn').click();await page.locator('[role=dialog]').waitFor();
await page.getByText('Local sandbox simulator',{exact:true}).waitFor();
for(const width of [360,768,1440]){await page.setViewportSize({width,height:width===360?900:1000});await page.screenshot({path:`artifacts/design-review/checkout-${width}.png`});}
await page.getByRole('button',{name:'Close checkout',exact:true}).click();
await page.locator('#operator-tata_play-btn').click();assert.match(await page.locator('[aria-live=polite]').first().textContent(),/Tata Play/);
await page.emulateMedia({reducedMotion:'reduce'});assert.equal(await page.locator('#total-payable > span').evaluate(e=>getComputedStyle(e).animationName),'none');
await page.setViewportSize({width:360,height:900});await page.locator('.task-language button[lang=ta]').click();await page.locator('.id-guide summary').click();await page.locator('.id-guide').scrollIntoViewIfNeeded();await page.screenshot({path:'artifacts/design-review/guide-360-ta.png'});
assert.equal(paymentPosts,0);
await fs.writeFile('artifacts/design-review/layout-checks.json',JSON.stringify({checks:results,invalidIdFocus:true,operatorAnnouncement:true,reducedMotion:true,paymentPostCount:paymentPosts,paymentSession:'Browser-intercepted fixture; no server payment session created.'},null,2));
console.log('PASS:',results.length,'route/width/language layouts; invalid-ID focus; operator announcement; reduced motion; no payments');
await browser.close();
