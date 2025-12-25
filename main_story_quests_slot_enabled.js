/* ============================================================================
  main_story_quests.js
  Nephilim Pixel Art Game — Main Story Questline (Data + Runtime)
  ----------------------------------------------------------------------------
  What this file gives you:
  - A full, in-depth, organized main-story quest chain (17 quests)
  - 5 scripted Enoch “Appearances” at key moments
  - Quest objectives (kills, destroys, pickups, visits, dialogues, puzzles)
  - World-state flags (enemy-of-city, city-pass, trolls-neutral, etc.)
  - Rewards hooks (XP, items, unlock markers, debuffs)
  - A lightweight QuestSystem runtime you can wire into your game loop

  How you integrate:
  - Include this script after your SaveStore / game boot code
  - Call MainStoryQuestSystem.init()
  - When things happen in-game, call MainStoryQuestSystem.emit("EVENT", payload)

  Example events you should emit:
    emit("ENTER_ZONE", { zoneId })
    emit("TALK_NPC", { npcId })
    emit("KILL_ENEMY", { enemyType, count: 1 })
    emit("DESTROY_OBJECT", { objectType, objectId })
    emit("PICKUP_ITEM", { itemId, qty })
    emit("COMPLETE_PUZZLE", { puzzleId })
    emit("CLEAR_ENCOUNTER", { encounterId })
    emit("CUTSCENE_DONE", { cutsceneId })

  Notes:
  - This system is intentionally engine-agnostic.
  - You can bind markers & UI by reading getState(), getActiveQuest(), etc.
============================================================================ */

(function () {
  "use strict";

  /* =========================
     IDs / Canonical Entities
  ========================== */

  const ZONES = Object.freeze({
    EMPTY_GROVE: "zone.empty_grove_sw",
    HUNTERS_CABIN: "zone.hunters_cabin_cw",
    TROLL_CAMP: "zone.troll_camp_cn",
    NAAMRIEL_HUT: "zone.naamriel_hut_center",
    CORRUPTED_SITE: "zone.corrupted_site_ec",
    SLAVE_MINE: "zone.slave_mine_nw",
    HOLY_SITE: "zone.holy_site_s",
    CITY_OVERLOOK: "zone.city_overlook_ne",
    CITY_OUTER: "zone.city_outer_ne",
    CITY_INNER: "zone.city_inner_ne",
    MEGALITH_RUINS: "zone.megalith_ruins_se",
    WYVERN_RIDGE: "zone.wyvern_ridge_e_of_holy",
  });

  const NPCS = Object.freeze({
    ENOCH: "npc.enoch_spirit",
    HUNTER_LEAD: "npc.hunter_lead",
    TROLL_CHIEFTAIN: "npc.troll_chieftain_grath",
    NAAMRIEL: "npc.naamriel",
    NAAMRIEL_SON: "npc.naamriel_son_cleansed",
    ZURIEL: "npc.zuriel_lore_keeper",
    GUARD_CAPTAIN: "npc.guard_captain",
    NEPHILIM_RULER: "npc.nephilim_child_ruler",
    WATCHER_BOSS: "npc.watcher_boss",
  });

  const ENEMIES = Object.freeze({
    WOLF: "enemy.wolf",
    BEAR: "enemy.bear",
    CULTIST: "enemy.cultist",
    CULT_LEADER: "enemy.cult_leader",
    STITCHED: "enemy.stitched_monster",
    TROLL: "enemy.troll",
    CITY_SOLDIER: "enemy.city_soldier",
    CITY_ELITE: "enemy.city_elite",
    RUIN_GUARDIAN: "enemy.ruin_guardian",
  });

  const ITEMS = Object.freeze({
    BEAR_HIDE: "item.bear_hide",
    WOLF_FANG: "item.wolf_fang",
    ABYSSTONE_RAW: "item.abyssstone_raw",     // aka Vyre shards
    ABYSSTONE_CORE: "item.abyssstone_core",   // refined core (optional later)
    ZURIEL_WARD: "item.zuriel_ward",
    NAAMRIEL_CHARM: "item.naamriel_charm",
    HUNTER_TOKEN: "item.hunter_token",
    CITY_PASS: "item.city_pass",
    TROPHY_GRATH: "item.grath_trophy",
    SEVERING_FRAGMENT: "item.severing_fragment",
  });

  const PUZZLES = Object.freeze({
    MEGALITH_ALIGN: "puzzle.megalith_align_braziers",
    RUIN_CLEANSING: "puzzle.ruin_cleansing",
  });

  const ENCOUNTERS = Object.freeze({
    TROLL_DUEL: "encounter.troll_duel_grath",
    CITY_AMBUSH_ARMY: "encounter.city_army_ambush",
    NEPHILIM_BOSS: "encounter.nephilim_child_boss",
    WATCHER_BOSS: "encounter.watcher_inner_chambers",
  });

  const CUTSCENES = Object.freeze({
    ENOCH_1_GROVE_EDGE: "cutscene.enoch_appearance_1",
    ENOCH_2_HUNT_RETURN: "cutscene.enoch_appearance_2",
    ENOCH_3_ABYSSTONE: "cutscene.enoch_appearance_3",
    ENOCH_4_CITY_OVERLOOK: "cutscene.enoch_appearance_4",
    ENOCH_5_CASTING: "cutscene.enoch_appearance_5",
    DIVINE_COUNCIL_SUMMONS: "cutscene.divine_council_summons",
  });

  const WORLD_FLAGS = Object.freeze({
    MARKER_HUNTERS_CABIN: "world.marker.hunters_cabin",
    MARKER_TROLL_CAMP: "world.marker.troll_camp",
    MARKER_NAAMRIEL_HUT: "world.marker.naamriel_hut",
    MARKER_CORRUPTED_SITE: "world.marker.corrupted_site",
    MARKER_SLAVE_MINE: "world.marker.slave_mine",
    MARKER_HOLY_SITE: "world.marker.holy_site",
    MARKER_CITY_OVERLOOK: "world.marker.city_overlook",
    MARKER_CITY_ACCESS: "world.marker.city_access",
    MARKER_MEGALITH_RUINS: "world.marker.megalith_ruins",

    TROLLS_NEUTRAL: "world.faction.trolls_neutral",
    CITY_PASS_GRANTED: "world.city_pass_granted",
    ENEMY_OF_CITY: "world.enemy_of_city",
    ABYSSTONE_TAINT: "world.status.abyssstone_taint",
    SPIRIT_SIGHT: "world.status.spirit_sight",
  });

  /* =========================
        Enoch Dialogues
     (5 total appearances)
  ========================== */

  const ENOCH_APPEARANCES = Object.freeze({
    A1_GROVE_EDGE: {
      id: "enoch.appearance.1",
      cutsceneId: CUTSCENES.ENOCH_1_GROVE_EDGE,
      title: "The Grove Boundary",
      lines: [
        "Brother… do not mistake silence for safety.",
        "The world did not heal when I was taken. It only learned to hide its wounds.",
        "Go west—where men still hunt with honest fear. Earn their trust. Learn what lives in the dark.",
        "I will not carry you. I will point. You must walk.",
      ],
    },
    A2_HUNT_RETURN: {
      id: "enoch.appearance.2",
      cutsceneId: CUTSCENES.ENOCH_2_HUNT_RETURN,
      title: "Trophies on the Table",
      lines: [
        "Blood answers blood. But be careful—killing can become a prayer to the wrong god.",
        "Take only what you must. Leave the rest to the earth.",
        "The next trial is not teeth or claw… it is pride.",
      ],
    },
    A3_ABYSSTONE_TAKEN: {
      id: "enoch.appearance.3",
      cutsceneId: CUTSCENES.ENOCH_3_ABYSSTONE,
      title: "The Stone That Learns",
      lines: [
        "Stop.",
        "That stone remembers. It listens. It repeats.",
        "It will try to learn your name the way a mouth learns flesh.",
        "Do not speak your true self in its presence. Carry it quickly. Wash it from you.",
      ],
    },
    A4_CITY_OVERLOOK: {
      id: "enoch.appearance.4",
      cutsceneId: CUTSCENES.ENOCH_4_CITY_OVERLOOK,
      title: "The City of Counting",
      lines: [
        "Behold Khar-Mazûn—order built from fear, measured in tribute.",
        "Count what they forbid. Count what they hide. Count the faces that never look up.",
        "Go in as one who sees. Not as one who strikes.",
      ],
    },
    A5_WATCHER_CASTING: {
      id: "enoch.appearance.5",
      cutsceneId: CUTSCENES.ENOCH_5_CASTING,
      title: "The Casting",
      lines: [
        "You have done what mortals should not be able to do.",
        "Watcher—your reign is ended. Your theft is named. Your claim is broken.",
        "By the decree above the stars, return to the Abyss you chose.",
        "Brother… you are summoned. The Council calls what the earth cannot judge.",
      ],
    },
  });

  /* =========================
        Quest Definitions
  ========================== */

  // Helper: objective templates
  function ObjVisit(zoneId, journal, opts = {}) {
    return {
      type: "VISIT_ZONE",
      zoneId,
      count: 1,
      progress: 0,
      required: true,
      ...opts,
      journal,
    };
  }
  function ObjTalk(npcId, journal, opts = {}) {
    return {
      type: "TALK_NPC",
      npcId,
      count: 1,
      progress: 0,
      required: true,
      ...opts,
      journal,
    };
  }
  function ObjKill(enemyType, count, journal, opts = {}) {
    return {
      type: "KILL_ENEMY",
      enemyType,
      count,
      progress: 0,
      required: true,
      ...opts,
      journal,
    };
  }
  function ObjDestroy(objectType, count, journal, opts = {}) {
    return {
      type: "DESTROY_OBJECT",
      objectType,
      count,
      progress: 0,
      required: true,
      ...opts,
      journal,
    };
  }
  function ObjPickup(itemId, qty, journal, opts = {}) {
    return {
      type: "PICKUP_ITEM",
      itemId,
      count: qty,
      progress: 0,
      required: true,
      ...opts,
      journal,
    };
  }
  function ObjPuzzle(puzzleId, journal, opts = {}) {
    return {
      type: "COMPLETE_PUZZLE",
      puzzleId,
      count: 1,
      progress: 0,
      required: true,
      ...opts,
      journal,
    };
  }
  function ObjEncounter(encounterId, journal, opts = {}) {
    return {
      type: "CLEAR_ENCOUNTER",
      encounterId,
      count: 1,
      progress: 0,
      required: true,
      ...opts,
      journal,
    };
  }
  function ObjCutscene(cutsceneId, journal, opts = {}) {
    return {
      type: "CUTSCENE_DONE",
      cutsceneId,
      count: 1,
      progress: 0,
      required: true,
      ...opts,
      journal,
    };
  }

  const QUESTS = Object.freeze([
    /* MAIN 01 */
{
  id: "main.01_ash_of_the_empty_grove",
  title: "Ash of the Empty Grove",
  summary:
    "You awaken in the Ash Grove. Enoch presses against your soul—guiding you toward the hunters.",
  giver: NPCS.ENOCH,
  startZone: ZONES.EMPTY_GROVE,
  markersOnStart: [WORLD_FLAGS.MARKER_HUNTERS_CABIN],
  objectives: [
    ObjTalk(NPCS.ENOCH, "Speak with Enoch in the Ash Grove."),
  ],
  onComplete: {
    grantFlags: [WORLD_FLAGS.MARKER_HUNTERS_CABIN],
    grantItems: [],
    grantStatus: [{ flag: "passive.enoch_oath_minor", value: true }],
  },
  next: "main.02_the_cabin_of_teeth",
},

    /* MAIN 02 */
    {
      id: "main.02_the_cabin_of_teeth",
      title: "The Cabin of Teeth",
      summary:
        "The hunters will not trust a stranger with sacred blood. Prove you can fight, track, and return alive.",
      giver: NPCS.HUNTER_LEAD,
      startZone: ZONES.HUNTERS_CABIN,
      markersOnStart: [],
      objectives: [
        ObjVisit(ZONES.HUNTERS_CABIN, "Reach the Hunter’s Cabin."),
        ObjTalk(NPCS.HUNTER_LEAD, "Speak to the hunter lead. Ask for work."),
      ],
      onComplete: {
        grantItems: [ITEMS.HUNTER_TOKEN],
      },
      next: "main.03_hide_and_hunger",
    },

    /* MAIN 03 */
    {
      id: "main.03_hide_and_hunger",
      title: "Hide and Hunger",
      summary:
        "A test of blood and restraint: slay a bear and five wolves, and return with proof.",
      giver: NPCS.HUNTER_LEAD,
      startZone: ZONES.HUNTERS_CABIN,
      objectives: [
        ObjKill(ENEMIES.BEAR, 1, "Defeat a bear."),
        ObjKill(ENEMIES.WOLF, 5, "Defeat five wolves."),
        // Optional proof items — you can enforce if your loot system supports it:
        ObjPickup(ITEMS.BEAR_HIDE, 1, "Collect the bear hide (proof).", { optional: true, required: false }),
        ObjPickup(ITEMS.WOLF_FANG, 5, "Collect five wolf fangs (proof).", { optional: true, required: false }),
        ObjTalk(NPCS.HUNTER_LEAD, "Return to the hunters with proof of the hunt."),
        ObjCutscene(CUTSCENES.ENOCH_2_HUNT_RETURN, "Enoch speaks a warning over your trophies."),
      ],
      onComplete: {
        grantFlags: [WORLD_FLAGS.MARKER_TROLL_CAMP],
        grantItems: [],
      },
      next: "main.04_to_the_bonefires",
    },

    /* MAIN 04 */
    {
      id: "main.04_to_the_bonefires",
      title: "To the Bonefires",
      summary:
        "The hunters point you north. Trolls gather beneath smoke that never thins. Their chieftain demands a trial.",
      giver: NPCS.HUNTER_LEAD,
      startZone: ZONES.HUNTERS_CABIN,
      objectives: [
        ObjVisit(ZONES.TROLL_CAMP, "Reach the Troll Camp."),
      ],
      onComplete: {
        // No rewards—sets up duel
      },
      next: "main.05_trial_of_the_chieftain",
    },

    /* MAIN 05 */
    {
      id: "main.05_trial_of_the_chieftain",
      title: "Trial of the Chieftain",
      summary:
        "Grath One-Tusk challenges you. Win, and the trolls will recognize your strength. Lose, and you become another story around the fire.",
      giver: NPCS.TROLL_CHIEFTAIN,
      startZone: ZONES.TROLL_CAMP,
      objectives: [
        ObjTalk(NPCS.TROLL_CHIEFTAIN, "Face the chieftain. Accept the duel."),
        ObjEncounter(ENCOUNTERS.TROLL_DUEL, "Defeat Grath in ritual combat."),
        ObjTalk(NPCS.TROLL_CHIEFTAIN, "Receive the chieftain’s judgment."),
      ],
      onComplete: {
        grantFlags: [WORLD_FLAGS.TROLLS_NEUTRAL, WORLD_FLAGS.MARKER_NAAMRIEL_HUT],
        grantItems: [ITEMS.TROPHY_GRATH],
      },
      next: "main.06_the_witch_of_the_boundary",
    },

    /* MAIN 06 */
    {
      id: "main.06_the_witch_of_the_boundary",
      title: "The Witch of the Boundary",
      summary:
        "Naamriel lives where the corrupt hesitate. She listens, tests you, and then names your first true work: cleansing.",
      giver: NPCS.NAAMRIEL,
      startZone: ZONES.NAAMRIEL_HUT,
      objectives: [
        ObjVisit(ZONES.NAAMRIEL_HUT, "Find Naamriel’s hut at the map’s heart."),
        ObjTalk(NPCS.NAAMRIEL, "Speak with Naamriel. Hear the task she sets."),
      ],
      onComplete: {
        grantFlags: [WORLD_FLAGS.MARKER_CORRUPTED_SITE],
        grantItems: [ITEMS.NAAMRIEL_CHARM],
      },
      next: "main.07_scour_the_blight",
    },

    /* MAIN 07 */
    {
      id: "main.07_scour_the_blight",
      title: "Scour the Blight",
      summary:
        "Cultists keep an outer lab alive. Burn their altars, break their chains, and ruin their work.",
      giver: NPCS.NAAMRIEL,
      startZone: ZONES.NAAMRIEL_HUT,
      objectives: [
        ObjVisit(ZONES.CORRUPTED_SITE, "Travel to the Corrupted Site."),
        ObjDestroy("object.corruption_altar", 3, "Destroy three corruption altars."),
        ObjKill(ENEMIES.CULT_LEADER, 1, "Defeat the cult overseer."),
        // Optional: free a captive
        {
          type: "FREE_CAPTIVE",
          count: 1,
          progress: 0,
          required: false,
          optional: true,
          journal: "Optional: Free at least one captive.",
        },
        ObjTalk(NPCS.NAAMRIEL, "Return to Naamriel and report what you found."),
      ],
      onComplete: {
        grantFlags: [WORLD_FLAGS.MARKER_SLAVE_MINE],
      },
      next: "main.08_stone_that_remembers",
    },

    /* MAIN 08 */
    {
      id: "main.08_stone_that_remembers",
      title: "Stone That Remembers",
      summary:
        "Naamriel needs Abyssstone (Vyre) to prove the city’s methods and counter its influence. Taking it marks you.",
      giver: NPCS.NAAMRIEL,
      startZone: ZONES.NAAMRIEL_HUT,
      objectives: [
        ObjVisit(ZONES.SLAVE_MINE, "Reach the slave mine in the northwest."),
        ObjPickup(ITEMS.ABYSSTONE_RAW, 3, "Acquire Vyre shards (Abyssstone)."),
        ObjCutscene(CUTSCENES.ENOCH_3_ABYSSTONE, "Enoch warns you: the stone learns."),
        ObjTalk(NPCS.NAAMRIEL, "Return to Naamriel with the stone."),
      ],
      onComplete: {
        grantFlags: [WORLD_FLAGS.ABYSSTONE_TAINT, WORLD_FLAGS.MARKER_HOLY_SITE],
        grantStatus: [{ flag: WORLD_FLAGS.ABYSSTONE_TAINT, value: true }],
      },
      next: "main.09_wash_in_living_memory",
    },

    /* MAIN 09 */
    {
      id: "main.09_wash_in_living_memory",
      title: "Wash in Living Memory",
      summary:
        "The Abyssstone clings to you. Zuriel must cleanse what the stone tried to carve into your spirit.",
      giver: NPCS.NAAMRIEL,
      startZone: ZONES.NAAMRIEL_HUT,
      objectives: [
        ObjVisit(ZONES.HOLY_SITE, "Go to Zuriel at the Holy Site."),
        ObjTalk(NPCS.ZURIEL, "Speak to Zuriel. Submit to cleansing."),
        {
          type: "PERFORM_RITE",
          riteId: "rite.zuriel_cleansing",
          count: 1,
          progress: 0,
          required: true,
          journal: "Complete Zuriel’s cleansing rite.",
        },
      ],
      onComplete: {
        grantStatus: [{ flag: WORLD_FLAGS.ABYSSTONE_TAINT, value: false }],
        grantItems: [ITEMS.ZURIEL_WARD],
        grantFlags: [WORLD_FLAGS.MARKER_CITY_OVERLOOK],
      },
      next: "main.10_eyes_on_khar_mazun",
    },

    /* MAIN 10 */
    {
      id: "main.10_eyes_on_khar_mazun",
      title: "Eyes on Khar-Mazûn",
      summary:
        "Zuriel forbids violence—your task is to look upon the city and learn its shape, not to strike.",
      giver: NPCS.ZURIEL,
      startZone: ZONES.HOLY_SITE,
      objectives: [
        ObjVisit(ZONES.CITY_OVERLOOK, "Approach the city overlook."),
        ObjCutscene(CUTSCENES.ENOCH_4_CITY_OVERLOOK, "Enoch teaches you to see what’s hidden."),
        {
          type: "NO_HOSTILE_ACTIONS_IN_ZONE",
          zoneId: ZONES.CITY_OVERLOOK,
          count: 1,
          progress: 0,
          required: true,
          journal: "Do not engage any enemies here—leave unseen.",
        },
      ],
      onComplete: {
        grantFlags: [WORLD_FLAGS.MARKER_CITY_ACCESS],
      },
      next: "main.11_the_captains_request",
    },

    /* MAIN 11 */
    {
      id: "main.11_the_captains_request",
      title: "The Captain’s Request",
      summary:
        "Inside the city, a guard captain offers you a task: cleanse the ancient ruins. A practical request… or a test.",
      giver: NPCS.GUARD_CAPTAIN,
      startZone: ZONES.CITY_OUTER,
      objectives: [
        ObjVisit(ZONES.CITY_OUTER, "Enter the city’s outer district."),
        ObjTalk(NPCS.GUARD_CAPTAIN, "Meet the guard captain."),
      ],
      onComplete: {
        grantFlags: [WORLD_FLAGS.MARKER_MEGALITH_RUINS],
        grantItems: [ITEMS.CITY_PASS], // limited pass
        grantFlags2: [WORLD_FLAGS.CITY_PASS_GRANTED],
      },
      next: "main.12_megaliths_of_the_old_defense",
    },

    /* MAIN 12 */
    {
      id: "main.12_megaliths_of_the_old_defense",
      title: "Megaliths of the Old Defense",
      summary:
        "Cyclopean stones and old wards. Something stirs there that should remain asleep.",
      giver: NPCS.GUARD_CAPTAIN,
      startZone: ZONES.CITY_OUTER,
      objectives: [
        ObjVisit(ZONES.MEGALITH_RUINS, "Travel to the megalithic ruins."),
        ObjKill(ENEMIES.RUIN_GUARDIAN, 1, "Defeat the ruins’ guardian threat."),
        ObjPuzzle(PUZZLES.RUIN_CLEANSING, "Complete the cleansing pattern among the stones."),
        ObjTalk(NPCS.GUARD_CAPTAIN, "Return to the guard captain with proof."),
      ],
      onComplete: {
        grantItems: [ITEMS.SEVERING_FRAGMENT],
      },
      next: "main.13_back_to_the_witch",
    },

    /* MAIN 13 */
    {
      id: "main.13_back_to_the_witch",
      title: "Back to the Witch",
      summary:
        "Naamriel needs to know what the city is building and why the ruins mattered. The pieces are aligning.",
      giver: NPCS.NAAMRIEL,
      startZone: ZONES.NAAMRIEL_HUT,
      objectives: [
        ObjTalk(NPCS.NAAMRIEL, "Return to Naamriel. Tell her what you learned in the city and ruins."),
      ],
      onComplete: {
        // This is the moral pivot: “break the chain”
        grantFlags: [WORLD_FLAGS.MARKER_SLAVE_MINE],
      },
      next: "main.14_break_the_chain",
    },

    /* MAIN 14 */
    {
      id: "main.14_break_the_chain",
      title: "Break the Chain",
      summary:
        "Free the slaves. This act will make you an enemy of Khar-Mazûn. There is no return to quiet life after this.",
      giver: NPCS.NAAMRIEL,
      startZone: ZONES.NAAMRIEL_HUT,
      objectives: [
        ObjVisit(ZONES.SLAVE_MINE, "Return to the mine."),
        {
          type: "FREE_SLAVES",
          count: 8,
          progress: 0,
          required: true,
          journal: "Free the slaves (at least 8).",
        },
        {
          type: "SABOTAGE_MINE",
          count: 1,
          progress: 0,
          required: true,
          journal: "Sabotage the Abyssstone lift or refinery to slow the city.",
        },
      ],
      onComplete: {
        grantFlags: [WORLD_FLAGS.ENEMY_OF_CITY],
      },
      next: "main.15_the_hunt_comes",
    },

    /* MAIN 15 */
    {
      id: "main.15_the_hunt_comes",
      title: "The Hunt Comes",
      summary:
        "The city responds with steel. Naamriel and her cleansed son stand with you. Survive the hunting force.",
      giver: NPCS.NAAMRIEL,
      startZone: ZONES.NAAMRIEL_HUT,
      objectives: [
        ObjEncounter(ENCOUNTERS.CITY_AMBUSH_ARMY, "Defeat the city’s hunting force."),
        ObjTalk(NPCS.NAAMRIEL, "Regroup with Naamriel after the battle."),
      ],
      onComplete: {
        grantFlags: [WORLD_FLAGS.SPIRIT_SIGHT],
        grantStatus: [{ flag: WORLD_FLAGS.SPIRIT_SIGHT, value: true }],
      },
      next: "main.16_throne_of_borrowed_blood",
    },

    /* MAIN 16 */
    {
      id: "main.16_throne_of_borrowed_blood",
      title: "Throne of Borrowed Blood",
      summary:
        "Return to Khar-Mazûn. The child-king’s rule ends tonight—by mercy or by blade.",
      giver: NPCS.NAAMRIEL,
      startZone: ZONES.CITY_INNER,
      objectives: [
        ObjVisit(ZONES.CITY_INNER, "Enter the city’s inner district."),
        ObjEncounter(ENCOUNTERS.NEPHILIM_BOSS, "Defeat the Nephilim ruler."),
      ],
      onComplete: {
        // Opens inner chambers
      },
      next: "main.17_inner_chambers",
    },

    /* MAIN 17 */
    {
      id: "main.17_inner_chambers",
      title: "Inner Chambers",
      summary:
        "Beneath the temple-palace, the true master waits. Defeat the Watcher, and the age turns.",
      giver: NPCS.ZURIEL,
      startZone: ZONES.CITY_INNER,
      objectives: [
        ObjEncounter(ENCOUNTERS.WATCHER_BOSS, "Defeat the Watcher in the inner chambers."),
        ObjCutscene(CUTSCENES.ENOCH_5_CASTING, "Enoch casts the Watcher to the Abyss."),
        ObjCutscene(CUTSCENES.DIVINE_COUNCIL_SUMMONS, "You are summoned before the Divine Council."),
      ],
      onComplete: {
        grantStatus: [{ flag: "story.chapter1.complete", value: true }],
      },
      next: null,
    },
  ]);

  const QUEST_INDEX = Object.freeze(
    QUESTS.reduce((acc, q) => {
      acc[q.id] = q;
      return acc;
    }, {})
  );

  /* =========================
         State + Storage
  ========================== */

  const STORAGE_KEY = (()=>{
  let slot="slot1";
  try{ slot = localStorage.getItem("np_active_save_slot") || "slot1"; }catch(_){ slot="slot1"; }
  return "nephilim_main_story_state_v1__" + slot;
})();

  function deepClone(obj) {
    return JSON.parse(JSON.stringify(obj));
  }

  function defaultState() {
    return {
      version: 1,
      activeQuestId: QUESTS[0].id,
      completed: {},          // questId -> true
      flags: {},              // world flags & statuses
      inventory: {},          // itemId -> qty (optional; if you already have your own inventory, you can ignore)
      killCounts: {},         // enemyType -> count
      objectDestroyed: {},    // objectType -> count
      puzzlesDone: {},        // puzzleId -> true
      encountersCleared: {},  // encounterId -> true
      cutscenesDone: {},      // cutsceneId -> true
      lastZoneId: null,
      journal: [],            // chronological log
      meta: {
        startedAt: Date.now(),
        updatedAt: Date.now(),
      },
    };
  }

  function loadState() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return defaultState();
      const parsed = JSON.parse(raw);
      // Minimal migration guard:
      if (!parsed || parsed.version !== 1) return defaultState();
      return parsed;
    } catch (e) {
      return defaultState();
    }
  }

  function saveState(state) {
    state.meta.updatedAt = Date.now();
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  }

  /* =========================
       Quest Runtime Engine
  ========================== */

  function isObjectiveComplete(obj) {
    return (obj.progress || 0) >= (obj.count || 1);
  }

  function allRequiredObjectivesComplete(quest) {
    return quest.objectives
      .filter((o) => o.required !== false)
      .every((o) => isObjectiveComplete(o));
  }

  function getActiveQuest(state) {
    return QUEST_INDEX[state.activeQuestId] || null;
  }

  function ensureQuestProgressShape(state) {
    const q = getActiveQuest(state);
    if (!q) return;

    // Create a per-quest progress cache in-state so we don’t mutate the frozen QUESTS objects.
    if (!state._questProgress) state._questProgress = {};
    if (!state._questProgress[q.id]) {
      state._questProgress[q.id] = q.objectives.map((o) => ({
        progress: 0,
      }));
    }
  }

  function readObjProgress(state, quest, idx) {
    ensureQuestProgressShape(state);
    const p = state._questProgress?.[quest.id]?.[idx]?.progress;
    return typeof p === "number" ? p : 0;
  }

  function writeObjProgress(state, quest, idx, value) {
    ensureQuestProgressShape(state);
    state._questProgress[quest.id][idx].progress = Math.max(0, value | 0);
  }

  function log(state, text) {
    state.journal.push({ t: Date.now(), text });
  }

  function grantFlag(state, flag, value = true) {
    state.flags[flag] = value;
  }

  function grantItem(state, itemId, qty = 1) {
    state.inventory[itemId] = (state.inventory[itemId] || 0) + qty;
  }

  function setStatus(state, flag, value) {
    state.flags[flag] = value;
  }

  function applyQuestCompletionRewards(state, quest) {
    const oc = quest.onComplete || {};
    (oc.grantFlags || []).forEach((f) => grantFlag(state, f, true));
    (oc.grantFlags2 || []).forEach((f) => grantFlag(state, f, true)); // optional extra
    (oc.grantItems || []).forEach((it) => grantItem(state, it, 1));
    (oc.grantStatus || []).forEach((s) => setStatus(state, s.flag, s.value));

    // Markers at start can also be set if desired:
    (quest.markersOnStart || []).forEach((f) => grantFlag(state, f, true));
  }

  function completeQuest(state, quest) {
    state.completed[quest.id] = true;
    log(state, `Quest completed: ${quest.title}`);

    applyQuestCompletionRewards(state, quest);

    if (quest.next) {
      state.activeQuestId = quest.next;
      const nq = QUEST_INDEX[quest.next];
      if (nq) {
        log(state, `New quest: ${nq.title}`);
        // Auto-grant any markers on new quest start
        (nq.markersOnStart || []).forEach((f) => grantFlag(state, f, true));
      }
    }
  }

  function tryAdvance(state) {
    const quest = getActiveQuest(state);
    if (!quest) return false;

    // Evaluate objective completion from state progress cache + quest objective requirements
    let requiredComplete = true;

    quest.objectives.forEach((obj, idx) => {
      const progress = readObjProgress(state, quest, idx);
      const count = obj.count || 1;

      // Clone-like computed:
      const done = progress >= count;

      if (obj.required !== false && !done) requiredComplete = false;
    });

    if (requiredComplete) {
      completeQuest(state, quest);
      return true;
    }
    return false;
  }

  /* =========================
        Objective Matching
  ========================== */

  function handleEvent(state, eventName, payload = {}) {
    const quest = getActiveQuest(state);
    if (!quest) return;

    quest.objectives.forEach((obj, idx) => {
      const progress = readObjProgress(state, quest, idx);
      const target = obj.count || 1;

      if (progress >= target) return; // already complete

      // Objective types:
      switch (obj.type) {
        case "VISIT_ZONE":
          if (eventName === "ENTER_ZONE" && payload.zoneId === obj.zoneId) {
            writeObjProgress(state, quest, idx, target);
            log(state, `Objective complete: ${obj.journal}`);
          }
          break;

        case "TRIGGER_ON_LEAVE_ZONE":
          if (eventName === "LEAVE_ZONE" && payload.zoneId === obj.zoneId) {
            writeObjProgress(state, quest, idx, target);
            log(state, `Objective complete: ${obj.journal}`);
          }
          break;

        case "TALK_NPC":
          if (eventName === "TALK_NPC" && payload.npcId === obj.npcId) {
            writeObjProgress(state, quest, idx, target);
            log(state, `Objective complete: ${obj.journal}`);
          }
          break;

        case "KILL_ENEMY":
          if (eventName === "KILL_ENEMY" && payload.enemyType === obj.enemyType) {
            const add = Math.max(1, payload.count || 1);
            writeObjProgress(state, quest, idx, Math.min(target, progress + add));
            if (readObjProgress(state, quest, idx) >= target) {
              log(state, `Objective complete: ${obj.journal}`);
            }
          }
          break;

        case "DESTROY_OBJECT":
          if (eventName === "DESTROY_OBJECT" && payload.objectType === obj.objectType) {
            writeObjProgress(state, quest, idx, Math.min(target, progress + 1));
            if (readObjProgress(state, quest, idx) >= target) {
              log(state, `Objective complete: ${obj.journal}`);
            }
          }
          break;

        case "PICKUP_ITEM":
          if (eventName === "PICKUP_ITEM" && payload.itemId === obj.itemId) {
            const add = Math.max(1, payload.qty || 1);
            writeObjProgress(state, quest, idx, Math.min(target, progress + add));
            if (readObjProgress(state, quest, idx) >= target) {
              log(state, `Objective complete: ${obj.journal}`);
            }
          }
          break;

        case "COMPLETE_PUZZLE":
          if (eventName === "COMPLETE_PUZZLE" && payload.puzzleId === obj.puzzleId) {
            writeObjProgress(state, quest, idx, target);
            log(state, `Objective complete: ${obj.journal}`);
          }
          break;

        case "CLEAR_ENCOUNTER":
          if (eventName === "CLEAR_ENCOUNTER" && payload.encounterId === obj.encounterId) {
            writeObjProgress(state, quest, idx, target);
            log(state, `Objective complete: ${obj.journal}`);
          }
          break;

        case "CUTSCENE_DONE":
          if (eventName === "CUTSCENE_DONE" && payload.cutsceneId === obj.cutsceneId) {
            writeObjProgress(state, quest, idx, target);
            log(state, `Objective complete: ${obj.journal}`);
          }
          break;

        case "PERFORM_RITE":
          if (eventName === "PERFORM_RITE" && payload.riteId === obj.riteId) {
            writeObjProgress(state, quest, idx, target);
            log(state, `Objective complete: ${obj.journal}`);
          }
          break;

        case "NO_HOSTILE_ACTIONS_IN_ZONE":
          // This should be enforced by your engine; we treat it as “complete when leaving zone clean.”
          // You can emit: emit("NO_HOSTILE_ACTIONS_PASSED", { zoneId })
          if (eventName === "NO_HOSTILE_ACTIONS_PASSED" && payload.zoneId === obj.zoneId) {
            writeObjProgress(state, quest, idx, target);
            log(state, `Objective complete: ${obj.journal}`);
          }
          break;

        case "FREE_CAPTIVE":
          if (eventName === "FREE_CAPTIVE") {
            writeObjProgress(state, quest, idx, Math.min(target, progress + 1));
            if (readObjProgress(state, quest, idx) >= target) {
              log(state, `Objective complete: ${obj.journal}`);
            }
          }
          break;

        case "FREE_SLAVES":
          if (eventName === "FREE_SLAVES") {
            const add = Math.max(1, payload.count || 1);
            writeObjProgress(state, quest, idx, Math.min(target, progress + add));
            if (readObjProgress(state, quest, idx) >= target) {
              log(state, `Objective complete: ${obj.journal}`);
            }
          }
          break;

        case "SABOTAGE_MINE":
          if (eventName === "SABOTAGE_MINE") {
            writeObjProgress(state, quest, idx, target);
            log(state, `Objective complete: ${obj.journal}`);
          }
          break;

        default:
          break;
      }
    });
  }

  /* =========================
       Public API / Helpers
  ========================== */

  const API = {
    // constants
    ZONES,
    NPCS,
    ENEMIES,
    ITEMS,
    PUZZLES,
    ENCOUNTERS,
    CUTSCENES,
    WORLD_FLAGS,
    ENOCH_APPEARANCES,

    // runtime
    _state: null,

    init() {
      this._state = loadState();
      // Ensure active quest is valid
      if (!QUEST_INDEX[this._state.activeQuestId]) {
        this._state = defaultState();
      }

      // Start journal if empty
      if (!this._state.journal || !this._state.journal.length) {
        const q = QUEST_INDEX[this._state.activeQuestId];
        if (q) log(this._state, `New quest: ${q.title}`);
      }

      // Auto grant markers on active quest start
      const aq = getActiveQuest(this._state);
      if (aq) (aq.markersOnStart || []).forEach((f) => grantFlag(this._state, f, true));

      saveState(this._state);
      return this.getState();
    },

    resetAllProgress() {
      this._state = defaultState();
      saveState(this._state);
      return this.getState();
    },

    getState() {
      return deepClone(this._state || defaultState());
    },

    getActiveQuest() {
      const s = this._state || defaultState();
      const q = QUEST_INDEX[s.activeQuestId];
      if (!q) return null;

      // Return a computed quest view with objective progress included:
      const view = deepClone(q);
      view.objectives = q.objectives.map((obj, idx) => {
        const o = deepClone(obj);
        o.progress = readObjProgress(s, q, idx);
        o.isComplete = o.progress >= (o.count || 1);
        return o;
      });
      view.isComplete = allRequiredObjectivesComplete(view);
      return view;
    },

    getQuestById(questId) {
      return QUEST_INDEX[questId] ? deepClone(QUEST_INDEX[questId]) : null;
    },

    getAllQuests() {
      return QUESTS.map((q) => deepClone(q));
    },

    hasFlag(flag) {
      return !!(this._state && this._state.flags && this._state.flags[flag]);
    },

    emit(eventName, payload = {}) {
      if (!this._state) this.init();

      // Track last zone for convenience
      if (eventName === "ENTER_ZONE") this._state.lastZoneId = payload.zoneId || null;

      // Update objective progress
      handleEvent(this._state, eventName, payload);

      // Attempt quest advancement (may chain multiple quests if objectives were auto-completed)
      let advanced = false;
      // Prevent infinite loops—max 5 quest auto-advances in one event
      for (let i = 0; i < 5; i++) {
        const did = tryAdvance(this._state);
        if (!did) break;
        advanced = true;
      }

      saveState(this._state);

      return {
        advanced,
        activeQuest: this.getActiveQuest(),
        flags: deepClone(this._state.flags),
      };
    },

    // Convenience wrappers (optional)
    enterZone(zoneId) { return this.emit("ENTER_ZONE", { zoneId }); },
    leaveZone(zoneId) { return this.emit("LEAVE_ZONE", { zoneId }); },
    talk(npcId) { return this.emit("TALK_NPC", { npcId }); },
    kill(enemyType, count = 1) { return this.emit("KILL_ENEMY", { enemyType, count }); },
    destroy(objectType, objectId = null) { return this.emit("DESTROY_OBJECT", { objectType, objectId }); },
    pickup(itemId, qty = 1) { return this.emit("PICKUP_ITEM", { itemId, qty }); },
    completePuzzle(puzzleId) { return this.emit("COMPLETE_PUZZLE", { puzzleId }); },
    clearEncounter(encounterId) { return this.emit("CLEAR_ENCOUNTER", { encounterId }); },
    cutsceneDone(cutsceneId) { return this.emit("CUTSCENE_DONE", { cutsceneId }); },

    // Useful for UI: quest log/journal
    getJournal(limit = 50) {
      if (!this._state) this.init();
      const j = this._state.journal || [];
      return deepClone(j.slice(Math.max(0, j.length - limit)));
    },
  };

  // Expose to window
  window.MainStoryQuestSystem = API;

  /* =========================
     Optional: Auto-init
     Comment out if you prefer manual init.
  ========================== */
  // API.init();

})();
