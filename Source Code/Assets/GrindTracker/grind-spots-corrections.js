/* Current live-game corrections layered over the historical grind-spot snapshots. */
(()=>{
  const corrections=new Map([
    [4,{players:"1"}],
    [149,{ap:280,dp:350}],
    [150,{ap:250,dp:320}],
    [167,{ap:340}],
    [169,{name:"Orzekea",zone:"Atoraxxion",type:"normal"}],
    [908,{name:"Sycraia Ruins (Lower Zone)"}],
    [911,{ap:370,dp:440,players:"3"}],
    [912,{ap:350,dp:427,players:"3"}]
  ]);
  const spots=Array.isArray(window.BDO_GRIND_SPOTS)?window.BDO_GRIND_SPOTS:[];
  window.BDO_GRIND_SPOTS=spots
    .filter(spot=>![112,914].includes(Number(spot?.id)))
    .map(spot=>({...spot,...(corrections.get(Number(spot?.id))||{})}));
})();
