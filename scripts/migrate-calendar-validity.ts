import 'dotenv/config';
import { initializeApp } from 'firebase-admin/app';
import { readNewConnectionCatalog, mutateCatalog } from '../server/models/newConnectionCatalog';
initializeApp({projectId:'gen-lang-client-0168639596'});
const before=await readNewConnectionCatalog();
const brandIds=new Set(before.brands.filter(b=>/airtel|tataplay/.test(b.name.toLowerCase().replace(/[^a-z]/g,''))).map(b=>b.id));
for(const pack of before.packs.filter(p=>brandIds.has(p.brandId))) {
 const pricingOptions=pack.pricingOptions.map(o=>!o.validityMonths && [360,365].includes(o.validityDays)?{...o,validityMonths:12}:o);
 if(JSON.stringify(pricingOptions)===JSON.stringify(pack.pricingOptions)) continue;
 if(process.argv.includes('--write')) await mutateCatalog('packs',{...pack,pricingOptions},{id:pack.id});
 console.log(JSON.stringify({pack:pack.name,pricingOptions,action:process.argv.includes('--write')?'saved':'preview'}));
}
