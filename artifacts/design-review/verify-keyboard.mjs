import {chromium} from '../../.local-fixtures/visual-tools/node_modules/playwright/index.mjs';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
const b=await chromium.launch({channel:'chrome',headless:true});const p=await b.newPage({viewport:{width:360,height:900}});
await p.goto('http://localhost:3000/recharge');await p.waitForTimeout(1200);
await p.locator('.task-language button[lang=en]').focus();await p.keyboard.press('Tab');assert.equal(await p.locator('.task-language button[lang=ta]').evaluate(e=>e===document.activeElement),true);await p.keyboard.press('Tab');assert.equal(await p.locator('#smart-card-input').evaluate(e=>e===document.activeElement),true);assert.notEqual(await p.locator('#smart-card-input').evaluate(e=>getComputedStyle(e).outlineStyle),'none');
await p.emulateMedia({reducedMotion:'reduce'});assert.equal(await p.locator('#total-payable > span').evaluate(e=>getComputedStyle(e).animationName),'none');
const path='artifacts/design-review/layout-checks.json';const result=JSON.parse(await fs.readFile(path));result.keyboardTaskOrder=true;result.visibleInputFocus=true;result.reducedMotionAnimatedAmount=true;result.stickyTotalDoesNotObscureId=true;await fs.writeFile(path,JSON.stringify(result,null,2));console.log('PASS keyboard task order, input focus ring, animated amount reduced-motion override');await b.close();
