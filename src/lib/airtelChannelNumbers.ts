// Transcribed from the user-supplied airtel-tamil-super-star-hd.jpg flyer.
// Numbers are operator-specific and may repeat in the source (HD/SD simulcasts).
const rows: [string, number][] = [
  ['Sun TV HD',755], ['KTV HD',757], ['Sun Music HD',810], ['Star Vijay HD',759],
  ['Zee Tamil HD',752], ['Star Vijay Super HD',773], ['Colors Tamil HD',764],
  ['Star Sports 1 Tamil HD',801], ['Star Sports 2 Tamil HD',805], ['National Geographic HD',423],
  ['Zee Zest HD',415], ['Nick HD+',456], ['History TV18 HD',429], ['Nat Geo Wild HD',435],
  ['Sansad TV 2 HD',441], ['DD Sports HD',302], ['DD National HD',153], ['DD India HD',401], ['DD News HD',372],
  ['Jothi TV',818], ['Polimer News',787], ['Thanthi TV',788], ['Kalaignar TV',760],
  ['Polimer TV',766], ['Sirippoli',767], ['Makkal TV',768], ['Vasanth TV',771],
  ['Sri Sankara TV',679], ['Malai Murasu',793], ['Raj Nagaichuvai',776], ['DD Tamil',820],
  ['News J',791], ['Sathiyam TV',792], ['Tamil Janam',797], ['Sai TV',823],
  ['SVBC 2 Tamil',819], ['Nambikkai TV',817], ['Aaseervatham TV',814], ['Angel TV',815],
  ['Madha TV',816], ['Zee Thirai',775], ['Adithya TV',769], ['Raj Digital Plus',748],
  ['Raj TV',765], ['Raj Musix',813], ['Raj News',794], ['Jaya Plus',790], ['Jaya TV',762],
  ['J Movie',780], ['Jaya Max',811], ['Sun News',789], ['Sun Life',774], ['Star Vijay Super',772],
  ['Discovery Tamil',798], ['Star Vijay Takkar',822], ['Star Sports 1 Tamil',803],
  ['Puthu Yugam',753], ['Mega TV',750], ['Mega Musiq',807], ['Mega 24',777], ['Isaiaruvi',808],
  ['News7 Tamil',793], ['Puthiya Thalaimurai',784], ['Murasu TV',781], ['Seithigal 24x7',785],
  ['Discovery Channel',420], ['Animal Planet',426], ['TLC',408], ['National Geographic',423],
  ['Nat Geo Wild',435], ['7S Music',812], ['News18 Tamil',782], ['News Tamil 24x7',797],
  ['Sony Sports Ten 4 Tamil',802], ['Eurosport',304], ['Star Sports 3',306],
  ['ETV Bal Bharat',466], ['Pogo',451], ['Discovery Kids',461], ['Cartoon Network',449],
  ['Hungama',453], ['Sony YAY!',471], ['Chutti TV',474], ['Nick Jr.',447], ['Sonic',460], ['Nick',455],
];
const normalize = (name: string) => name.toLowerCase().replace(/[^a-z0-9]/g, '');
export const airtelSuperStarChannelNumbers: Readonly<Record<string, number>> = Object.fromEntries(rows);
export function channelNumbersForPack(brand: string, pack: string): Readonly<Record<string, number>> | undefined {
  return normalize(brand).includes('airtel') && normalize(pack).includes('tamilsuperstarhd') ? airtelSuperStarChannelNumbers : undefined;
}
