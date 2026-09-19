(function(root){
  'use strict';
  const E=root.BDOEngine||(typeof require==='function'?require('./engine.js'):null);
  const clone=E.clone;
  const layoutKey=p=>JSON.stringify({width:p.width,height:p.height,uiScale:p.uiScale,slots:p.slots});
  function blank(){
    const profiles={};
    for(let p=1;p<=3;p++){
      const id='preset-'+p,slots=[];
      for(let n=1;n<=20;n++)for(const family of ['cd','quick'])slots.push({id:(family==='cd'?'cd-':'q-')+n,family,number:n,x:(family==='cd'?1450:450)+((n-1)%5)*52,y:700+Math.floor((n-1)/5)*52});
      profiles[id]={id,name:'Preset '+p,width:2560,height:1440,uiScale:100,slots};
    }
    return {profiles,active:['preset-1','preset-2','preset-3'],library:[],editing:'preset-1'};
  }
  /** Refresh the three game slots; keep previous edited/named profiles in the library. */
  function merge(saved,game,{legacyState}={}){
    const checked=E.validateState(game);if(!checked.valid)throw Error(checked.errors[0]);
    if(!saved)return clone(game);
    const check=E.validateState(saved);if(!check.valid)throw Error(check.errors[0]);
    // A successful apply can put any named library ID into a game slot. Keep
    // those names/IDs and assignments when all three on-disk layouts match.
    if(saved.active.every((id,index)=>layoutKey(saved.profiles[id])===layoutKey(game.profiles[game.active[index]])))return clone(saved);
    const result=clone(game),existing=[...saved.library,...saved.active];
    for(const id of existing){
      const old=saved.profiles[id];
      // Remove only exact, unedited demonstration profiles from version 1.0.
      if(legacyState?.profiles[id]&&JSON.stringify(old)===JSON.stringify(legacyState.profiles[id]))continue;
      const incoming=result.profiles[id];
      if(incoming&&layoutKey(incoming)===layoutKey(old)){
        incoming.name=old.name;continue;
      }
      let target=id;
      if(incoming){
        const base=('saved-'+id).slice(0,54);target=base;let suffix=2;
        while(result.profiles[target]){
          if(layoutKey(result.profiles[target])===layoutKey(old)&&result.profiles[target].name===old.name){target=null;break;}
          target=base+'-'+suffix++;
        }
      }
      if(target===null)continue;
      if(Object.keys(result.profiles).length>=100)throw Error('Loading these game presets would exceed the 100-layout library limit. Export your library before making room.');
      Object.defineProperty(result.profiles,target,{enumerable:true,writable:true,configurable:true,value:{...clone(old),id:target}});
      result.library.push(target);
    }
    const validation=E.validateState(result);if(!validation.valid)throw Error(validation.errors[0]);
    return result;
  }
  root.BDOGameLibrary=Object.freeze({blank,merge});
  if(typeof module!=='undefined'&&module.exports)module.exports=root.BDOGameLibrary;
})(typeof window!=='undefined'?window:globalThis);
