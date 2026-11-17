import 'dotenv/config';
import { initializeApp } from 'firebase-admin/app';
import { mutateCatalog, readNewConnectionCatalog } from '../server/models/newConnectionCatalog';
const groups: [string,string,boolean,string][] = [
 ['Tamil','Entertainment',true,'Sun TV HD|Star Vijay HD|Jaya TV HD|KTV HD'],
 ['Tamil','Music',true,'Sun Music HD'],
 ['English','Sports',true,'Eurosport HD'],
 ['English','Kids',true,'Cartoon Network HD+'],
 ['English','Infotainment',true,'Discovery World HD|Animal Planet HD|Investigation Discovery HD'],
 ['English','Lifestyle',true,'TLC HD'],
 ['Tamil','Entertainment',false,'Sun Life|Zee Tamil|Star Vijay Super|Colors Tamil|Kalaignar TV|Raj TV|D Tamil|Raj Digital Plus|Mega TV|Mega 24|Vasanth TV|Polimer TV|Makkal TV|Peppers TV|Vendhar TV|Star Vijay Takkar'],
 ['Tamil','Comedy',false,'Sirippoli|Adithya TV|Raj Nagaichuvai'],
 ['Tamil','Movies',false,'Chithiram TV|J Movie|Zee Thirai'],
 ['Tamil','News',false,'Puthiya Thalaimurai|Thanthi TV|Jaya Plus|Sun News|Polimer News|News18 Tamil|Seithigal 24x7|Raj News|Sathiyam TV|Malai Murasu|News J|News Tamil 24x7|Tamil Janam|DD Tamil|Murasu TV'],
 ['Tamil','Music',false,'Jaya Max|Raj Musix|Isaiaruvi|Mega Musiq'],
 ['Tamil','Devotional',false,'Sri Sankara TV|Jothi TV|Madha TV|Angel TV|Nambikkai TV|Aaseervatham TV|SVBC 2 Tamil'],
 ['Hindi','Sports',false,'DD Sports|Star Sports 3'],
 ['English','Sports',true,'Unite 8 Sports 2 HD'],
 ['Tamil','Sports',false,'Star Sports 1 Tamil|Star Sports 2 Tamil'],
 ['English','Infotainment',false,'National Geographic|Nat Geo Wild|Discovery Science|History TV|Discovery Turbo'],
 ['Hindi','Lifestyle',false,'Food Food|Zee Zest'],
 ['Multilingual','Kids',false,'Hungama|Nick|Cartoon Network|Pogo|Discovery Kids|Sonic|ETV Bal Bharat|Nick Jr.|CBeebies'],
 ['Tamil','Kids',false,'Chutti TV'],
];
// The flyer advertises English news and other counts without naming all entries.
// Only explicitly named channels are imported; no missing names are invented.
const channels=groups.flatMap(([language,genre,isHD,names])=>names.split('|').map(name=>({name,language,genre,isHD,active:false,isPay:false})));
if(new Set(channels.map(c=>c.name)).size!==channels.length) throw new Error('Duplicate channel');
if(!process.argv.includes('--write')) console.log(JSON.stringify({name:'TAMIL THALAIVA HDS',channels:channels.length,hd:channels.filter(c=>c.isHD).length}));
else {
 initializeApp({projectId:'gen-lang-client-0168639596'});
 const before=await readNewConnectionCatalog();
 const brand=before.brands.find(b=>b.slug==='tata-play');
 if(!brand) throw new Error('Tata Play brand not found');
 const existingPack=before.packs.find(p=>p.brandId===brand.id && p.name.toLowerCase().replace(/[^a-z0-9]/g,'')==='tamilthalaivahds');
 if(existingPack) throw new Error('Pack already exists; review before changing');
 const channelIds:string[]=[];
 for(const [index,c] of channels.entries()) {
  const existing=before.channels.find(v=>v.name.toLowerCase()===c.name.toLowerCase());
  if(existing) channelIds.push(existing.id);
  else { const result=await mutateCatalog('channels',{...c,sortOrder:before.channels.length+index},{upsert:true});channelIds.push(result.item.id); }
 }
 const result=await mutateCatalog('packs',{name:'TAMIL THALAIVA HDS',brandId:brand.id,type:'HD',language:'Tamil',region:'Tamil Nadu',active:false,sortOrder:0,pricingOptions:[{validityDays:30,price:315}],channelIds,highlights:[]});
 const after=await readNewConnectionCatalog();const pack=after.packs.find(p=>p.id===result.item.id)!;
 if(pack.channelCount!==channels.length) throw new Error('Channel count verification failed');
 console.log(JSON.stringify({name:pack.name,id:pack.id,channels:pack.channelCount,hd:pack.hdChannelCount,price:pack.pricingOptions,active:pack.active}));
}
