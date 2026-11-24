const { chromium }=require('C:/Users/HSP/AppData/Local/npm-cache/_npx/e41f203b7505f1fb/node_modules/playwright');
const fs=require('node:fs');
(async()=>{const browser=await chromium.launch({channel:'chrome',headless:true});try{
 const fixtures=JSON.parse(fs.readFileSync('tmp/home-returning-markup.json','utf8'));
 for(const lang of ['en','ta'])for(const width of [1366,390,320]){
  const context=await browser.newContext({viewport:{width,height:width===1366?768:844}});await context.addInitScript(lang=>localStorage.setItem('dth_tamizhan_lang',lang),lang);const page=await context.newPage();
  await page.goto('http://localhost:3000',{waitUntil:'networkidle'});await page.locator('.home-task-cards').waitFor();
  await page.locator('#main-content').evaluate((el,html)=>{el.innerHTML=html},fixtures[lang]);
  await page.locator('.home-connection-strip').waitFor();
  const result=await page.evaluate(()=>{const text=document.querySelector('.home-hero-heading>p');return {overflow:document.documentElement.scrollWidth>innerWidth,cardBottom:Math.max(...[...document.querySelectorAll('.home-task-card')].map(el=>el.getBoundingClientRect().bottom)),subtextLines:text.getBoundingClientRect().height/parseFloat(getComputedStyle(text).lineHeight),fullIdVisible:document.querySelector('#main-content').textContent.includes('1234567890'),strip:!!document.querySelector('.home-connection-strip'),expiry:!!document.querySelector('.home-expiry-notice'),chips:document.querySelectorAll('.home-status-chips a').length}});
  if(result.overflow||result.fullIdVisible||!result.strip||!result.expiry||result.chips!==2||result.subtextLines>1.1)throw new Error(JSON.stringify({lang,width,...result}));
  if(width===1366&&result.cardBottom>768)throw new Error('Returning customer cards below fold: '+JSON.stringify(result));
  await page.screenshot({path:`tmp/home-services-returning-${lang}-${width}.png`,fullPage:width!==1366});console.log(JSON.stringify({lang,width,...result}));await context.close();
 }
}finally{await browser.close()}})();
