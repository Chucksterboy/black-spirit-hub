let startupPreferenceBusy=false;
let backgroundPreferenceBusy=false;
let backgroundStatusPromise=null;
let backgroundStatusGeneration=0;
function renderStartupAndBackgroundPreferences(settings){
  for(const [id,key,busy] of [
    ["openImmediatelyWhenReady","openImmediatelyWhenReady",startupPreferenceBusy],
    ["backgroundMarketUpdatesEnabled","backgroundMarketUpdatesEnabled",backgroundPreferenceBusy]
  ]){
    const toggle=document.getElementById(id);
    if(!toggle)continue;
    toggle.disabled=busy||typeof settings?.[key]!=="boolean";
    if(!busy&&typeof settings?.[key]==="boolean")toggle.checked=settings[key];
  }
}
function renderBackgroundMarketStatus(status){
  const text=document.getElementById("backgroundMarketStatus");
  const run=document.getElementById("backgroundMarketLastRun");
  const toggle=document.getElementById("backgroundMarketUpdatesEnabled");
  if(toggle&&typeof status?.enabled==="boolean")toggle.checked=status.enabled;
  if(text)text.textContent=status?.error||status?.message||"Background update status is unavailable.";
  const format=value=>{const date=new Date(value);return value&&Number.isFinite(date.getTime())?date.toLocaleString():null;};
  const success=format(status?.lastCompletedCheckUtc);
  const sample=format(status?.lastSuccessfulSampleUtc);
  const next=format(status?.nextRunUtc);
  if(run)run.textContent=[success?`Last completed background check: ${success}.`:"No completed background check recorded yet.",sample?`Latest saved EU market sample: ${sample}.`:"",next?`Next check: ${next}.`:""].filter(Boolean).join(" ");
}
async function refreshBackgroundMarketStatus({force=false}={}){
  if(backgroundStatusPromise&&!force)return backgroundStatusPromise;
  const generation=++backgroundStatusGeneration;
  const button=document.getElementById("refreshBackgroundMarketStatus");
  if(button)button.disabled=true;
  const request=(async()=>{
    try{const status=await bridgeCall("getBackgroundMarketStatus");if(generation===backgroundStatusGeneration)renderBackgroundMarketStatus(status);}
    catch(error){const text=document.getElementById("backgroundMarketStatus");if(text&&generation===backgroundStatusGeneration)text.textContent=error.message||"Could not read background update status. Try Refresh status.";}
    finally{if(button&&generation===backgroundStatusGeneration)button.disabled=false;}
  })().finally(()=>{if(backgroundStatusPromise===request)backgroundStatusPromise=null;});
  backgroundStatusPromise=request;
  return request;
}
document.getElementById("refreshBackgroundMarketStatus")?.addEventListener("click",()=>void refreshBackgroundMarketStatus());
document.getElementById("openImmediatelyWhenReady")?.addEventListener("change",async event=>{
  if(startupPreferenceBusy)return;
  const toggle=event.currentTarget;
  const previous=!toggle.checked;
  startupPreferenceBusy=true;toggle.disabled=true;
  try{
    const settings=await bridgeCall("saveStartupPreference",{openImmediatelyWhenReady:toggle.checked});
    if(typeof settings?.openImmediatelyWhenReady!=="boolean")throw new Error("The application returned an invalid startup preference.");
    toggle.checked=settings.openImmediatelyWhenReady;
    NotificationService.ShowInfo("Startup preference saved for your next launch.","Startup");
  }catch(error){
    try{
      const settings=await bridgeCall("getAppBehaviorSettings");
      toggle.checked=typeof settings?.openImmediatelyWhenReady==="boolean"?settings.openImmediatelyWhenReady:previous;
    }catch{toggle.checked=previous;}
    NotificationService.ShowError(error.message||"Could not save startup preference.","Startup");
  }
  finally{startupPreferenceBusy=false;toggle.disabled=false;}
});
document.getElementById("backgroundMarketUpdatesEnabled")?.addEventListener("change",async event=>{
  if(backgroundPreferenceBusy)return;
  const toggle=event.currentTarget;
  const requested=toggle.checked;
  ++backgroundStatusGeneration;
  backgroundPreferenceBusy=true;toggle.disabled=true;
  try{
    const status=await bridgeCall("setBackgroundMarketPreference",{enabled:requested});
    if(typeof status?.enabled!=="boolean"||typeof status?.success!=="boolean")throw new Error("The application returned an invalid background-update preference.");
    renderBackgroundMarketStatus(status);
    if(status.success===false)NotificationService.ShowError(status.error||status.message||"Windows could not update the background task.","Background updates");
    else NotificationService.ShowInfo(requested?"Background market updates enabled.":"Background market updates disabled.","Background updates");
  }catch(error){
    // A timed-out request may have saved the preference; reload the durable value.
    try{
      const settings=await bridgeCall("getAppBehaviorSettings");
      toggle.checked=typeof settings?.backgroundMarketUpdatesEnabled==="boolean"?settings.backgroundMarketUpdatesEnabled:!requested;
    }catch{toggle.checked=!requested;}
    NotificationService.ShowError(error.message||"Could not change background updates.","Background updates");
  }finally{backgroundPreferenceBusy=false;toggle.disabled=false;await refreshBackgroundMarketStatus({force:true});}
});
