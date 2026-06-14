// Build game.js from game/*.js modules (concatenation)
const fs=require('fs'),path=require('path');
const GAME_DIR=__dirname;
const ORDER=['constants','state','audio','textures','scene','player','track','buildings','obstacles','coins','guns','particles','collision','ui','controls','homelander','police','main','account','pvp-client'];
let out='';
for(const name of ORDER){
  const fp=path.join(GAME_DIR,name+'.js');
  if(!fs.existsSync(fp)){continue;}
  let c=fs.readFileSync(fp,'utf8').replace(/\n+$/,'\n');
  out+='// ===== ENDLESS RUNNER - '+name.charAt(0).toUpperCase()+name.slice(1).replace(/([A-Z])/g,' $1')+' =====\n';
  out+=c+'\n';
}
out=out.replace(/\n+$/, '\n');
fs.writeFileSync(path.join(GAME_DIR,'..','game.js'),out);
