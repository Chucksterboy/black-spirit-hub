(() => {
'use strict';
const ASSETS = {"background":"./assets/background.jpg","seed":[{"id":"cd-1","family":"cd","number":1,"x":1392,"y":559},{"id":"cd-2","family":"cd","number":2,"x":1392,"y":609},{"id":"cd-3","family":"cd","number":3,"x":1459,"y":455},{"id":"cd-4","family":"cd","number":4,"x":1496,"y":455},{"id":"cd-5","family":"cd","number":5,"x":1552,"y":490},{"id":"cd-6","family":"cd","number":6,"x":1578,"y":554},{"id":"cd-7","family":"cd","number":7,"x":1577,"y":618},{"id":"cd-8","family":"cd","number":8,"x":1549,"y":680},{"id":"cd-9","family":"cd","number":9,"x":1488,"y":706},{"id":"cd-10","family":"cd","number":10,"x":1424,"y":705},{"id":"cd-11","family":"cd","number":11,"x":1456,"y":780},{"id":"cd-12","family":"cd","number":12,"x":1506,"y":780},{"id":"cd-13","family":"cd","number":13,"x":1556,"y":780},{"id":"cd-14","family":"cd","number":14,"x":935,"y":495},{"id":"cd-15","family":"cd","number":15,"x":985,"y":495},{"id":"cd-16","family":"cd","number":16,"x":1035,"y":495},{"id":"cd-17","family":"cd","number":17,"x":982,"y":620},{"id":"cd-18","family":"cd","number":18,"x":932,"y":620},{"id":"cd-19","family":"cd","number":19,"x":932,"y":706},{"id":"cd-20","family":"cd","number":20,"x":982,"y":706},{"id":"q-1","family":"quick","number":1,"x":704,"y":1376},{"id":"q-2","family":"quick","number":2,"x":402,"y":1376},{"id":"q-3","family":"quick","number":3,"x":504,"y":1376},{"id":"q-4","family":"quick","number":4,"x":7,"y":911},{"id":"q-5","family":"quick","number":5,"x":654,"y":1376},{"id":"q-6","family":"quick","number":6,"x":0,"y":1376},{"id":"q-7","family":"quick","number":7,"x":604,"y":1376},{"id":"q-8","family":"quick","number":8,"x":107,"y":911},{"id":"q-9","family":"quick","number":9,"x":157,"y":911},{"id":"q-10","family":"quick","number":10,"x":352,"y":1376},{"id":"q-11","family":"quick","number":11,"x":57,"y":911},{"id":"q-12","family":"quick","number":12,"x":301,"y":1376},{"id":"q-13","family":"quick","number":13,"x":50,"y":1376},{"id":"q-14","family":"quick","number":14,"x":100,"y":1376},{"id":"q-15","family":"quick","number":15,"x":1392,"y":396},{"id":"q-16","family":"quick","number":16,"x":149,"y":1376},{"id":"q-17","family":"quick","number":17,"x":554,"y":1376},{"id":"q-18","family":"quick","number":18,"x":453,"y":1376},{"id":"q-19","family":"quick","number":19,"x":201,"y":1376},{"id":"q-20","family":"quick","number":20,"x":252,"y":1376}]};
const root = document.getElementById('bdo-layout-studio');
const E = globalThis.BDOEngine;
const $ = selector => root.querySelector(selector);
const $$ = selector => [...root.querySelectorAll(selector)];
const viewport = $('.ed-viewport'), world = $('.ed-world');
let storageKey = 'bdo-layout-editor-v3';
const signature = state => JSON.stringify({profiles:state.profiles,active:state.active,library:state.library});
let state = BDOGameLibrary.blank(), initialized = false, initializing = false, saving = null, saveHandler = null;
let gameSource=null,gameReport=null,sourceBusy=false,accountResolver=null;
let gameTarget=null,gamePending=false,lastSaveResult=null,checkingGame=null,lastFileCheck=null,saveProgress=null,stopSaveProgress=null;
const hasGameReader=()=>typeof window.bdoDesktop?.discoverBdo==='function'&&typeof window.bdoDesktop?.readBdo==='function';
const hasGameWriter=()=>storageMode==='desktop'&&typeof window.bdoDesktop?.saveAndApply==='function';
let lastNotification = '', storageMode = 'browser';
let readyResolve, readyReject;
let readyFailed = false;
let ready = new Promise((resolve,reject)=>{readyResolve=resolve;readyReject=reject;});
ready.catch(()=>{});
let applied = signature(state), selected = new Set(), undoStack = [], redoStack = [];
let pointer = null, profileDrag = null, spaceDown = false, suppressClick = false, ownsKeyboard = false, canvasHovered = false;
let zoom=1, panX=0, panY=0, fitScale=1, scale=1, guides={x:[],y:[]};
let openPickerIndex=null,previousFullscreenView=null,wasFullscreen=false;
let nameDialogContext=null;
let backgroundTask=null,customBackground=null,backgroundLoadWarning='';
let resultReturnFocus=null;
let applyConfirmationReturnFocus=null,applyConfirmationCloseTimer=0;
const BACKGROUND_LIMIT=4*1024*1024;
const visible={cd:true,quick:true};
const slotButtons=new Map();
const profile=()=>state.profiles[state.editing];
const slotSize=()=>40*profile().uiScale/100;
const announce=(text,dialogTitle='')=>{
  const message=hasGameWriter()?text.replaceAll('Save library','Save & apply'):text;
  $('[data-message]').textContent=message;
  if(dialogTitle){
    const dialog=$('[data-result-dialog]');
    if(!dialog.open)resultReturnFocus=document.activeElement;
    closePicker();
    $('[data-result-title]').textContent=dialogTitle;
    $('[data-result-message]').textContent=message;
    if(!dialog.open)dialog.showModal();
    $('[data-result-close]').focus();
  }
};
$('[data-result-close]').addEventListener('click',()=>$('[data-result-dialog]').close());
$('[data-result-dialog]').addEventListener('close',()=>{
  const previous=resultReturnFocus;resultReturnFocus=null;
  if(previous?.isConnected&&!previous.disabled)previous.focus({preventScroll:true});
});
const emit=(name,detail)=>window.dispatchEvent(new CustomEvent('bdo:'+name,{detail}));
function notifyChange(){
  const current=signature(state),dirty=current!==applied||gamePending;
  const key=current+'|'+state.editing+'|'+dirty;
  if(initialized&&lastNotification!==key){lastNotification=key;emit('change',{state:E.clone(state),dirty});}
}
const equal=(a,b)=>signature(a)===signature(b);
function pushHistory(before) {if(equal(before,state))return;undoStack.push(E.clone(before));if(undoStack.length>50)undoStack.shift();redoStack=[];}
function mutate(change,text) {const before=E.clone(state);change();pushHistory(before);renderAll();if(text)announce(text);}
function dirtyRender() {
  const dirty=signature(state)!==applied||gamePending;
  $('[data-save-state]').textContent=saving?(saveProgress?'Waiting for BDO…':'Saving…'):checkingGame?'Checking file…':gamePending?'BDO apply pending':dirty?'Unsaved changes':lastSaveResult?.requiresInGameCheck?'Check in game':'All changes saved';
  $('[data-save-state]').dataset.dirty=String(dirty);
  $('[data-apply]').disabled=!initialized||!!saving||!!checkingGame||sourceBusy||!dirty;
  $('[data-apply]').textContent=saving&&saveProgress?'Waiting…':hasGameWriter()?(gamePending&&signature(state)===applied?'Retry apply':'Save & apply'):'Save library';
  $('[data-apply]').title=hasGameWriter()?'Save locally and write the three BDO presets, including while the game is open. Apply at character selection, then enter a character and load the preset in Edit UI.':'Save the layout library on this device.';
  $('[data-check-game-file]').hidden=!lastSaveResult?.applied||typeof window.bdoDesktop?.checkLastApply!=='function';
  $('[data-check-game-file]').disabled=!!saving||!!checkingGame||sourceBusy;
  $('[data-save-as]').disabled=!initialized;
  $('[data-export]').disabled=!initialized;
  $('[data-load-bdo]').disabled=!!saving||!!checkingGame||sourceBusy;
  $('[data-undo]').disabled=!undoStack.length;
  $('[data-redo]').disabled=!redoStack.length;
  renderBackgroundControls();
  notifyChange();
}
function renderBackgroundControls(){
  $('[data-background-pick]').disabled=!initialized||!!backgroundTask;
  $('[data-background-reset]').disabled=!initialized||!!backgroundTask||!customBackground;
  $('[data-background-pick]').classList.toggle('is-custom',!!customBackground);
  $('[data-background-pick]').setAttribute('aria-busy',String(!!backgroundTask));
}
const nativeBackground=()=>storageMode==='desktop'&&typeof window.bdoDesktop?.loadBackground==='function'&&typeof window.bdoDesktop?.saveBackground==='function';
function setBackground(value){
  customBackground=value;
  $('.ed-background').src=value||ASSETS.background;
  $('.ed-background').alt=value?'Custom layout preview background':'Default Black Desert temple background';
  renderBackgroundControls();
}
async function decodedImage(url){
  const image=new Image();image.src=url;
  try{await image.decode();}catch(_){throw Error('This image could not be opened. Choose a PNG, JPG, WebP or BMP image.');}
  if(!image.naturalWidth||!image.naturalHeight||image.naturalWidth*image.naturalHeight>80000000)throw Error('Choose an image with fewer than 80 million pixels.');
  return image;
}
async function loadBackground(){
  backgroundLoadWarning='';
  try{
    const value=nativeBackground()?await window.bdoDesktop.loadBackground():localStorage.getItem(storageKey+'-background');
    if(value!==null){
      if(typeof value!=='string'||value.length>BACKGROUND_LIMIT||!/^data:image\/jpeg;base64,[A-Za-z0-9+/]+={0,2}$/.test(value))throw Error('The saved background is not a supported image.');
      await decodedImage(value);
    }
    setBackground(value);
  }catch(error){setBackground(null);backgroundLoadWarning=' Background could not be loaded. '+error.message;}
}
async function persistBackground(value){
  if(nativeBackground())await window.bdoDesktop.saveBackground(value);
  else if(value===null)localStorage.removeItem(storageKey+'-background');
  else localStorage.setItem(storageKey+'-background',value);
}
async function backgroundFromFile(file){
  if(!file.size||file.size>30*1024*1024)throw Error('Choose an image under 30 MB.');
  const head=new Uint8Array(await file.slice(0,12).arrayBuffer());
  const png=[137,80,78,71,13,10,26,10].every((n,i)=>head[i]===n);
  const jpeg=head[0]===255&&head[1]===216&&head[2]===255;
  const webp=String.fromCharCode(...head.slice(0,4))==='RIFF'&&String.fromCharCode(...head.slice(8,12))==='WEBP';
  const bmp=head[0]===66&&head[1]===77;
  if(!png&&!jpeg&&!webp&&!bmp)throw Error('Choose a PNG, JPG, WebP or BMP image.');
  const url=URL.createObjectURL(file);
  try{
    const image=await decodedImage(url),factor=Math.min(1,3840/Math.max(image.naturalWidth,image.naturalHeight));
    const canvas=document.createElement('canvas');canvas.width=Math.max(1,Math.round(image.naturalWidth*factor));canvas.height=Math.max(1,Math.round(image.naturalHeight*factor));
    const context=canvas.getContext('2d');if(!context)throw Error('Image preview is unavailable.');
    context.fillStyle='#101715';context.fillRect(0,0,canvas.width,canvas.height);context.drawImage(image,0,0,canvas.width,canvas.height);
    for(const quality of [.9,.8,.65,.5]){const value=canvas.toDataURL('image/jpeg',quality);if(value.length<=BACKGROUND_LIMIT)return value;}
    throw Error('This image is too detailed to save. Choose a smaller image.');
  }finally{URL.revokeObjectURL(url);}
}
function changeBackground(file){
  if(backgroundTask||!initialized)return;
  backgroundTask=(async()=>{
    try{
      const value=file?await backgroundFromFile(file):null;
      await persistBackground(value);setBackground(value);
      announce(file?'Background saved on this device.':'Default background restored.');
    }catch(error){announce('Background was not changed. '+(error.name==='QuotaExceededError'?'There is not enough browser storage. Choose a smaller image.':error.message),'Background could not be changed');}
    finally{backgroundTask=null;renderBackgroundControls();}
  })();
  renderBackgroundControls();
}
$('[data-background-pick]').addEventListener('click',()=>{if(initialized&&!backgroundTask)$('[data-background-file]').click();});
$('[data-background-file]').addEventListener('change',e=>{const file=e.target.files[0];e.target.value='';if(file)changeBackground(file);});
$('[data-background-reset]').addEventListener('click',()=>changeBackground(null));
function bounds(slots=profile().slots.filter(s=>selected.has(s.id))) {
  if(!slots.length)return null;
  const size=slotSize(),x=Math.min(...slots.map(s=>s.x)),y=Math.min(...slots.map(s=>s.y));
  return {x,y,width:Math.max(...slots.map(s=>s.x+size))-x,height:Math.max(...slots.map(s=>s.y+size))-y};
}
function locate(id) {const a=state.active.indexOf(id);return a>=0?{area:'active',index:a}:{area:'library',index:state.library.indexOf(id)};}
function chooseProfile(id) {
  if(pointer)return;
  closePicker();
  state.editing=id;selected.clear();zoom=1;panX=0;panY=0;$('[data-zoom]').value='1';
  renderAll();announce('Editing '+profile().name+'.');
}
function bindPresetDrag(source,area,index,target=source) {
  const id=state[area][index];source.draggable=true;
  source.addEventListener('dragstart',e=>{profileDrag={area,index,id};e.dataTransfer.effectAllowed='move';e.dataTransfer.setData('text/plain',id);source.classList.add('ed-dragging');});
  source.addEventListener('dragend',()=>{profileDrag=null;$$('.ed-drop,.ed-dragging').forEach(el=>el.classList.remove('ed-drop','ed-dragging'));closePicker();});
  if(area!=='active')return;
  target.addEventListener('dragover',e=>{if(!profileDrag||profileDrag.id===id)return;e.preventDefault();e.dataTransfer.dropEffect='move';target.classList.add('ed-drop');});
  target.addEventListener('dragleave',e=>{if(!target.contains(e.relatedTarget))target.classList.remove('ed-drop');});
  target.addEventListener('drop',e=>{if(!profileDrag)return;e.preventDefault();e.stopPropagation();const incoming=profileDrag.id;profileDrag=null;assignLayout(index,incoming);});
}
function createCard(id,area,index) {
  const p=state.profiles[id];
  const card=document.createElement('div');card.className='ed-preset-card';card.dataset.profile=id;card.dataset.index=index;
  card.classList.toggle('is-editing',state.editing===id);
  const button=document.createElement('button');button.type='button';button.className='ed-preset';
  button.dataset.profile=id;button.dataset.area=area;button.dataset.index=index;
  button.setAttribute('aria-pressed',String(state.editing===id));
  button.disabled=!initialized;
  button.setAttribute('aria-label',(area==='active'?'Preset '+(index+1)+': ':'Saved preset: ')+p.name);
  button.title=button.dataset.tooltip=p.name+' · Click to edit · drag to swap';
  const emblem=document.createElement('span');emblem.className='ed-preset-number';emblem.textContent=index+1;emblem.setAttribute('aria-hidden','true');
  const name=document.createElement('span');name.className='ed-card-name';name.textContent=p.name;
  button.append(emblem,name);
  const rename=document.createElement('button');rename.type='button';rename.className='ed-preset-rename';rename.dataset.rename=index;rename.disabled=!initialized;
  rename.setAttribute('aria-label','Rename preset '+p.name);rename.title=rename.dataset.tooltip='Rename preset · F2';
  rename.innerHTML='<svg width="14" height="14" viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m12.4 3.3 4.3 4.3M3 17l4.4-1 9.2-9.2a1.7 1.7 0 0 0 0-2.4l-1-1a1.7 1.7 0 0 0-2.4 0L4 12.6 3 17Z"/></svg>';
  rename.addEventListener('click',()=>openNameDialog('rename',id));
  const picker=document.createElement('button');picker.type='button';picker.className='ed-preset-picker';picker.dataset.picker=index;
  picker.innerHTML='<svg width="14" height="14" viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m5 7.5 5 5 5-5"/></svg>';
  picker.disabled=!initialized;
  picker.setAttribute('aria-label','Choose layout for Preset '+(index+1));picker.setAttribute('aria-haspopup','menu');picker.setAttribute('aria-expanded','false');picker.setAttribute('aria-controls','bdo-ed-layout-picker');
  picker.title=picker.dataset.tooltip='Choose a saved layout';
  picker.addEventListener('click',()=>openPickerIndex===index?closePicker(true):openPicker(index));
  picker.addEventListener('keydown',e=>{if(e.key==='ArrowDown'){e.preventDefault();e.stopPropagation();openPicker(index);}});
  card.append(button,rename,picker);bindPresetDrag(button,area,index,card);
  button.addEventListener('click',()=>{if(!profileDrag)chooseProfile(id);});
  button.addEventListener('keydown',e=>{
    if(e.altKey&&['1','2','3'].includes(e.key)){e.preventDefault();const target={area:'active',index:Number(e.key)-1};mutate(()=>{state=E.swap(state,locate(id),target);},p.name+' moved to Preset '+e.key+'. Save library to keep changes.');}
  });
  return card;
}
function closePicker(refocus=false){
  const previous=openPickerIndex;openPickerIndex=null;$('[data-layout-picker]').hidden=true;
  $$('[data-picker]').forEach(button=>button.setAttribute('aria-expanded','false'));
  if(refocus&&previous!==null)$('[data-picker="'+previous+'"]').focus({preventScroll:true});
}
function positionPicker(){
  if(openPickerIndex===null)return;
  const popup=$('[data-layout-picker]'),card=$('[data-picker="'+openPickerIndex+'"]').closest('.ed-preset-card'),box=card.getBoundingClientRect(),outer=root.getBoundingClientRect();
  popup.style.width='max-content';popup.style.minWidth=Math.min(224,outer.width-16)+'px';popup.style.maxWidth=Math.min(360,outer.width-16)+'px';
  const width=popup.getBoundingClientRect().width;
  popup.style.left=Math.max(8,Math.min(box.left-outer.left,outer.width-width-8))+'px';popup.style.top=(box.bottom-outer.top+6)+'px';
}
function openPicker(index){
  if(pointer)finishPointer({},true);
  closePicker();openPickerIndex=index;
  const popup=$('[data-layout-picker]');popup.id='bdo-ed-layout-picker';popup.setAttribute('role','menu');
  const heading=$('[data-picker-heading]');heading.textContent='Layouts for Preset '+(index+1);heading.id='bdo-ed-picker-heading';popup.setAttribute('aria-labelledby',heading.id);
  const current=state.active[index],ids=[current,...state.library,...state.active.filter(id=>id!==current)];
  const rows=ids.map(id=>{
    const row=document.createElement('div');row.className='ed-layout-row';row.setAttribute('role','none');
    const p=state.profiles[id],loc=locate(id),button=document.createElement('button');button.type='button';button.className='ed-layout-option';button.dataset.layoutId=id;
    button.setAttribute('role','menuitemradio');button.setAttribute('aria-checked',String(id===current));
    const name=document.createElement('span');name.className='ed-option-name';name.textContent=p.name;
    const meta=document.createElement('span');meta.className='ed-option-meta';meta.textContent=id===current?'Current':loc.area==='active'?'Preset '+(loc.index+1):'Saved';button.append(name,meta);
    button.addEventListener('click',()=>assignLayout(index,id));bindPresetDrag(button,loc.area,loc.index);
    row.append(button);
    if(loc.area==='library'){
      const remove=document.createElement('button');remove.type='button';remove.className='ed-layout-delete';remove.dataset.deleteLayout=id;
      remove.setAttribute('role','menuitem');remove.setAttribute('aria-label','Delete saved preset '+p.name);remove.title='Delete '+p.name+' · Undo restores it';
      remove.innerHTML='<svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M3.5 5.5h13M7 5.5V3.8h6v1.7M5 5.5l.8 11h8.4l.8-11M8 8.5v5M12 8.5v5"/></svg>';
      remove.addEventListener('click',()=>deleteSavedLayout(id,index));row.append(remove);
    }
    return row;
  });
  $('[data-picker-options]').replaceChildren(...rows);popup.hidden=false;$('[data-picker="'+index+'"]').setAttribute('aria-expanded','true');positionPicker();rows[0].querySelector('button').focus({preventScroll:true});
}
function deleteSavedLayout(id,index){
  const name=state.profiles[id].name,oldIndex=state.library.indexOf(id);
  try{
    mutate(()=>{
      const wasEditing=state.editing===id;state=E.deletePreset(state,id);
      if(wasEditing){selected.clear();zoom=1;panX=0;panY=0;$('[data-zoom]').value='1';}
    },'Deleted '+name+'. Undo restores it. Save library to keep this change.');
    openPicker(index);
    const bins=$$('[data-delete-layout]');
    (bins[Math.min(oldIndex,bins.length-1)]||$('[data-layout-id="'+state.active[index]+'"]')).focus({preventScroll:true});
  }catch(error){announce('Could not delete preset: '+error.message,'Preset could not be deleted');}
}
function assignLayout(index,id){
  const outgoing=state.active[index],oldName=state.profiles[outgoing].name,newName=state.profiles[id].name;closePicker();
  if(id===outgoing)chooseProfile(id);
  else mutate(()=>{state=E.swap(state,locate(id),{area:'active',index});state.editing=id;selected.clear();zoom=1;panX=0;panY=0;$('[data-zoom]').value='1';},newName+' assigned to Preset '+(index+1)+'. '+oldName+' is '+(state.library.includes(id)?'kept in saved layouts.':'preserved.'));
  $('[data-picker="'+index+'"]').focus({preventScroll:true});
}
function renderProfiles() {
  closePicker();
  $('.ed-active-presets').replaceChildren(...state.active.map((id,i)=>createCard(id,'active',i)));
  $('[data-editing-label]').textContent='Editing '+profile().name+(state.library.includes(state.editing)?' · saved layout':'');
  $('[data-fullscreen-label]').textContent=profile().name;
  $('[data-width]').value=profile().width;$('[data-height]').value=profile().height;$('[data-ui-scale]').value=profile().uiScale;
}
function pick(id,toggle=false) {if(toggle){if(selected.has(id))selected.delete(id);else selected.add(id);}else{selected.clear();selected.add(id);}renderCanvas();}
function createSlots() {
  for(const s of profile().slots) {
    const button=document.createElement('button');button.type='button';button.className='ed-slot';button.dataset.slot=s.id;button.dataset.family=s.family;
    button.setAttribute('aria-label',(s.family==='cd'?'Cooldown':'Quickslot')+' slot '+s.number);
    const number=document.createElement('span');number.className='ed-slot-number';number.textContent=s.number;button.append(number);
    button.title=(s.family==='cd'?'Cooldown ':'Quickslot ')+s.number;
    button.addEventListener('click',e=>{if(suppressClick||e.detail!==0)return;pick(s.id,e.ctrlKey||e.metaKey);});
    world.append(button);slotButtons.set(s.id,button);
  }
}
function updateView() {
  const p=profile(),fullscreen=document.fullscreenElement===viewport;
  const h=viewport.clientHeight;
  fitScale=Math.min(viewport.clientWidth/p.width,h/p.height);scale=fitScale*zoom;
  panX=p.width*scale<=viewport.clientWidth?(viewport.clientWidth-p.width*scale)/2:Math.min(0,Math.max(viewport.clientWidth-p.width*scale,panX));
  panY=p.height*scale<=h?(h-p.height*scale)/2:Math.min(0,Math.max(h-p.height*scale,panY));
  world.style.width=p.width+'px';world.style.height=p.height+'px';
  world.style.transform='translate('+panX+'px,'+panY+'px) scale('+scale+')';
  $('[data-view-badge]').textContent=p.width+' × '+p.height+' · UI '+p.uiScale+'%';
  $('.ed-mini').style.transform='scale('+(p.uiScale/100)+')';$('.ed-mini').style.transformOrigin='top right';
}
function renderCanvas() {
  updateView();const size=slotSize(),p=profile();
  const origin=gameReport?.presets.find(item=>item.id===state.editing);
  p.slots.forEach(s=>{
    const button=slotButtons.get(s.id);if(!button)return;
    button.style.left=s.x+'px';button.style.top=s.y+'px';button.style.width=size+'px';button.style.height=size+'px';
    button.hidden=!visible[s.family];button.setAttribute('aria-pressed',String(selected.has(s.id)));
    const original=origin?.slots.find(item=>item.id===s.id);
    button.dataset.gameHidden=String(!!original?.hidden);
    button.title=(s.family==='cd'?'Cooldown ':'Quickslot ')+s.number+(original?' · BDO panel '+original.panelIndex+(original.hidden?' · hidden in source file':'')+(original.clamped?' · fitted inside preview':''):'');
    const label=button.firstElementChild;label.style.fontSize=(Math.max(10,Math.min(12,size*scale*.58))/scale)+'px';
    label.style.display=size*scale<11&&!selected.has(s.id)?'none':'';
  });
  $('.ed-mini').hidden=!$('[data-map]').checked;
  $('[data-guide-hint]').classList.toggle('is-held',!!pointer?.holdingGuides);
  $('[data-guide-hint]').dataset.mode=pointer?.shiftMode||'';
  $$('.ed-guide,.ed-axis-guide').forEach(el=>el.remove());
  for(const axis of ['x','y'])for(const value of guides[axis]){
    const el=document.createElement('div');el.className='ed-guide';el.dataset.axis=axis;el.dataset.coordinate=String(value);
    el.dataset.held=String(!!pointer?.holdingGuides&&pointer.heldGuides[axis].includes(value));
    el.style.cssText=axis==='x'?'left:'+(panX+value*scale)+'px;top:0;width:1px;height:100%':'top:'+(panY+value*scale)+'px;left:0;height:1px;width:100%';viewport.append(el);
  }
  if(pointer?.type==='move'&&pointer.holdingGuides&&pointer.shiftMode==='axis'&&pointer.movementAxis){
    const anchor=pointer.slots.find(s=>s.id===pointer.anchor),horizontal=pointer.movementAxis==='x';
    const value=(horizontal?anchor.y:anchor.x)+size/2,position=(horizontal?panY:panX)+value*scale;
    const line=document.createElement('div');line.className='ed-axis-guide';line.dataset.axis=horizontal?'y':'x';line.dataset.coordinate=String(value);line.setAttribute('aria-hidden','true');
    line.style.cssText=horizontal?'top:'+position+'px;left:0;height:1px;width:100%':'left:'+position+'px;top:0;width:1px;height:100%';
    const label=document.createElement('span');label.textContent=(horizontal?'Horizontal':'Vertical')+' · Shift';
    label.style.cssText=horizontal?'left:12px;top:'+(position<30?'8px':'-26px'):'top:12px;left:'+(position>viewport.clientWidth-140?'-125px':'8px');
    line.append(label);viewport.append(line);
  }
  dirtyRender();
}
function renderAll(){renderProfiles();renderCanvas();}
function clientPoint(e){const r=viewport.getBoundingClientRect();return {x:e.clientX-r.left,y:e.clientY-r.top};}
function gamePoint(e){const p=clientPoint(e);return {x:(p.x-panX)/scale,y:(p.y-panY)/scale};}
function translated(slots,ids,dx,dy,snap,anchorId,movementAxis,heldOptions={}) {
  const candidates=slots.filter(s=>visible[s.family]||ids.has(s.id));
  const result=E.translateGroup(candidates,[...ids],dx,dy,{width:profile().width,height:profile().height,size:slotSize(),snap,tolerance:6/scale,anchorId,movementAxis,...heldOptions});
  const moved=new Map(result.slots.map(s=>[s.id,s]));
  result.slots=slots.map(s=>moved.get(s.id)||s);return result;
}
function currentAlignment(altKey=false){
  const found=E.clone(pointer.liveGuides);
  if($('[data-snap]').checked&&!altKey){
    const probe=translated(profile().slots,pointer.selected,0,0,true,pointer.anchor);
    for(const axis of ['x','y']){
      // A stationary probe may suggest a nearby snap. Only already aligned
      // axes count; selecting a mode must never move a slot.
      if(Math.abs(axis==='x'?probe.dx:probe.dy)<1e-6)found[axis]=[...new Set([...found[axis],...probe.guides[axis]])];
    }
  }
  return found;
}
function captureHeldTargets(){
  const anchor=profile().slots.find(slot=>slot.id===pointer.anchor);
  for(const axis of ['x','y'])if(pointer.heldGuides[axis].length&&!pointer.guideTargets[axis].length){
    // Keep the grabbed slot's original edge relationship to the visible line.
    // A right-edge guide must not later attract the slot's left edge instead.
    pointer.guideTargets[axis]=[anchor[axis]];pointer.guideLatch[axis]=anchor[axis];
  }
}
function holdDragGuides(holding,altKey=false){
  if(pointer?.type!=='move'||pointer.holdingGuides===holding)return;
  // Start a new movement segment at the rendered position. Modifier changes
  // must not pull the layout back toward the pointer's unconstrained path.
  pointer.slots=E.clone(profile().slots);pointer.point={...pointer.lastPoint};pointer.movementAxis=null;pointer.axisTurn=0;
  pointer.holdingGuides=holding;
  const alignment=holding?currentAlignment(altKey):{x:[],y:[]};
  pointer.shiftMode=holding?(alignment.x.length||alignment.y.length?'blue':'axis'):null;
  pointer.heldGuides=pointer.shiftMode==='blue'?alignment:{x:[],y:[]};
  pointer.guideTargets={x:[],y:[]};pointer.guideLatch={x:null,y:null};captureHeldTargets();
  guides=E.clone(holding?pointer.heldGuides:pointer.liveGuides);
}
function updateDragGuides(current,holding){
  pointer.liveGuides=E.clone(current);
  if(holding&&pointer.shiftMode==='blue'){
    for(const axis of ['x','y'])if(!pointer.heldGuides[axis].length&&current[axis].length)pointer.heldGuides[axis]=[...current[axis]];
    captureHeldTargets();
    guides=E.clone(pointer.heldGuides);
  }else guides=holding?{x:[],y:[]}:current;
}
viewport.addEventListener('pointerdown',e=>{
  if(pointer||profileDrag||![0,1].includes(e.button)||e.target.closest('[data-canvas-ui]'))return;
  ownsKeyboard=true;
  const client=clientPoint(e),point=gamePoint(e),button=e.target.closest('.ed-slot');
  if(!button&&document.activeElement instanceof HTMLElement&&root.contains(document.activeElement))document.activeElement.blur();
  if(spaceDown||e.button===1){pointer={type:'pan',id:e.pointerId,client,panX,panY};viewport.style.cursor='grabbing';}
  else if(button){
    const id=button.dataset.slot;
    if(e.ctrlKey||e.metaKey){e.preventDefault();button.focus({preventScroll:true});pick(id,true);return;}
    if(!selected.has(id))pick(id,false);
    button.focus({preventScroll:true});
    pointer={type:'move',id:e.pointerId,point,lastPoint:{...point},anchor:id,before:E.clone(state),slots:E.clone(profile().slots),selected:new Set(selected),moved:false,
      holdingGuides:false,shiftMode:null,movementAxis:null,axisTurn:0,heldGuides:{x:[],y:[]},liveGuides:{x:[],y:[]},guideTargets:{x:[],y:[]},guideLatch:{x:null,y:null}};
    holdDragGuides(e.shiftKey,e.altKey);
  } else {
    const base=(e.ctrlKey||e.metaKey)?new Set(selected):new Set();selected=new Set(base);
    pointer={type:'box',id:e.pointerId,point,client,base,moved:false};
    const marquee=$('.ed-marquee');marquee.hidden=false;marquee.style.cssText='left:'+client.x+'px;top:'+client.y+'px;width:0;height:0';
  }
  e.preventDefault();viewport.setPointerCapture(e.pointerId);renderCanvas();
});
viewport.addEventListener('pointermove',e=>{
  if(!pointer||pointer.id!==e.pointerId)return;
  if(pointer.type==='pan'){const p=clientPoint(e);panX=pointer.panX+p.x-pointer.client.x;panY=pointer.panY+p.y-pointer.client.y;renderCanvas();return;}
  const point=gamePoint(e);
  if(pointer.type==='move'){
    holdDragGuides(e.shiftKey,e.altKey);
    const step={x:point.x-pointer.lastPoint.x,y:point.y-pointer.lastPoint.y};pointer.lastPoint={...point};
    let dx=Math.round(point.x-pointer.point.x),dy=Math.round(point.y-pointer.point.y);
    if(pointer.holdingGuides&&pointer.shiftMode==='axis'){
      const intent=E.updateAxisIntent({axis:pointer.movementAxis,turn:pointer.axisTurn},pointer.movementAxis?step.x:dx,pointer.movementAxis?step.y:dy,scale);
      pointer.axisTurn=intent.turn;
      if(!intent.axis)return;
      if(intent.switched){
        // Turn at the displayed location, carrying only deliberate movement
        // along the new axis instead of projecting back to the drag origin.
        pointer.slots=E.clone(profile().slots);pointer.point={...point};pointer.point[intent.axis]-=intent.carry;
        dx=Math.round(point.x-pointer.point.x);dy=Math.round(point.y-pointer.point.y);
      }
      pointer.movementAxis=intent.axis;
    }
    if(Math.hypot(dx,dy)*scale<2&&!pointer.moved)return;
    const heldOptions=pointer.holdingGuides&&pointer.shiftMode==='blue'?{
      guideTargets:pointer.guideTargets,guideLatch:pointer.guideLatch,guideTolerance:10/scale,guideReleaseTolerance:18/scale
    }:{};
    pointer.moved=true;const result=translated(pointer.slots,pointer.selected,dx,dy,$('[data-snap]').checked&&!e.altKey,pointer.anchor,pointer.movementAxis,heldOptions);
    if(result.guideLatch)pointer.guideLatch=result.guideLatch;
    profile().slots=result.slots;updateDragGuides(result.guides,e.shiftKey);
  } else {
    const p=clientPoint(e),x=Math.min(p.x,pointer.client.x),y=Math.min(p.y,pointer.client.y),w=Math.abs(p.x-pointer.client.x),h=Math.abs(p.y-pointer.client.y);
    pointer.moved=w+h>3;$('.ed-marquee').style.cssText='left:'+x+'px;top:'+y+'px;width:'+w+'px;height:'+h+'px';
    const ids=E.selectRect(profile().slots.filter(s=>visible[s.family]),{x1:pointer.point.x,y1:pointer.point.y,x2:point.x,y2:point.y},slotSize());
    selected=new Set([...pointer.base,...ids]);
  }
  renderCanvas();
});
function finishPointer(e,cancel=false){
  if(!pointer||(e.pointerId!==undefined&&pointer.id!==e.pointerId))return;
  const previous=pointer;pointer=null;guides={x:[],y:[]};$('.ed-marquee').hidden=true;
  if(previous.type==='move'){
    if(cancel)state=previous.before;else pushHistory(previous.before);
    if(previous.moved&&!cancel)announce(selected.size+' '+(selected.size===1?'slot moved':'slots moved together')+'. Save library to keep changes.');
  }
  if(cancel&&previous.type==='box')selected=new Set(previous.base);
  viewport.style.cursor=spaceDown?'grab':'crosshair';
  suppressClick=true;setTimeout(()=>suppressClick=false,0);renderCanvas();
}
viewport.addEventListener('pointerup',e=>finishPointer(e));
viewport.addEventListener('pointercancel',e=>finishPointer(e,true));
viewport.addEventListener('lostpointercapture',e=>finishPointer(e));
function nudge(dx,dy){if(!selected.size)return;mutate(()=>{profile().slots=translated(profile().slots,selected,dx,dy,false).slots;});}
function undo(){if(pointer){finishPointer({},true);announce('Current drag cancelled.');return;}if(!undoStack.length)return;redoStack.push(E.clone(state));state=undoStack.pop();clearGameSource();selected.clear();renderAll();announce('Undone.');}
function redo(){if(pointer){finishPointer({},true);announce('Current drag cancelled.');return;}if(!redoStack.length)return;undoStack.push(E.clone(state));state=redoStack.pop();clearGameSource();selected.clear();renderAll();announce('Redone.');}
root.addEventListener('pointerdown',()=>{ownsKeyboard=true;});
document.addEventListener('pointerdown',e=>{if(!root.contains(e.target))ownsKeyboard=false;if(openPickerIndex!==null&&!e.target.closest('[data-layout-picker]')&&!e.target.closest('[data-picker]'))closePicker();});
viewport.addEventListener('pointerenter',()=>{canvasHovered=true;});
viewport.addEventListener('pointerleave',()=>{canvasHovered=false;});
document.addEventListener('keydown',e=>{
  if(!root.contains(e.target)&&!ownsKeyboard&&!canvasHovered)return;
  const editable=['INPUT','SELECT','TEXTAREA'].includes(e.target.tagName)||e.target.isContentEditable;
  if(editable)return;
  if(e.target.closest('dialog[open]'))return;
  if(e.target.closest('[data-layout-picker]')||e.target.closest('[data-canvas-ui]')||$('[data-more-menu]').matches(':popover-open'))return;
  if(openPickerIndex!==null&&e.key==='Escape'){e.preventDefault();closePicker(true);return;}
  if(document.fullscreenElement===viewport&&e.key==='Escape')return;
  if(e.key==='Escape'){if(pointer)finishPointer({},true);else{selected.clear();renderCanvas();}return;}
  if((e.ctrlKey||e.metaKey)&&e.key.toLowerCase()==='z'){e.preventDefault();e.shiftKey?redo():undo();return;}
  if((e.ctrlKey||e.metaKey)&&e.key.toLowerCase()==='y'){e.preventDefault();redo();return;}
  if(e.key==='Shift'&&pointer?.type==='move'){holdDragGuides(true,e.altKey);renderCanvas();return;}
  if(pointer)return;
  if(e.key==='F2'&&initialized){e.preventDefault();openNameDialog('rename',state.editing);return;}
  if((e.ctrlKey||e.metaKey)&&e.key.toLowerCase()==='a'){e.preventDefault();selected=new Set(profile().slots.filter(s=>visible[s.family]).map(s=>s.id));renderCanvas();return;}
  const directions={ArrowLeft:[-1,0],ArrowRight:[1,0],ArrowUp:[0,-1],ArrowDown:[0,1]};
  if(directions[e.key]&&selected.size){e.preventDefault();const amount=e.shiftKey?10:1;const [x,y]=directions[e.key];nudge(x*amount,y*amount);return;}
  if(e.code==='Space'&&(canvasHovered||e.target.closest('.ed-slot')||e.target===viewport)){e.preventDefault();spaceDown=true;viewport.style.cursor='grab';}
});
document.addEventListener('keyup',e=>{
  if(e.code==='Space'){spaceDown=false;viewport.style.cursor='crosshair';}
  if(e.key==='Shift'&&pointer?.type==='move'){holdDragGuides(false);renderCanvas();}
});
window.addEventListener('blur',()=>{spaceDown=false;if(pointer)finishPointer({},true);});
function setZoom(value){
  const old=scale,b=bounds(),cx=b?(b.x+b.width/2):((viewport.clientWidth/2-panX)/old),cy=b?(b.y+b.height/2):((viewport.clientHeight/2-panY)/old);
  zoom=value;scale=fitScale*zoom;panX=viewport.clientWidth/2-cx*scale;panY=viewport.clientHeight/2-cy*scale;renderCanvas();
}
$('[data-zoom]').addEventListener('change',e=>setZoom(Number(e.target.value)));
viewport.addEventListener('wheel',e=>{if(!e.ctrlKey)return;e.preventDefault();const levels=[1,1.5,2,3],index=levels.indexOf(zoom),next=levels[Math.min(3,Math.max(0,index+(e.deltaY<0?1:-1)))];$('[data-zoom]').value=String(next);setZoom(next);},{passive:false});
$('[data-layout-picker]').addEventListener('keydown',e=>{
  e.stopPropagation();
  const options=$$('.ed-layout-option'),row=document.activeElement.closest('.ed-layout-row'),index=options.indexOf(row?.querySelector('.ed-layout-option'));
  if(e.key==='Escape'){e.preventDefault();closePicker(true);return;}
  if((e.ctrlKey||e.metaKey)&&['z','y'].includes(e.key.toLowerCase())){
    e.preventDefault();const pickerIndex=openPickerIndex;
    e.key.toLowerCase()==='y'||e.shiftKey?redo():undo();
    $('[data-picker="'+pickerIndex+'"]').focus({preventScroll:true});return;
  }
  if(e.key==='ArrowRight'||e.key==='ArrowLeft'){
    e.preventDefault();row?.querySelector(e.key==='ArrowRight'?'.ed-layout-delete':'.ed-layout-option')?.focus();return;
  }
  if(['ArrowDown','ArrowUp','Home','End'].includes(e.key)){
    e.preventDefault();const next=e.key==='Home'?0:e.key==='End'?options.length-1:(index+(e.key==='ArrowDown'?1:-1)+options.length)%options.length;options[next]?.focus();
  }
});
document.addEventListener('focusin',e=>{if(openPickerIndex!==null&&!e.target.closest('[data-layout-picker]')&&!e.target.closest('[data-picker]'))closePicker();});
function positionMoreMenu(){
  const menu=$('[data-more-menu]');if(!menu.matches(':popover-open'))return;
  const anchor=$('[data-more-toggle]').getBoundingClientRect();
  menu.style.left=Math.max(8,Math.min(innerWidth-menu.offsetWidth-8,anchor.right-menu.offsetWidth))+'px';
  menu.style.top=Math.max(8,Math.min(innerHeight-menu.offsetHeight-8,anchor.bottom+7))+'px';
}
$('[data-more-toggle]').addEventListener('click',()=>{
  const menu=$('[data-more-menu]');
  if(menu.matches(':popover-open')){menu.hidePopover();return;}
  closePicker();menu.showPopover();positionMoreMenu();
  $('[data-more-toggle]').setAttribute('aria-expanded','true');
  menu.querySelector('button:not([hidden]):not(:disabled)')?.focus();
});
$('[data-more-menu]').addEventListener('toggle',e=>{$('[data-more-toggle]').setAttribute('aria-expanded',String(e.newState==='open'));});
$('[data-more-menu]').addEventListener('click',e=>{if(e.target.closest('button')&&$('[data-more-menu]').matches(':popover-open'))$('[data-more-menu]').hidePopover();});
$('[data-more-menu]').addEventListener('keydown',e=>{
  if(!['ArrowDown','ArrowUp','Home','End','Escape'].includes(e.key))return;
  e.preventDefault();e.stopPropagation();
  if(e.key==='Escape'){$('[data-more-menu]').hidePopover();$('[data-more-toggle]').focus();return;}
  const items=[...$('[data-more-menu]').querySelectorAll('button:not([hidden]):not(:disabled)')],index=items.indexOf(document.activeElement);
  const next=e.key==='Home'?0:e.key==='End'?items.length-1:(index+(e.key==='ArrowDown'?1:-1)+items.length)%items.length;
  items[next]?.focus();
});
window.addEventListener('resize',positionMoreMenu);
$('[data-fullscreen]').addEventListener('click',async()=>{
  if(pointer)finishPointer({},true);closePicker();
  previousFullscreenView={zoom,panX,panY};
  try{
    if(!viewport.requestFullscreen)throw Error('unavailable');
    await viewport.requestFullscreen();
  }catch(_){previousFullscreenView=null;announce('Fullscreen is unavailable here. Enable fullscreen permission in the host, or maximize the app window.','Fullscreen unavailable');}
});
$('[data-exit-fullscreen]').addEventListener('click',()=>{if(document.fullscreenElement===viewport)document.exitFullscreen().catch(()=>{});});
document.addEventListener('fullscreenchange',()=>{
  if(pointer)finishPointer({},true);
  const active=document.fullscreenElement===viewport;
  if(active){wasFullscreen=true;zoom=1;panX=0;panY=0;$('[data-zoom]').value='1';}
  else if(wasFullscreen){wasFullscreen=false;if(previousFullscreenView){({zoom,panX,panY}=previousFullscreenView);$('[data-zoom]').value=String(zoom);previousFullscreenView=null;}$('[data-fullscreen]').focus({preventScroll:true});}
  $('[data-fullscreen]').setAttribute('aria-pressed',String(active));renderCanvas();
});
$('[data-undo]').addEventListener('click',undo);$('[data-redo]').addEventListener('click',redo);
$$('[data-show]').forEach(input=>input.addEventListener('change',()=>{visible[input.dataset.show]=input.checked;profile().slots.filter(s=>!visible[s.family]).forEach(s=>selected.delete(s.id));renderCanvas();}));
$('[data-map]').addEventListener('change',renderCanvas);
function changeDisplay(){
  const width=Number($('[data-width]').value),height=Number($('[data-height]').value),uiScale=Number($('[data-ui-scale]').value);
  if(width<800||width>7680||height<600||height>4320||uiScale<50||uiScale>150||![width,height].every(Number.isInteger)||!Number.isFinite(uiScale)){announce('Use a resolution from 800 × 600 to 7680 × 4320 and a UI scale from 50–150%.','Check display settings');renderProfiles();return;}
  mutate(()=>{
    const p=profile(),oldSize=slotSize(),newSize=40*uiScale/100;
    p.slots=p.slots.map(s=>({...s,x:Math.max(0,Math.min(width-newSize,(s.x+oldSize/2)/p.width*width-newSize/2)),y:Math.max(0,Math.min(height-newSize,(s.y+oldSize/2)/p.height*height-newSize/2))}));
    p.width=width;p.height=height;p.uiScale=uiScale;panX=0;panY=0;
  },'Display reference updated. Save library to keep changes.');
}
for(const selector of ['[data-width]','[data-height]','[data-ui-scale]'])$(selector).addEventListener('change',changeDisplay);
async function apply({applyMode=hasGameWriter()?'game-open':'closed-game'}={}){
  if(!['closed-game','game-open','character-selection'].includes(applyMode))throw Error('Choose a supported BDO apply mode.');
  if(!initialized)throw Error('The layout library has not loaded.');
  if(saving)return saving;
  if(checkingGame)throw Error('Wait for the game file check to finish.');
  if(sourceBusy)throw Error('Wait for BDO settings to finish loading.');
  if(pointer)finishPointer({},false);
  const result=E.validateState(state);if(!result.valid)throw Error(result.errors[0]);
  const snapshot=E.clone(state),submittedSignature=signature(snapshot);
  saveProgress=null;
  saving=Promise.resolve().then(()=>saveHandler(snapshot,{applyMode})).then(result=>{
    const saved=result?.savedState||snapshot;assertState(saved);
    if(signature(state)===submittedSignature&&result?.savedState){state=E.clone(saved);renderAll();}
    applied=signature(saved);
    if(hasGameWriter()){
      lastSaveResult=result;
      lastFileCheck=null;
      gamePending=result?.applied!==true;
      if(result?.source){
        gameTarget={accountId:result.source.id,expectedHash:result.source.hash};gameSource={...gameSource,...result.source};
        $('[data-source-info]').hidden=false;$('[data-source-info]').title=result.source.path;
      }
      if(gamePending){
        const error=Error(result?.error||'BDO could not be updated.');error.localSaved=true;
        announce('BDO was not updated. Your edits are saved locally. '+applyFailureReason());
        showApplyFailure();
        emit('error',{message:error.message,operation:'apply',localSaved:true});throw error;
      }
      const reloadStep='From character selection, enter a character and load the edited preset in Edit UI.';
      const saveMessage=result.requiresInGameCheck?'Saved locally. '+(result.unchanged?'BDO file already matches. ':'Written to BDO. ')+reloadStep:result.unchanged?'Saved locally. BDO presets already match.':'Saved locally and applied to BDO Presets 1, 2 and 3. Open BDO and load the preset in Edit UI.';
      announce(saveMessage+(state.library.includes(state.editing)?' Assign '+profile().name+' to a preset to use that layout in BDO.':'')+(signature(state)!==applied?' Newer edits still need saving.':'')+(result.warning?' '+result.warning:''));
    }else announce((storageMode==='desktop'?'Saved on this computer.':storageMode==='host'?'Saved by the host application.':'Saved in this browser.')+(signature(state)!==applied?' Newer edits still need saving.':' BDO files are untouched.'));
    emit('applied',{state:E.clone(saved),dirty:signature(state)!==applied,gameApplied:hasGameWriter()});
    return E.clone(saved);
  }).catch(error=>{if(!error.localSaved){announce('Save failed: '+error.message+'. Your edits are still here.','Changes could not be saved');emit('error',{message:error.message,operation:'save'});}throw error;}).finally(()=>{saving=null;saveProgress=null;dirtyRender();});
  dirtyRender();return saving;
}
const prefersReducedMotion=()=>window.matchMedia?.('(prefers-reduced-motion: reduce)').matches===true;
function closeApplyConfirmation(applyAfterClose=false){
  const dialog=$('[data-apply-confirm-dialog]');
  if(!dialog.open||dialog.classList.contains('ed-apply-confirm-closing'))return;
  const finish=()=>{
    clearTimeout(applyConfirmationCloseTimer);applyConfirmationCloseTimer=0;
    dialog.classList.remove('ed-apply-confirm-closing');dialog.close();
    const previous=applyConfirmationReturnFocus;applyConfirmationReturnFocus=null;
    if(applyAfterClose)apply({applyMode:'character-selection'}).catch(()=>{});
    else if(previous?.isConnected&&!previous.disabled)previous.focus({preventScroll:true});
  };
  if(prefersReducedMotion()){finish();return;}
  dialog.classList.add('ed-apply-confirm-closing');
  clearTimeout(applyConfirmationCloseTimer);applyConfirmationCloseTimer=window.setTimeout(finish,130);
}
function openApplyConfirmation(){
  if(!hasGameWriter()){apply().catch(()=>{});return;}
  const dialog=$('[data-apply-confirm-dialog]');
  if(dialog.open||saving||checkingGame||sourceBusy)return;
  if(pointer)finishPointer({},false);
  closePicker();clearTimeout(applyConfirmationCloseTimer);applyConfirmationCloseTimer=0;
  applyConfirmationReturnFocus=document.activeElement;dialog.classList.remove('ed-apply-confirm-closing');dialog.showModal();
  $('[data-apply-confirm-cancel]').focus({preventScroll:true});
}
$('[data-apply-confirm-cancel]').addEventListener('click',()=>closeApplyConfirmation());
$('[data-apply-confirm-apply]').addEventListener('click',()=>closeApplyConfirmation(true));
$('[data-apply-confirm-dialog]').addEventListener('cancel',event=>{event.preventDefault();closeApplyConfirmation();});
$('[data-apply]').addEventListener('click',openApplyConfirmation);
function applyFailureReason(){
  if(lastFileCheck?.status==='changed')return 'BDO’s saved positions or display settings changed after applying. Let the current game load finish, then Retry apply. Your edited layouts are kept locally.';
  if(lastSaveResult?.code==='SOURCE_CHANGED')return 'BDO’s settings changed after the previous read. Let the current game load finish, then Retry apply. The editor will read the latest file and keep your edited layouts.';
  if(lastSaveResult?.code==='GAME_RUNNING')return 'The previous apply was blocked because BDO was open. Retry apply now also writes while BDO is running. Apply at character selection, then enter a character and load the preset in Edit UI.';
  return lastSaveResult?.error?.replace(/^Saved locally\.\s*/i,'')||'The previous version did not record why applying failed. Choose Retry apply to save your edited layouts to BDO’s latest file.';
}
function showApplyFailure(){
  if(!gamePending)return;
  const dialog=$('[data-apply-error-dialog]');
  $('[data-apply-error-reason]').textContent=applyFailureReason();
  $('[data-apply-error-code]').textContent=[lastSaveResult?.code,lastSaveResult?.failedAt?new Date(lastSaveResult.failedAt).toLocaleString():''].filter(Boolean).join(' · ');
  $('[data-apply-error-local]').textContent=signature(state)===applied?'Your edited layouts are saved on this computer.':'The submitted layouts are saved on this computer. Newer edits still need saving.';
  if(!dialog.open)dialog.showModal();
  $('[data-apply-error-close]').focus();
}
$('[data-apply-error-close]').addEventListener('click',()=>$('[data-apply-error-dialog]').close());
$('[data-apply-error-dialog]').addEventListener('close',()=>$('[data-apply]').focus({preventScroll:true}));
async function checkGameFile(){
  if(checkingGame)return checkingGame;
  if(saving||sourceBusy||!lastSaveResult?.applied||!window.bdoDesktop?.checkLastApply)return;
  checkingGame=Promise.resolve().then(()=>window.bdoDesktop.checkLastApply()).then(result=>{
    lastFileCheck=result;
    if(result.status==='changed'){
      gamePending=true;
      announce('BDO’s saved positions or display settings changed after applying. Your edited layouts are kept locally. Let the current game load finish, then Retry apply.'+(result.warning?' '+result.warning:''),'BDO file check');
    }else if(result.status==='matches')announce('The BDO file still matches the applied positions. Check the layout in game to confirm it loaded.','BDO file check');
    else if(result.status==='no-apply')announce('No apply from this editor session is available to check.','BDO file check');
    else announce('Could not check the BDO file: '+(result.error||'Try again in a moment.'),'BDO file check');
    return result;
  }).catch(error=>{announce('Could not check the BDO file: '+error.message,'BDO file check');}).finally(()=>{checkingGame=null;dirtyRender();});
  dirtyRender();return checkingGame;
}
$('[data-check-game-file]').addEventListener('click',()=>checkGameFile());
function openNameDialog(mode,id=state.editing){
  if(!initialized||!state.profiles[id])return;
  if(pointer)finishPointer({},true);
  closePicker();
  if(document.fullscreenElement===viewport){
    document.exitFullscreen().then(()=>openNameDialog(mode,id)).catch(()=>announce('Exit fullscreen to rename this preset.','Exit fullscreen'));return;
  }
  const renaming=mode==='rename';
  nameDialogContext={mode,id};
  $('[data-name-title]').textContent=renaming?'Rename preset':'Save a new preset';
  $('[data-name-description]').textContent=renaming?'Give this layout a name that is easy to find.':'Make a separate copy of '+state.profiles[id].name+'. Choose it from a preset’s arrow when you want to use it in BDO.';
  $('[data-name-submit]').textContent=renaming?'Rename':'Save preset';
  $('[data-new-name]').value=renaming?state.profiles[id].name:state.profiles[id].name.slice(0,35)+' copy';
  $('[data-name-error]').textContent='';$('[data-name-dialog]').showModal();$('[data-new-name]').focus();$('[data-new-name]').select();
}
$('[data-save-as]').addEventListener('click',()=>openNameDialog('save-as'));
$('[data-cancel-name]').addEventListener('click',()=>$('[data-name-dialog]').close());
$('[data-name-dialog]').addEventListener('close',()=>{
  const previous=nameDialogContext;nameDialogContext=null;
  const index=previous?.mode==='rename'?state.active.indexOf(previous.id):-1;
  (index>=0?$('[data-rename="'+index+'"]'):$('[data-save-as]')).focus({preventScroll:true});
});
$('[data-name-form]').addEventListener('submit',e=>{
  e.preventDefault();const name=$('[data-new-name]').value.trim();
  const context=nameDialogContext;if(!context)return;
  if(!name){$('[data-name-error]').textContent='Enter a preset name.';return;}
  if(name.length>40){$('[data-name-error]').textContent='Use a name of 40 characters or fewer.';return;}
  if(Object.values(state.profiles).some(p=>(context.mode!=='rename'||p.id!==context.id)&&p.name.toLowerCase()===name.toLowerCase())){$('[data-name-error]').textContent='That name is already in your library.';return;}
  try{
    if(context.mode==='rename')mutate(()=>{state=E.rename(state,context.id,name);},'Renamed to '+name+'. Save library to keep the name.');
    else mutate(()=>{state=E.saveAs(state,name);selected.clear();},'Created '+name+'. Choose it from a preset’s arrow to assign it. Save library to keep changes.');
    $('[data-name-dialog]').close();
  }
  catch(error){$('[data-name-error]').textContent=error.message;}
});
$('[data-export]').addEventListener('click',()=>{
  const file={format:'bdo-layout-editor',version:1,state:E.clone(state)};
  const blob=new Blob([JSON.stringify(file,null,2)],{type:'application/json'}),url=URL.createObjectURL(blob),link=document.createElement('a');
  link.href=url;link.download='bdo-layout-presets.json';link.click();setTimeout(()=>URL.revokeObjectURL(url),1000);announce('Exported your presets, display settings and assignments.');
});
$('[data-import]').addEventListener('click',()=>$('[data-import-file]').click());
$('[data-import-file]').addEventListener('change',async e=>{
  const file=e.target.files[0];if(!file)return;
  try{
    if(saving)throw Error('Wait for the current save to finish.');
    if(file.size>2000000)throw Error('Choose a preset file under 2 MB.');
    const data=JSON.parse(await file.text());
    if(data.format!=='bdo-layout-editor'||data.version!==1)throw Error('Choose a preset file exported by this editor.');
    assertState(data.state);
    mutate(()=>{state=E.clone(data.state);clearGameSource();selected.clear();zoom=1;panX=0;panY=0;$('[data-zoom]').value='1';},'Imported presets. Save library to keep changes, or Undo to restore your previous library.');
  }catch(error){announce('Import failed: '+error.message,'Presets could not be imported');}finally{e.target.value='';}
});
setBackground(null);
createSlots();renderAll();
new ResizeObserver(()=>{renderCanvas();positionPicker();positionMoreMenu();}).observe(viewport);

function assertState(value){
  const validation=E.validateState(value);
  if(!validation.valid)throw Error(validation.errors[0]);
  if(JSON.stringify(value).length>2000000)throw Error('Layout data exceeds 2 MB.');
}
function loadState(value,{markSaved=false}={}){
  if(saving)throw Error('Wait for the current save to finish.');
  assertState(value);if(pointer)finishPointer({},true);
  const before=E.clone(state);state=E.clone(value);clearGameSource();selected.clear();zoom=1;panX=0;panY=0;$('[data-zoom]').value='1';
  if(markSaved){applied=signature(state);undoStack=[];redoStack=[];}else pushHistory(before);
  renderAll();return E.clone(state);
}
function chooseAccount(discovery){
  return new Promise((resolve,reject)=>{
    accountResolver={resolve,reject};
    $('[data-account-path]').textContent=discovery.documentsPath+' → Black Desert → UserCache';
    $('[data-account-select]').replaceChildren(...discovery.candidates.map(item=>{
      const option=document.createElement('option');option.value=item.id;
      option.textContent=item.label+' · '+new Date(item.modifiedAt).toLocaleString();return option;
    }));
    const preferred=gameSource?.id||discovery.lastAccountId;
    if(discovery.candidates.some(item=>item.id===preferred))$('[data-account-select]').value=preferred;
    root.inert=false;$('[data-account-dialog]').showModal();$('[data-account-select]').focus();
  });
}
function cancelAccount(){
  const pending=accountResolver;accountResolver=null;$('[data-account-dialog]').close();
  pending?.reject(Error('Account selection was cancelled.'));
}
$('[data-account-form]').addEventListener('submit',event=>{
  event.preventDefault();const pending=accountResolver;accountResolver=null;
  const id=$('[data-account-select]').value;$('[data-account-dialog]').close();pending?.resolve(id);
});
$('[data-account-cancel]').addEventListener('click',cancelAccount);
$('[data-account-dialog]').addEventListener('cancel',event=>{event.preventDefault();cancelAccount();});
async function readGame(choose=false){
  const found=await window.bdoDesktop.discoverBdo();
  if(!found.candidates.length)throw Error('No saved BDO presets were found in '+found.documentsPath+'\\Black Desert\\UserCache. Save your UI presets in BDO, then reload.');
  let id=found.candidates.length===1?found.candidates[0].id:found.lastAccountId;
  if(found.candidates.length>1&&(choose||!found.candidates.some(item=>item.id===id)))id=await chooseAccount(found);
  const bundle=await window.bdoDesktop.readBdo(id);
  const parsed=BDOGameImport.parse(bundle.xml,{gameOptionsText:bundle.gameOptionsText,sourceLabel:bundle.source.path});
  return {...parsed,source:bundle.source};
}
function sourceSummary(){
  const count=gameReport?.warnings.length||0;
  return 'Loaded three BDO presets'+(gameSource?.label?' · '+gameSource.label:'')+(count?' · '+count+' import note'+(count===1?'':'s')+' in Source.':'.')+(hasGameWriter()?' Save & apply updates your library and BDO.':' Save library keeps editor changes locally.');
}
function setGameSource(result){
  gameSource=result.source;gameReport=result.report;
  if(result.source.id&&result.source.hash)gameTarget={accountId:result.source.id,expectedHash:result.source.hash};
  $('[data-source-info]').hidden=false;$('[data-source-info]').title=gameSource.path;
  $('[data-load-bdo]').textContent=hasGameReader()?'Reload BDO Presets':'Load BDO Presets';
  root.classList.remove('ed-unloaded');
  renderCanvas();
}
function clearGameSource(){gameSource=null;gameReport=null;$('[data-source-info]').hidden=true;}
$('[data-source-info]').addEventListener('click',()=>{
  if(!gameSource)return;
  const rows=[gameSource.path,gameSource.modifiedAt?'File saved: '+new Date(gameSource.modifiedAt).toLocaleString():'',
    gameReport?'Display: '+gameReport.display.width+' × '+gameReport.display.height+' · UI '+gameReport.display.uiScale+'%':'',
    '',...(gameReport?.presets||[]).map(p=>p.name+': '+p.slots.length+' slot positions from '+p.sourceTag),
    '',gameReport?.mapping.quickslot.numbering,...(gameReport?.warnings||[]),'',
    lastSaveResult?.applied?'Last save: '+(lastSaveResult.unchanged?'BDO preset positions already matched.':'BDO preset positions updated.'):'',
    gamePending?'BDO apply pending: '+applyFailureReason():'',
    gamePending&&lastSaveResult?.code?'Reason code: '+lastSaveResult.code:'',
    gamePending&&lastSaveResult?.failedAt?'Attempt: '+new Date(lastSaveResult.failedAt).toLocaleString():'',
    lastSaveResult?.sourceRefreshed?'Source refreshed: this apply used BDO’s latest file and preserved its other settings.':'',
    lastSaveResult?.requiresInGameCheck?'Apply at character selection, then enter a character and load the edited preset in Edit UI. Check the result in game.':'',
    lastFileCheck?'Latest file check: '+lastFileCheck.status+'. This checks saved positions, not the running game UI.':'',
    lastSaveResult?.backupPath?'Backup: '+lastSaveResult.backupPath:'',
    hasGameWriter()?'Save & apply writes the 20 cooldown and 20 quickslot positions in each of the three game presets.':'This host saves the editor library only.'];
  $('[data-source-details]').textContent=rows.filter(row=>row!==undefined).join('\n');$('[data-source-dialog]').showModal();
});
$('[data-source-close]').addEventListener('click',()=>$('[data-source-dialog]').close());
async function reloadGame(){
  if(sourceBusy||saving||checkingGame)return;
  if(!initialized){await initialize({chooseAccount:true});return;}
  sourceBusy=true;dirtyRender();
  try{
    if(pointer)finishPointer({},true);
    const result=await readGame(true);
    const merged=BDOGameLibrary.merge(state,result.state,{legacyState:E.createState(ASSETS.seed)});
    loadState(merged);gamePending=false;lastSaveResult=null;lastFileCheck=null;setGameSource(result);announce(sourceSummary()+' Previous edited layouts are kept in the library.');
  }catch(error){announce('BDO load failed: '+error.message,'BDO presets could not be loaded');}
  finally{sourceBusy=false;dirtyRender();}
}
$('[data-load-bdo]').addEventListener('click',()=>{
  if(hasGameReader())reloadGame().catch(()=>{});else $('[data-game-file]').click();
});
$('[data-game-file]').addEventListener('change',async event=>{
  const file=event.target.files[0];if(!file)return;
  try{
    if(saving||sourceBusy)throw Error('Wait for the current operation to finish.');
    if(file.size>20*1024*1024)throw Error('Choose a gamevariable.xml file under 20 MiB.');
    const bytes=new Uint8Array(await file.arrayBuffer());
    const encoding=bytes[0]===0xff&&bytes[1]===0xfe?'utf-16le':bytes[0]===0xfe&&bytes[1]===0xff?'utf-16be':'utf-8';
    const parsed=BDOGameImport.parse(new TextDecoder(encoding,{fatal:true}).decode(bytes),{sourceLabel:file.name});
    const merged=BDOGameLibrary.merge(state,parsed.state,{legacyState:E.createState(ASSETS.seed)});
    loadState(merged);setGameSource({...parsed,source:{path:file.name,label:'Selected file',modifiedAt:new Date(file.lastModified).toISOString()}});announce(sourceSummary());
  }catch(error){announce('BDO load failed: '+error.message,'BDO presets could not be loaded');}finally{event.target.value='';}
});
async function initialize(options={}){
  if(initialized||initializing)throw Error('The editor is already initializing or initialized.');
  initializing=true;
  sourceBusy=true;
  if(readyFailed){readyFailed=false;ready=new Promise((resolve,reject)=>{readyResolve=resolve;readyReject=reject;});ready.catch(()=>{});}
  root.inert=true;
  try{
    if(options.theme==='dark'||options.theme==='light')document.documentElement.style.colorScheme=options.theme;
    if(options.storageKey!==undefined){if(typeof options.storageKey!=='string'||!options.storageKey||options.storageKey.length>120)throw Error('Invalid storage key.');storageKey=options.storageKey;}
    storageMode=options.save?'host':window.bdoDesktop?'desktop':'browser';
    let loaded=options.initialState,loadedGame=null,libraryError=null,gameLoadError=null,applyStatus=null;
    if(storageMode==='host'){saveHandler=options.save;}
    else if(storageMode==='desktop'){
      if(!stopSaveProgress&&window.bdoDesktop.onApplyProgress)stopSaveProgress=window.bdoDesktop.onApplyProgress(progress=>{
        if(!saving)return;
        saveProgress=progress.phase==='waiting-for-game'?progress:null;
        if(saveProgress)announce('Your edits are saved locally. Waiting up to 15 seconds for BDO to finish closing…');
        dirtyRender();
      });
      saveHandler=(value,options={})=>hasGameWriter()?window.bdoDesktop.saveAndApply(value,{...gameTarget,applyMode:options.applyMode}):window.bdoDesktop.save(value);
      if(loaded===undefined){
        try{loaded=await window.bdoDesktop.load();if(loaded)assertState(loaded);}catch(error){libraryError=error;loaded=null;}
        if(loaded&&window.bdoDesktop.getApplyStatus)applyStatus=await window.bdoDesktop.getApplyStatus().catch(()=>null);
        if(hasGameReader()){
          try{
            const imported=await readGame(options.chooseAccount===true);
            const keepPending=loaded&&applyStatus?.pending&&applyStatus.accountId===imported.source.id;
            const merged=keepPending?loaded:BDOGameLibrary.merge(loaded,imported.state,{legacyState:E.createState(ASSETS.seed)});
            gamePending=!!keepPending;
            if(keepPending)lastSaveResult={localSaved:true,applied:false,applyMode:applyStatus.applyMode,...applyStatus.failure};
            loaded=merged;loadedGame=imported;
          }catch(error){if(loaded){gameLoadError=error;}else throw error;}
          if(libraryError)saveHandler=async()=>{throw Error('The existing editor library could not be read. It was preserved; repair it before saving. '+libraryError.message);};
        }else if(libraryError)throw libraryError;
      }
    }else{
      saveHandler=async value=>{localStorage.setItem(storageKey,JSON.stringify(value));};
      if(loaded===undefined){const raw=localStorage.getItem(storageKey);if(raw)loaded=JSON.parse(raw);}
    }
    if(loaded!==undefined&&loaded!==null){assertState(loaded);state=E.clone(loaded);}
    await loadBackground();
    applied=signature(state);initialized=true;root.inert=false;$('[data-retry]').hidden=true;root.classList.remove('ed-unloaded');
    if(loadedGame)setGameSource(loadedGame);
    renderAll();
    announce(gamePending?'BDO was not updated. Your edits are saved locally. '+applyFailureReason():gameLoadError?'BDO load failed. Showing your saved editor library. '+gameLoadError.message:loadedGame?sourceSummary()+(libraryError?' Your existing editor library needs recovery; its file is unchanged.':''):storageMode==='desktop'?'Local editor library · Use Load BDO to read gamevariable.xml.':storageMode==='host'?'Layout library connected · BDO files are untouched.':'Local editor library · Load BDO opens gamevariable.xml.');
    if(backgroundLoadWarning)announce($('[data-message]').textContent+backgroundLoadWarning);
    readyResolve();emit('ready',{state:E.clone(state),mode:storageMode});return E.clone(state);
  }catch(error){root.inert=false;const embedded=new URLSearchParams(location.search).get('embedded')==='1';announce('Could not load your library: '+error.message+(embedded?' Reopen this editor from the host to retry.':''));$('[data-empty-title]').textContent='BDO presets could not be loaded';$('[data-empty-message]').textContent=error.message;$('[data-retry]').hidden=embedded;dirtyRender();readyFailed=true;readyReject(error);emit('error',{message:error.message,operation:'load'});throw error;}
  finally{initializing=false;sourceBusy=false;dirtyRender();}
}
$('[data-retry]').addEventListener('click',()=>initialize({chooseAccount:true}).catch(()=>{}));
globalThis.BDOEditor=Object.freeze({get ready(){return ready;},getState:()=>E.clone(state),getSource:()=>E.clone({source:gameSource,report:gameReport}),getSaveStatus:()=>({localDirty:signature(state)!==applied,pendingBdo:gamePending,lastResult:E.clone(lastSaveResult)}),loadState,apply,reloadBdo:reloadGame,isDirty:()=>!!saving||signature(state)!==applied||gamePending,whenIdle:()=>Promise.all([saving,checkingGame,backgroundTask].filter(Boolean)),initialize});
window.addEventListener('beforeunload',event=>{if(!window.bdoDesktop&&initialized&&(saving||backgroundTask||signature(state)!==applied)){event.preventDefault();event.returnValue='';}});
if(new URLSearchParams(location.search).get('embedded')!=='1')initialize().catch(()=>{});
else{root.inert=true;announce('Connecting to the host application…');}


})();
