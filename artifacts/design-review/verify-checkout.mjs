import {chromium} from '../../.local-fixtures/visual-tools/node_modules/playwright/index.mjs';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
const browser=await chromium.launch({channel:'chrome',headless:true});const page=await browser.newPage({viewport:{width:360,height:900}});
let state='ready';let expiry=false;let network=false;let mode='sandbox';let paymentPosts=0;
await page.route('**/api/payments/config',r=>r.fulfill({json:{mode}}));
await page.route('**/api/payments/session',r=>network?r.abort('internetdisconnected'):r.fulfill({json:{session:{id:'TEST-DESIGN-REVIEW',mode:'sandbox',status:state,provider:'Local sandbox simulator',packName:'Economy HD',validity:'6 months',amountPaise:139900,expiresAt:Date.now()+(expiry?-1000:180000)}}}));
await page.route('**/api/recharge/create',r=>{paymentPosts++;return r.abort();});
await page.goto('http://localhost:3000/recharge');await page.evaluate(()=>{localStorage.setItem('dth_tamizhan_lang','en');localStorage.setItem('dth_selected_operator','sun_direct');});
const scenarios=[['failed','Test payment failed. No money was taken.'],['pending','Test payment pending.'],['success','Test payment succeeded.'],['expired','Session expired, generate a new QR.'],['network','We could not load the details. Check your connection, then try again.'],['production','No payment has been taken.']];
for(const [scenario,expected] of scenarios){
 state=['failed','pending','success'].includes(scenario)?scenario:'ready';expiry=scenario==='expired';network=scenario==='network';mode=scenario==='production'?'production':'sandbox';
 await page.goto('http://localhost:3000/recharge');await page.waitForTimeout(900);await page.locator('#smart-card-input').fill('41289456123');await page.locator('#proceed-to-pay-btn').click();
 await page.locator('[role=dialog]').getByText(expected,{exact:false}).first().waitFor();
 if(scenario==='expired')assert.equal(await page.getByRole('button',{name:'Generate a new mock QR',exact:true}).count(),1);
 await page.locator('[role=dialog]').evaluate(e=>e.scrollTop=e.scrollHeight);await page.screenshot({path:`artifacts/design-review/checkout-${scenario}-360.png`});
 await page.keyboard.press('Escape');assert.equal(await page.locator('[role=dialog]').count(),0);
 console.log('PASS checkout',scenario);
}
assert.equal(paymentPosts,0);await fs.writeFile('artifacts/design-review/checkout-checks.json',JSON.stringify({scenarios:scenarios.map(([state])=>state),passed:true,paymentPosts,source:'Intercepted browser fixtures; no server session or provider request.'},null,2));await browser.close();
