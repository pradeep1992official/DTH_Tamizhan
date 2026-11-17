import 'dotenv/config';
import { initializeApp } from 'firebase-admin/app';
import { mutateCatalog, readNewConnectionCatalog } from '../server/models/newConnectionCatalog';

// Transcribed from the supplied 279.jpg flyer. Names repeated in both columns
// (Discovery, Animal Planet and TLC) appear once. Channel numbers are not IDs.
const groups: [string, string, boolean, string][] = [
 ['Tamil','Entertainment',true,'Sun TV HD|KTV HD|Star Vijay HD|Zee Tamil HD|Star Vijay Super HD|Colors Tamil HD'],
 ['Tamil','Music',true,'Sun Music HD'],
 ['Tamil','Sports',true,'Star Sports 1 Tamil HD|Star Sports 2 Tamil HD'],
 ['English','Infotainment',true,'National Geographic HD|History TV18 HD|Nat Geo Wild HD'],
 ['Hindi','Lifestyle',true,'Zee Zest HD'],
 ['English','Kids',true,'Nick HD+'],
 ['Hindi','Public service',true,'Sansad TV 2 HD|DD National HD|DD India HD|DD News HD'],
 ['Hindi','Sports',true,'DD Sports HD'],
 ['Tamil','Devotional',false,'Jothi TV|Sri Sankara TV|Sai TV|SVBC 2 Tamil|Nambikkai TV|Aaseervatham TV|Angel TV|Madha TV'],
 ['Tamil','News',false,'Polimer News|Thanthi TV|News J|Sathiyam TV|Tamil Janam|Malai Murasu|Raj News|Jaya Plus|Sun News|Puthiya Thalaimurai|News7 Tamil|Murasu TV|Seithigal 24x7|News18 Tamil|News Tamil 24x7|Raj Digital Plus'],
 ['Tamil','Entertainment',false,'Kalaignar TV|Polimer TV|Makkal TV|Vasanth TV|DD Tamil|Zee Thirai|Adithya TV|Raj TV|Jaya TV|Sun Life|Star Vijay Super|Star Vijay Takkar|Puthu Yugam|Mega TV'],
 ['Tamil','Comedy',false,'Sirippoli|Raj Nagaichuvai'],
 ['Tamil','Music',false,'Raj Musix|Jaya Max|Mega Musiq|Isaiaruvi|7S Music'],
 ['Tamil','Movies',false,'J Movie|Mega 24'],
 ['Tamil','Infotainment',false,'Discovery Tamil'],
 ['English','Infotainment',false,'Discovery Channel|Animal Planet|National Geographic|Nat Geo Wild'],
 ['English','Lifestyle',false,'TLC'],
 ['Tamil','Sports',false,'Star Sports 1 Tamil|Sony Sports Ten 4 Tamil'],
 ['English','Sports',false,'Eurosport|Star Sports 3'],
 ['Multilingual','Kids',false,'ETV Bal Bharat|Pogo|Discovery Kids|Cartoon Network|Hungama|Sony YAY!|Nick Jr.|Sonic|Nick'],
 ['Tamil','Kids',false,'Chutti TV'],
];
const channels = groups.flatMap(([language,genre,isHD,names]) => names.split('|').map(name => ({name,language,genre,isHD,active:false,isPay:false})));
if (new Set(channels.map(c=>c.name)).size !== channels.length) throw new Error('Duplicate channel name');
if (!process.argv.includes('--write')) {
 console.log(JSON.stringify({pack:'Tamil Super Star HD',pricingOptions:[{validityDays:30,price:279}],channels:channels.length,hd:channels.filter(c=>c.isHD).length,active:false},null,2));
} else {
 initializeApp({projectId:'gen-lang-client-0168639596'});
 const before=await readNewConnectionCatalog();
 const brand=before.brands.find(b=>b.slug==='airtel');
 if(!brand) throw new Error('Airtel brand not found');
 if(before.packs.some(p=>p.brandId===brand.id && p.name==='Tamil Super Star HD')) throw new Error('Pack already exists');
 const channelIds:string[]=[];
 for(const [index,channel] of channels.entries()) {
  const existing=before.channels.find(c=>c.name.toLowerCase()===channel.name.toLowerCase());
  if(existing) { channelIds.push(existing.id); continue; }
  const result=await mutateCatalog('channels',{...channel,sortOrder:index},{upsert:true});
  channelIds.push(result.item.id);
 }
 const result=await mutateCatalog('packs',{brandId:brand.id,name:'Tamil Super Star HD',type:'HD',language:'Tamil',region:'Tamil Nadu',pricingOptions:[{validityDays:30,price:279}],channelIds,active:false,highlights:['Channel list transcribed from supplied Airtel flyer. Pricing duration, channel availability and pay/free classifications require verification.'],sortOrder:0});
 const after=await readNewConnectionCatalog();
 const pack=after.packs.find(p=>p.id===result.item.id)!;
 if(pack.channelIds.length!==channels.length || pack.hdChannelCount!==19) throw new Error('Verification failed');
 console.log(JSON.stringify({id:pack.id,name:pack.name,channels:pack.channelCount,hd:pack.hdChannelCount,pricing:pack.pricingOptions,active:pack.active}));
}
