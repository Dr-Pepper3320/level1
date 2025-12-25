/* points_loader.js
   Loads + normalizes level points (playerSpawn / npcSlots / enemySpawns)
   Stores into localStorage under your devKey so the game can run without the JSON later too.

   Usage in HTML:
     <script src="points_loader.js"></script>
     let devData = PointsLoader.loadDev(CFG.devKey);
     await PointsLoader.tryLoadPointsFile({
       url: CFG.pointsUrl,
       devKey: CFG.devKey,
       toast: (title, bodyHtml)=>toast(title, bodyHtml),
       onApplied: (data)=>{ devData=data; rebuildInteractables(); initEnemiesFromDev(); }
     });
*/

(function(){
  const CLONE = (obj) => {
    try { if (typeof structuredClone === "function") return structuredClone(obj); } catch(_) {}
    return JSON.parse(JSON.stringify(obj));
  };

  const DEV_DEFAULT = {
    playerSpawn: null,
    npcSlots: Array.from({length:30}, ()=>null),
    enemySpawns: []
  };

  function clamp(v, a, b){ return Math.max(a, Math.min(b, v)); }

  function normalizePointsJson(data){
    const normalized = CLONE(DEV_DEFAULT);

    if(data && typeof data === "object"){
      // playerSpawn
      if(data.playerSpawn && typeof data.playerSpawn.x==="number" && typeof data.playerSpawn.y==="number"){
        normalized.playerSpawn = { x:data.playerSpawn.x, y:data.playerSpawn.y };
      }

      // npcSlots: array of {slot,x,y,name}
      if(Array.isArray(data.npcSlots)){
        for(const s of data.npcSlots){
          if(!s || typeof s.slot!=="number") continue;
          const slot = Math.floor(s.slot);
          if(slot < 1 || slot > 30) continue;
          if(typeof s.x!=="number" || typeof s.y!=="number") continue;
          normalized.npcSlots[slot-1] = {
            slot,
            x: s.x,
            y: s.y,
            name: (typeof s.name==="string" ? s.name.slice(0,40) : "")
          };
        }
      }

      // enemySpawns: array of {id,x,y,type,radius}
      if(Array.isArray(data.enemySpawns)){
        normalized.enemySpawns = data.enemySpawns
          .filter(s => s && typeof s.x==="number" && typeof s.y==="number")
          .slice(0, 800)
          .map((s, idx)=>({
            id: (typeof s.id==="string" ? s.id : ("spawn_"+idx)),
            x: s.x,
            y: s.y,
            type: (typeof s.type==="string" && s.type.trim() ? s.type.trim().slice(0,40) : "enemy"),
            radius: (typeof s.radius==="number" ? clamp(s.radius, 0, 9999) : 0),
          }));
      }
    }

    return normalized;
  }

  function loadDev(devKey){
    try{
      const raw = localStorage.getItem(devKey);
      if(!raw) return CLONE(DEV_DEFAULT);
      const data = JSON.parse(raw);
      // accept either already-normalized dev data or raw points json
      // (normalizePointsJson safely handles both)
      return normalizePointsJson(data);
    }catch(_){
      return CLONE(DEV_DEFAULT);
    }
  }

  
  function tryLoadEmbeddedPoints(){
    // Supports running via file:// (no fetch) if level1.points.js is included.
    // Expected global: window.LEVEL1_POINTS (object) OR window.LEVEL1_POINTS_JSON (object)
    const embedded = (window.LEVEL1_POINTS_JSON || window.LEVEL1_POINTS);
    if(!embedded) return null;
    try{
      return normalizePointsJson(embedded);
    }catch(_){
      return null;
    }
  }

async function tryLoadPointsFile({ url, devKey, toast, onApplied }){
    // Returns: { ok:boolean, mode:"fetch"|"missing"|"blocked", data }
    try{
      const res = await fetch(url, { cache:"no-store" });
      if(!res.ok){
        const embedded = tryLoadEmbeddedPoints();
        if(embedded){
          localStorage.setItem(devKey, JSON.stringify(embedded));
          if(typeof onApplied === "function") onApplied(embedded);
          if(typeof toast === "function") toast("Loaded embedded points", "Using points embedded via <span class=\"k\">level1.points.js</span>.");
          return { ok:true, mode:"embedded", data: embedded };
        }
        return { ok:false, mode:"missing", data: loadDev(devKey) };
      }

      const json = await res.json();
      const normalized = normalizePointsJson(json);

      localStorage.setItem(devKey, JSON.stringify(normalized));

      if(typeof onApplied === "function") onApplied(normalized);

      if(typeof toast === "function"){
        toast("Loaded points file", `Using <span class="k">${String(url)}</span>.`);
      }

      return { ok:true, mode:"fetch", data: normalized };
    }catch(_){
      // Common case: file:// fetch blocked.
      const embedded = tryLoadEmbeddedPoints();
      if(embedded){
        localStorage.setItem(devKey, JSON.stringify(embedded));
        if(typeof onApplied === "function") onApplied(embedded);
        if(typeof toast === "function") toast("Loaded embedded points", "Using points embedded via <span class=\"k\">level1.points.js</span> (fetch blocked).");
        return { ok:true, mode:"embedded", data: embedded };
      }
      const fallback = loadDev(devKey);
      return { ok:false, mode:"blocked", data: fallback };
    }
  }

  window.PointsLoader = {
    DEV_DEFAULT,
    normalizePointsJson,
    loadDev,
    tryLoadPointsFile
  };
})();