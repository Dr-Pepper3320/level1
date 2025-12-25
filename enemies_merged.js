/* enemies.js
   Enemy system extracted from level1.html (keeps file:// compatible).
   Exposes: window.EnemySystem
*/

/* Auto-generated from enemy_drops.json */
window.ENEMY_DROPS = {
  "griffon": {
    "common": [
      "griffon_feather",
      "raw_meat"
    ],
    "uncommon": [
      "hardened_talon",
      "wind_essence"
    ],
    "rare": [
      "griffon_heart",
      "sky_sigil"
    ]
  },
  "chimera": {
    "common": [
      "beast_hide",
      "mixed_bone_shards"
    ],
    "uncommon": [
      "elemental_gland_random",
      "chimera_fang"
    ],
    "rare": [
      "chimera_core",
      "mutagenic_relic"
    ]
  },
  "goblin": {
    "common": [
      "coins",
      "scrap_metal",
      "crude_weapon"
    ],
    "uncommon": [
      "lockpick_set",
      "goblin_totem"
    ],
    "rare": [
      "stolen_blueprint",
      "lucky_trinket"
    ]
  },
  "bandit": {
    "common": [
      "ammo",
      "coins",
      "food"
    ],
    "uncommon": [
      "weapon_attachment",
      "armor_piece"
    ],
    "rare": [
      "map_fragment",
      "skill_manual"
    ]
  },
  "wolf": {
    "common": [
      "raw_meat",
      "fur"
    ],
    "uncommon": [
      "sharp_fang",
      "tough_hide"
    ],
    "rare": [
      "alpha_fang",
      "beast_spirit_charm"
    ]
  },
  "bear": {
    "common": [
      "thick_hide",
      "raw_meat_large"
    ],
    "uncommon": [
      "reinforced_bone",
      "bear_fat"
    ],
    "rare": [
      "bear_totem",
      "primal_heart"
    ]
  },
  "lich": {
    "common": [
      "bone_dust",
      "dark_mana_residue"
    ],
    "uncommon": [
      "phylactery_shard",
      "necromantic_scroll"
    ],
    "rare": [
      "lich_phylactery",
      "forbidden_spell_tome"
    ]
  },
  "mummy": {
    "common": [
      "rotten_cloth",
      "sand_relic"
    ],
    "uncommon": [
      "curse_bandage",
      "ancient_coin"
    ],
    "rare": [
      "pharaoh_sigil",
      "curse_core"
    ]
  },
  "harpy": {
    "common": [
      "feather_bundle",
      "bone_shards"
    ],
    "uncommon": [
      "screech_gland",
      "wing_membrane"
    ],
    "rare": [
      "harpy_voice_crystal",
      "wind_rune"
    ]
  },
  "wyvern": {
    "common": [
      "wyvern_scale",
      "raw_meat"
    ],
    "uncommon": [
      "poison_gland",
      "wing_bone"
    ],
    "rare": [
      "wyvern_heart",
      "draconic_rune"
    ]
  },
  "ogre": {
    "common": [
      "heavy_scrap",
      "raw_meat"
    ],
    "uncommon": [
      "ogre_hide",
      "crushed_bone_plate"
    ],
    "rare": [
      "ogre_core",
      "strength_totem"
    ]
  },
  "troll": {
    "common": [
      "regenerative_flesh",
      "bone_shards"
    ],
    "uncommon": [
      "troll_blood",
      "thick_hide"
    ],
    "rare": [
      "regeneration_core",
      "troll_totem"
    ]
  },
  "skeleton": {
    "common": [
      "bone",
      "rusted_weapon"
    ],
    "uncommon": [
      "bone_powder",
      "old_coin"
    ],
    "rare": [
      "skeleton_captain_emblem",
      "undead_rune"
    ]
  },
  "wight": {
    "common": [
      "cold_essence",
      "bone_fragments"
    ],
    "uncommon": [
      "soul_fragment",
      "shadow_shard"
    ],
    "rare": [
      "wight_core",
      "death_sigil"
    ]
  },
  "banshee": {
    "common": [
      "ectoplasm",
      "wisp_essence"
    ],
    "uncommon": [
      "screaming_soul",
      "spirit_thread"
    ],
    "rare": [
      "banshee_heart",
      "fear_rune"
    ]
  },
  "cultist": {
    "common": [
      "coins",
      "cloth",
      "light_weapon"
    ],
    "uncommon": [
      "ritual_component",
      "cult_sigil"
    ],
    "rare": [
      "forbidden_tome_page",
      "dark_relic"
    ]
  },
  "dark_knight": {
    "common": [
      "heavy_armor_scrap",
      "dark_steel_shard"
    ],
    "uncommon": [
      "enchanted_armor_plate",
      "shadow_blade_core"
    ],
    "rare": [
      "dark_knight_crest",
      "cursed_weapon"
    ]
  },
  "giant_spider": {
    "common": [
      "spider_silk",
      "venom_gland"
    ],
    "uncommon": [
      "hardened_chitin",
      "toxic_extract"
    ],
    "rare": [
      "queen_silk",
      "poison_core"
    ]
  },
  "slime": {
    "common": [
      "slime_gel",
      "residue"
    ],
    "uncommon": [
      "elemental_slime_core",
      "alchemy_catalyst"
    ],
    "rare": [
      "pure_slime_core",
      "adaptive_rune"
    ]
  },
  "corrupted_treant": {
    "common": [
      "corrupted_wood",
      "sap"
    ],
    "uncommon": [
      "blight_seed",
      "living_bark"
    ],
    "rare": [
      "heartwood_core",
      "nature_relic"
    ]
  },
  "elemental": {
    "common": [
      "elemental_essence",
      "crystallized_residue"
    ],
    "uncommon": [
      "elemental_core_fragment",
      "charged_shard"
    ],
    "rare": [
      "greater_elemental_core",
      "primal_rune"
    ]
  }
};

(function(){
  "use strict";

  const EnemySystem = {};

  // ----------------
  // Internal state
  // ----------------
  const enemies = [];
  const projectiles = [];
  const activeBySpawnId = new Map();
  const respawnUntil = new Map();

  let CFG = null;
  let state = null;
  let clamp = null;

  // hooks from main file
  let spawnLootAt = null;
  let damagePlayer = null;

  // tuning
  const ENEMY = { homeRadius: 400, hitFlash: 0.18 };

  // ✅ hitbox tuning (global defaults)
  // - r    = "body radius" used for spacing + movement bounds + drawing circle fallback
  // - hitR = "hit radius" used by combat collision (melee/projectiles/shockwave)
  const HITBOX = {
    defaultHitR: 12,
    minHitR: 6,
    maxHitR: 44
  };

  const SPAWN_IN_DIST  = 850;
  const SPAWN_OUT_DIST = 1050;
  const MAX_ACTIVE_ENEMIES = 18;

  const RESPAWN_COOLDOWN_SEC = 120;

  function nowSec(){ return performance.now() / 1000; }

  // ----------------
  // Definitions
  // ----------------
  const FACTION = { BEAST:"beast", HUMANOID:"humanoid", UNDEAD:"undead", MYTHIC:"mythic" };

  // ✅ Add per-type hitbox sizes here (hitR)
  // If omitted, we’ll derive hitR from r at spawn time.
  const ENEMY_DEFS = {
    "wolf":            { faction:FACTION.BEAST,    sense:220, speed:88,  hp:30,  melee:{range:22, cd:0.9, dmg:7},  sprite:"wolf", hitR:14 },
    "bear":            { faction:FACTION.BEAST,    sense:260, speed:62,  hp:70,  melee:{range:26, cd:1.2, dmg:13},                    hitR:16 },
    "giant spider":    { faction:FACTION.BEAST,    sense:280, speed:78,  hp:40,  melee:{range:20, cd:1.0, dmg:9},                     hitR:14 },
    "corrupted treant":{ faction:FACTION.BEAST,    sense:340, speed:36,  hp:120, melee:{range:34, cd:1.6, dmg:16},                    hitR:18 },

    "goblin":          { faction:FACTION.HUMANOID, sense:260, speed:84,  hp:28,  melee:{range:20, cd:0.9, dmg:6},                     hitR:12 },
    "bandit":          { faction:FACTION.HUMANOID, sense:320, speed:78,  hp:40,  melee:{range:22, cd:1.0, dmg:9},                     hitR:13 },
    "cultist":         { faction:FACTION.HUMANOID, sense:360, speed:68,  hp:34,  melee:{range:18, cd:1.0, dmg:6}, cast:{kind:"bolt", range:520, cd:2.4, dmg:9,  speed:280}, hitR:12 },
    "dark knight":     { faction:FACTION.HUMANOID, sense:380, speed:64,  hp:90,  melee:{range:26, cd:1.1, dmg:14}, cast:{kind:"dash", range:260, cd:3.2, dmg:10, speed:520}, hitR:15 },
    "troll":           { faction:FACTION.HUMANOID, sense:320, speed:54,  hp:140, melee:{range:34, cd:1.7, dmg:18},                    hitR:18 },

    "lich":            { faction:FACTION.UNDEAD,   sense:540, speed:58,  hp:110, melee:{range:18, cd:1.2, dmg:8},  cast:{kind:"bolt", range:720, cd:1.8, dmg:14, speed:340}, hitR:14 },
    "mummy":           { faction:FACTION.UNDEAD,   sense:300, speed:52,  hp:85,  melee:{range:24, cd:1.1, dmg:12},                    hitR:15 },
    "wight":           { faction:FACTION.UNDEAD,   sense:380, speed:66,  hp:70,  melee:{range:24, cd:1.0, dmg:11},                    hitR:14 },
    "banshee":         { faction:FACTION.UNDEAD,   sense:460, speed:74,  hp:55,  melee:{range:18, cd:1.0, dmg:8},  cast:{kind:"scream", range:260, cd:4.0, dmg:12, slow:0.65, dur:1.2}, hitR:13 },

    "griffon":         { faction:FACTION.MYTHIC,   sense:460, speed:92,  hp:120, melee:{range:26, cd:1.0, dmg:15}, cast:{kind:"gust", range:360, cd:3.5, dmg:8,  push:180}, hitR:16 },
    "chimera":         { faction:FACTION.MYTHIC,   sense:420, speed:78,  hp:150, melee:{range:30, cd:1.3, dmg:17}, cast:{kind:"bolt", range:520, cd:2.8, dmg:12, speed:300}, hitR:18 },
    "wyvern":          { faction:FACTION.MYTHIC,   sense:520, speed:96,  hp:135, melee:{range:30, cd:0.75, dmg:14}, cast:{kind:"bolt", range:460, cd:3.2, dmg:13, speed:360}, hitR:16 },
    "harpy":           { faction:FACTION.MYTHIC,   sense:440, speed:104, hp:60,  melee:{range:20, cd:0.9, dmg:9},  cast:{kind:"bolt", range:520, cd:2.9, dmg:10, speed:320}, hitR:13 },
  };

  // ----------------
  // Scaling (per enemy type)
  // ----------------
  // This scales enemy HP + damage based on the player's current level,
  // with different scaling curves per enemy type (NOT region-based).
  // Tweak numbers here to tune difficulty.
  const ENEMY_SCALING = {
    // low-tier: barely scales (still relevant but not spongey)
    "wolf":            { hpPerLevel:0.020, dmgPerLevel:0.015, capHp:1.45, capDmg:1.30 },
    "goblin":          { hpPerLevel:0.025, dmgPerLevel:0.020, capHp:1.60, capDmg:1.40 },
    "bandit":          { hpPerLevel:0.030, dmgPerLevel:0.025, capHp:1.70, capDmg:1.50 },
    "giant spider":    { hpPerLevel:0.030, dmgPerLevel:0.022, capHp:1.75, capDmg:1.45 },
    "cultist":         { hpPerLevel:0.035, dmgPerLevel:0.030, capHp:1.85, capDmg:1.60 },

    // mid-tier: scales more
    "bear":            { hpPerLevel:0.035, dmgPerLevel:0.028, capHp:1.90, capDmg:1.60 },
    "wight":           { hpPerLevel:0.038, dmgPerLevel:0.032, capHp:1.95, capDmg:1.70 },
    "mummy":           { hpPerLevel:0.040, dmgPerLevel:0.033, capHp:2.00, capDmg:1.75 },
    "harpy":           { hpPerLevel:0.042, dmgPerLevel:0.035, capHp:2.05, capDmg:1.80 },

    // high-tier: keeps pressure at higher player levels
    "dark knight":     { hpPerLevel:0.045, dmgPerLevel:0.040, capHp:2.10, capDmg:1.90 },
    "griffon":         { hpPerLevel:0.045, dmgPerLevel:0.038, capHp:2.15, capDmg:1.85 },
    "banshee":         { hpPerLevel:0.048, dmgPerLevel:0.042, capHp:2.20, capDmg:1.95 },
    "lich":            { hpPerLevel:0.052, dmgPerLevel:0.046, capHp:2.30, capDmg:2.05 },
    "wyvern":          { hpPerLevel:0.055, dmgPerLevel:0.048, capHp:2.35, capDmg:2.10 },
    "chimera":         { hpPerLevel:0.060, dmgPerLevel:0.052, capHp:2.45, capDmg:2.20 },
    "troll":           { hpPerLevel:0.060, dmgPerLevel:0.052, capHp:2.50, capDmg:2.25 },
    "corrupted treant":{ hpPerLevel:0.065, dmgPerLevel:0.055, capHp:2.65, capDmg:2.35 }
  };

  function getPlayerLevel(){
    try{
      if(window.Progression && typeof Progression.get === "function"){
        const g = Progression.get();
        if(g && typeof g.level === "number") return Math.max(1, g.level|0);
      }
    }catch(_){}
    return 1;
  }

  function scaleCfgFor(type){
    const k = String(type||"").toLowerCase().trim();
    return ENEMY_SCALING[k] || { hpPerLevel:0.030, dmgPerLevel:0.025, capHp:1.80, capDmg:1.55 };
  }

  function computeMul(perLevel, cap, L){
    // L=1 -> 1.00, grows linearly with cap
    const mul = 1 + Math.max(0, (L-1)) * (Number(perLevel)||0);
    return Math.max(1, Math.min(Number(cap)||2.0, mul));
  }

  function scaleDmg(e, base){
    const mul = (e && typeof e.dmgMul === "number") ? e.dmgMul : 1;
    return Math.max(0, Math.round(((Number(base)||0) * mul) * 10) / 10);
  }

  function applyScalingToEnemy(e, def){
    const L = getPlayerLevel();
    const sc = scaleCfgFor(e.type);

    // Store multipliers so we can use them everywhere (melee + cast + bolts)
    e.hpMul  = computeMul(sc.hpPerLevel,  sc.capHp,  L);
    e.dmgMul = computeMul(sc.dmgPerLevel, sc.capDmg, L);

    // Apply HP scaling at spawn time
    e.maxHp = Math.max(1, Math.round((Number(def.hp)||1) * e.hpMul));
    e.hp = e.maxHp;
  }


  function enemyDef(type){
    const k = String(type||"").toLowerCase().trim();
    return ENEMY_DEFS[k] || { faction:FACTION.BEAST, sense:260, speed:70, hp:40, melee:{range:22, cd:1.1, dmg:8}, hitR: HITBOX.defaultHitR };
  }

  // ✅ central getter (combat.js should use this)
  function getHitRadius(e){
    const hr = (e && typeof e.hitR === "number") ? e.hitR
             : (e && typeof e.r === "number") ? e.r
             : HITBOX.defaultHitR;
    return Math.max(HITBOX.minHitR, Math.min(HITBOX.maxHitR, hr));
  }

  // ----------------
  // Assets (wolf walk frames)
  // ----------------
  const ASSETS = {
    wolf: { v1:{w1:new Image(), w2:new Image()}, v2:{w1:new Image(), w2:new Image()}, ready:false }
  };

  function initWolfAssets(){
    ASSETS.wolf.v1.w1.src = "assets/enemies/wolf/variant1/walk1.png";
    ASSETS.wolf.v1.w2.src = "assets/enemies/wolf/variant1/walk2.png";
    ASSETS.wolf.v2.w1.src = "assets/enemies/wolf/variant2/walk1.png";
    ASSETS.wolf.v2.w2.src = "assets/enemies/wolf/variant2/walk2.png";

    const imgs = [ASSETS.wolf.v1.w1, ASSETS.wolf.v1.w2, ASSETS.wolf.v2.w1, ASSETS.wolf.v2.w2];
    let loaded = 0;
    for(const im of imgs){
      const done = () => { loaded++; if(loaded === imgs.length) ASSETS.wolf.ready = true; };
      im.onload = done;
      im.onerror = done;
    }
  }

  // ----------------
  // Projectiles
  // ----------------
  function spawnBolt(fromX, fromY, toX, toY, speed, dmg){
    const dx = toX - fromX, dy = toY - fromY;
    const d = Math.hypot(dx,dy) || 1;
    projectiles.push({ x:fromX, y:fromY, vx:(dx/d)*speed, vy:(dy/d)*speed, r:5, dmg, t:0, life:2.4 });
  }

  // ----------------
  // Spawning + activation
  // ----------------
  function clearEnemies(){
    enemies.length = 0;
    projectiles.length = 0;
    activeBySpawnId.clear();
    // keep respawnUntil so cooldown survives reloads during session (same as before)
  }

  function spawnEnemyFromPoint(sp){
    const type = String(sp.type||"enemy").toLowerCase().trim();
    const def = enemyDef(type);
    const rad = Math.max(0, sp.radius || 0);
    const ang = Math.random() * Math.PI * 2;
    const rr = rad > 0 ? Math.random() * rad : 0;
    const x = clamp(sp.x + Math.cos(ang)*rr, 0, state.world.w);
    const y = clamp(sp.y + Math.sin(ang)*rr, 0, state.world.h);

    const wolfR = CFG.player.radius * 2;

    // body radius (movement bounds / spacing)
    const bodyR =
      (type==="wolf" ? wolfR :
       (type==="bear" ? 16 :
        (type==="troll" || type==="corrupted treant") ? 18 : 14));

    // ✅ hit radius (combat). Priority:
    // 1) spawn point override: sp.hitR
    // 2) enemy def: def.hitR
    // 3) derived from body radius: bodyR
    let hitR = (typeof sp.hitR === "number") ? sp.hitR :
               (typeof def.hitR === "number") ? def.hitR :
               bodyR;

    hitR = Math.max(HITBOX.minHitR, Math.min(HITBOX.maxHitR, hitR));

    const enemy = {
      spawnId: sp.id || null,
      id: sp.id || ("enemy_"+Math.random().toString(16).slice(2,8)),
      type,
      faction: def.faction,
      x, y,
      vx: 0, vy: 0,
      homeX: sp.x, homeY: sp.y,
      homeR: ENEMY.homeRadius,
      hp: def.hp,

      // ✅ alive/dead flags (combat.js checks e.dead)
      dead: false,

      // ✅ radii
      r: bodyR,
      hitR: hitR,

      targetX: sp.x, targetY: sp.y,
      thinkT: 0,
      idleT: 0,
      attackCd: 0,
      castCd: 0,
      hitT: 0,
      wolfVariant: (type==="wolf" ? (Math.random() < 0.5 ? 1 : 2) : 0),
      animT: Math.random()*10
    };

    // Apply per-type scaling based on player level
    applyScalingToEnemy(enemy, def);

    enemies.push(enemy);
    if(enemy.spawnId) activeBySpawnId.set(enemy.spawnId, enemy);
  }

  function updateActivation(devData){
    const px = state.player.x, py = state.player.y;

    // Despawn far enemies (spawned via points)
    for(let i=enemies.length-1;i>=0;i--){
      const e = enemies[i];
      if(!e.spawnId) continue;
      const d = Math.hypot(e.homeX - px, e.homeY - py);
      if(d > SPAWN_OUT_DIST){
        activeBySpawnId.delete(e.spawnId);
        enemies.splice(i, 1);
      }
    }

    if(enemies.length >= MAX_ACTIVE_ENEMIES) return;

    const spawns = (devData && devData.enemySpawns) ? devData.enemySpawns : [];
    const tNow = nowSec();

    for(const sp of spawns){
      if(!sp || !sp.id) continue;
      if(activeBySpawnId.has(sp.id)) continue;

      const until = respawnUntil.get(sp.id) || 0;
      if(until > tNow) continue;

      const d = Math.hypot(sp.x - px, sp.y - py);
      if(d <= SPAWN_IN_DIST){
        spawnEnemyFromPoint(sp);
        if(enemies.length >= MAX_ACTIVE_ENEMIES) break;
      }
    }
  }

  // ----------------
  // Combat helpers
  // ----------------
  
  // Map your internal enemy type names (e.g., "wolf", "giant spider") to the
  // canonical quest-system enemy ids (e.g., "enemy.wolf", "enemy.giant_spider").
  function questEnemyId(type){
    const ms = window.MainStoryQuestSystem;
    const t = String(type || "").toLowerCase().trim();
    if(ms && ms.ENEMIES){
      if(t === "wolf") return ms.ENEMIES.WOLF;
      if(t === "bear") return ms.ENEMIES.BEAR;
      if(t === "cultist") return ms.ENEMIES.CULTIST;
      if(t === "troll") return ms.ENEMIES.TROLL;
    }
    const slug = t.replace(/[^a-z0-9]+/g, "_").replace(/^_+|_+$/g, "");
    return slug ? ("enemy." + slug) : "enemy.unknown";
  }
function killEnemy(e){
    // Allow kill after damage has already reduced HP to 0.
    // Prevent double-processing via e._killed (some extensions may set e.dead for visuals).
    if(!e || e._killed) return;
    e._killed = true;
    e.hp = 0;
    e.dead = true;

    if(typeof spawnLootAt === "function"){
      spawnLootAt(e.x, e.y, e.type);
    }


    // ✅ Main story quest hook (kills)
    try{
      const ms = window.MainStoryQuestSystem;
      if(ms && typeof ms.kill === "function"){
        ms.kill(questEnemyId(e.type), 1);
      }
    }catch(_){}
    // ✅ XP / progression hook (works with old + new progression APIs)
    try{
      if(window.Progression){
        if(typeof Progression.onEnemyKilled === "function"){
          Progression.onEnemyKilled(e);
        }else if(typeof Progression.getEnemyXP === "function" && typeof Progression.addXP === "function"){
          const xp = Progression.getEnemyXP(e.type);
          // Optional: slight XP bonus for scaled enemies (keeps higher-level fights rewarding)
          const hpMul = (typeof e.hpMul === "number") ? e.hpMul : 1;
          const dmgMul = (typeof e.dmgMul === "number") ? e.dmgMul : 1;
          const xpMul = 1 + Math.max(0, (hpMul-1))*0.35 + Math.max(0, (dmgMul-1))*0.25;
          Progression.addXP(Math.round(xp * xpMul), e.type);
        }
      }
    }catch(_){}

    if(e.spawnId){
      activeBySpawnId.delete(e.spawnId);
      respawnUntil.set(e.spawnId, nowSec() + RESPAWN_COOLDOWN_SEC);
    }

    const idx = enemies.indexOf(e);
    if(idx >= 0) enemies.splice(idx,1);
  }

  // ✅ NEW: damage method used by combat.js (prevents insta-kill fallback)
  function damageEnemy(e, dmg, kx, ky){
    if(!e || e._killed || e.hp <= 0) return false;

    const amount = Math.max(0, Number(dmg) || 0);
    if(amount <= 0) return false;

    e.hp -= amount;
    e.hitT = ENEMY.hitFlash;

    // knockback (small mass scaling so big guys aren't ping-ponged)
    const type = String(e.type||"").toLowerCase().trim();
    const massMul = (type==="troll" || type==="corrupted treant" || type==="chimera") ? 0.55
                  : (type==="bear" || type==="griffon") ? 0.70
                  : 1.00;

    e.vx += (Number(kx)||0) * massMul;
    e.vy += (Number(ky)||0) * massMul;

    if(e.hp <= 0){
      killEnemy(e);
      return true;
    }
    return true;
  }

  function nearestEnemy(maxDist=80){
    const p = state.player;
    let best = null;
    for(const e of enemies){
      if(!e || e.dead || e.hp <= 0) continue;
      const d = Math.hypot(e.x - p.x, e.y - p.y);
      if(d <= maxDist && (!best || d < best.d)) best = { e, d };
    }
    return best ? best.e : null;
  }

  // ----------------
  // AI step
  // ----------------
  function applyEnemyFriction(e, dt){
    const fk = 1 - Math.exp(-8*dt);
    e.vx *= (1 - fk);
    e.vy *= (1 - fk);
    if(Math.abs(e.vx) < 0.01) e.vx = 0;
    if(Math.abs(e.vy) < 0.01) e.vy = 0;
  }

  function pickWanderPoint(e){
    const a = Math.random()*Math.PI*2;
    const rr = Math.random()*e.homeR;
    e.targetX = clamp(e.homeX + Math.cos(a)*rr, 0, state.world.w);
    e.targetY = clamp(e.homeY + Math.sin(a)*rr, 0, state.world.h);
  }

  function enemyTargetCandidate(e){
    const def = enemyDef(e.type);
    const px = state.player.x, py = state.player.y;
    const dp = Math.hypot(px - e.x, py - e.y);
    if(dp <= def.sense) return { kind:"player", d: dp };
    return null;
  }

  function enemyCast(e){
    const def = enemyDef(e.type);
    const c = def.cast;
    if(!c || e.castCd > 0) return;

    if(c.kind === "bolt"){
      spawnBolt(e.x, e.y, state.player.x, state.player.y, c.speed, scaleDmg(e, c.dmg));
      e.castCd = c.cd;
      return;
    }

    if(c.kind === "scream"){
      const p = state.player;
      const d = Math.hypot(p.x - e.x, p.y - e.y);
      if(d <= c.range){
        if(typeof damagePlayer === "function") damagePlayer(scaleDmg(e, c.dmg));
        p.slowMul = Math.min(p.slowMul, c.slow);
        p._slowT = Math.max(p._slowT || 0, c.dur);
        state.cam.shakeT = 0.18;
      }
      e.castCd = c.cd;
      return;
    }

    if(c.kind === "gust"){
      const p = state.player;
      const d = Math.hypot(p.x - e.x, p.y - e.y);
      if(d <= c.range){
        if(typeof damagePlayer === "function") damagePlayer(scaleDmg(e, c.dmg));
        const dx = p.x - e.x, dy = p.y - e.y;
        const dd = Math.hypot(dx,dy) || 1;
        p.vx += (dx/dd) * c.push;
        p.vy += (dy/dd) * c.push;
      }
      e.castCd = c.cd;
      return;
    }

    if(c.kind === "dash"){
      const p = state.player;
      const d = Math.hypot(p.x - e.x, p.y - e.y);
      if(d <= c.range){
        const dx = p.x - e.x, dy = p.y - e.y;
        const dd = Math.hypot(dx,dy) || 1;
        e.vx += (dx/dd) * c.speed;
        e.vy += (dy/dd) * c.speed;
        if(d < 30 && typeof damagePlayer === "function") damagePlayer(scaleDmg(e, c.dmg));
      }
      e.castCd = c.cd;
      return;
    }
  }

  function update(dt){
    const p = state.player;
    p._slowT = Math.max(0, (p._slowT || 0) - dt);
    if(p._slowT <= 0) p.slowMul = 1;

    for(const e of enemies){
      if(!e || e.hp <= 0 || e.dead) continue;
      const def = enemyDef(e.type);

      e.animT += dt;
      e.thinkT = Math.max(0, e.thinkT - dt);
      e.attackCd = Math.max(0, e.attackCd - dt);
      e.castCd = Math.max(0, e.castCd - dt);
      e.hitT = Math.max(0, e.hitT - dt);

      const tgt = enemyTargetCandidate(e);

      if(tgt){
        if(def.cast){
          const d = Math.hypot(state.player.x - e.x, state.player.y - e.y);
          if(d <= (def.cast.range || 420)) enemyCast(e);
        }

        const dx = state.player.x - e.x, dy = state.player.y - e.y;
        const d = Math.hypot(dx,dy) || 1;
        const mv = def.speed;
        const k = 1 - Math.exp(-10*dt);
        e.vx += ((dx/d)*mv - e.vx) * k;
        e.vy += ((dy/d)*mv - e.vy) * k;

        if(def.melee && d <= def.melee.range && e.attackCd <= 0){
          e.attackCd = def.melee.cd;
          if(typeof damagePlayer === "function") damagePlayer(scaleDmg(e, def.melee.dmg));
          p.vx += (dx/d) * 120;
          p.vy += (dy/d) * 120;
        }
      }else{
        if(e.idleT > 0){
          e.idleT = Math.max(0, e.idleT - dt);
          applyEnemyFriction(e, dt);
          if(e.idleT <= 0) e.thinkT = 0;
        }else{
          if(e.thinkT <= 0){
            if(Math.random() < 0.12){
              e.idleT = 0.6 + Math.random()*1.2;
              e.thinkT = 0.6;
            }else{
              pickWanderPoint(e);
              e.thinkT = 0.8 + Math.random()*1.3;
            }
          }

          const dx = e.targetX - e.x, dy = e.targetY - e.y;
          const d = Math.hypot(dx,dy);
          if(d < 14){
            applyEnemyFriction(e, dt);
            if(Math.random() < 0.08) e.idleT = 0.5 + Math.random()*0.9;
            else e.thinkT = 0;
          }else{
            const mv = def.speed * 0.55;
            const k = 1 - Math.exp(-8*dt);
            e.vx += ((dx/d)*mv - e.vx) * k;
            e.vy += ((dy/d)*mv - e.vy) * k;
          }
        }
      }

      e.x += e.vx * dt;
      e.y += e.vy * dt;

      // movement bounds still use body radius
      e.x = clamp(e.x, e.r, state.world.w - e.r);
      e.y = clamp(e.y, e.r, state.world.h - e.r);

      const dh = Math.hypot(e.x - e.homeX, e.y - e.homeY);
      if(dh > e.homeR + 160){
        const dx = e.homeX - e.x, dy = e.homeY - e.y;
        const dd = Math.hypot(dx,dy) || 1;
        e.vx += (dx/dd) * 30 * dt;
        e.vy += (dy/dd) * 30 * dt;
      }
    }

    for(let i=projectiles.length-1;i>=0;i--){
      const pr = projectiles[i];
      pr.t += dt;
      pr.x += pr.vx * dt;
      pr.y += pr.vy * dt;
      if(pr.t >= pr.life){ projectiles.splice(i,1); continue; }

      const d = Math.hypot(state.player.x - pr.x, state.player.y - pr.y);
      if(d <= (CFG.player.radius + pr.r)){
        projectiles.splice(i,1);
        if(typeof damagePlayer === "function") damagePlayer(pr.dmg);
      }
    }
  }

  // ----------------
  // Drawing
  // ----------------
  function drawEnemy(ctx, e){
    const def = enemyDef(e.type);
    const moving = (Math.hypot(e.vx,e.vy) > 4);

    ctx.globalAlpha = 0.28;
    ctx.fillStyle = "#000";
    ctx.beginPath();
    ctx.ellipse(e.x, e.y + e.r + 4, e.r*1.05, e.r*0.62, 0, 0, Math.PI*2);
    ctx.fill();

    if(def.sprite === "wolf" && ASSETS.wolf.ready){
      const v = (e.wolfVariant === 2) ? ASSETS.wolf.v2 : ASSETS.wolf.v1;
      const frame = (moving && (Math.floor(e.animT*6) % 2 === 1)) ? v.w2 : v.w1;

      const size = CFG.player.radius * 4;
      const dx = Math.floor(e.x - size/2);
      const dy = Math.floor(e.y - size/2);

      ctx.globalAlpha = 1;

      if(e.hitT > 0){
        ctx.globalAlpha = 0.45;
        ctx.fillStyle = "rgba(255,255,255,.85)";
        ctx.fillRect(dx, dy, size, size);
        ctx.globalAlpha = 1;
      }

      ctx.drawImage(frame, dx, dy, size, size);
      return;
    }

    ctx.globalAlpha = 1;
    const base = ({
      "beast":"rgba(175,255,215,.92)",
      "humanoid":"rgba(255,220,150,.92)",
      "undead":"rgba(190,180,255,.92)",
      "mythic":"rgba(255,170,210,.92)"
    })[def.faction] || "rgba(215,255,227,.92)";

    ctx.fillStyle = (e.hitT > 0) ? "rgba(255,255,255,.92)" : base;
    ctx.beginPath(); ctx.arc(e.x, e.y, e.r, 0, Math.PI*2); ctx.fill();

    // Optional debug: show hit radius (OFF by default)
    // if(window.__SHOW_HITBOXES__){
    //   ctx.globalAlpha = 0.9;
    //   ctx.strokeStyle = "rgba(255,80,80,.85)";
    //   ctx.lineWidth = 1;
    //   ctx.beginPath(); ctx.arc(e.x, e.y, getHitRadius(e), 0, Math.PI*2); ctx.stroke();
    //   ctx.globalAlpha = 1;
    // }
  }

  function draw(ctx){
    for(const e of enemies){ if(e && e.hp > 0 && !e.dead) drawEnemy(ctx, e); }

    // projectiles
    ctx.globalAlpha = 0.95;
    ctx.fillStyle = "rgba(109,255,213,.95)";
    for(const pr of projectiles){
      ctx.beginPath(); ctx.arc(pr.x, pr.y, pr.r, 0, Math.PI*2); ctx.fill();
    }
    ctx.globalAlpha = 1;
  }

  // ----------------
  // Public API
  // ----------------
  EnemySystem.init = function(opts){
    CFG = opts.CFG;
    state = opts.state;
    clamp = opts.clamp;

    spawnLootAt = opts.spawnLootAt;
    damagePlayer = opts.damagePlayer;

    initWolfAssets();
    return EnemySystem;
  };

  EnemySystem.reset = function(){
    clearEnemies();
  };

  EnemySystem.resetFromDev = function(devData){
    clearEnemies();
  };

  EnemySystem.updateActivation = function(devData){
    updateActivation(devData);
  };

  EnemySystem.update = function(dt){
    update(dt);
  };

  EnemySystem.draw = function(ctx){
    draw(ctx);
  };

  EnemySystem.nearestEnemy = function(maxDist){
    return nearestEnemy(maxDist);
  };

  EnemySystem.killEnemy = function(e){
    killEnemy(e);
  };

  // ✅ NEW: combat-facing APIs
  EnemySystem.damageEnemy = function(e, dmg, kx, ky){
    return damageEnemy(e, dmg, kx, ky);
  };

  EnemySystem.getHitRadius = function(e){
    return getHitRadius(e);
  };

  EnemySystem.getEnemies = function(){
    return enemies;
  };

  window.EnemySystem = EnemySystem;
})();



/* =========================================================
   WYVERN EXTENSION (NON-DESTRUCTIVE)
   - Adds animated PNG sets for Wyvern
   - Does NOT remove or rewrite existing enemy logic
   - Hooks into EnemySystem.update / draw safely
   ========================================================= */

(function(){
  if(!window.EnemySystem) return;

  const ES = window.EnemySystem;

  // -----------------------------
  // Wyvern assets
  // -----------------------------
  const WYVERN = {
    ready:false,
    size:164,
    sets:{
      wakeup:{ count:10, fps:10, frames:[] },
      walk:{ count:12, fps:10, frames:[] },
      attack:{ count:9, fps:14, frames:[] },
      flame:{ count:8, fps:12, frames:[] }
    }
  };

  function loadWyvernAssets(){
    let total = 0, loaded = 0;
    for(const k in WYVERN.sets){
      const set = WYVERN.sets[k];
      total += set.count;
      for(let i=1;i<=set.count;i++){
        const img = new Image();
        img.src = `assets/enemies/wyvern/${k}/${i}.png`;
        img.onload = img.onerror = () => {
          loaded++;
          if(loaded >= total) WYVERN.ready = true;
        };
        set.frames[i] = img;
      }
    }
  }

  // -----------------------------
  // Helpers
  // -----------------------------
  function isWyvern(e){ return e && e.type === "wyvern"; }

  function ensureWyvernState(e){
    if(!e._wyvern){
      e._wyvern = {
        anim:"wakeup",
        animT:0,
        once:true
      };
    }
  }

  // -----------------------------
  // Patch update
  // -----------------------------
  const _update = ES.update;
  ES.update = function(dt){
    _update(dt);

    const enemies = ES.getEnemies();
    for(const e of enemies){
      if(!isWyvern(e) || e.dead) continue;

      ensureWyvernState(e);
      const w = e._wyvern;
      w.animT += dt;

      // wakeup -> walk
      if(w.anim === "wakeup" && w.animT > 1){
        w.anim = "walk";
        w.animT = 0;
        w.once = false;
      }

      // flame casting visual trigger
      if(e.castCd > 0 && w.anim !== "flame"){
        w.anim = "flame";
        w.animT = 0;
        w.once = true;
      }

      // return to walk
      if(w.anim === "flame" && w.animT > 0.7){
        w.anim = "walk";
        w.animT = 0;
        w.once = false;
      }
    }
  };

  // -----------------------------
  // Patch draw
  // -----------------------------
  const _draw = ES.draw;
  ES.draw = function(ctx){
    _draw(ctx);

    if(!WYVERN.ready) return;

    const enemies = ES.getEnemies();
    for(const e of enemies){
      if(!isWyvern(e) || e.dead) continue;

      ensureWyvernState(e);
      const w = e._wyvern;
      const set = WYVERN.sets[w.anim];
      if(!set) continue;

      const frame =
        Math.floor(w.animT * set.fps) % set.count + 1;

      const img = set.frames[frame];
      if(!img) continue;

      const sz = WYVERN.size;
      ctx.drawImage(img, e.x - sz/2, e.y - sz/2, sz, sz);
    }
  };

  // -----------------------------
  // Init hook
  // -----------------------------
  const _init = ES.init;
  ES.init = function(opts){
    const r = _init(opts);
    loadWyvernAssets();
    return r;
  };

})();
/* ================= END WYVERN EXTENSION ================= */
