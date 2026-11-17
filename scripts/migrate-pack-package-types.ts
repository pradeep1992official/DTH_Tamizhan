import 'dotenv/config';
import { initializeApp } from 'firebase-admin/app';
import { readNewConnectionCatalog, mutateCatalog } from '../server/models/newConnectionCatalog';
import { packPackageType } from '../src/lib/newConnectionCatalog';
initializeApp({projectId:'gen-lang-client-0168639596'});
const c=await readNewConnectionCatalog();
for(const pack of c.packs) {
 const packageType=packPackageType(pack);
 if(!packageType) { console.log(JSON.stringify({name:pack.name,status:'needs package selection'})); continue; }
 if(process.argv.includes('--write') && !pack.packageType) await mutateCatalog('packs',{...pack,packageType},{id:pack.id});
 console.log(JSON.stringify({name:pack.name,packageType,action:process.argv.includes('--write')?'saved':'preview'}));
}
