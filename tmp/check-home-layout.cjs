const { chromium } = require('C:/Users/HSP/AppData/Local/npm-cache/_npx/e41f203b7505f1fb/node_modules/playwright');
const fs = require('node:fs');
(async () => {
 const browser = await chromium.launch({ channel: 'chrome', headless: true });
 try {
  for (const language of ['en','ta']) for (const width of [1366,390,320]) {
   const context=await browser.newContext({ viewport: {width,height:width===1366?768:844} });
   await context.addInitScript(lang=>localStorage.setItem('dth_tamizhan_lang',lang),language);
   const page=await context.newPage();
   await page.goto('http://localhost:3000',{waitUntil:'networkidle'});
   await page.locator('.home-task-cards').waitFor();
   const result=await page.evaluate(()=>({overflow:document.documentElement.scrollWidth>innerWidth,cards:[...document.querySelectorAll('.home-task-card')].map(el=>{const b=el.getBoundingClientRect();return {title:el.querySelector('h2').textContent,x:b.x,y:b.y,width:b.width,height:b.height,bottom:b.bottom};}),personalStrip:!!document.querySelector('.home-connection-strip')}));
   if(result.overflow || result.personalStrip) throw new Error(JSON.stringify(result));
   if(width===1366 && (!result.cards.every(c=>c.bottom<=768) || new Set(result.cards.map(c=>c.height)).size!==1)) throw new Error('Desktop cards do not fit: '+JSON.stringify(result));
   if(width<700 && !(result.cards[0].y<result.cards[1].y && result.cards[1].y<result.cards[2].y)) throw new Error('Mobile task order is wrong');
   await page.screenshot({path:`tmp/home-services-${language}-${width}.png`,fullPage:width!==1366});
   console.log(JSON.stringify({language,width,...result}));
   if(language==='en' && width===1366){
    await page.getByRole('tab',{name:'New connection',exact:true}).click();
    if(!(await page.getByRole('tabpanel').textContent()).includes('Choose your pack'))throw new Error('New connection tab failed');
    await page.getByRole('tab',{name:'Service request',exact:true}).click();
    if(!(await page.getByRole('tabpanel').textContent()).includes('Tell us the problem'))throw new Error('Service tab failed');
    await page.getByRole('tab',{name:'Service request',exact:true}).press('Home');
    if(await page.getByRole('tab',{name:'Recharge',exact:true}).getAttribute('aria-selected')!=='true')throw new Error('Tab keyboard navigation failed');
   }
   await context.close();
  }
 } finally {await browser.close();}
})();
