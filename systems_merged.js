// systems_merged.js
// Combined: progression.js + skills.js + combat.js
// Load order preserved: Progression -> SkillsUI -> Combat
// Generated for Nephilim Pixel Art Game

// progression.js (v7-full) — progression + skill points + skill trees + NPC#19 trainer
(function(){
  "use strict";

  const Progression = {};
  window.Progression = Progression;

  let CFG = null;
  let state = null;
  let toast = null;

  // ======================
  // TUNING
  // ======================
  const MAX_LEVEL = 20;

  // XP needed to advance from level L → L+1
  const XP_TO_NEXT = {
    1:  30,  2:  45,  3:  60,  4:  80,  5:  105,
    6:  135, 7:  170, 8:  210, 9:  255, 10: 305,
    11: 360, 12: 420, 13: 485, 14: 555, 15: 630,
    16: 710, 17: 795, 18: 885, 19: 980
  };

  // XP per enemy type (normalized key)
  const XP_BY_TYPE = {
    // beasts
    "wolf": 10, "bear": 24, "giant spider": 16, "slime": 10, "corrupted treant": 90,
    // humanoids
    "goblin": 12, "bandit": 15, "cultist": 18, "dark knight": 42, "ogre": 36,
    // undead
    "skeleton": 14, "wight": 26, "mummy": 30, "banshee": 44, "lich": 55,
    // mythic
    "harpy": 32, "griffon": 40, "wyvern": 60, "chimera": 70, "troll": 75,
    // elemental
    "elemental": 48
  };

  // ======================
  // STAT CURVES (base from level only)
  // ======================
  function meleeDamageForLevel(L){ return Math.round((6 + (L - 1) * 1.5) * 10) / 10; }
  function fireballDamageForLevel(L){ return Math.round((9 + (L - 1) * 1.2) * 10) / 10; }
  function shockDamageForLevel(L){ return Math.round((6 + (L - 1) * 0.9) * 10) / 10; }
  function maxHpForLevel(L){ return Math.round(100 + (L - 1) * 6); }
  function powerForLevel(L){ return 1 + (L - 1) * 0.05; }

  // ======================
  // SKILLS (authoritative)
  // ======================
  let SKILL_DEFS = null; // set by SkillsUI/skills.js via Progression.registerSkillDefs()

  function safeCopy(obj){
    try{ return JSON.parse(JSON.stringify(obj||{})); }catch(_){ return {}; }
  }

  function registerSkillDefs(defs){
    if(!defs || typeof defs !== "object") return;
    if(!Array.isArray(defs.nodes)) return;
    SKILL_DEFS = defs;
  }

  function skillNode(id){
    if(!SKILL_DEFS || !Array.isArray(SKILL_DEFS.nodes)) return null;
    return SKILL_DEFS.nodes.find(n => n && n.id === id) || null;
  }

  function skillRank(id){
    return Math.max(0, (P.skills && P.skills[id]) ? (P.skills[id]|0) : 0);
  }

  function sumSkillBonuses(){
    const out = {
      // Core stats (existing)
      meleePct:0, fireballPct:0, shockPct:0,
      hpFlat:0, hpPct:0,
      critPct:0, burnChance:0, shockRadiusPct:0, regenPerSec:0,

      // Advanced combat knobs
      meleeSpeedPct:0,
      lifestealPct:0,

      fireCdPct:0,
      shockCdPct:0,
      fireProjSpeedPct:0,

      whirlwindCdPct:0,
      novaCdPct:0,
      novaDmgPct:0,

      chainCdPct:0,
      chainJumps:0,

      dmgReductionPct:0,
      guardDur:0,
      guardDR:0,

      unlocks:{
        whirlwind:false,
        lunge:false,
        fireNova:false,
        chainShock:false,
        guard:false
      }
    };

    if(!SKILL_DEFS || !Array.isArray(SKILL_DEFS.nodes) || !P.skills) return out;

    for(const [id, r] of Object.entries(P.skills)){
      const rank = Math.max(0, r|0);
      if(rank <= 0) continue;

      const n = skillNode(id);
      if(!n || !n.effects || typeof n.effects !== "object") continue;
      const e = n.effects;

      // Each effect value is "per rank"
      if(typeof e.meleePct === "number") out.meleePct += e.meleePct * rank;
      if(typeof e.fireballPct === "number") out.fireballPct += e.fireballPct * rank;
      if(typeof e.shockPct === "number") out.shockPct += e.shockPct * rank;

      if(typeof e.hpFlat === "number") out.hpFlat += e.hpFlat * rank;
      if(typeof e.hpPct === "number") out.hpPct += e.hpPct * rank;

      if(typeof e.critPct === "number") out.critPct += e.critPct * rank;
      if(typeof e.burnChance === "number") out.burnChance += e.burnChance * rank;
      if(typeof e.shockRadiusPct === "number") out.shockRadiusPct += e.shockRadiusPct * rank;
      if(typeof e.regenPerSec === "number") out.regenPerSec += e.regenPerSec * rank;

      if(typeof e.meleeSpeedPct === "number") out.meleeSpeedPct += e.meleeSpeedPct * rank;
      if(typeof e.lifestealPct === "number") out.lifestealPct += e.lifestealPct * rank;

      if(typeof e.fireCdPct === "number") out.fireCdPct += e.fireCdPct * rank;
      if(typeof e.shockCdPct === "number") out.shockCdPct += e.shockCdPct * rank;
      if(typeof e.fireProjSpeedPct === "number") out.fireProjSpeedPct += e.fireProjSpeedPct * rank;

      if(typeof e.whirlwindCdPct === "number") out.whirlwindCdPct += e.whirlwindCdPct * rank;
      if(typeof e.novaCdPct === "number") out.novaCdPct += e.novaCdPct * rank;
      if(typeof e.novaDmgPct === "number") out.novaDmgPct += e.novaDmgPct * rank;

      if(typeof e.chainCdPct === "number") out.chainCdPct += e.chainCdPct * rank;
      if(typeof e.chainJumps === "number") out.chainJumps += e.chainJumps * rank;

      if(typeof e.dmgReductionPct === "number") out.dmgReductionPct += e.dmgReductionPct * rank;
      if(typeof e.guardDur === "number") out.guardDur += e.guardDur * rank;
      if(typeof e.guardDR === "number") out.guardDR += e.guardDR * rank;

      // Unlock flags (any rank > 0)
      if(typeof e.unlockWhirlwind === "number" && rank > 0) out.unlocks.whirlwind = true;
      if(typeof e.unlockLunge === "number" && rank > 0) out.unlocks.lunge = true;
      if(typeof e.unlockFireNova === "number" && rank > 0) out.unlocks.fireNova = true;
      if(typeof e.unlockChainShock === "number" && rank > 0) out.unlocks.chainShock = true;
      if(typeof e.unlockGuard === "number" && rank > 0) out.unlocks.guard = true;
    }

    return out;
  }

  function bonusesSummary(b){
    const parts = [];
    if(b.hpFlat) parts.push(`HP +${Math.round(b.hpFlat)}`);
    if(b.hpPct) parts.push(`HP +${Math.round(b.hpPct*100)}%`);
    if(b.meleePct) parts.push(`Sword +${Math.round(b.meleePct*100)}%`);
    if(b.fireballPct) parts.push(`Fire +${Math.round(b.fireballPct*100)}%`);
    if(b.shockPct) parts.push(`Shock +${Math.round(b.shockPct*100)}%`);
    if(b.critPct) parts.push(`Crit +${Math.round(b.critPct*100)}%`);
    return parts.join(" • ");
  }

  // ======================
  // INTERNAL STATE
  // ======================
  const P = {
    level: 1,
    xp: 0,
    spentXP: 0,
    unspentLevels: 0,

    // ✅ Skills
    skillPoints: 0,
    skills: {},

    lastSource: "",
    lastEarnT: 0,
    _loaded: false,
    _loadedKey: null
  };

  // ======================
  // HELPERS
  // ======================
  function normTypeKey(s){
    return String(s || "")
      .toLowerCase()
      .trim()
      .replace(/[_-]+/g, " ")
      .replace(/\s+/g, " ");
  }

  function resolveSaveKey(){
    if(CFG && typeof CFG.progKey === "string" && CFG.progKey.trim()) return CFG.progKey.trim();
    if(CFG && typeof CFG.progressKey === "string" && CFG.progressKey.trim()) return CFG.progressKey.trim();
    return "level1_prog_v1";
  }

  function xpToNext(L){
    if(L >= MAX_LEVEL) return 0;
    return XP_TO_NEXT[L] || Math.round(50 + L * 35);
  }

  function recomputeBankedLevels(){
    P.unspentLevels = 0;
    let lvl = P.level;
    let xp = P.xp;

    while(lvl < MAX_LEVEL){
      const need = xpToNext(lvl);
      if(xp >= need){
        xp -= need;
        lvl++;
        P.unspentLevels++;
      } else break;
    }
  }

  function saveWithKey(key){
    try{
      localStorage.setItem(key, JSON.stringify({
        level: P.level, xp: P.xp, spentXP: P.spentXP,
        skillPoints: P.skillPoints, skills: P.skills
      }));
    }catch(_){}
  }

  function loadFromKey(key){
    try{
      const raw = localStorage.getItem(key);
      if(!raw) return false;
      const d = JSON.parse(raw);
      if(!d || typeof d !== "object") return false;
      if(typeof d.level === "number") P.level = Math.max(1, Math.min(MAX_LEVEL, d.level|0));
      if(typeof d.xp === "number") P.xp = Math.max(0, d.xp);
      if(typeof d.spentXP === "number") P.spentXP = Math.max(0, d.spentXP);

      // ✅ skills
      if(typeof d.skillPoints === "number") P.skillPoints = Math.max(0, d.skillPoints|0);
      if(d.skills && typeof d.skills === "object") P.skills = d.skills;

      P._loaded = true;
      P._loadedKey = key;
      return true;
    }catch(_){
      return false;
    }
  }

  function load(){
    const primary = resolveSaveKey();
    const candidates = [ primary, "level1_progress_v1", "level1_prog_v1" ];

    let loaded = false;
    for(const k of candidates){
      if(loadFromKey(k)){
        loaded = true;
        if(k !== primary) saveWithKey(primary);
        break;
      }
    }
    if(!loaded){
      P._loaded = true;
      P._loadedKey = primary;
    }

    if(!P.skills || typeof P.skills !== "object") P.skills = {};
    recomputeBankedLevels();
    saveWithKey(primary);
  }

  function applyStatsToPlayer(){
    if(!state || !state.player) return;

    const baseL = P.level;
    const baseHp = maxHpForLevel(baseL);

    const b = sumSkillBonuses();
    const hp = Math.round((baseHp + (b.hpFlat||0)) * (1 + (b.hpPct||0)));

    state.player.maxHp = hp;
    if(typeof state.player.hp !== "number") state.player.hp = state.player.maxHp;
    state.player.hp = Math.min(state.player.hp, state.player.maxHp);
  }

  // ======================
  // DAMAGE SCALING (compat)
  // ======================
  const BASE = { melee: 18, fireball: 18, shock: 18 };
  function damageMultForLevel(L){
    const want = meleeDamageForLevel(L);
    const base = Math.max(1, Number(BASE.melee) || 18);
    return want / base;
  }

  // ======================
  // PUBLIC API
  // ======================
  Progression.init = function(deps){
    CFG = (deps && deps.CFG) || CFG;
    state = (deps && deps.state) || state;
    toast = (deps && deps.toast) || toast;

    load();
    applyStatsToPlayer();
    return Progression;
  };

  Progression.registerSkillDefs = function(defs){
    registerSkillDefs(defs);
    // re-apply because HP can change once defs arrive
    applyStatsToPlayer();
    saveWithKey(resolveSaveKey());
  };

  Progression.getLevel = function(){ return P.level|0; };
  Progression.getXp = function(){ return Math.floor(P.xp)||0; };
  Progression.getXpToNext = function(){ return xpToNext(P.level)|0; };

  Progression.get = function(){
    return { level:P.level, xp:P.xp, xpToNext: xpToNext(P.level), maxLevel: MAX_LEVEL, banked: P.unspentLevels };
  };

  Progression.getSkillState = function(){
    return { skillPoints: P.skillPoints|0, skills: safeCopy(P.skills) };
  };

  Progression.getSkillRank = function(id){
    return skillRank(id);
  };

  Progression.canBuySkill = function(id){
    const n = skillNode(id);
    if(!n) return { ok:false, reason:"unknown_skill" };

    const rank = skillRank(id);
    const maxRank = Math.max(1, n.maxRank|0);
    if(rank >= maxRank) return { ok:false, reason:"max_rank" };

    const cost = Math.max(1, (n.cost|0) || 1);
    if((P.skillPoints|0) < cost) return { ok:false, reason:"no_points", need: cost - (P.skillPoints|0) };

    if(n.prereq && n.prereq.id){
      const preRank = skillRank(n.prereq.id);
      const needRank = Math.max(1, (n.prereq.rank|0) || 1);
      if(preRank < needRank) return { ok:false, reason:"prereq", prereq: n.prereq.id, have: preRank, need: needRank };
    }

    return { ok:true, reason:"ok", cost };
  };

  Progression.buySkill = function(id){
    const c = Progression.canBuySkill(id);
    if(!c.ok) return { ok:false, reason:c.reason };

    const n = skillNode(id);
    const cost = Math.max(1, (n.cost|0) || 1);

    P.skillPoints = Math.max(0, (P.skillPoints|0) - cost);
    P.skills = P.skills || {};
    P.skills[id] = (skillRank(id) + 1);

    applyStatsToPlayer();
    saveWithKey(resolveSaveKey());

    if(typeof toast === "function"){
      const r = P.skills[id];
      toast("Skill Up", `Bought <span class="k">${id}</span> (Rank <span class="k">${r}</span>).`);
    }

    return { ok:true };
  };

  Progression.respecSkills = function(){
    // Refund 1 point per rank spent (simple). If you later add varying costs, track spent costs separately.
    let refund = 0;
    if(P.skills && typeof P.skills === "object"){
      for(const r of Object.values(P.skills)) refund += Math.max(0, r|0);
    }
    P.skills = {};
    P.skillPoints = (P.skillPoints|0) + refund;

    applyStatsToPlayer();
    saveWithKey(resolveSaveKey());

    return { ok:true, refund };
  };

  Progression.getStats = function(){
    const L = P.level;
    const base = {
      level:L,
      power:powerForLevel(L),
      meleeDmg:meleeDamageForLevel(L),
      fireballDmg:fireballDamageForLevel(L),
      shockDmg:shockDamageForLevel(L),
      maxHp:maxHpForLevel(L)
    };

    const b = sumSkillBonuses();

    // apply % bonuses (damage) and hp bonuses
    const melee = Math.round(base.meleeDmg * (1 + (b.meleePct||0)) * 10) / 10;
    const fire  = Math.round(base.fireballDmg * (1 + (b.fireballPct||0)) * 10) / 10;
    const shock = Math.round(base.shockDmg * (1 + (b.shockPct||0)) * 10) / 10;

    const hp = Math.round((base.maxHp + (b.hpFlat||0)) * (1 + (b.hpPct||0)));

    return {
      ...base,
      meleeDmg: melee,
      fireballDmg: fire,
      shockDmg: shock,
      maxHp: hp,
      bonuses: b,
      unlocks: (b && b.unlocks) ? b.unlocks : {},
      bonusesSummary: bonusesSummary(b)
    };
  };

  Progression.getEnemyXP = function(enemyType){
    return XP_BY_TYPE[normTypeKey(enemyType)] || 12;
  };

  Progression.setBaseDamages = function(obj){
    if(!obj || typeof obj !== "object") return;
    if(typeof obj.melee === "number" && isFinite(obj.melee)) BASE.melee = obj.melee;
    if(typeof obj.fireball === "number" && isFinite(obj.fireball)) BASE.fireball = obj.fireball;
    if(typeof obj.shock === "number" && isFinite(obj.shock)) BASE.shock = obj.shock;
  };

  Progression.getDamageMult = function(){
    return Math.max(0.05, Number(damageMultForLevel(P.level)) || 1);
  };

  Progression.addXP = function(amount, source=""){
    const n = Math.max(0, Number(amount) || 0);
    if(n <= 0) return;
    if(P.level >= MAX_LEVEL) return;

    P.xp += n;
    P.lastSource = source;
    P.lastEarnT = performance.now();

    recomputeBankedLevels();
    saveWithKey(resolveSaveKey());
  };

  // ✅ COMPAT: enemies.js calls Progression.onEnemyKilled(enemy)
  let _lastXpToastT = 0;
  Progression.onEnemyKilled = function(enemy){
    try{
      const type = enemy && (enemy.type || enemy.enemyType || enemy.kind) ? String(enemy.type || enemy.enemyType || enemy.kind) : "";
      const xp = Progression.getEnemyXP(type);
      Progression.addXP(xp, type);

      if(typeof toast === "function"){
        const now = performance.now();
        if(now - _lastXpToastT > 650){
          _lastXpToastT = now;
          const g = Progression.get();
          const msg = `+<span class="k">${xp}</span> XP` + (g.banked > 0 ? ` • Banked <span class="k">${g.banked}</span>` : "");
          toast("XP gained", msg);
        }
      }
    }catch(_){}
  };

  // ======================
  // TRAINER (NPC SLOT 19)
  // ======================
  Progression.canTrainAtNpcSlot = function(slot){
    if(Number(slot) !== 19) return { ok:false, reason:"wrong_trainer", banked:0, needMore:0 };
    if(P.level >= MAX_LEVEL) return { ok:false, reason:"max_level", banked:0, needMore:0, level:P.level };

    recomputeBankedLevels();
    const need = xpToNext(P.level);
    const have = Math.floor(P.xp);
    return {
      ok: P.unspentLevels > 0,
      reason: (P.unspentLevels > 0) ? "ready" : "not_ready",
      level: P.level,
      xp: P.xp,
      xpToNext: need,
      banked: P.unspentLevels,
      needMore: Math.max(0, need - have)
    };
  };

  // opts.levels: 1 | "one" | "all" (default "all")
  Progression.tryTrainAtNpcSlot = function(slot, opts){
    if(Number(slot) !== 19) return { ok:false, reason:"wrong_trainer", gained:0 };

    if(P.level >= MAX_LEVEL){
      if(typeof toast === "function") toast("Trainer", "You are already <span class='k'>Level 20</span>.");
      return { ok:false, reason:"max_level", gained:0 };
    }

    recomputeBankedLevels();
    if(P.unspentLevels <= 0){
      if(typeof toast === "function"){
        const need = xpToNext(P.level);
        toast("Trainer", `Not ready. Need <span class='k'>${need - Math.floor(P.xp)}</span> more XP to reach Level ${P.level + 1}.`);
      }
      return { ok:false, reason:"not_ready", gained:0 };
    }

    const modeOne = !!(opts && (opts.levels === 1 || opts.levels === "one"));
    let gained = 0;

    while(P.level < MAX_LEVEL){
      const need = xpToNext(P.level);
      if(P.xp >= need){
        P.xp -= need;
        P.spentXP += need;
        P.level++;
        gained++;
        if(modeOne) break;
      } else break;
    }

    // ✅ +1 skill point per trained level
    if(gained > 0) P.skillPoints = (P.skillPoints|0) + gained;

    recomputeBankedLevels();
    applyStatsToPlayer();
    saveWithKey(resolveSaveKey());

    if(typeof toast === "function"){
      const s = Progression.getStats();
      toast(
        "Level Up!",
        `You reached <span class="k">Level ${P.level}</span>` +
        (gained > 1 ? ` (+<span class="k">${gained}</span>)` : "") +
        ` • +<span class="k">${gained}</span> SP • Max HP <span class="k">${s.maxHp}</span>`
      );
    }

    return { ok:true, reason:"leveled", gained };
  };

  // ✅ Trainer opens the pretty menu if SkillsUI exists; otherwise falls back to dialogue overlay.
  Progression.openTrainer = function(trainerName){
    const name = (trainerName && String(trainerName).trim()) ? String(trainerName).trim() : "Trainer";

    // Prefer the pretty leveling menu (skills.js)
    try{
      if(window.SkillsUI && typeof SkillsUI.openMenu === "function"){
        SkillsUI.openMenu("training", { fromTrainer:true });
        return;
      }
    }catch(_){}

    // Fallback to old dialogue UI
    const api = window.DLG_API;
    function render(){
      const g = Progression.get();
      const stats = Progression.getStats();
      const can = Progression.canTrainAtNpcSlot(19);
      const need = g.xpToNext;
      const have = Math.floor(g.xp);

      if(api && typeof api.openDialog === "function" && typeof api.addLine === "function" && typeof api.setDialogControls === "function"){
        if(api.clearLog) api.clearLog();
        api.openDialog(name);

        api.addLine(name, "Bring me your earned experience, and I will forge it into strength.");
        api.addLine("SYSTEM", `Level: ${g.level} • XP: ${have}/${need} • Banked Levels: ${g.banked}`);
        api.addLine("SYSTEM", `Skill Points: ${P.skillPoints|0}`);
        api.addLine("SYSTEM", `Stats → Sword ${stats.meleeDmg} • Fire ${stats.fireballDmg} • Shock ${stats.shockDmg} • Max HP ${stats.maxHp}`);

        const btnOne = can.ok ? "Train 1 Level" : (can.needMore > 0 ? `Need ${can.needMore} XP` : "Not ready");
        const btnAll = can.ok ? `Train All (${g.banked})` : "Train All";

        api.setDialogControls({
          mode:"script",
          buttons:[
            { label: btnOne, onClick: function(){ if(!can.ok) return; Progression.tryTrainAtNpcSlot(19, { levels: 1 }); render(); } },
            { label: btnAll, onClick: function(){ if(!can.ok) return; Progression.tryTrainAtNpcSlot(19, { levels: "all" }); render(); } },
            { label:"Close", onClick: api.closeDialog || function(){} }
          ]
        });
        return;
      }

      if(typeof toast === "function"){
        toast("Trainer", Progression.formatHud());
      }
    }
    render();
  };

  Progression.formatHud = function(){
    const g = Progression.get();
    if(g.level >= MAX_LEVEL) return `Lv ${g.level} • MAX`;
    return `Lv ${g.level} • XP ${Math.floor(g.xp)}/${g.xpToNext} • Banked ${g.banked} • SP ${P.skillPoints|0}`;
  };

  

  // ======================
  // LEGACY + DEV UTILITIES
  // (These are here to avoid "shrinking" functionality — and to keep older code paths working.)
  // ======================

  // Optional legacy-ish damage curve (from the old inline fallback) — not used unless enabled.
  // Starts ~0.34 and climbs to ~2.10 across levels 1..MAX_LEVEL.
  let _useLegacyDamageCurve = false;
  function legacyDamageMultForLevel(level){
    level = Math.max(1, Math.min(MAX_LEVEL, level|0));
    const t = (level - 1) / (MAX_LEVEL - 1); // 0..1
    const a = 0.34;
    const b = 2.10;
    // ease-out-ish
    const e = 1 - Math.pow(1 - t, 1.65);
    return a + (b - a) * e;
  }

  // Toggle which multiplier is returned by getDamageMult().
  // Default is the modern "stat-curve ratio" method (your current file’s behavior).
  Progression.setDamageCurve = function(mode){
    const m = String(mode||"").toLowerCase().trim();
    _useLegacyDamageCurve = (m === "legacy" || m === "old" || m === "fallback");
    return { ok:true, mode: _useLegacyDamageCurve ? "legacy" : "modern" };
  };

  // Expose the legacy curve directly (for debugging).
  Progression.getLegacyDamageMult = function(){
    return legacyDamageMultForLevel(P.level);
  };

  // Override getDamageMult (but preserve your current behavior by default).
  const _getDamageMultModern = Progression.getDamageMult;
  Progression.getDamageMult = function(){
    try{
      if(_useLegacyDamageCurve) return legacyDamageMultForLevel(P.level);
    }catch(_){}
    return _getDamageMultModern();
  };

  // Quick setters (helpful for testing / dev mode)
  Progression.setLevel = function(level){
    const L = Math.max(1, Math.min(MAX_LEVEL, Number(level)||1))|0;
    P.level = L;
    recomputeBankedLevels();
    applyStatsToPlayer();
    saveWithKey(resolveSaveKey());
    return { ok:true, level:P.level };
  };

  Progression.setXP = function(xp){
    P.xp = Math.max(0, Number(xp)||0);
    recomputeBankedLevels();
    saveWithKey(resolveSaveKey());
    return { ok:true, xp:P.xp, banked:P.unspentLevels };
  };

  Progression.giveSkillPoints = function(n){
    const add = Math.max(0, Number(n)||0)|0;
    P.skillPoints = (P.skillPoints|0) + add;
    saveWithKey(resolveSaveKey());
    return { ok:true, skillPoints:P.skillPoints|0 };
  };

  Progression.resetProgression = function(opts){
    const keepSkills = !!(opts && opts.keepSkills);
    P.level = 1;
    P.xp = 0;
    P.spentXP = 0;
    P.unspentLevels = 0;
    if(!keepSkills){
      P.skillPoints = 0;
      P.skills = {};
    }
    applyStatsToPlayer();
    saveWithKey(resolveSaveKey());
    return { ok:true };
  };

  Progression.exportSave = function(){
    return safeCopy({
      level:P.level, xp:P.xp, spentXP:P.spentXP,
      skillPoints:P.skillPoints, skills:P.skills,
      key: resolveSaveKey()
    });
  };

  Progression.importSave = function(obj){
    if(!obj || typeof obj !== "object") return { ok:false, reason:"bad_input" };
    if(typeof obj.level === "number") P.level = Math.max(1, Math.min(MAX_LEVEL, obj.level|0));
    if(typeof obj.xp === "number") P.xp = Math.max(0, obj.xp);
    if(typeof obj.spentXP === "number") P.spentXP = Math.max(0, obj.spentXP);
    if(typeof obj.skillPoints === "number") P.skillPoints = Math.max(0, obj.skillPoints|0);
    if(obj.skills && typeof obj.skills === "object") P.skills = obj.skills;

    if(!P.skills || typeof P.skills !== "object") P.skills = {};
    recomputeBankedLevels();
    applyStatsToPlayer();
    saveWithKey(resolveSaveKey());
    return { ok:true };
  };

  // Optional HUD helper (so level1.html doesn’t have to do it).
  let _hud = null;
  Progression.bindHud = function(hud){
    // hud = { plvlEl, pxpEl, pxpNEl } or { plvlId:"plvl", ... }
    if(!hud) return { ok:false };
    const byId = (id)=>document.getElementById(id);
    _hud = {
      plvl: hud.plvlEl || (hud.plvlId ? byId(hud.plvlId) : null),
      pxp:  hud.pxpEl  || (hud.pxpId  ? byId(hud.pxpId)  : null),
      pxpN: hud.pxpNEl || (hud.pxpNId ? byId(hud.pxpNId) : null),
    };
    return { ok:true };
  };

  Progression.renderHud = function(){
    if(!_hud) return;
    try{
      const lvl = Progression.getLevel();
      const xp = Progression.getXp();
      const need = Progression.getXpToNext();
      if(_hud.plvl) _hud.plvl.textContent = String(lvl|0);
      if(_hud.pxp) _hud.pxp.textContent = String(xp|0);
      if(_hud.pxpN) _hud.pxpN.textContent = String((need|0) || 0);
    }catch(_){}
  };

  // Fire a lightweight event any time XP or level changes (other systems can listen).
  function emitProgressionEvent(type, detail){
    try{
      window.dispatchEvent(new CustomEvent(type, { detail: detail||{} }));
    }catch(_){}
  }

  // Wrap addXP to emit events + keep older systems in sync.
  const _addXP = Progression.addXP;
  Progression.addXP = function(amount, source=""){
    _addXP(amount, source);
    emitProgressionEvent("progression:xp", { xp:P.xp, level:P.level, banked:P.unspentLevels, source });
    Progression.renderHud();
  };

  // Wrap tryTrain to emit events
  const _tryTrain = Progression.tryTrainAtNpcSlot;
  Progression.tryTrainAtNpcSlot = function(slot, opts){
    const r = _tryTrain(slot, opts);
    emitProgressionEvent("progression:train", { result:r, xp:P.xp, level:P.level, banked:P.unspentLevels });
    Progression.renderHud();
    return r;
  };

  // Public debug helper
  Progression._debug = function(){
    return {
      key: resolveSaveKey(),
      P: safeCopy(P),
      skillDefsLoaded: !!SKILL_DEFS,
      legacyDamageCurve: _useLegacyDamageCurve
    };
  };


// ======================
  // BOOTSTRAP (auto-load)
  // ======================
  load();

})();

// skills.js — Pretty Leveling Menu + Skill Trees (UI module)
// Load AFTER progression.js. Creates its own overlay so level1.html stays clean.

(function(){
  "use strict";

  // ===============
  // SKILL DEFINITIONS
  // ===============
  // effects are interpreted by progression.js (authoritative). UI just displays.
  const SKILLS_DEF = {
    meta:{ version:2, pointsName:"Skill Points" },
    trees:[
      { id:"sword",   name:"Sword",    tagline:"Melee damage, crits, tempo" },
      { id:"fire",    name:"Fire",     tagline:"Fireball damage, burn, control" },
      { id:"shock",   name:"Shock",    tagline:"Shockwave damage, radius, chaining" },
      { id:"survive", name:"Survival", tagline:"HP, sustain, defense" },
    ],
    // Grid coordinates: col 1-5, row 1+ (UI supports scrolling)
    nodes:[
      // =====================
      // Sword (early -> late)
      // =====================
      { id:"swd_1", tree:"sword", name:"Basic Technique", icon:"⚔️", col:1,row:1, maxRank:5, cost:1,
        desc:"Increase sword damage by 5% per rank.",
        effects:{ meleePct:0.05 } },
      { id:"swd_2", tree:"sword", name:"Precision", icon:"🎯", col:3,row:1, maxRank:4, cost:1,
        prereq:{ id:"swd_1", rank:3 },
        desc:"Increase critical chance by 3% per rank.",
        effects:{ critPct:0.03 } },
      { id:"swd_3", tree:"sword", name:"Relentless", icon:"🔥", col:2,row:3, maxRank:3, cost:1,
        prereq:{ id:"swd_1", rank:4 },
        desc:"Increase sword damage by 7% per rank.",
        effects:{ meleePct:0.07 } },
      { id:"swd_4", tree:"sword", name:"Whirlwind", icon:"🌀", col:4,row:3, maxRank:1, cost:2,
        prereq:{ id:"swd_2", rank:2 },
        desc:"Unlock **Whirlwind** (Key Q): spin strike hitting all nearby enemies.",
        effects:{ unlockWhirlwind:1 } },
      { id:"swd_5", tree:"sword", name:"Tempo", icon:"⏱️", col:1,row:5, maxRank:4, cost:1,
        prereq:{ id:"swd_3", rank:2 },
        desc:"Increase sword attack speed by 5% per rank.",
        effects:{ meleeSpeedPct:0.05 } },
      { id:"swd_6", tree:"sword", name:"Bloodletting", icon:"🩸", col:3,row:5, maxRank:5, cost:1,
        prereq:{ id:"swd_4", rank:1 },
        desc:"Gain lifesteal: heal for 1% of sword damage per rank.",
        effects:{ lifestealPct:0.01 } },
      { id:"swd_7", tree:"sword", name:"Executioner", icon:"🗡️", col:5,row:5, maxRank:3, cost:1,
        prereq:{ id:"swd_6", rank:3 },
        desc:"Increase sword damage by 12% per rank.",
        effects:{ meleePct:0.12 } },
      { id:"swd_8", tree:"sword", name:"Lunge Strike", icon:"🏹", col:2,row:7, maxRank:1, cost:2,
        prereq:{ id:"swd_5", rank:2 },
        desc:"Unlock **Lunge Strike** (Key F): a long-range thrust that hits in front of you.",
        effects:{ unlockLunge:1 } },
      { id:"swd_9", tree:"sword", name:"Master of Steel", icon:"👑", col:4,row:7, maxRank:3, cost:2,
        prereq:{ id:"swd_7", rank:1 },
        desc:"Increase sword damage by 15% per rank and crit by 2% per rank.",
        effects:{ meleePct:0.15, critPct:0.02 } },
      { id:"swd_10", tree:"sword", name:"Blade Storm", icon:"🌪️", col:3,row:9, maxRank:2, cost:2,
        prereq:{ id:"swd_9", rank:2 },
        desc:"Whirlwind cooldown reduced by 10% per rank.",
        effects:{ whirlwindCdPct:-0.10 } },

      // =====================
      // Fire (early -> late)
      // =====================
      { id:"fir_1", tree:"fire", name:"Kindle", icon:"🔥", col:1,row:1, maxRank:5, cost:1,
        desc:"Increase fireball damage by 5% per rank.",
        effects:{ fireballPct:0.05 } },
      { id:"fir_2", tree:"fire", name:"Incinerate", icon:"💥", col:3,row:1, maxRank:4, cost:1,
        prereq:{ id:"fir_1", rank:3 },
        desc:"Increase fireball damage by 8% per rank.",
        effects:{ fireballPct:0.08 } },
      { id:"fir_3", tree:"fire", name:"Embers", icon:"🩸", col:2,row:3, maxRank:3, cost:1,
        prereq:{ id:"fir_1", rank:2 },
        desc:"Adds burn chance by 6% per rank.",
        effects:{ burnChance:0.06 } },
      { id:"fir_4", tree:"fire", name:"Quick Cast", icon:"⚡", col:4,row:3, maxRank:4, cost:1,
        prereq:{ id:"fir_2", rank:1 },
        desc:"Reduce fireball cooldown by 6% per rank.",
        effects:{ fireCdPct:-0.06 } },
      { id:"fir_5", tree:"fire", name:"Fire Nova", icon:"☀️", col:1,row:5, maxRank:1, cost:2,
        prereq:{ id:"fir_3", rank:2 },
        desc:"Unlock **Fire Nova** (Key R): burst of fireballs in all directions.",
        effects:{ unlockFireNova:1 } },
      { id:"fir_6", tree:"fire", name:"Flare Path", icon:"➡️", col:3,row:5, maxRank:4, cost:1,
        prereq:{ id:"fir_4", rank:2 },
        desc:"Increase fire projectile speed by 8% per rank.",
        effects:{ fireProjSpeedPct:0.08 } },
      { id:"fir_7", tree:"fire", name:"Inferno", icon:"🌋", col:5,row:5, maxRank:3, cost:2,
        prereq:{ id:"fir_2", rank:3 },
        desc:"Increase fireball damage by 12% per rank.",
        effects:{ fireballPct:0.12 } },
      { id:"fir_8", tree:"fire", name:"Searing Heat", icon:"🧨", col:2,row:7, maxRank:3, cost:1,
        prereq:{ id:"fir_5", rank:1 },
        desc:"Fire Nova damage increased by 10% per rank.",
        effects:{ novaDmgPct:0.10 } },
      { id:"fir_9", tree:"fire", name:"Phoenix Pact", icon:"🕊️", col:4,row:7, maxRank:2, cost:2,
        prereq:{ id:"fir_7", rank:2 },
        desc:"Gain +2 max HP per rank and +5% fire damage per rank.",
        effects:{ hpFlat:2, fireballPct:0.05 } },
      { id:"fir_10", tree:"fire", name:"Volcanic Core", icon:"💎", col:3,row:9, maxRank:1, cost:3,
        prereq:{ id:"fir_9", rank:2 },
        desc:"Fire Nova cooldown reduced by 25%.",
        effects:{ novaCdPct:-0.25 } },

      // =====================
      // Shock (early -> late)
      // =====================
      { id:"shk_1", tree:"shock", name:"Resonance", icon:"⚡", col:1,row:1, maxRank:5, cost:1,
        desc:"Increase shockwave damage by 5% per rank.",
        effects:{ shockPct:0.05 } },
      { id:"shk_2", tree:"shock", name:"Wide Pulse", icon:"🌀", col:3,row:1, maxRank:4, cost:1,
        prereq:{ id:"shk_1", rank:3 },
        desc:"Increase shockwave radius by 7% per rank.",
        effects:{ shockRadiusPct:0.07 } },
      { id:"shk_3", tree:"shock", name:"Overcharge", icon:"🌩️", col:2,row:3, maxRank:3, cost:1,
        prereq:{ id:"shk_1", rank:4 },
        desc:"Increase shockwave damage by 8% per rank.",
        effects:{ shockPct:0.08 } },
      { id:"shk_4", tree:"shock", name:"Static Surge", icon:"🔋", col:4,row:3, maxRank:4, cost:1,
        prereq:{ id:"shk_2", rank:1 },
        desc:"Reduce shockwave cooldown by 5% per rank.",
        effects:{ shockCdPct:-0.05 } },
      { id:"shk_5", tree:"shock", name:"Chain Shock", icon:"⛓️", col:1,row:5, maxRank:1, cost:2,
        prereq:{ id:"shk_3", rank:2 },
        desc:"Unlock **Chain Shock** (Key T): lightning jumps between enemies.",
        effects:{ unlockChainShock:1 } },
      { id:"shk_6", tree:"shock", name:"Thunderclap", icon:"🥁", col:3,row:5, maxRank:3, cost:2,
        prereq:{ id:"shk_4", rank:2 },
        desc:"Increase shockwave damage by 12% per rank.",
        effects:{ shockPct:0.12 } },
      { id:"shk_7", tree:"shock", name:"Ion Field", icon:"🫧", col:5,row:5, maxRank:3, cost:1,
        prereq:{ id:"shk_2", rank:3 },
        desc:"Increase shockwave radius by 10% per rank.",
        effects:{ shockRadiusPct:0.10 } },
      { id:"shk_8", tree:"shock", name:"Conductive Edge", icon:"🔪", col:2,row:7, maxRank:3, cost:1,
        prereq:{ id:"shk_5", rank:1 },
        desc:"Sword damage +6% per rank against stunned targets. (future hook)",
        effects:{ /* future hook */ } },
      { id:"shk_9", tree:"shock", name:"Storm Lord", icon:"👑", col:4,row:7, maxRank:2, cost:2,
        prereq:{ id:"shk_6", rank:2 },
        desc:"Chain Shock jumps +1 per rank and shock damage +5% per rank.",
        effects:{ chainJumps:1, shockPct:0.05 } },
      { id:"shk_10", tree:"shock", name:"Tempest Core", icon:"🧿", col:3,row:9, maxRank:1, cost:3,
        prereq:{ id:"shk_9", rank:2 },
        desc:"Chain Shock cooldown reduced by 25%.",
        effects:{ chainCdPct:-0.25 } },

      // =====================
      // Survival (early -> late)
      // =====================
      { id:"sur_1", tree:"survive", name:"Hardened", icon:"🛡️", col:1,row:1, maxRank:5, cost:1,
        desc:"Increase max HP by +6 per rank.",
        effects:{ hpFlat:6 } },
      { id:"sur_2", tree:"survive", name:"Stamina", icon:"💪", col:3,row:1, maxRank:3, cost:1,
        prereq:{ id:"sur_1", rank:4 },
        desc:"Increase max HP by +10 per rank.",
        effects:{ hpFlat:10 } },
      { id:"sur_3", tree:"survive", name:"Regeneration", icon:"🌿", col:2,row:3, maxRank:4, cost:1,
        prereq:{ id:"sur_1", rank:2 },
        desc:"Regenerate +0.25 HP per second per rank. (future hook)",
        effects:{ regenPerSec:0.25 } },
      { id:"sur_4", tree:"survive", name:"Stone Skin", icon:"🪨", col:4,row:3, maxRank:5, cost:1,
        prereq:{ id:"sur_1", rank:3 },
        desc:"Reduce incoming damage by 3% per rank.",
        effects:{ dmgReductionPct:0.03 } },
      { id:"sur_5", tree:"survive", name:"Bulwark", icon:"🧱", col:1,row:5, maxRank:3, cost:1,
        prereq:{ id:"sur_4", rank:2 },
        desc:"Increase max HP by 5% per rank.",
        effects:{ hpPct:0.05 } },
      { id:"sur_6", tree:"survive", name:"Guard", icon:"🛡️", col:3,row:5, maxRank:1, cost:2,
        prereq:{ id:"sur_4", rank:3 },
        desc:"Unlock **Guard** (Key C): brief damage reduction window.",
        effects:{ unlockGuard:1 } },
      { id:"sur_7", tree:"survive", name:"Last Stand", icon:"🧿", col:5,row:5, maxRank:2, cost:2,
        prereq:{ id:"sur_5", rank:2 },
        desc:"Guard duration +0.25s per rank and damage reduction +5% per rank.",
        effects:{ guardDur:0.25, guardDR:0.05 } },
      { id:"sur_8", tree:"survive", name:"Unbreakable", icon:"🏔️", col:3,row:7, maxRank:1, cost:3,
        prereq:{ id:"sur_7", rank:2 },
        desc:"Permanent +10% damage reduction.",
        effects:{ dmgReductionPct:0.10 } },
    ],

    // Edges drawn as lines for the active tree
    edges:[
      // Sword
      ["swd_1","swd_2"], ["swd_1","swd_3"], ["swd_2","swd_4"],
      ["swd_3","swd_5"], ["swd_4","swd_6"], ["swd_6","swd_7"],
      ["swd_5","swd_8"], ["swd_7","swd_9"], ["swd_9","swd_10"],

      // Fire
      ["fir_1","fir_2"], ["fir_1","fir_3"], ["fir_2","fir_4"],
      ["fir_3","fir_5"], ["fir_4","fir_6"], ["fir_2","fir_7"],
      ["fir_5","fir_8"], ["fir_7","fir_9"], ["fir_9","fir_10"],

      // Shock
      ["shk_1","shk_2"], ["shk_1","shk_3"], ["shk_2","shk_4"],
      ["shk_3","shk_5"], ["shk_4","shk_6"], ["shk_2","shk_7"],
      ["shk_5","shk_8"], ["shk_6","shk_9"], ["shk_9","shk_10"],

      // Survival
      ["sur_1","sur_2"], ["sur_1","sur_3"], ["sur_1","sur_4"],
      ["sur_4","sur_5"], ["sur_4","sur_6"], ["sur_5","sur_7"],
      ["sur_7","sur_8"],
    ]
  };

  // register defs with progression (authoritative)
  try{
    if(window.Progression && typeof Progression.registerSkillDefs === "function"){
      Progression.registerSkillDefs(SKILLS_DEF);
    }else{
      window.SKILLS_DEF = SKILLS_DEF;
    }
  }catch(_){
    window.SKILLS_DEF = SKILLS_DEF;
  }

  // ===============
  // STYLES (injected)
  // ===============
  const css = `
  #lvlMenuOverlay{ position:fixed; inset:0; z-index:50; display:none; align-items:center; justify-content:center; background:rgba(0,0,0,.62); padding:14px; }
  #lvlMenu{ width:min(1100px, calc(100% - 24px)); height:min(680px, calc(100% - 24px)); background:rgba(8,12,18,.92); border:1px solid rgba(255,255,255,.12); border-radius:18px; box-shadow:0 20px 60px rgba(0,0,0,.65); overflow:hidden; display:flex; flex-direction:column; backdrop-filter: blur(8px); color:#d7ffe3; font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono","Courier New", monospace; }
  #lvlMenu header{ padding:12px 14px; border-bottom:1px solid rgba(255,255,255,.12); display:flex; align-items:center; justify-content:space-between; gap:12px; }
  #lvlMenu .ttl{ font-weight:900; letter-spacing:.06em; }
  #lvlMenu .tabs{ display:flex; gap:10px; flex-wrap:wrap; }
  #lvlMenu .tab{ border:1px solid rgba(255,255,255,.12); background:rgba(255,255,255,.06); color:#d7ffe3; border-radius:999px; padding:7px 10px; font-weight:900; cursor:pointer; user-select:none; }
  #lvlMenu .tab[aria-selected="true"]{ background:rgba(109,255,213,.18); border-color:rgba(109,255,213,.35); }
  #lvlMenu main{ flex:1; display:flex; overflow:hidden; }
  #lvlMenu .pane{ padding:14px; overflow:auto; }
  #lvlMenu .pane.left{ width:260px; border-right:1px solid rgba(255,255,255,.12); }
  #lvlMenu .pane.right{ width:320px; border-left:1px solid rgba(255,255,255,.12); }
  #lvlMenu .pane.center{ flex:1; position:relative; }
  #lvlMenu footer{ padding:12px 14px; border-top:1px solid rgba(255,255,255,.12); display:flex; gap:10px; align-items:center; justify-content:space-between; flex-wrap:wrap; }
  .muted{ color:#9bd7b0; font-size:12px; line-height:1.35; }
  .k{ display:inline-block; padding:2px 6px; border:1px solid rgba(255,255,255,.12); border-radius:8px; background:rgba(255,255,255,.06); font-size:12px; }
  .btn{ border:1px solid rgba(255,255,255,.12); background:rgba(255,255,255,.07); color:#d7ffe3; border-radius:12px; padding:10px 12px; font-weight:900; cursor:pointer; user-select:none; }
  .btn:hover{ background:rgba(255,255,255,.12); }
  .btn:disabled{ opacity:.45; cursor:not-allowed; }
  .card{ background:rgba(255,255,255,.05); border:1px solid rgba(255,255,255,.10); border-radius:14px; padding:12px; box-shadow:0 10px 30px rgba(0,0,0,.25); }
  .treeBtn{ width:100%; text-align:left; margin:0 0 10px 0; }
  .treeBtn small{ display:block; margin-top:4px; color:#9bd7b0; font-weight:800; opacity:.9; }
  
  #skillScroll{ position:absolute; inset:12px; overflow:auto; }
  #skillStage{ position:relative; width:100%; min-height:100%; }
  #skillStagePad{ position:relative; width:100%; height:100%; padding:14px; box-sizing:border-box; }
  #skillStageInner{ position:relative; width:100%; height:100%; }
#skillGrid{ position:absolute; inset:14px; display:grid; grid-template-columns:repeat(5,1fr);  gap:14px; z-index:2; }
  #skillLines{ position:absolute; inset:14px; z-index:1; pointer-events:none; }
  .node{ position:relative; border:1px solid rgba(255,255,255,.12); background:rgba(255,255,255,.06); border-radius:16px; padding:10px; cursor:pointer; user-select:none; display:flex; flex-direction:column; gap:6px; min-height:84px; box-shadow:0 10px 30px rgba(0,0,0,.2); }
  .node:hover{ background:rgba(255,255,255,.10); }
  .node[aria-disabled="true"]{ opacity:.45; cursor:not-allowed; }
  .node[aria-owned="true"]{ border-color:rgba(109,255,213,.35); background:rgba(109,255,213,.12); }
  .node .top{ display:flex; align-items:center; justify-content:space-between; gap:10px; }
  .node .nm{ font-weight:900; }
  .node .rk{ font-weight:900; font-size:12px; }
  .node .ic{ font-size:20px; }
  .node .bar{ height:6px; border-radius:999px; background:rgba(255,255,255,.08); overflow:hidden; border:1px solid rgba(255,255,255,.10); }
  .node .bar > i{ display:block; height:100%; width:0%; background:rgba(109,255,213,.55); }
  `;
  const st = document.createElement("style");
  st.textContent = css;
  document.head.appendChild(st);

  // ===============
  // DOM scaffold
  // ===============
  const overlay = document.createElement("div");
  overlay.id = "lvlMenuOverlay";
  overlay.innerHTML = `
    <div id="lvlMenu" role="dialog" aria-modal="true" aria-label="Leveling Menu">
      <header>
        <div class="ttl">LEVELING</div>
        <div class="tabs" id="lvlTabs"></div>
        <button class="btn" id="lvlClose">Close</button>
      </header>
      <main>
        <div class="pane left" id="lvlLeft"></div>
        <div class="pane center" id="lvlCenter"></div>
        <div class="pane right" id="lvlRight"></div>
      </main>
      <footer>
        <div class="muted" id="lvlFooterLeft"></div>
        <div style="display:flex;gap:10px;align-items:center;flex-wrap:wrap">
          <span class="k" id="lvlSP">SP: 0</span>
          <span class="k" id="lvlLV">Lv 1</span>
          <span class="k" id="lvlXP">XP 0/0</span>
        </div>
      </footer>
    </div>
  `;
  document.body.appendChild(overlay);

  const els = {
    overlay,
    tabs: overlay.querySelector("#lvlTabs"),
    close: overlay.querySelector("#lvlClose"),
    left: overlay.querySelector("#lvlLeft"),
    center: overlay.querySelector("#lvlCenter"),
    right: overlay.querySelector("#lvlRight"),
    footerLeft: overlay.querySelector("#lvlFooterLeft"),
    sp: overlay.querySelector("#lvlSP"),
    lv: overlay.querySelector("#lvlLV"),
    xp: overlay.querySelector("#lvlXP"),
  };

  // ===============
  // Helpers
  // ===============
  function clamp(v,a,b){ return Math.max(a, Math.min(b, v)); }
  function esc(s){ return String(s).replace(/[&<>"']/g, (c)=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"}[c])); }

  function getProg(){ try{ return (window.Progression && Progression.get) ? Progression.get() : null; }catch(_){ return null; } }
  function getStats(){ try{ return (window.Progression && Progression.getStats) ? Progression.getStats() : null; }catch(_){ return null; } }
  function getSkillState(){ try{ return (window.Progression && Progression.getSkillState) ? Progression.getSkillState() : { skillPoints:0, skills:{} }; }catch(_){ return { skillPoints:0, skills:{} }; } }
  function canTrain(){ try{ return (window.Progression && Progression.canTrainAtNpcSlot) ? Progression.canTrainAtNpcSlot(19) : { ok:false, needMore:0 }; }catch(_){ return { ok:false, needMore:0 }; } }
  function canBuy(id){ try{ return (window.Progression && Progression.canBuySkill) ? Progression.canBuySkill(id) : { ok:false, reason:"no_progression" }; }catch(_){ return { ok:false, reason:"no_progression" }; } }
  function buy(id){ try{ return (window.Progression && Progression.buySkill) ? Progression.buySkill(id) : { ok:false, reason:"no_progression" }; }catch(_){ return { ok:false, reason:"no_progression" }; } }

  function nodeById(id){ return SKILLS_DEF.nodes.find(n=>n.id===id) || null; }
  function treeById(id){ return SKILLS_DEF.trees.find(t=>t.id===id) || SKILLS_DEF.trees[0]; }

  // ===============
  // State
  // ===============
  const TABS = [
    { id:"training", name:"Training" },
    { id:"tree",     name:"Skill Tree" },
    { id:"stats",    name:"Stats" },
  ];
  let activeTab = "training";
  let activeTree = "sword";
  let selectedNodeId = null;
  let openMeta = { fromTrainer:false };

  // ===============
  // Public API
  // ===============
  function show(tab, opts){
    activeTab = tab || activeTab;
    openMeta = Object.assign({ fromTrainer:false }, (opts && typeof opts==="object") ? opts : {});
    els.overlay.style.display = "flex";
    render();
  }
  function hide(){
    els.overlay.style.display = "none";

    // If the menu was opened as a direct trainer interaction (no dialogue overlay),
    // make sure we release the dialogue zoom.
    try{
      const dlgOpen = (window.ui && ui.overlay && ui.overlay.style.display === "flex");
      if(openMeta && openMeta.fromTrainer && !dlgOpen && typeof window.endDialogueZoom === "function"){
        window.endDialogueZoom();
      }
    }catch(_){ }

    openMeta = { fromTrainer:false };
  }

  // Expose to game
  window.SkillsUI = {
    openMenu: (tab="training", opts=null) => show(tab, opts),
    openTree: (treeId="sword") => { activeTree = treeId; selectedNodeId = null; show("tree"); },
    close: hide,
    isOpen: () => { try{ return els.overlay.style.display === "flex"; }catch(_){ return false; } },
    defs: SKILLS_DEF
  };

  // close behaviors
  els.close.addEventListener("click", hide);
  els.overlay.addEventListener("click", (e)=>{ if(e.target === els.overlay) hide(); });

  // ===============
  // Tabs
  // ===============
  function renderTabs(){
    els.tabs.innerHTML = "";
    for(const t of TABS){
      const b = document.createElement("button");
      b.className = "tab";
      b.textContent = t.name;
      b.setAttribute("aria-selected", String(t.id === activeTab));
      b.addEventListener("click", ()=>{ activeTab = t.id; render(); });
      els.tabs.appendChild(b);
    }
  }

  // ===============
  // Training view
  // ===============
  function renderTraining(){
    const g = getProg() || { level:1, xp:0, xpToNext:0, banked:0, maxLevel:20 };
    const s = getStats() || { maxHp:0, meleeDmg:0, fireballDmg:0, shockDmg:0 };
    const ss = getSkillState();
    const ct = canTrain();

    els.left.innerHTML = `
      <div class="card">
        <div style="font-weight:900;letter-spacing:.04em;margin-bottom:8px">Trainer</div>
        <div class="muted">Train levels using banked XP, then spend <span class="k">${esc(SKILLS_DEF.meta.pointsName)}</span> to shape your build.</div>
        <div style="height:10px"></div>
        <div class="muted">Banked Levels: <span class="k">${g.banked|0}</span></div>
        <div class="muted">${esc(SKILLS_DEF.meta.pointsName)}: <span class="k">${ss.skillPoints|0}</span></div>
      </div>
      <div style="height:12px"></div>
      <button class="btn treeBtn" data-tree="sword">Sword <small>${esc(treeById("sword").tagline)}</small></button>
      <button class="btn treeBtn" data-tree="fire">Fire <small>${esc(treeById("fire").tagline)}</small></button>
      <button class="btn treeBtn" data-tree="shock">Shock <small>${esc(treeById("shock").tagline)}</small></button>
      <button class="btn treeBtn" data-tree="survive">Survival <small>${esc(treeById("survive").tagline)}</small></button>
    `;
    for(const btn of els.left.querySelectorAll(".treeBtn")){
      btn.addEventListener("click", ()=>{
        activeTree = btn.getAttribute("data-tree") || "sword";
        selectedNodeId = null;
        activeTab = "tree";
        render();
      });
    }

    els.center.innerHTML = `
      <div class="card">
        <div style="font-weight:900;letter-spacing:.04em;margin-bottom:8px">Level</div>
        <div class="muted">Current Level: <span class="k">${g.level|0}</span></div>
        <div class="muted">XP: <span class="k">${Math.floor(g.xp)|0}</span> / <span class="k">${g.xpToNext|0}</span></div>
        <div style="height:12px"></div>
        <div style="display:flex;gap:10px;flex-wrap:wrap">
          <button class="btn" id="btnTrainOne">Train 1 Level</button>
          <button class="btn" id="btnTrainAll">Train All</button>
        </div>
        <div style="height:10px"></div>
        <div class="muted" id="trainHint"></div>
      </div>
    `;

    const b1 = els.center.querySelector("#btnTrainOne");
    const ba = els.center.querySelector("#btnTrainAll");
    const hint = els.center.querySelector("#trainHint");

    if(g.level >= g.maxLevel){
      b1.disabled = true; ba.disabled = true;
      hint.innerHTML = `You are at <span class="k">MAX</span>.`;
    }else if(!ct.ok){
      b1.disabled = true; ba.disabled = true;
      const more = ct.needMore || Math.max(0, (g.xpToNext|0) - (Math.floor(g.xp)|0));
      hint.innerHTML = `Need <span class="k">${more|0}</span> more XP to reach Level ${g.level+1}.`;
    }else{
      b1.disabled = false; ba.disabled = false;
      ba.textContent = `Train All (${g.banked|0})`;
      hint.innerHTML = `Training grants <span class="k">+1</span> Skill Point per level.`;
    }

    b1.addEventListener("click", ()=>{
      if(!ct.ok) return;
      try{ Progression.tryTrainAtNpcSlot(19, { levels:1 }); }catch(_){}
      render();
    });
    ba.addEventListener("click", ()=>{
      if(!ct.ok) return;
      try{ Progression.tryTrainAtNpcSlot(19, { levels:"all" }); }catch(_){}
      render();
    });

    const bsum = (s && s.bonusesSummary) ? `<div style="height:10px"></div><div class="muted">Bonuses: ${esc(s.bonusesSummary)}</div>` : "";
    els.right.innerHTML = `
      <div class="card">
        <div style="font-weight:900;letter-spacing:.04em;margin-bottom:8px">Current Stats</div>
        <div class="muted">Max HP: <span class="k">${s.maxHp|0}</span></div>
        <div class="muted">Sword Damage: <span class="k">${s.meleeDmg}</span></div>
        <div class="muted">Fireball Damage: <span class="k">${s.fireballDmg}</span></div>
        <div class="muted">Shockwave Damage: <span class="k">${s.shockDmg}</span></div>
        ${bsum}
      </div>
      <div style="height:12px"></div>
      <div class="card">
        <div style="font-weight:900;letter-spacing:.04em;margin-bottom:8px">Hotkeys</div>
        <div class="muted">Open menu: <span class="k">P</span> • Close: <span class="k">Esc</span></div>
      </div>
    `;
  }

  // ===============
  // Skill Tree view
  // ===============
  function renderTree(){
    const ss = getSkillState();
    const skills = ss.skills || {};
    const sp = ss.skillPoints|0;

    const tree = treeById(activeTree);
    const nodes = SKILLS_DEF.nodes.filter(n => n.tree === tree.id);
    const ROWS = Math.max(6, nodes.reduce((m,n)=>Math.max(m, (n && n.row) ? (n.row|0) : 1), 1));


    els.left.innerHTML = `
      <div class="card">
        <div style="font-weight:900;letter-spacing:.04em;margin-bottom:8px">${esc(tree.name)} Tree</div>
        <div class="muted">${esc(tree.tagline)}</div>
        <div style="height:10px"></div>
        <div class="muted">${esc(SKILLS_DEF.meta.pointsName)}: <span class="k">${sp}</span></div>
        <div style="height:12px"></div>
        <button class="btn" id="backTraining">← Back to Training</button>
      </div>
      <div style="height:12px"></div>
      <button class="btn treeBtn" data-tree="sword">Sword <small>${esc(treeById("sword").tagline)}</small></button>
      <button class="btn treeBtn" data-tree="fire">Fire <small>${esc(treeById("fire").tagline)}</small></button>
      <button class="btn treeBtn" data-tree="shock">Shock <small>${esc(treeById("shock").tagline)}</small></button>
      <button class="btn treeBtn" data-tree="survive">Survival <small>${esc(treeById("survive").tagline)}</small></button>
    `;
    els.left.querySelector("#backTraining").addEventListener("click", ()=>{ activeTab="training"; render(); });
    for(const btn of els.left.querySelectorAll(".treeBtn")){
      btn.addEventListener("click", ()=>{
        activeTree = btn.getAttribute("data-tree") || "sword";
        selectedNodeId = null;
        render();
      });
    }

    // scrolling skill grid sized to the tree's deepest row
    const ROW_H = 110;
    const GAP = 14;

    els.center.innerHTML = `
      <div class="card" style="position:relative;height:100%">
        <div id="skillScroll">
          <div id="skillStage"></div>
        </div>
      </div>
    `;

    const stage = els.center.querySelector("#skillStage");
    // stage height makes the pane scroll when ROWS is large
    const stageH = Math.max(1, (ROWS * ROW_H) + ((ROWS-1) * GAP) + 28);
    stage.style.height = stageH + "px";

    stage.innerHTML = `
      <canvas id="skillLines"></canvas>
      <div id="skillGrid"></div>
    `;

    const grid = stage.querySelector("#skillGrid");
    const lines = stage.querySelector("#skillLines");

    // dynamic rows
    grid.style.gridTemplateRows = `repeat(${ROWS}, ${ROW_H}px)`;

    function sizeLines(){
      const r = stage.getBoundingClientRect();
      // lines/grid are inset 14px on each side
      lines.width = Math.max(1, Math.floor(r.width - 28));
      lines.height = Math.max(1, Math.floor(r.height - 28));
      drawLines();
    }

    function nodeCenter(n){
      // Use real DOM positions (handles gaps/scroll/variable row counts cleanly)
      const el = grid.querySelector(`[data-node="${n.id}"]`);
      if(!el){
        const cellW = lines.width / 5;
        const cellH = lines.height / ROWS;
        return { x:(clamp(n.col,1,5)-1 + 0.5) * cellW, y:(clamp(n.row,1,ROWS)-1 + 0.5) * cellH };
      }
      const r = el.getBoundingClientRect();
      const c = lines.getBoundingClientRect();
      return { x:(r.left + r.width/2) - c.left, y:(r.top + r.height/2) - c.top };
    }

    function drawLines(){
      const ctx = lines.getContext("2d");
      ctx.setTransform(1,0,0,1,0,0);
      ctx.clearRect(0,0,lines.width,lines.height);

      ctx.lineWidth = 3;
      ctx.lineCap = "round";

      for(const [a,b] of SKILLS_DEF.edges){
        const A = nodeById(a), B = nodeById(b);
        if(!A || !B) continue;
        if(A.tree !== tree.id || B.tree !== tree.id) continue;

        const ca = nodeCenter(A), cb = nodeCenter(B);
        const ra = skills[A.id] || 0;
        const rb = skills[B.id] || 0;
        const unlocked = (ra > 0) || (rb > 0);

        ctx.strokeStyle = unlocked ? "rgba(109,255,213,.55)" : "rgba(255,255,255,.14)";
        ctx.beginPath();
        ctx.moveTo(ca.x, ca.y);
        ctx.lineTo(cb.x, cb.y);
        ctx.stroke();
      }
    }

    // Create nodes
    for(const n of nodes){
      const rank = skills[n.id] || 0;
      const pct = Math.round((rank / (n.maxRank||1)) * 100);
      const c = canBuy(n.id);
      const isMax = rank >= (n.maxRank||1);

      const nodeEl = document.createElement("div");
      nodeEl.className = "node";
      nodeEl.setAttribute("data-node", n.id);
      nodeEl.style.gridColumn = String(clamp(n.col,1,5));
      nodeEl.style.gridRow = String(clamp(n.row,1,ROWS));
      nodeEl.setAttribute("aria-owned", String(rank > 0));
      nodeEl.setAttribute("aria-disabled", String(!c.ok && rank === 0));
      nodeEl.innerHTML = `
        <div class="top">
          <div class="ic">${esc(n.icon || "◆")}</div>
          <div class="rk">${rank}/${n.maxRank}</div>
        </div>
        <div class="nm">${esc(n.name)}</div>
        <div class="bar"><i style="width:${pct}%"></i></div>
        <div class="muted">${esc(n.desc)}</div>
      `;

      nodeEl.addEventListener("click", ()=>{
        selectedNodeId = n.id;
        renderNodeDetails();
      });

      grid.appendChild(nodeEl);

      // if nothing selected yet, pick first
      if(!selectedNodeId) selectedNodeId = n.id;
    }

    // Right pane details
    function renderNodeDetails(){
      const node = nodeById(selectedNodeId);
      if(!node){
        els.right.innerHTML = `<div class="card"><div class="muted">Select a node.</div></div>`;
        return;
      }

      const rank = skills[node.id] || 0;
      const c = canBuy(node.id);
      const isMax = rank >= (node.maxRank||1);

      let prereqTxt = "None";
      if(node.prereq){
        const pre = nodeById(node.prereq.id);
        const preName = pre ? pre.name : node.prereq.id;
        const preRank = pre ? (skills[pre.id]||0) : 0;
        prereqTxt = `${preName} (${preRank}/${node.prereq.rank})`;
      }

      const buyLabel = isMax ? "Maxed" : (c.ok ? `Buy (Cost ${node.cost||1})` : "Locked");
      const hint = isMax ? "Already max rank." : (c.ok ? "Ready." : ("Locked: " + (c.reason || "requirements not met")));

      els.right.innerHTML = `
        <div class="card">
          <div style="display:flex;align-items:center;justify-content:space-between;gap:10px;margin-bottom:8px">
            <div style="font-weight:900;letter-spacing:.04em">${esc(node.name)}</div>
            <span class="k">${rank}/${node.maxRank}</span>
          </div>
          <div class="muted">${esc(node.desc)}</div>
          <div style="height:10px"></div>
          <div class="muted">Prerequisite: <span class="k">${esc(prereqTxt)}</span></div>
          <div class="muted">Cost: <span class="k">${node.cost||1} SP</span></div>
          <div style="height:12px"></div>
          <button class="btn" id="buyNode">${esc(buyLabel)}</button>
          <div style="height:10px"></div>
          <div class="muted" id="buyHint">${esc(hint)}</div>
        </div>
        <div style="height:12px"></div>
        <div class="card">
          <div style="font-weight:900;letter-spacing:.04em;margin-bottom:8px">Build</div>
          <div class="muted">${esc(SKILLS_DEF.meta.pointsName)}: <span class="k">${sp}</span></div>
          <div class="muted">Tree: <span class="k">${esc(tree.name)}</span></div>
          <div style="height:10px"></div>
          <button class="btn" id="toStats">View Stats</button>
        </div>
      `;

      const btn = els.right.querySelector("#buyNode");
      if(isMax || !c.ok) btn.disabled = true;

      btn.addEventListener("click", ()=>{
        if(isMax) return;
        const r = buy(node.id);
        if(!r || !r.ok) return;
        // refresh
        render();
      });

      els.right.querySelector("#toStats").addEventListener("click", ()=>{
        activeTab = "stats";
        render();
      });
    }

    renderNodeDetails();
    sizeLines();
    // redraw lines on resize while overlay is open
    const onResize = ()=>{ if(els.overlay.style.display === "flex" && activeTab === "tree") sizeLines(); };
    window.addEventListener("resize", onResize, { passive:true });
    // light cleanup: remove handler when menu closes
    const closeOnce = ()=>{ window.removeEventListener("resize", onResize); els.close.removeEventListener("click", closeOnce); };
    els.close.addEventListener("click", closeOnce);
  }

  // ===============
  // Stats view
  // ===============
  function renderStats(){
    const g = getProg() || { level:1, xp:0, xpToNext:0, banked:0, maxLevel:20 };
    const s = getStats() || {};
    const ss = getSkillState();

    const owned = ss.skills || {};
    const lines = Object.keys(owned).sort().map(id => {
      const n = nodeById(id);
      const nm = n ? n.name : id;
      return `${nm} (Rank ${owned[id]})`;
    });
    const ownedHtml = lines.length ? lines.map(x=>`<div class="muted">• ${esc(x)}</div>`).join("") : `<div class="muted">(none)</div>`;

    els.left.innerHTML = `
      <div class="card">
        <div style="font-weight:900;letter-spacing:.04em;margin-bottom:8px">Summary</div>
        <div class="muted">Level: <span class="k">${g.level|0}</span></div>
        <div class="muted">XP: <span class="k">${Math.floor(g.xp)|0}</span> / <span class="k">${g.xpToNext|0}</span></div>
        <div class="muted">Banked Levels: <span class="k">${g.banked|0}</span></div>
        <div style="height:10px"></div>
        <div class="muted">${esc(SKILLS_DEF.meta.pointsName)}: <span class="k">${ss.skillPoints|0}</span></div>
      </div>
      <div style="height:12px"></div>
      <button class="btn" id="toTraining">← Training</button>
      <div style="height:10px"></div>
      <button class="btn" id="toTree">Skill Tree →</button>
    `;
    els.left.querySelector("#toTraining").addEventListener("click", ()=>{ activeTab="training"; render(); });
    els.left.querySelector("#toTree").addEventListener("click", ()=>{ activeTab="tree"; render(); });

    els.center.innerHTML = `
      <div class="card">
        <div style="font-weight:900;letter-spacing:.04em;margin-bottom:8px">Combat Stats</div>
        <div class="muted">Max HP: <span class="k">${(s.maxHp|0) || 0}</span></div>
        <div class="muted">Sword Damage: <span class="k">${s.meleeDmg ?? "—"}</span></div>
        <div class="muted">Fireball Damage: <span class="k">${s.fireballDmg ?? "—"}</span></div>
        <div class="muted">Shockwave Damage: <span class="k">${s.shockDmg ?? "—"}</span></div>
        ${s.bonusesSummary ? `<div style="height:10px"></div><div class="muted">Bonuses: ${esc(s.bonusesSummary)}</div>` : ""}
      </div>
      <div style="height:12px"></div>
      <div class="card">
        <div style="font-weight:900;letter-spacing:.04em;margin-bottom:8px">Owned Skills</div>
        ${ownedHtml}
      </div>
    `;

    els.right.innerHTML = `
      <div class="card">
        <div style="font-weight:900;letter-spacing:.04em;margin-bottom:8px">Notes</div>
        <div class="muted">Skill effects are applied automatically to progression stats (and combat uses those stats).</div>
        <div style="height:10px"></div>
        <div class="muted">Future hooks already included: crit %, burn chance, shock radius, regen.</div>
      </div>
    `;
  }

  // ===============
  // Master render
  // ===============
  function renderFooter(){
    const g = getProg() || { level:1, xp:0, xpToNext:0 };
    const ss = getSkillState();
    els.sp.textContent = `SP: ${ss.skillPoints|0}`;
    els.lv.textContent = `Lv ${g.level|0}`;
    els.xp.textContent = `XP ${Math.floor(g.xp)|0}/${g.xpToNext|0}`;
    els.footerLeft.textContent = (activeTab === "tree") ? `Click a node to view details. Spend SP to rank up.` : `NPC #19 is the Trainer. Press P to open anytime.`;
  }

  function render(){
    renderTabs();
    if(activeTab === "training") renderTraining();
    else if(activeTab === "tree") renderTree();
    else renderStats();
    renderFooter();
  }

  // ===============
  // Hotkey: P opens menu
  // ===============
  window.addEventListener("keydown", (e)=>{
    if(e.code === "KeyP"){
      // don't open over existing dialogue typing unless it's already open
      if(els.overlay.style.display !== "flex"){
        show("training");
      }
    }
    if(e.key === "Escape" && els.overlay.style.display === "flex"){
      hide();
    }
  }, { passive:true });

})();

// combat.js
(function(){
  const Combat = {};
  window.Combat = Combat;

  let CFG, state, clamp, toast;

  const keys = new Map();

  const DATA = {
    melee: {
      range: 44,
      arcCos: 0.55,
      windup: 0.05,
      active: 0.10,
      recovery: 0.16,
      dmg: 18,          // (legacy fallback only now)
      knockback: 170
    },
    fireball: {
      speed: 420,
      radius: 8,
      life: 1.35,
      dmg: 22,          // (legacy fallback only now)
      knockback: 220,
      cooldown: 0.22,
      castAnim: 0.22
    },
    shockwave: {
      radius: 110,
      life: 0.28,
      grow: 520,
      dmg: 14,          // (legacy fallback only now)
      knockback: 260,
      cooldown: 0.85
    },

    whirlwind:{
      radius: 96,
      dmgMul: 1.15,
      knockback: 260,
      cooldown: 2.4
    },
    lunge:{
      range: 92,
      arcCos: 0.35,
      dmgMul: 1.35,
      knockback: 340,
      cooldown: 2.1
    },
    nova:{
      count: 10,
      speed: 320,
      radius: 8,
      life: 0.62,
      knockback: 220,
      cooldown: 3.2,
      dmgMul: 0.65
    },
    chain:{
      range: 170,
      jumps: 3,
      dmgMul: 0.75,
      knockback: 240,
      cooldown: 3.4
    },
    guard:{
      duration: 0.55,
      cooldown: 5.0
    },
    playerSprite: {
      size: 56,
      walkFps: 9,
      swordFps: 14,
      fireFps: 14,
      shockFps: 18
    }
  };

  const swing = { phase:"idle", t:0, hit:new Set() };
  const cooldowns = { fire:0, shock:0, whirlwind:0, lunge:0, nova:0, chain:0, guard:0 };
  const projectiles = [];
  const fx = { shockR:0, shockT:0, shockGrow:0, shockMaxR:0, guardT:0 };

  // Mouse aim (world coords) - HTML can pass a live object via setMouse(...)
  const mouse = { wx:null, wy:null };

  // Player animation state
  const anim = {
    // modes: "idle" | "walk" | "sword" | "fire" | "shock" | "chain" | "nova" | "lunge" | "whirl"
    mode: "idle",
    t: 0,
    fireT: 0,
    shockT: 0,
    chainT: 0,
    novaT: 0,
    lungeT: 0,
    whirlT: 0
  };

  // Sprite packs
  const SPR = {
    ready: false,
    loaded: 0,
    total: 0,
    size: DATA.playerSprite.size,
    walk:  { frames:[null], count: 4, fps: DATA.playerSprite.walkFps },
    sword: { frames:[null], count: 5, fps: DATA.playerSprite.swordFps },
    fire:  { frames:[null], count: 6, fps: DATA.playerSprite.fireFps },
    shock: { frames:[null], count: 6, fps: DATA.playerSprite.shockFps },

    // New attack loops
    chain:{ frames:[null], count: 8,  fps: (DATA.playerSprite.chainFps||DATA.playerSprite.shockFps||14) },
    nova: { frames:[null], count: 11, fps: (DATA.playerSprite.novaFps||DATA.playerSprite.fireFps||14) },
    lunge:{ frames:[null], count: 10, fps: (DATA.playerSprite.lungeFps||DATA.playerSprite.swordFps||14) },
    whirl:{ frames:[null], count: 9,  fps: (DATA.playerSprite.whirlFps||DATA.playerSprite.swordFps||14) },

    cache: { walk:[], sword:[], fire:[], shock:[], chain:[], nova:[], lunge:[], whirl:[] },
    _cacheBuilt: false
  };

  // ---------------- PROGRESSION DAMAGE ----------------
  function getStats(){
    try{
      if(window.Progression && typeof Progression.getStats === "function"){
        return Progression.getStats();
      }
    }catch(_){}
    return null;
  }
  function meleeDmg(){
    const s = getStats();
    return (s && typeof s.meleeDmg === "number") ? s.meleeDmg : DATA.melee.dmg;
  }
  function fireDmg(){
    const s = getStats();
    return (s && typeof s.fireballDmg === "number") ? s.fireballDmg : DATA.fireball.dmg;
  }
  function shockDmg(){
    const s = getStats();
    return (s && typeof s.shockDmg === "number") ? s.shockDmg : DATA.shockwave.dmg;
  }

  Combat.init = (deps)=>{
    CFG = deps.CFG;
    state = deps.state;
    clamp = deps.clamp;
    toast = deps.toast;

    preloadPlayerSprites();
  };

  Combat.setMouse = (m)=>{
    if(m && typeof m === "object") Combat._externalMouse = m;
  };

  // ---------------- INPUT ----------------
  Combat.onKeyDown = (e)=>{
    keys.set(e.code,true);

    if(e.code === "KeyG") castFireball();
    if(e.code === "Space") castShockwave();

    // New unlockable abilities (via skill tree)
    if(e.code === "KeyQ") castWhirlwind();
    if(e.code === "KeyF") castLunge();
    if(e.code === "KeyR") castFireNova();
    if(e.code === "KeyT") castChainShock();
    if(e.code === "KeyC") castGuard();
  };

  Combat.onKeyUp = (e)=>keys.set(e.code,false);

  Combat.onMouseDown = ()=>{
    startSword();
  };

  // ---------------- HELPERS ----------------
  function faceDir(){
    let {faceX:x, faceY:y} = state.player;
    const m = Math.hypot(x,y)||1;
    return {x:x/m, y:y/m};
  }

  function aimDir(){
    const p = state.player;
    const em = Combat._externalMouse;

    const mx = (em && typeof em.wx === "number") ? em.wx : mouse.wx;
    const my = (em && typeof em.wy === "number") ? em.wy : mouse.wy;

    if(typeof mx === "number" && typeof my === "number"){
      let dx = mx - p.x;
      let dy = my - p.y;
      const m = Math.hypot(dx,dy) || 1;
      dx /= m; dy /= m;
      return { x: dx, y: dy };
    }
    return faceDir();
  }

  function enemies(){
    return (window.EnemySystem && EnemySystem.getEnemies)
      ? EnemySystem.getEnemies() : [];
  }

  // Use EnemySystem hit radius if available
  function enemyHitR(e){
    try{
      if(window.EnemySystem && typeof EnemySystem.getHitRadius === "function"){
        return EnemySystem.getHitRadius(e) || 12;
      }
    }catch(_){}
    return (e && typeof e.hitR === "number") ? e.hitR : ((e && typeof e.r === "number") ? e.r : 12);
  }

  function hitEnemy(e,d,kx,ky){
    if(EnemySystem.damageEnemy) EnemySystem.damageEnemy(e,d,kx,ky);
    else if(EnemySystem.killEnemy) EnemySystem.killEnemy(e);

    // Lifesteal (sword tree) – simple, heals on hit
    try{
      const s = getStats();
      const ls = (s && s.bonuses) ? (s.bonuses.lifestealPct||0) : 0;
      if(ls > 0 && state && state.player){
        const maxHp = (typeof state.player.maxHp === "number") ? state.player.maxHp : 999;
        const cur = (typeof state.player.hp === "number") ? state.player.hp : maxHp;
        state.player.hp = Math.min(maxHp, cur + (d * ls));
      }
    }catch(_){}
  }

  function buildCacheIfReady(){
    if(SPR._cacheBuilt) return;
    if(!SPR.ready) return;

    const makeScaled = (img) => {
      if(!img || !img.complete || !img.naturalWidth) return null;
      const c = document.createElement("canvas");
      c.width = SPR.size;
      c.height = SPR.size;
      const cctx = c.getContext("2d");
      cctx.imageSmoothingEnabled = false;
      cctx.clearRect(0,0,c.width,c.height);
      try { cctx.drawImage(img, 0, 0, c.width, c.height); } catch(_){}
      return c;
    };

    for(let i=1;i<=SPR.walk.count;i++)   SPR.cache.walk[i]   = makeScaled(SPR.walk.frames[i]);
    for(let i=1;i<=SPR.sword.count;i++)  SPR.cache.sword[i]  = makeScaled(SPR.sword.frames[i]);
    for(let i=1;i<=SPR.fire.count;i++)   SPR.cache.fire[i]   = makeScaled(SPR.fire.frames[i]);
    for(let i=1;i<=SPR.shock.count;i++)  SPR.cache.shock[i]  = makeScaled(SPR.shock.frames[i]);

    // New attack loops
    for(let i=1;i<=SPR.chain.count;i++)  SPR.cache.chain[i]  = makeScaled(SPR.chain.frames[i]);
    for(let i=1;i<=SPR.nova.count;i++)   SPR.cache.nova[i]   = makeScaled(SPR.nova.frames[i]);
    for(let i=1;i<=SPR.lunge.count;i++)  SPR.cache.lunge[i]  = makeScaled(SPR.lunge.frames[i]);
    for(let i=1;i<=SPR.whirl.count;i++)  SPR.cache.whirl[i]  = makeScaled(SPR.whirl.frames[i]);

    SPR._cacheBuilt = true;
  }

  function preloadSet(store, base, count){
    for(let i=1;i<=count;i++){
      const img = new Image();
      img.src = base + i + ".png";
      img.onload = img.onerror = () => {
        SPR.loaded++;
        if(SPR.loaded >= SPR.total) SPR.ready = true;
      };
      store.frames[i] = img;
    }
  }

  function preloadPlayerSprites(){
    SPR.loaded = 0;
    SPR.ready = false;
    SPR._cacheBuilt = false;

    SPR.total = (
      SPR.walk.count + SPR.sword.count + SPR.fire.count + SPR.shock.count +
      SPR.chain.count + SPR.nova.count + SPR.lunge.count + SPR.whirl.count
    );

    preloadSet(SPR.walk,  "assets/player/walking/",   SPR.walk.count);
    preloadSet(SPR.sword, "assets/player/sword/",     SPR.sword.count);
    preloadSet(SPR.fire,  "assets/player/fireball/",  SPR.fire.count);
    preloadSet(SPR.shock, "assets/player/shockwave/", SPR.shock.count);

    // New attack loops (must exist as numbered PNGs)
    preloadSet(SPR.chain, "assets/player/chainlightening/", SPR.chain.count);
    preloadSet(SPR.nova,  "assets/player/firenova/",        SPR.nova.count);
    preloadSet(SPR.lunge, "assets/player/lunge/",           SPR.lunge.count);
    preloadSet(SPR.whirl, "assets/player/whirlwind/",       SPR.whirl.count);
  }

  // Small helper to time one full sprite loop
  function animDur(count, fps){
    const f = (fps||14);
    const d = count / f;
    return Math.max(0.18, Math.min(1.0, d));
  }

  // ---------------- MELEE ----------------
  function startSword(){
    // don't start sword if shock anim is playing
    if(anim.shockT > 0 || anim.chainT>0 || anim.novaT>0 || anim.lungeT>0 || anim.whirlT>0) return;

    const s = getStats();
    const b = (s && s.bonuses) ? s.bonuses : {};
    const spd = 1 + (b.meleeSpeedPct||0);

    if(swing.phase!=="idle") return;
    swing.phase="windup";

    swing.w = DATA.melee.windup / spd;
    swing.a = DATA.melee.active / spd;
    swing.r = DATA.melee.recovery / spd;
    swing.t = swing.w + swing.a + swing.r;
    swing.hit.clear();
    state.cam.shakeT = Math.max(state.cam.shakeT,0.06);

    anim.mode = "sword";
    anim.t = 0;
  }

  function meleeCheck(){
    const p = state.player;
    const f = faceDir();

    for(const e of enemies()){
      if(!e||e.dead) continue;
      const dx=e.x-p.x, dy=e.y-p.y;
      const d=Math.hypot(dx,dy);
      const hr = enemyHitR(e);

      if(d > DATA.melee.range + hr) continue;
      if(d <= 0.0001) continue;
      if((dx/d)*f.x+(dy/d)*f.y < DATA.melee.arcCos) continue;

      const id=e.id||(e.id=Math.random());
      if(swing.hit.has(id)) continue;
      swing.hit.add(id);

      hitEnemy(e, meleeDmg(), (dx/d)*DATA.melee.knockback, (dy/d)*DATA.melee.knockback);
    }
  }

  // ---------------- FIREBALL ----------------
  function castFireball(){
    // don't cast fire while shock anim is playing
    if(anim.shockT > 0 || anim.chainT>0 || anim.novaT>0 || anim.lungeT>0 || anim.whirlT>0) return;

    const s = getStats();
    const b = (s && s.bonuses) ? s.bonuses : {};

    if(cooldowns.fire>0) return;
    const cdMul = 1 + (b.fireCdPct||0);
    cooldowns.fire = Math.max(0.12, DATA.fireball.cooldown * cdMul);

    const d = aimDir();
    const p = state.player;

    state.player.faceX = d.x;
    state.player.faceY = d.y;

    anim.mode = "fire";
    anim.t = 0;
    anim.fireT = DATA.fireball.castAnim;

    projectiles.push({
      x: p.x + d.x*12,
      y: p.y + d.y*12,
      vx: d.x * DATA.fireball.speed * (1 + ((b.fireProjSpeedPct||0))),
      vy: d.y * DATA.fireball.speed * (1 + ((b.fireProjSpeedPct||0))),
      r: DATA.fireball.radius,
      life: DATA.fireball.life
    });
  }

  // ---------------- SHOCKWAVE ----------------
  function castShockwave(){
    const s = getStats();
    const b = (s && s.bonuses) ? s.bonuses : {};

    if(cooldowns.shock>0) return;
    const cdMul = 1 + (b.shockCdPct||0);
    cooldowns.shock = Math.max(0.12, DATA.shockwave.cooldown * cdMul);

    const radius = DATA.shockwave.radius * (1 + (b.shockRadiusPct||0));

    fx.shockR = 0;
    fx.shockT = DATA.shockwave.life;
    fx.shockMaxR = radius;
    fx.shockGrow = radius / Math.max(0.001, DATA.shockwave.life);

    // HARD LOCK: during shockT, only shock sprites render
    anim.mode = "shock";
    anim.t = 0;
    anim.shockT = DATA.shockwave.life;

    const p=state.player;

    for(const e of enemies()){
      if(!e||e.dead) continue;
      const dx=e.x-p.x, dy=e.y-p.y;
      const d=Math.hypot(dx,dy);
      const hr = enemyHitR(e);

      if(d>0 && d <= (DATA.shockwave.radius + hr)){
        hitEnemy(e, shockDmg(), (dx/d)*DATA.shockwave.knockback, (dy/d)*DATA.shockwave.knockback);
      }
    }
  }

  // ---------------- NEW ABILITIES (unlockable via skill tree) ----------------
  function unlocks(){
    const s = getStats();
    return (s && s.unlocks) ? s.unlocks : ((s && s.bonuses && s.bonuses.unlocks) ? s.bonuses.unlocks : {});
  }

  function castWhirlwind(){
    const u = unlocks();
    const s = getStats();
    const b = (s && s.bonuses) ? s.bonuses : {};

    if(!u.whirlwind){
      toast("Locked", "Learn Whirlwind in the Sword tree to use Key Q.");
      return;
    }
    if(anim.shockT > 0 || anim.chainT>0 || anim.novaT>0 || anim.lungeT>0 || anim.whirlT>0) return;
    if(cooldowns.whirlwind > 0) return;

    const cdMul = 1 + (b.whirlwindCdPct||0);
    cooldowns.whirlwind = Math.max(0.25, DATA.whirlwind.cooldown * cdMul);

    anim.mode = "whirl";
    anim.t = 0;
    anim.whirlT = Math.max(anim.whirlT, animDur(SPR.whirl.count, SPR.whirl.fps));
    state.cam.shakeT = Math.max(state.cam.shakeT, 0.14);

    const p = state.player;
    const radius = DATA.whirlwind.radius;

    for(const e of enemies()){
      if(!e || e.dead) continue;
      const dx = e.x - p.x, dy = e.y - p.y;
      const d = Math.hypot(dx,dy);
      const hr = enemyHitR(e);
      if(d <= radius + hr){
        const m = d || 1;
        hitEnemy(e, meleeDmg() * DATA.whirlwind.dmgMul, (dx/m)*DATA.whirlwind.knockback, (dy/m)*DATA.whirlwind.knockback);
      }
    }
  }

  function castLunge(){
    const u = unlocks();
    if(!u.lunge){
      toast("Locked", "Learn Lunge Strike in the Sword tree to use Key F.");
      return;
    }
    if(anim.shockT > 0 || anim.chainT>0 || anim.novaT>0 || anim.lungeT>0 || anim.whirlT>0) return;
    if(cooldowns.lunge > 0) return;

    cooldowns.lunge = DATA.lunge.cooldown;

    anim.mode = "lunge";
    anim.t = 0;
    anim.lungeT = Math.max(anim.lungeT, animDur(SPR.lunge.count, SPR.lunge.fps));
    state.cam.shakeT = Math.max(state.cam.shakeT, 0.10);

    const p = state.player;
    const f = faceDir();
    const range = DATA.lunge.range;

    for(const e of enemies()){
      if(!e || e.dead) continue;
      const dx = e.x - p.x, dy = e.y - p.y;
      const d = Math.hypot(dx,dy);
      const hr = enemyHitR(e);
      if(d > range + hr) continue;
      if(d <= 0.0001) continue;
      const dot = (dx/d)*f.x + (dy/d)*f.y;
      if(dot < DATA.lunge.arcCos) continue;

      hitEnemy(e, meleeDmg() * DATA.lunge.dmgMul, f.x*DATA.lunge.knockback, f.y*DATA.lunge.knockback);
    }
  }

  function castFireNova(){
    const u = unlocks();
    const s = getStats();
    const b = (s && s.bonuses) ? s.bonuses : {};

    if(!u.fireNova){
      toast("Locked", "Learn Fire Nova in the Fire tree to use Key R.");
      return;
    }
    if(anim.shockT > 0 || anim.chainT>0 || anim.novaT>0 || anim.lungeT>0 || anim.whirlT>0) return;
    if(cooldowns.nova > 0) return;

    const cdMul = 1 + (b.novaCdPct||0);
    cooldowns.nova = Math.max(0.25, DATA.nova.cooldown * cdMul);

    anim.mode = "nova";
    anim.t = 0;
    anim.novaT = Math.max(anim.novaT, animDur(SPR.nova.count, SPR.nova.fps));

    const p = state.player;
    const count = DATA.nova.count;
    const spdMul = 1 + (b.fireProjSpeedPct||0);
    const dmgMul = DATA.nova.dmgMul * (1 + (b.novaDmgPct||0));

    for(let i=0;i<count;i++){
      const ang = (i / count) * Math.PI * 2;
      const vx = Math.cos(ang) * DATA.nova.speed * spdMul;
      const vy = Math.sin(ang) * DATA.nova.speed * spdMul;
      projectiles.push({
        x:p.x, y:p.y,
        vx, vy,
        r: DATA.nova.radius,
        life: DATA.nova.life,
        dmgMul
      });
    }
  }

  function castChainShock(){
    const u = unlocks();
    const s = getStats();
    const b = (s && s.bonuses) ? s.bonuses : {};

    if(!u.chainShock){
      toast("Locked", "Learn Chain Shock in the Shock tree to use Key T.");
      return;
    }
    if(anim.shockT > 0 || anim.chainT>0 || anim.novaT>0 || anim.lungeT>0 || anim.whirlT>0) return;
    if(cooldowns.chain > 0) return;

    const cdMul = 1 + (b.chainCdPct||0);
    cooldowns.chain = Math.max(0.25, DATA.chain.cooldown * cdMul);

    anim.mode = "chain";
    anim.t = 0;
    anim.chainT = Math.max(anim.chainT, animDur(SPR.chain.count, SPR.chain.fps));

    const range = DATA.chain.range;
    let jumps = DATA.chain.jumps + (b.chainJumps||0);
    jumps = Math.max(1, jumps|0);

    // pick first target: nearest enemy to player within range
    const p = state.player;
    let src = { x:p.x, y:p.y };
    const hit = new Set();

    for(let j=0;j<jumps;j++){
      let best = null;
      let bestD = Infinity;

      for(const e of enemies()){
        if(!e || e.dead) continue;
        if(hit.has(e)) continue;
        const dx = e.x - src.x, dy = e.y - src.y;
        const d = Math.hypot(dx,dy);
        if(d <= range && d < bestD){ bestD = d; best = e; }
      }

      if(!best) break;

      hit.add(best);
      const dx = best.x - src.x, dy = best.y - src.y;
      const d = Math.hypot(dx,dy) || 1;

      hitEnemy(best, shockDmg() * DATA.chain.dmgMul, (dx/d)*DATA.chain.knockback, (dy/d)*DATA.chain.knockback);
      src = best;
    }
  }

  function castGuard(){
    const u = unlocks();
    const s = getStats();
    const b = (s && s.bonuses) ? s.bonuses : {};

    if(!u.guard){
      toast("Locked", "Learn Guard in Survival to use Key C.");
      return;
    }
    if(cooldowns.guard > 0) return;

    cooldowns.guard = DATA.guard.cooldown;

    // NOTE: actual damage reduction hook depends on enemy damage pipeline.
    // We still expose a timer on the player so other systems can use it.
    fx.guardT = Math.max(fx.guardT, DATA.guard.duration + (b.guardDur||0));
    state.player.guardT = fx.guardT;

    toast("Guard", "Guard active!");
  }



  // ---------------- UPDATE ----------------
  Combat.update=(dt)=>{
    cooldowns.fire=Math.max(0,cooldowns.fire-dt);
    cooldowns.shock=Math.max(0,cooldowns.shock-dt);
    cooldowns.whirlwind=Math.max(0,cooldowns.whirlwind-dt);
    cooldowns.lunge=Math.max(0,cooldowns.lunge-dt);
    cooldowns.nova=Math.max(0,cooldowns.nova-dt);
    cooldowns.chain=Math.max(0,cooldowns.chain-dt);
    cooldowns.guard=Math.max(0,cooldowns.guard-dt);

    anim.t += dt;
    if(anim.fireT > 0)  anim.fireT  = Math.max(0, anim.fireT  - dt);
    if(anim.shockT > 0) anim.shockT = Math.max(0, anim.shockT - dt);
    if(anim.chainT > 0) anim.chainT = Math.max(0, anim.chainT - dt);
    if(anim.novaT > 0)  anim.novaT  = Math.max(0, anim.novaT  - dt);
    if(anim.lungeT > 0) anim.lungeT = Math.max(0, anim.lungeT - dt);
    if(anim.whirlT > 0) anim.whirlT = Math.max(0, anim.whirlT - dt);

    if(swing.phase!=="idle"){
      swing.t-=dt;
      const w = (typeof swing.w==="number") ? swing.w : DATA.melee.windup;
      const a = (typeof swing.a==="number") ? swing.a : DATA.melee.active;
      const r = (typeof swing.r==="number") ? swing.r : DATA.melee.recovery;
      const passed = w+a+r - swing.t;
      if(passed>w && passed<w+a) meleeCheck();
      if(swing.t<=0) swing.phase="idle";
    }

    for(let i=projectiles.length-1;i>=0;i--){
      const p=projectiles[i];
      p.life-=dt;
      if(p.life<=0){projectiles.splice(i,1);continue;}
      p.x+=p.vx*dt; p.y+=p.vy*dt;

      for(const e of enemies()){
        if(!e||e.dead) continue;
        const dx=e.x-p.x, dy=e.y-p.y;
        const d = Math.hypot(dx,dy);
        const hr = enemyHitR(e);

        if(d <= p.r + hr){
          const m = d || 1;
          hitEnemy(e, fireDmg() * (p.dmgMul||1), (dx/m)*DATA.fireball.knockback, (dy/m)*DATA.fireball.knockback);
          projectiles.splice(i,1);
          break;
        }
      }
    }

    if(fx.shockT>0){
      fx.shockT-=dt;
      fx.shockR = Math.min(fx.shockMaxR||fx.shockR, fx.shockR + (fx.shockGrow||DATA.shockwave.grow)*dt);
    }

    if(fx.guardT>0){
      fx.guardT = Math.max(0, fx.guardT - dt);
      if(state && state.player) state.player.guardT = fx.guardT;
    } else {
      if(state && state.player) state.player.guardT = 0;
    }

    // Animation mode priority
    if(anim.chainT > 0){
      anim.mode = "chain";
    } else if(anim.novaT > 0){
      anim.mode = "nova";
    } else if(anim.whirlT > 0){
      anim.mode = "whirl";
    } else if(anim.lungeT > 0){
      anim.mode = "lunge";
    } else if(anim.shockT > 0){
      anim.mode = "shock";
    } else if(swing.phase !== "idle"){
      anim.mode = "sword";
    } else if(anim.fireT > 0){
      anim.mode = "fire";
    } else {
      const sp = Math.hypot(state.player.vx||0, state.player.vy||0);
      anim.mode = (sp > 10) ? "walk" : "idle";
    }
  };

  // ---------------- DRAW ----------------
  Combat.draw=(ctx)=>{
    for(const p of projectiles){
      ctx.fillStyle="orange";
      ctx.beginPath(); ctx.arc(p.x,p.y,p.r,0,Math.PI*2); ctx.fill();
    }

    if(fx.shockT>0){
      const p=state.player;
      ctx.strokeStyle="rgba(120,220,255,.8)";
      ctx.lineWidth=3;
      ctx.beginPath(); ctx.arc(p.x,p.y,fx.shockR,0,Math.PI*2); ctx.stroke();
    }
  };

  // draw player sprite
  Combat.drawPlayer = (ctx)=>{
    if(!state || !state.player) return false;
    if(!SPR.ready) return false;

    buildCacheIfReady();

    const p = state.player;
    const flip = (p.faceX || 0) < -0.15;

    // pack priority is enforced here too (double-safety)
    let packName = "walk";
    if(anim.chainT > 0 || anim.mode === "chain") packName = "chain";
    else if(anim.novaT > 0 || anim.mode === "nova") packName = "nova";
    else if(anim.whirlT > 0 || anim.mode === "whirl") packName = "whirl";
    else if(anim.lungeT > 0 || anim.mode === "lunge") packName = "lunge";
    else if(anim.shockT > 0 || anim.mode === "shock") packName = "shock";
    else if(anim.mode === "sword") packName = "sword";
    else if(anim.mode === "fire") packName = "fire";
    else packName = "walk"; // idle uses walk frame 1

    const pack = SPR[packName];
    const cached = SPR.cache[packName];
    const fps = pack.fps || 10;

    let idx = 1;
    if(packName === "walk" && anim.mode === "idle"){
      idx = 1;
    } else {
      idx = 1 + (Math.floor(anim.t * fps) % pack.count);
    }

    const safeClamp = (typeof clamp === "function")
      ? clamp
      : (v,a,b)=>Math.max(a,Math.min(b,v));

    idx = safeClamp(idx, 1, pack.count);

    const img = cached[idx] || cached[1] || pack.frames[idx] || pack.frames[1];
    if(!img) return false;

    // If an image failed to load, don't hide the fallback circle
    try{
      if(img instanceof HTMLImageElement){
        if(!img.complete || img.naturalWidth === 0) return false;
      }
      if(img instanceof HTMLCanvasElement){
        if(!img.width || !img.height) return false;
      }
    }catch(_){ /* ignore */ }

    const size = SPR.size;
    const dx = Math.floor(p.x - size/2);
    const dy = Math.floor(p.y - size/2);

    // shadow
    const r = (CFG && CFG.player && CFG.player.radius) ? CFG.player.radius : 10;
    ctx.save();
    ctx.globalAlpha = 0.35;
    ctx.fillStyle = "#000";
    ctx.beginPath();
    ctx.ellipse(p.x, p.y + r + 4, r*1.2, r*0.7, 0, 0, Math.PI*2);
    ctx.fill();
    ctx.restore();

    ctx.save();
    ctx.imageSmoothingEnabled = false;
    if(flip){
      ctx.translate(dx + size, dy);
      ctx.scale(-1, 1);
      ctx.drawImage(img, 0, 0, size, size);
    }else{
      ctx.drawImage(img, dx, dy, size, size);
    }
    ctx.restore();

    return true;
  };

})();

