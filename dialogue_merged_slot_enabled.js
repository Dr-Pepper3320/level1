/* dialogue_merged.js
   Combined file:
     - dialogue_runner_v2.js
     - dialogue_naamriel.js
     - dialogue_zuriel.js
     - dialogue_enoch.js
     - dialogue_hunter.js

   Purpose: reduce <script> tags + keep existing global names intact.
   Notes:
     - Runner expects datasets on window.DIALOGUE_<KEY> (uppercase).
     - We keep those globals exactly, so no other code needs to change.
*/



/* ===== dialogue_runner_v2.js ===== */

/* dialogue_runner.js (v2)
   Scripted dialogue runner (node types: npc | choice | set | gate | end)
   Supports multiple NPC data files:
     - window.DIALOGUE_NAAMRIEL
     - window.DIALOGUE_ZURIEL
   Requires:
     - level1.html exposes window.DLG_API (addLine, setDialogControls, openDialog, closeDialog, ui, etc.)
*/

(function(){
  "use strict";

  const API = () => (window.DLG_API || null);

  const scripted = {
    active: false,
    data: null,
    conv: null,
    convoId: null,
    nodeId: null,
    stack: [],
    state: { flags: {} },
    _stateKey: "dlg_scripted_state_v2"
  };

  function stateKeyFor(data){
    const id = (data && data.npcId) ? String(data.npcId) : "global";
    let slot="slot1";
    try{ slot = localStorage.getItem("np_active_save_slot") || "slot1"; }catch(_){ slot="slot1"; }
    return "dlg_scripted_state_v2__" + slot + "__" + id;
  }

  function loadScriptedState(){
    try{
      const raw = localStorage.getItem(scripted._stateKey);
      if(!raw) return;
      const data = JSON.parse(raw);
      if(data && typeof data === "object") scripted.state = data;
    }catch(_){}
  }

  function saveScriptedState(){
    try{
      localStorage.setItem(scripted._stateKey, JSON.stringify(scripted.state));
    }catch(_){}
  }

  function getInventoryCounts(){
    // Tries to read your game inventory state if it exists
    try{
      if(window.Inventory && typeof Inventory.getCounts === "function") return Inventory.getCounts();
    }catch(_){}
    try{
      if(window.state && window.state.inventoryCounts) return window.state.inventoryCounts;
    }catch(_){}
    return null;
  }

  function getConvoById(data, id){
    const list = (data && data.conversations) ? data.conversations : [];
    return list.find(c => c && c.id === id) || null;
  }

  function getNode(conv, id){
    if(!conv || !conv.nodes) return null;
    return conv.nodes[id] || null;
  }

  // Cross-conversation node lookup (lets choices jump into other convo node sets).
  // If a nodeId isn't found in the current conversation, we search all conversations
  // for a matching nodeId and switch scripted.conv over if found.
  function findConvoForNode(data, nodeId){
    try{
      const list = (data && data.conversations) ? data.conversations : [];
      for(const c of list){
        if(c && c.nodes && c.nodes[nodeId]) return c;
      }
    }catch(_){}
    return null;
  }

  function ensureNodeActive(conv, nodeId){
    let node = getNode(conv, nodeId);
    if(node) return { conv, node, switched:false };

    const c2 = findConvoForNode(scripted.data, nodeId);
    if(c2){
      scripted.conv = c2;
      scripted.convoId = c2.id;
      return { conv:c2, node:getNode(c2, nodeId), switched:true };
    }
    return { conv, node:null, switched:false };
  }

  function evalGate(node){
    const flags = scripted.state.flags || {};
    const inv = getInventoryCounts();

    let ok = true;

    if(node.ifFlag) ok = !!flags[node.ifFlag];
    else if(node.flag) ok = !!flags[node.flag];
    else if(node.notFlag) ok = !flags[node.notFlag];
    else if(node.ifNotFlag) ok = !flags[node.ifNotFlag];
    else if(node.hasItem && inv) ok = (inv[String(node.hasItem)] || 0) > 0;
    else if(node.if && typeof node.if === "object"){
      if(node.if.flag) ok = (flags[node.if.flag] === (node.if.equals ?? true));
      else ok = !!node.if.value;
    }

    const thenId = node.then ?? node.pass ?? node.yes ?? node.trueNext ?? node.nextTrue ?? node.onTrue ?? node.ok;
    const elseId = node.else ?? node.fail ?? node.no ?? node.falseNext ?? node.nextFalse ?? node.onFalse ?? node.notOk;

    return { ok, next: ok ? thenId : elseId, fallback: node.next };
  }

  function applySet(node){
    scripted.state.flags = scripted.state.flags || {};
    if(node.set && typeof node.set === "object"){
      for(const [k,v] of Object.entries(node.set)) scripted.state.flags[k] = v;
    }
    if(node.setFlag){
      scripted.state.flags[String(node.setFlag)] = (node.value ?? true);
    }
    saveScriptedState();
    return node.next;
  }

  function resolveAutoNodes(conv, nodeId){
    let safety = 0;
    while(safety++ < 120){
      const r0 = ensureNodeActive(conv, nodeId);
      conv = r0.conv;
      const node = r0.node;
      if(!node) return nodeId;

      if(node.type === "gate"){
        const r = evalGate(node);
        nodeId = r.next || r.fallback;
        if(!nodeId) return nodeId;
        continue;
      }
      if(node.type === "set"){
        nodeId = applySet(node);
        if(!nodeId) return nodeId;
        continue;
      }
      return nodeId;
    }
    return nodeId;
  }

  function doAction(action, args){
    try{
      switch(String(action||"")){
        case "start_troll_duel": {
          const encounterId = (args && (args.encounterId || args.encounter)) || "encounter.troll_duel_grath";
          const returnUrl = (args && args.returnUrl) || window.location.href;
          const duelUrl = (args && args.url) || "troll_duel_slot_enabled.html";
          try{
            localStorage.setItem("np_duel_return_url_v1", String(returnUrl));
          }catch(_){}
          const url = duelUrl
            + "?return=" + encodeURIComponent(String(returnUrl))
            + "&encounter=" + encodeURIComponent(String(encounterId));
          window.location.href = url;
          return true;
        }

        case "open_level_menu":
          if(window.SkillsUI && typeof SkillsUI.openMenu === "function"){
            SkillsUI.openMenu("training", { fromTrainer:false });
          }else if(window.Progression && typeof Progression.openTrainer === "function"){
            Progression.openTrainer("Zuriel");
          }
          return true;

        case "open_skill_tree":
          if(window.SkillsUI){
            const tree = args && args.treeId ? args.treeId : "sword";
            if(typeof SkillsUI.openTree === "function") SkillsUI.openTree(tree);
            else if(typeof SkillsUI.openMenu === "function") SkillsUI.openMenu("tree", { fromTrainer:false });
          }
          return true;

        case "respec_skills":
          if(window.Progression && typeof Progression.respecSkills === "function"){
            Progression.respecSkills();
          }
          return true;

        default:
          // allow user-defined callbacks: window.DLG_ACTIONS[action]
          if(window.DLG_ACTIONS && typeof window.DLG_ACTIONS[action] === "function"){
            window.DLG_ACTIONS[action](args || {});
            return true;
          }
          return false;
      }
    }catch(_){
      return false;
    }
  }

  function scriptedEnd(){
    scripted.active = false;
    scripted.data = null;
    scripted.conv = null;
    scripted.nodeId = null;
    scripted.convoId = null;
    scripted.stack.length = 0;

    const api = API();
    api?.setDialogControls?.({ mode:"chat" });
  }

  function scriptedRender(){
    const api = API();
    if(!api) return;
    if(!scripted.active || !scripted.conv) return;

    scripted.nodeId = resolveAutoNodes(scripted.conv, scripted.nodeId);
    const r1 = ensureNodeActive(scripted.conv, scripted.nodeId);
    scripted.conv = r1.conv;
    scripted.convoId = r1.conv ? r1.conv.id : scripted.convoId;
    const node = r1.node;

    if(!node){
      api.addLine("SYSTEM", "Dialogue node missing: " + String(scripted.nodeId));
      api.setDialogControls({
        mode:"script",
        buttons:[ { label:"Close", onClick: () => { api.closeDialog(); scriptedEnd(); } } ]
      });
      return;
    }

    if(node.type === "end"){
      api.addLine("SYSTEM", node.text || "End.");
      api.setDialogControls({
        mode:"script",
        buttons:[ { label:"Close", onClick: () => { api.closeDialog(); scriptedEnd(); } } ]
      });
      return;
    }

    if(node.type === "npc"){
      api.addLine(scripted.data?.npcName || "NPC", node.text || "");
      const nextId = node.next;

      const btns = [];
      if(nextId){
        btns.push({
          label:"Continue",
          onClick: () => {
            scripted.stack.push(scripted.nodeId);
            scripted.nodeId = nextId;
            scriptedRender();
          }
        });
      }
      if(scripted.stack.length){
        btns.push({
          label:"Back",
          onClick: () => {
            scripted.nodeId = scripted.stack.pop();
            scriptedRender();
          }
        });
      }
      btns.push({ label:"Close", onClick: () => { api.closeDialog(); scriptedEnd(); } });

      api.setDialogControls({ mode:"script", buttons: btns });
      return;
    }

    if(node.type === "choice"){
      api.addLine(scripted.data?.npcName || "NPC", node.prompt || "");

      const btns = (node.choices || []).map(ch => ({
        label: ch.text || "…",
        onClick: () => {
          scripted.stack.push(scripted.nodeId);

          // optional inline set on choice
          if(ch.set && typeof ch.set === "object"){
            scripted.state.flags = scripted.state.flags || {};
            for(const [k,v] of Object.entries(ch.set)) scripted.state.flags[k] = v;
            saveScriptedState();
          }

          // optional action
          if(ch.action){
            doAction(ch.action, ch.actionArgs || ch.args || {});
          }

          // next node (if provided)
          if(ch.next){
            scripted.nodeId = ch.next;
            scriptedRender();
          }else{
            // if no next, stay on current node
            scripted.nodeId = scripted.nodeId;
            scriptedRender();
          }
        }
      }));

      if(scripted.stack.length){
        btns.push({
          label:"Back",
          onClick: () => {
            scripted.nodeId = scripted.stack.pop();
            scriptedRender();
          }
        });
      }
      btns.push({ label:"Close", onClick: () => { api.closeDialog(); scriptedEnd(); } });

      api.setDialogControls({ mode:"script", buttons: btns });
      return;
    }

    // Default fallback
    api.addLine("SYSTEM", "Unknown dialogue node type: " + String(node.type));
    api.setDialogControls({ mode:"chat" });
  }

  function getDialogueData(npcKeyOrData){
    if(!npcKeyOrData) return window.DIALOGUE_NAAMRIEL || null;
    if(typeof npcKeyOrData === "object") return npcKeyOrData;

    const key = String(npcKeyOrData).toUpperCase().replace(/[^A-Z0-9_]/g, "_");
    const globalName = "DIALOGUE_" + key;
    return window[globalName] || null;
  }

  function start(convoId="first_meeting", npcKeyOrData){
    const api = API();
    if(!api){
      console.warn("DialogueRunner: missing window.DLG_API bridge.");
      return;
    }

    const data = getDialogueData(npcKeyOrData);
    if(!data){
      api.addLine("SYSTEM", "Missing dialogue data for: " + String(npcKeyOrData));
      api.setDialogControls({ mode:"chat" });
      return;
    }

    scripted._stateKey = stateKeyFor(data);
    loadScriptedState();

    // Seed flags if empty
    if(data.defaultState && data.defaultState.flags && Object.keys(scripted.state.flags || {}).length === 0){
      scripted.state.flags = { ...data.defaultState.flags };
      saveScriptedState();
    }

    const conv = getConvoById(data, convoId);
    if(!conv){
      api.addLine("SYSTEM", "Missing conversation: " + String(convoId));
      api.setDialogControls({ mode:"chat" });
      return;
    }

    scripted.active = true;
    scripted.data = data;
    scripted.conv = conv;
    scripted.convoId = conv.id;
    scripted.nodeId = conv.startNode;
    scripted.stack.length = 0;

    api.setDialogControls({ mode:"script", buttons: [] });
    scriptedRender();
  }

  window.DialogueRunner = { start, end: scriptedEnd, _debug: scripted };
})();


/* ===== dialogue_naamriel.js ===== */

/* dialogue_naamriel.js
   Na’amriel dialogue data (pre-Flood) — embedded JS so no fetch needed.

   What’s new vs v1:
   - Real back-and-forth: player can ask “Who are you?”, “Where am I?”, “Why me?”
   - Progression: first meeting must be advanced before “camp topics” unlock.
   - Supports missions: sets flags like "mission_azazel_started"
   - Designed for a node-based runner:
       node.type: "npc" | "choice" | "set" | "gate" | "end"
       node.next: nextNodeId
       choice.choices: [{ text, next, set?:{...} }]
       set.set: {flag:true,...} and then node.next
       gate.ifFlag / ifNotFlag: routes based on state flags

   Usage:
     - Loaded via <script>, access window.DIALOGUE_NAAMRIEL
*/

(function () {
  const DIALOGUE_NAAMRIEL = {
    npcId: "naamriel",
    npcName: "Na’amriel the Ash-Bound",
    version: "2.0",
    setting: "preFlood",
    // optional: suggested NPC slot naming
    devHint: { npcSlot: 28, title: "Na’amriel" },

    // Flags your game should store per-save (localStorage is fine)
    // Your dialogue runner should maintain:
    //   state.flags = {}
    //   state.currentConversationId
    //   state.currentNodeId
    //
    // This file never writes localStorage directly — it just describes what to set.
    defaultState: {
      flags: {
        met_naamriel: false,
        intro_complete: false,
        mission_azazel_started: false,
        learned_oath_on_hermon: false,
        learned_semyaza_leader: false,
        learned_azazel_weapons: false,
        learned_watchers_names: false,
      }
    },

    conversations: [
      // =========================================================
      // 1) FIRST MEETING — camp entry, pride, identity, lore, mission
      // =========================================================
      {
        id: "first_meeting",
        title: "First Meeting — Camp",
        startNode: "fm_gate",
        nodes: {
          // Gate: if already completed, jump to the camp hub
          fm_gate: {
            type: "gate",
            ifFlag: "intro_complete",
            then: "hub_001",
            else: "fm_001"
          },

          fm_001: {
            type: "set",
            set: { met_naamriel: true },
            next: "fm_002"
          },

          fm_002: {
            type: "npc",
            text:
              "You reached our fires.\n\nGood.\n\nThat means the dark between the trees did not claim you.",
            next: "fm_003"
          },

          fm_003: {
            type: "npc",
            text:
              "I’m not surprised.\n\nEnoch’s blood does not run thin.\n\nStill… I am proud you made it.",
            next: "fm_choice_001"
          },

          // First interactive exchange: who/where/why
          fm_choice_001: {
            type: "choice",
            prompt: "Ask her…",
            choices: [
              { text: "Who are you?", next: "fm_who_001" },
              { text: "Where is this place?", next: "fm_where_001" },
              { text: "How did you know about Enoch?", next: "fm_enoch_001" },
              { text: "I came because I was told to stop the angels.", next: "fm_purpose_001" },
            ]
          },

          fm_who_001: {
            type: "npc",
            text:
              "Names are dangerous here.\n\nBut you can call me Na’amriel.\n\nAsh-Bound. Oath-Marked.\n\nI keep this camp alive with memory and fire.",
            next: "fm_who_002"
          },
          fm_who_002: {
            type: "npc",
            text:
              "Once, I was only a woman.\n\nThen the Watchers came as teachers… and took what was not offered.\n\nSome of us were broken.\nSome became mothers of horrors.\n\nI became something else: a witness who refused to die quietly.",
            next: "fm_choice_002"
          },

          fm_where_001: {
            type: "npc",
            text:
              "This is the outer edge of a wounded land.\n\nThe Watchers do not rule openly here—not yet.\n\nBut their works are everywhere: strange stones, corrupted altars, children that should not exist, hunger that isn’t natural.",
            next: "fm_choice_002"
          },

          fm_enoch_001: {
            type: "npc",
            text:
              "Because your brother does not walk like other men.\n\nHe listens.\nHe writes.\nAnd when he speaks, even spirits grow cautious.\n\nWord travels in places you cannot see.",
            next: "fm_choice_002"
          },

          fm_purpose_001: {
            type: "npc",
            text:
              "An honest answer.\n\nThen listen to mine:\nYou only *think* you know what ‘angels’ means.\n\nSome are faithful.\nSome are bound.\nSome are fallen.\n\nAnd the fallen are clever enough to wear righteousness like a robe.",
            next: "fm_choice_002"
          },

          // Second choice layer: push into the core lore
          fm_choice_002: {
            type: "choice",
            prompt: "Press deeper…",
            choices: [
              { text: "Tell me what happened here. Start from the beginning.", next: "fm_lore_001" },
              { text: "Why did they fall?", next: "fm_fall_001" },
              { text: "Who led them?", next: "fm_leader_001" },
              { text: "Why am I here and not Enoch?", next: "fm_whyme_001" },
            ]
          },

          fm_lore_001: {
            type: "npc",
            text:
              "The Watchers were appointed to observe—guardians over knowledge and boundaries.\n\nBut they looked down.\nAnd desire became a law in their own hearts.\n\nThey crossed what was forbidden, and then taught humanity to love what should have been feared.",
            next: "fm_lore_002"
          },
          fm_lore_002: {
            type: "npc",
            text:
              "They descended upon Mount Hermon.\n\nNot in chaos—by oath.\n\nThey bound themselves together so none would stand alone in judgment.",
            next: "fm_lore_003"
          },
          fm_lore_003: {
            type: "set",
            set: { learned_oath_on_hermon: true },
            next: "fm_lore_004"
          },
          fm_lore_004: {
            type: "npc",
            text:
              "That oath poisoned everything.\n\nBecause when rebellion becomes a pact, it becomes a kingdom.",
            next: "fm_choice_003"
          },

          fm_fall_001: {
            type: "npc",
            text:
              "They will call it love.\nThey will claim compassion.\n\nPride always uses beautiful words.\n\nBut it began as this:\nObservation became fascination.\nFascination became appetite.\n\nAnd appetite demanded permission—so they invented it.",
            next: "fm_choice_003"
          },

          fm_leader_001: {
            type: "npc",
            text:
              "Semjâzâ.\n\nNot because he was the boldest.\nBecause he was afraid.\n\nHe feared falling alone.\nSo he made the others swear: *If one descends, all descend.*",
            next: "fm_leader_002"
          },
          fm_leader_002: {
            type: "set",
            set: { learned_semyaza_leader: true },
            next: "fm_choice_003"
          },

          fm_whyme_001: {
            type: "npc",
            text:
              "Because Enoch is a messenger.\n\nHe speaks to powers.\nHe bears witness.\n\nYou… are the one who walks where messages must become wounds.\n\nSomeone must interrupt their work in the soil, in the stones, in the hidden places.\nThat is a task for hands, not visions.",
            next: "fm_choice_003"
          },

          // Third choice: names + the “seven” + mission handoff
          fm_choice_003: {
            type: "choice",
            prompt: "Ask about the Watchers…",
            choices: [
              { text: "Name the leaders. I want names.", next: "fm_names_001" },
              { text: "What did they teach?", next: "fm_teach_001" },
              { text: "You said seven resist binding—what does that mean?", next: "fm_seven_001" },
              { text: "What do you need me to do first?", next: "fm_mission_001" }
            ]
          },

          fm_names_001: {
            type: "npc",
            text:
              "You want names? Good.\nNames are hooks.\n\nSemjâzâ—oath-maker.\nAzazel—weapon-smith.\nBaraqel—signs in the sky.\nKokabiel—corruptor of the star-courses.\nArmaros—twister of words and bindings.\n\nThere are more.\nBut these are the ones your fear will recognize when it tries to hide as wisdom.",
            next: "fm_names_002"
          },
          fm_names_002: {
            type: "set",
            set: { learned_watchers_names: true },
            next: "fm_choice_004"
          },

          fm_teach_001: {
            type: "npc",
            text:
              "They taught humanity to turn skill into domination.\n\nMetal into blades.\nAdornment into vanity.\nSecrets into leverage.\n\nKnowledge without restraint becomes hunger.\nThey knew that.\nThey wanted that.",
            next: "fm_choice_004"
          },

          fm_seven_001: {
            type: "npc",
            text:
              "Many Watchers have been bound—chains prepared beneath the earth, places of restraint.\n\nBut there are princes among the fallen who still move.\nSeven powers that bend the world by influence: cults, altars, corrupt knowledge, beasts bred in secret.\n\nYou cannot strike them in the open.\nYou wound them by breaking what they feed on.",
            next: "fm_choice_004"
          },

          fm_choice_004: {
            type: "choice",
            prompt: "Keep talking or take the mission…",
            choices: [
              { text: "Tell me about Azazel.", next: "fm_azazel_001" },
              { text: "I’m ready. Give me the first task.", next: "fm_mission_001" },
              { text: "One more thing—how are you still alive?", next: "fm_alive_001" }
            ]
          },

          fm_azazel_001: {
            type: "npc",
            text:
              "Azazel loved tools.\nNot because he admired craft—because he admired control.\n\nHe taught men to forge blades, to shape armor, to sharpen the instinct to dominate.\nThen he taught them to desire war as if it were virtue.",
            next: "fm_azazel_002"
          },
          fm_azazel_002: {
            type: "set",
            set: { learned_azazel_weapons: true },
            next: "fm_azazel_003"
          },
          fm_azazel_003: {
            type: "npc",
            text:
              "His followers renew his teaching at an altar-site.\nIt’s not only stone.\nIt’s a *signal*.\nA place where the corruption is remembered and repeated.\n\nBreak it—interrupt the renewal—and you force him to notice you.",
            next: "fm_mission_001"
          },

          fm_alive_001: {
            type: "npc",
            text:
              "Time does not touch everyone equally.\n\nThe Watchers altered more than flesh.\nSome of us were changed by their violence—by knowledge forced into blood.\n\nI endured by binding my years to ritual… and refusing to let their work be the final word.",
            next: "fm_mission_001"
          },

          // Mission assignment
          fm_mission_001: {
            type: "npc",
            text:
              "Your first task is not a duel.\nIt is interruption.\n\nGo to the Watcher site.\nFind the altar where Azazel’s teaching is renewed.\nShatter it.\nBring me the remnants—anything that bears his mark: etched metal, carved plates, blackened runes.\n\nDo not answer voices that speak from the air.\nThey will sound righteous.\nThat is how you will know you are close.",
            next: "fm_mission_set"
          },

          fm_mission_set: {
            type: "set",
            set: { mission_azazel_started: true, intro_complete: true },
            next: "fm_exit_001"
          },

          fm_exit_001: {
            type: "npc",
            text:
              "Return alive.\n\nAnd when you do… I will teach you how to wound what was never meant to be wounded.",
            next: "hub_001"
          },

          // =========================================================
          // 2) HUB — after intro, player can ask longform topics anytime
          // =========================================================
          hub_001: {
            type: "choice",
            prompt: "Na’amriel watches the fire. Ask her…",
            choices: [
              { text: "Remind me of my task (Azazel’s altar).", next: "hub_mission_001" },
              { text: "Why did the Watchers fall?", next: "t_fall_001" },
              { text: "Who led the descent?", next: "t_started_001" },
              { text: "Tell me more names of the Watchers.", next: "t_names_001" },
              { text: "What are the Nephilim like?", next: "t_nephilim_001" },
              { text: "Why do they lie so well?", next: "t_lies_001" },
              { text: "What did Enoch see?", next: "t_enoch_001" },
              { text: "How are you still alive?", next: "t_alive_001" },
              { text: "Do you hate them?", next: "t_hate_001" },
              { text: "Leave.", next: "end" }
            ]
          },

          hub_mission_001: {
            type: "npc",
            text:
              "Azazel’s altar.\n\nBreak the stone.\nScatter the etched teaching.\nBring me whatever remains that still *wants* to be remembered.\n\nIf you hear a voice calling you ‘ungrateful’… don’t answer.\nKeep breaking.",
            next: "hub_001"
          },

          // =========================================================
          // TOPICS (longform + follow-ups)
          // =========================================================

          // FALL
          t_fall_001: {
            type: "npc",
            text:
              "They claim love.\nThey claim compassion.\n\nBut the fall begins when a guardian decides the boundary is beneath him.\n\nThey were appointed to observe.\nObservation became fascination.\nFascination became desire.\n\nThen desire dressed itself as ‘instruction.’",
            next: "t_fall_q"
          },
          t_fall_q: {
            type: "choice",
            prompt: "Follow up?",
            choices: [
              { text: "So it wasn’t just lust?", next: "t_fall_002" },
              { text: "Back.", next: "hub_001" }
            ]
          },
          t_fall_002: {
            type: "npc",
            text:
              "Lust was the doorway.\n\nWhat they wanted was authority without accountability.\n\nThey wanted to be praised as benefactors while feeding on the world like kings.",
            next: "hub_001"
          },

          // STARTED
          t_started_001: {
            type: "npc",
            text:
              "Semjâzâ.\n\nHe feared being punished alone, so he made rebellion a covenant.\n\nMount Hermon became their altar of agreement: *If one descends, all descend.*",
            next: "t_started_q"
          },
          t_started_q: {
            type: "choice",
            prompt: "Follow up?",
            choices: [
              { text: "And Azazel?", next: "t_started_002" },
              { text: "Back.", next: "hub_001" }
            ]
          },
          t_started_002: {
            type: "npc",
            text:
              "Azazel wasn’t driven by fear.\nHe was driven by appetite.\n\nWhere Semjâzâ sought belonging, Azazel sought influence.\nHe taught men weapons so he could watch them choose violence… and call it strength.",
            next: "hub_001"
          },

          // NAMES (extended)
          t_names_001: {
            type: "npc",
            text:
              "You already know Semjâzâ and Azazel.\n\nRemember also:\nBaraqel—signs and lightning.\nKokabiel—star-courses turned crooked.\nArmaros—bindings, words made into snares.\n\nNames differ on tongues and tribes.\nBut their works leave the same scars.",
            next: "t_names_q"
          },
          t_names_q: {
            type: "choice",
            prompt: "Follow up?",
            choices: [
              { text: "Why do names matter?", next: "t_names_002" },
              { text: "Back.", next: "hub_001" }
            ]
          },
          t_names_002: {
            type: "npc",
            text:
              "Because a name is a handle.\n\nWhen you speak it without fear, you refuse their disguise.\nAnd when you bind a work to a name, you can hunt it without confusion.\n\nThey thrive on blur—on ‘maybe.’\nNames carve the blur into targets.",
            next: "hub_001"
          },

          // NEPHILIM
          t_nephilim_001: {
            type: "npc",
            text:
              "They grow too quickly.\nThey hunger too deeply.\n\nThe world cannot satisfy what they are.\nSo they consume.\nAnimals, stores, fields… sometimes people.\n\nNot always from malice.\nOften from endless need.",
            next: "t_nephilim_q"
          },
          t_nephilim_q: {
            type: "choice",
            prompt: "Follow up?",
            choices: [
              { text: "Were any of them redeemable?", next: "t_nephilim_002" },
              { text: "Back.", next: "hub_001" }
            ]
          },
          t_nephilim_002: {
            type: "npc",
            text:
              "Some looked at the sky like they were waiting for permission to be something else.\n\nThat is the tragedy.\nThey are contradictions given flesh.\n\nA mistake that suffers for existing.",
            next: "hub_001"
          },

          // LIES
          t_lies_001: {
            type: "npc",
            text:
              "Because they remember the truth.\n\nA fallen angel rarely invents.\nHe rearranges righteousness until it serves him.\n\nThey speak with authority.\nThat is why listening is dangerous.",
            next: "hub_001"
          },

          // ENOCH
          t_enoch_001: {
            type: "npc",
            text:
              "Enoch has seen places not meant for human feet.\n\nChains prepared before rebellion ever occurred.\nJudgment that exists outside of time.\n\nSome Watchers begged him to intercede.\nHe did not confuse mercy with permission.",
            next: "t_enoch_q"
          },
          t_enoch_q: {
            type: "choice",
            prompt: "Follow up?",
            choices: [
              { text: "Did he fear them?", next: "t_enoch_002" },
              { text: "Back.", next: "hub_001" }
            ]
          },
          t_enoch_002: {
            type: "npc",
            text:
              "He feared what any wise man fears:\nNot the loud threat… but the subtle persuasion.\n\nHe knows they weaponize pity.\nThey want you to call rebellion ‘misunderstood.’",
            next: "hub_001"
          },

          // ALIVE
          t_alive_001: {
            type: "npc",
            text:
              "I do not call it immortality.\n\nThe Watchers tried to make me *useful.*\nWhat they did not understand is that survival is not loyalty.\n\nI bound my years to memory and ritual.\nAs long as their work stands uncorrected… my life does not conclude.",
            next: "hub_001"
          },

          // HATE
          t_hate_001: {
            type: "npc",
            text:
              "Hate is too simple.\n\nI remember what they were.\nAnd I refuse to let them redefine what they became.\n\nI will not hand them the comfort of being ‘monsters by nature.’\nThey chose this.",
            next: "hub_001"
          },

          // END
          end: {
            type: "end",
            text: "Na’amriel returns to her brazier, tracing sigils into the ash."
          }
        }
      }
    ]
  };

  window.DIALOGUE_NAAMRIEL = DIALOGUE_NAAMRIEL;

  // If you later switch to modules:
  // export default DIALOGUE_NAAMRIEL;
})();


/* ===== dialogue_zuriel.js ===== */

/* dialogue_zuriel.js
   Zuriel dialogue data — Apkallu, Watchers, Enochian scripture (in-universe).
   Node types: npc | choice | set | gate | end
   Requires dialogue_runner.js v2+.
*/

(function(){
  "use strict";

  const DIALOGUE_ZURIEL = {
    npcId: "zuriel",
    npcName: "Zuriel, Tablet-Keeper of the Floodline",
    version: "1.0",
    setting: "mesopotamian_enochian",
    devHint: { npcSlot: 19, title: "Zuriel" },

    defaultState: {
      flags: {
        met_zuriel: false,
        trained_once: false,
        asked_apkallu: false,
        asked_watchers: false,
        asked_enoch: false,
        asked_tablets: false,
        asked_flood: false,
        asked_names: false,
        unlocked_deep_lore: false
      }
    },

    conversations: [
      // =========================================================
      // ROOT — first meeting / repeat meeting
      // =========================================================
      {
        id: "root",
        title: "Zuriel — Root",
        startNode: "z_gate_met",
        nodes: {
          z_gate_met: {
            type:"gate",
            ifFlag:"met_zuriel",
            then:"z_repeat_001",
            else:"z_first_001"
          },

          // -------- First meeting --------
          z_first_001: { type:"set", set:{ met_zuriel:true }, next:"z_first_002" },

          z_first_002: {
            type:"npc",
            text:
`…Hold.\n\nYou carry the smell of cedar-smoke and iron.\nNot a shepherd. Not yet a king.\n\nI am Zuriel.\nOnce I copied the words of sages onto clay.\nNow I copy wounds into wisdom.`,
            next:"z_first_003"
          },

          z_first_003: {
            type:"npc",
            text:
`This place is older than your fear.\nAnd your war is older than your name.\n\nIf you want strength, I can carve it into you.\nIf you want truth, I can lend you tablets.\n\nChoose.`,
            next:"z_menu"
          },

          // -------- Repeat meeting --------
          z_repeat_001: {
            type:"npc",
            text:
`Back again.\n\nThe river does not apologize for moving.\nNeither should you.`,
            next:"z_menu"
          },

          // -------- Main menu --------
          z_menu: {
            type:"choice",
            prompt:"What do you seek?",
            choices:[
              { text:"Train me (Level Up / Skill Points).", action:"open_level_menu", next:"z_after_training" },
              { text:"Tell me of the Apkallu.", set:{ asked_apkallu:true }, next:"apk_001" },
              { text:"Tell me of the Watchers and the Oath.", set:{ asked_watchers:true }, next:"wch_001" },
              { text:"Speak of Enoch and the books.", set:{ asked_enoch:true }, next:"eno_001" },
              { text:"What are these tablets you guard?", set:{ asked_tablets:true }, next:"tab_001" },
              { text:"The Flood… what did it wash away?", set:{ asked_flood:true }, next:"fld_001" },
              { text:"Teach me the names (secret names / titles).", set:{ asked_names:true }, next:"nam_001" },
              { text:"That’s enough for now.", next:"z_end" }
            ]
          },

          z_after_training: {
            type:"npc",
            text:
`Good.\n\nSpend what you have earned.\nDo not spend what you have not bled for.\n\nWhen you are finished, speak again.`,
            next:"z_menu"
          },

          z_end: { type:"end", text:"Zuriel returns to his tablets, scratching lines into clay." }
        }
      },

      // =========================================================
      // APKALLU ARC
      // =========================================================
      {
        id:"apkallu",
        title:"Apkallu — The Seven Sages",
        startNode:"apk_001",
        nodes:{
          apk_001:{
            type:"npc",
            text:
`The Apkallu were the first teachers.\nNot kings. Not priests.\nSages.\n\nThey walked between river and reed-bed, between altar and workshop.\nThey taught men to measure, to build, to name, to read the sky.\n\nBut wisdom is a knife.\nIt can cut bread.\nOr throats.`,
            next:"apk_002"
          },
          apk_002:{
            type:"choice",
            prompt:"What part do you want?",
            choices:[
              { text:"Were they angels? Spirits?", next:"apk_kind_001" },
              { text:"Why are they sometimes described as fish-men?", next:"apk_fish_001" },
              { text:"How do they relate to the Watchers?", next:"apk_watch_001" },
              { text:"How does this matter for me right now?", next:"apk_now_001" },
              { text:"Back to your main questions.", next:"z_menu" }
            ]
          },

          apk_kind_001:{
            type:"npc",
            text:
`In the oldest memory they are “sent ones”—carriers of instruction.\n\nSome were pure.\nSome were compromised.\nSome were a mask worn by worse things.\n\nA man will call any bright thing “divine.”\nA fool will follow it.`,
            next:"apk_kind_002"
          },
          apk_kind_002:{
            type:"npc",
            text:
`So I speak carefully.\n\nThe Apkallu are a category:\nSages who bring knowledge from beyond.\n\nYour enemy does not hate knowledge.\nHe hates *obedience*.`,
            next:"apk_002"
          },

          apk_fish_001:{
            type:"npc",
            text:
`The fish-cloak is a sign.\n\nThe deep is chaos.\nThe sea is untamed.\nTo master it is to wear it.\n\nA sage wrapped in fish-skin is saying:\n“I have brought order from the waters.”`,
            next:"apk_fish_002"
          },
          apk_fish_002:{
            type:"npc",
            text:
`But symbols are stolen.\n\nLater liars wore the same skin.\nThey offered secret arts.\nThey promised power without covenant.\n\nThat is always the serpent’s bargain.`,
            next:"apk_002"
          },

          apk_watch_001:{
            type:"npc",
            text:
`The Watchers are not sages.\nThey are judges who rebelled.\n\nThe Apkallu teach.\nThe Watchers *interfere*.\n\nYet the stories braid together—because men remember patterns even when names change.`,
            next:"apk_watch_002"
          },
          apk_watch_002:{
            type:"npc",
            text:
`Some sages were faithful messengers.\nSome were “teachers” sent by the rebels.\n\nEither way, the test is the same:\nDo they lead you toward the Everlasting…\nor toward yourself?`,
            next:"apk_002"
          },

          apk_now_001:{
            type:"npc",
            text:
`Because your war is a war over instruction.\n\nThey taught men to shape metal.\nYour enemies taught men to shape *men*.\n\nYou will win by refusing their curriculum.\nAnd by learning the right one.`,
            next:"apk_now_002"
          },
          apk_now_002:{
            type:"choice",
            prompt:"Do you want to learn the right one?",
            choices:[
              { text:"Yes. Teach me through training.", action:"open_level_menu", next:"z_after_training" },
              { text:"Yes. Give me the deeper lore.", set:{ unlocked_deep_lore:true }, next:"apk_deep_001" },
              { text:"Not now.", next:"z_menu" }
            ]
          },

          apk_deep_001:{
            type:"npc",
            text:
`Then remember this:\n\nKnowledge is neutral.\nSpirits are not.\n\nWhen a “sage” arrives, ask:\nWhat oath binds him?\nWhat law limits him?\nWhat fruit follows him?\n\nThe unbound teacher is never your friend.`,
            next:"z_menu"
          }
        }
      },

      // =========================================================
      // WATCHERS ARC
      // =========================================================
      {
        id:"watchers",
        title:"Watchers — The Oath and the Fall",
        startNode:"wch_001",
        nodes:{
          wch_001:{
            type:"npc",
            text:
`The Watchers swore together.\nNot because the plan was wise—\nbut because none of them trusted the others.\n\nAn oath is a chain.\nIt can hold the righteous steady.\nOr bind the wicked to a cliff.`,
            next:"wch_002"
          },
          wch_002:{
            type:"choice",
            prompt:"Which thread do you pull?",
            choices:[
              { text:"Why did they fall?", next:"wch_why_001" },
              { text:"What did they teach?", next:"wch_teach_001" },
              { text:"What is the Nephilim in your telling?", next:"wch_neph_001" },
              { text:"How do I fight something like that?", next:"wch_fight_001" },
              { text:"Back.", next:"z_menu" }
            ]
          },

          wch_why_001:{
            type:"npc",
            text:
`They wanted authority without assignment.\n\nThey saw beauty.\nThey saw power.\nThey saw the boundary.\n\nAnd they called the boundary an insult.`,
            next:"wch_why_002"
          },
          wch_why_002:{
            type:"npc",
            text:
`Rebellion rarely begins with hatred.\nIt begins with entitlement.\n\nRemember that. Entitlement is the first demon.`,
            next:"wch_002"
          },

          wch_teach_001:{
            type:"npc",
            text:
`They taught weapons.\nThey taught enchantments.\nThey taught the cutting of roots and the naming of stars.\n\nSome of it was “true.”\nThat is what made it deadly.`,
            next:"wch_teach_002"
          },
          wch_teach_002:{
            type:"npc",
            text:
`A lie that is all lie is easy.\nBut a lie laced with truth makes slaves.\n\nIf you learn their arts, you must also learn their limits.\nThat is what training is.`,
            next:"wch_002"
          },

          wch_neph_001:{
            type:"npc",
            text:
`The Nephilim are the consequence of crossing.\n\nNot merely large men.\nNot merely strong men.\n\nA mingled thing.\nAn inheritance that should not exist.\n\nAnd like all contradictions—it is violent.`,
            next:"wch_neph_002"
          },
          wch_neph_002:{
            type:"npc",
            text:
`Some linger as flesh.\nSome linger as hunger.\nSome linger as a voice behind the eyes.\n\nDo not romanticize them.\nPity them if you must.\nBut do not serve them.`,
            next:"wch_002"
          },

          wch_fight_001:{
            type:"npc",
            text:
`You fight them by refusing the terms.\n\nThey want you afraid.\nOr proud.\nOr desperate enough to bargain.\n\nSo you train.\nAnd you keep covenant.\nAnd you do not take their gifts.`,
            next:"wch_fight_002"
          },
          wch_fight_002:{
            type:"choice",
            prompt:"Do you want strength without bargains?",
            choices:[
              { text:"Yes. Train me.", action:"open_level_menu", next:"z_after_training" },
              { text:"Yes. Teach me more lore.", next:"eno_001" },
              { text:"Back.", next:"z_menu" }
            ]
          }
        }
      },

      // =========================================================
      // ENOCH ARC
      // =========================================================
      {
        id:"enoch",
        title:"Enoch — The Scribe and the Sentence",
        startNode:"eno_001",
        nodes:{
          eno_001:{
            type:"npc",
            text:
`Enoch was not merely a man who walked with God.\nHe was a scribe.\n\nA scribe does two things:\nHe receives.\nAnd he remembers.\n\nThe rebels fear memory.\nBecause memory becomes testimony.`,
            next:"eno_002"
          },
          eno_002:{
            type:"choice",
            prompt:"Ask.",
            choices:[
              { text:"What did Enoch see?", next:"eno_see_001" },
              { text:"What are the ‘books’ in your telling?", next:"eno_books_001" },
              { text:"How do I use this knowledge?", next:"eno_use_001" },
              { text:"Back.", next:"z_menu" }
            ]
          },

          eno_see_001:{
            type:"npc",
            text:
`He saw court.\nHe saw judgment.\nHe saw the reckoning that is already written.\n\nAnd he saw that the rebels are not invincible.\nOnly loud.`,
            next:"eno_see_002"
          },
          eno_see_002:{
            type:"npc",
            text:
`That is why they hate his name.\nA witness is a blade.\n\nNot because it cuts flesh.\nBecause it cuts excuses.`,
            next:"eno_002"
          },

          eno_books_001:{
            type:"npc",
            text:
`The “books” are not paper.\nThey are record.\n\nSome are written in heaven.\nSome are etched into the bones of the world.\nSome are pressed into clay—like mine.\n\nAll of them agree on one thing:\nThe rebels lose.`,
            next:"eno_books_002"
          },
          eno_books_002:{
            type:"npc",
            text:
`But between “they lose” and “you live” is the battlefield.\n\nThat is where training matters.\nAnd where wisdom becomes action.`,
            next:"eno_002"
          },

          eno_use_001:{
            type:"npc",
            text:
`Use it like this:\n\nWhen a spirit flatters you, remember Enoch.\nWhen a spirit threatens you, remember judgment.\nWhen a spirit offers shortcuts, remember the oath.\n\nThen do the ordinary work—\none step, one swing, one faithful refusal at a time.`,
            next:"eno_use_002"
          },
          eno_use_002:{
            type:"choice",
            prompt:"Shall we make that ordinary work easier?",
            choices:[
              { text:"Yes. Open training.", action:"open_level_menu", next:"z_after_training" },
              { text:"Show me the Skill Trees.", action:"open_skill_tree", actionArgs:{treeId:"sword"}, next:"z_after_training" },
              { text:"Back.", next:"z_menu" }
            ]
          }
        }
      },

      // =========================================================
      // TABLETS / FLOOD / NAMES (lore utility)
      // =========================================================
      {
        id:"tablets",
        title:"Tablets",
        startNode:"tab_001",
        nodes:{
          tab_001:{
            type:"npc",
            text:
`Clay does not forget.\n\nMen do.\n\nSo I press memory into earth and fire it into permanence.\nI do for truth what the rebels do for corruption—\nI try to make it *stick*.`,
            next:"tab_002"
          },
          tab_002:{
            type:"choice",
            prompt:"And what do the tablets say?",
            choices:[
              { text:"Tell me about the Apkallu again.", next:"apk_001" },
              { text:"Tell me about the Watchers.", next:"wch_001" },
              { text:"Tell me about Enoch.", next:"eno_001" },
              { text:"Back.", next:"z_menu" }
            ]
          }
        }
      },

      {
        id:"flood",
        title:"The Flood",
        startNode:"fld_001",
        nodes:{
          fld_001:{
            type:"npc",
            text:
`The Flood was not only water.\nIt was a reset.\nA verdict.\n\nThe world had become a workshop for monsters.\nSo the Everlasting shattered the tools.\n\nMercy can look like ruin—\nwhen you loved the ruin.`,
            next:"fld_002"
          },
          fld_002:{
            type:"choice",
            prompt:"What do you take from that?",
            choices:[
              { text:"That judgment is real.", next:"fld_jud_001" },
              { text:"That mercy is severe.", next:"fld_mercy_001" },
              { text:"Back.", next:"z_menu" }
            ]
          },
          fld_jud_001:{
            type:"npc",
            text:
`Yes.\n\nAnd if judgment is real, then so is victory.\nBecause the judge is not uncertain.\n\nYour job is to endure long enough to see it.`,
            next:"z_menu"
          },
          fld_mercy_001:{
            type:"npc",
            text:
`Severe mercy is still mercy.\n\nThe rebels call boundaries “cruel.”\nBut boundaries are what keep life possible.\n\nEven a sword has an edge.\nWithout an edge, it is only metal.`,
            next:"z_menu"
          }
        }
      },

      {
        id:"names",
        title:"Names and Titles",
        startNode:"nam_001",
        nodes:{
          nam_001:{
            type:"gate",
            ifFlag:"unlocked_deep_lore",
            then:"nam_deep_001",
            else:"nam_shallow_001"
          },

          nam_shallow_001:{
            type:"npc",
            text:
`Names are not toys.\n\nA name is a handle.\nA handle lets you pull.\n\nEarn the right to pull.\nThen I will teach you the handles that matter.`,
            next:"nam_shallow_002"
          },
          nam_shallow_002:{
            type:"choice",
            prompt:"How do I earn it?",
            choices:[
              { text:"Through training.", action:"open_level_menu", next:"z_after_training" },
              { text:"Through deeper lore.", set:{ unlocked_deep_lore:true }, next:"nam_deep_001" },
              { text:"Back.", next:"z_menu" }
            ]
          },

          nam_deep_001:{
            type:"npc",
            text:
`Very well.\n\nHere is the rule:\n\nA true name is bound to authority.\nA stolen name is bound to manipulation.\n\nThe rebels love stolen names.\nBecause stolen names feel like power.\n\nBut covenant names—those are anchors.`,
            next:"nam_deep_002"
          },
          nam_deep_002:{
            type:"npc",
            text:
`So when you hear a spirit speak:\nAsk what authority stands behind its words.\n\nIf it cannot answer—\nit is either a liar,\nor a stray.\n\nAnd either way, you do not kneel.`,
            next:"z_menu"
          }
        }
      }
    ]
  };

  window.DIALOGUE_ZURIEL = DIALOGUE_ZURIEL;
})();


/* ===== dialogue_enoch.js ===== */

/* dialogue_enoch.js
   Enoch (NPC #12) — main story guidance + Enochian lore (in-universe)
   Node types: npc | choice | set | gate | end
   Requires dialogue_runner_v2.js+
*/
(function(){
  "use strict";

  const DIALOGUE_ENOCH = {
    npcId: "enoch",
    npcName: "Enoch",
    version: "1.0",
    defaultState: {
      flags: {
        met_enoch: false,
        asked_grove: false,
        asked_hunters: false,
        asked_watchers: false,
        asked_apkallu: false,
        asked_city: false,
      }
    },
    conversations: [
      {
        id: "root",
        title: "Enoch — Root",
        startNode: "gate_met",
        nodes: {
          gate_met: { type:"gate", ifFlag:"met_enoch", then:"repeat_001", else:"first_set" },

          first_set: { type:"set", set:{ met_enoch:true }, next:"first_001" },

          first_001: {
            type:"npc",
            text:
`…You have opened your eyes inside a wound in the world.\n\nThe Ash Grove is not merely a place.\nIt is a scar where older wars bled into soil.\n\nI am Enoch.\nI will not command you.\nBut I will not lie to you.`,
            next:"menu"
          },

          repeat_001: {
            type:"npc",
            text:
`Again you return.\nGood.\nA man who never returns to counsel becomes a story with a short ending.`,
            next:"menu"
          },

          menu: {
            type:"choice",
            prompt:"What do you ask of me?",
            choices: [
              { text:"What is this grove?", set:{ asked_grove:true }, next:"grove_001" },
              { text:"Where should I go first?", set:{ asked_hunters:true }, next:"hunters_001" },
              { text:"Tell me of the Watchers.", set:{ asked_watchers:true }, next:"watchers_001" },
              { text:"Zuriel spoke of the Apkallu…", set:{ asked_apkallu:true }, next:"apkallu_001" },
              { text:"What is this city I will see?", set:{ asked_city:true }, next:"city_001" },
              { text:"That’s enough for now.", next:"end" },
            ]
          },

          grove_001: {
            type:"npc",
            text:
`Ash remembers.\n\nWhen corruption passes through a place, it leaves residue.\nThe grove holds residue like a cup holds rain.\n\nIf you feel watched here—\nyou are.\nBut not all watchers are enemies.`,
            next:"grove_002"
          },
          grove_002: {
            type:"npc",
            text:
`Do not linger.\nThe grove is a beginning, not a home.\n\nGo—before the forest decides you belong to it.`,
            next:"menu"
          },

          hunters_001: {
            type:"npc",
            text:
`Find the hunters.\nThey still remember how to live without bargaining.\n\nThey will set your hands to honest work:\nmeat, hide, fire, steel.\n\nSmall victories are how men survive great wars.`,
            next:"hunters_002"
          },
          hunters_002: {
            type:"npc",
            text:
`Speak to their leader.\nHe will test you.\nDo not resent the test.\nA sword that is never tested is only decoration.`,
            next:"menu"
          },

          watchers_001: {
            type:"npc",
            text:
`The Watchers are oath-breakers.\nThey were appointed to observe—not to interfere.\n\nTheir sin was not curiosity.\nIt was entitlement.\n\nAnd entitlement always demands a sacrifice—\nyours.`,
            next:"watchers_002"
          },
          watchers_002: {
            type:"choice",
            prompt:"How do you resist them?",
            choices: [
              { text:"By training and refusing shortcuts.", next:"watchers_resist_001" },
              { text:"Back.", next:"menu" }
            ]
          },
          watchers_resist_001: {
            type:"npc",
            text:
`Yes.\n\nThey offer power without covenant.\nRefuse.\n\nThey offer knowledge without obedience.\nRefuse.\n\nThey offer fear.\nEndure.\n\nDo this and you will outlive their schemes.`,
            next:"menu"
          },

          apkallu_001: {
            type:"npc",
            text:
`Sages came before rebels, and rebels learned to imitate sages.\n\nSo when a “teacher” arrives, ask:\nWhat fruit follows him?\n\nThe Everlasting teaches by making you whole.\nThe rebels teach by making you hungry.`,
            next:"menu"
          },

          city_001: {
            type:"npc",
            text:
`You will see a city that calls itself order.\nBut it is built on chains.\n\nDo not strike first.\nDo not beg.\nObserve.\n\nYour eyes will become evidence—\nand evidence becomes judgment.`,
            next:"menu"
          },

          end: { type:"end", text:"Enoch’s presence recedes like a breath leaving warm air." }
        }
      }
    ]
  };

  window.DIALOGUE_ENOCH = DIALOGUE_ENOCH;
})();


/* ===== dialogue_hunter.js ===== */

/* dialogue_hunter.js
   Shamash-nasir (NPC 29) — early quest giver (bear + wolves) + wilderness lore.
   Node types: npc | choice | set | gate | end
*/

(function(){
  "use strict";

  const DIALOGUE_HUNTER = {
    npcId: "hunter",
    npcName: "Shamash-nasir, Hunter of the Cedarline",
    version: "1.0",
    devHint: { npcSlot: 29, title: "Shamash-nasir" },

    defaultState: {
      flags: {
        met_hunter: false,
        accepted_hunt: false,
        turned_in_hunt: false,
        asked_cabin: false,
        asked_beasts: false,
        asked_watchers: false
      }
    },

    conversations: [
      {
        id:"root",
        title:"Shamash-nasir — Root",
        startNode:"h_gate_met",
        nodes:{
          h_gate_met:{ type:"gate", ifFlag:"met_hunter", then:"h_repeat_001", else:"h_first_001" },

          h_first_001:{ type:"set", set:{ met_hunter:true }, next:"h_first_002" },
          h_first_002:{
            type:"npc",
            text:
`Easy there.\n\nYou’re not one of my traps… but you look like you’ve been caught in something anyway.\n\nIf you came from the Ash Grove, then you’ve already felt it — the air’s wrong.\nPeople think that means “spirits.”\nI think it means “teeth.”`,
            next:"h_menu"
          },

          h_repeat_001:{
            type:"npc",
            text:
`Back again.\nIf you’re here, either you need work… or you survived it.`,
            next:"h_menu"
          },

          h_menu:{
            type:"choice",
            prompt:"What do you want to talk about?",
            choices:[
              { text:"Do you have work for me?", next:"h_work_gate" },
              { text:"Tell me about this cabin and the woods.", set:{ asked_cabin:true }, next:"h_cabin_001" },
              { text:"What beasts are out there?", set:{ asked_beasts:true }, next:"h_beasts_001" },
              { text:"Have you heard of Watchers / sages (Apkallu)?", set:{ asked_watchers:true }, next:"h_watchers_001" },
              { text:"That’s all for now.", next:"h_end" }
            ]
          },

          h_work_gate:{
            type:"gate",
            ifFlag:"turned_in_hunt",
            then:"h_work_done_001",
            else:"h_work_offer_gate"
          },

          h_work_offer_gate:{
            type:"gate",
            ifFlag:"accepted_hunt",
            then:"h_work_inprog_001",
            else:"h_work_offer_001"
          },

          h_work_offer_001:{
            type:"npc",
            text:
`Work? Yeah.\n\nA bear’s been prowling close — not starving, not scared.\nAnd wolves are shadowing it like they’re *taught*.\n\nBring down:\n• 1 Bear\n• 5 Wolves\n\nThen come back. And don’t bleed on my floor.`,
            next:"h_work_offer_002"
          },
          h_work_offer_002:{
            type:"choice",
            prompt:"Take the hunt?",
            choices:[
              { text:"I’ll do it.", set:{ accepted_hunt:true }, next:"h_work_accept_001" },
              { text:"Not yet.", next:"h_menu" }
            ]
          },
          h_work_accept_001:{
            type:"npc",
            text:
`Good.\nAim for the lungs.\nDon’t chase into thick brush.\n\nIf you hear singing… that’s not the wind. Walk away.`,
            next:"h_menu"
          },

          h_work_inprog_001:{
            type:"npc",
            text:
`You’ve got the job.\n\nBear + five wolves.\nCome back when it’s done.`,
            next:"h_menu"
          },

          h_work_done_001:{
            type:"npc",
            text:
`You did it.\n\nThe woods will be quieter for a while.\nNot safe — just quieter.\n\nIf you’re headed deeper, find the Troll Chieftain.\nHe respects strength… and he knows the old paths.`,
            next:"h_menu"
          },

          h_cabin_001:{
            type:"npc",
            text:
`This cabin was built to keep the weather out.\nNow it keeps worse things out.\n\nI line the threshold with ash and salt.\nNot because it’s magic.\nBecause it’s a *boundary*.\nBoundaries matter.`,
            next:"h_menu"
          },

          h_beasts_001:{
            type:"npc",
            text:
`Wolves. Bears. Worse.\n\nBut the strangest ones don’t hunt like animals.\nThey stalk like soldiers.\n\nSomething is training them. Or steering them.`,
            next:"h_beasts_002"
          },
          h_beasts_002:{
            type:"choice",
            prompt:"And if I run into something that isn’t an animal?",
            choices:[
              { text:"What should I do?", next:"h_beasts_advice_001" },
              { text:"Back.", next:"h_menu" }
            ]
          },
          h_beasts_advice_001:{
            type:"npc",
            text:
`Don’t bargain.\nDon’t listen too long.\nAnd don’t chase voices.\n\nIf it wants you close, it’s because close is where it wins.`,
            next:"h_menu"
          },

          h_watchers_001:{
            type:"npc",
            text:
`Old stories.\nMen in fish-skins teaching towns to rise.\nLights on the hills.\n“Watchers” above the clouds.\n\nMaybe they’re real.\nMaybe they’re just names for the same problem:\nSomething older than us thinks it can own us.`,
            next:"h_watchers_002"
          },
          h_watchers_002:{
            type:"npc",
            text:
`If you want scripture and sky-talk, you’re better off with Zuriel.\n\nMe? I watch tracks.\nAnd right now the tracks say:\nThis isn’t over.`,
            next:"h_menu"
          },

          h_end:{ type:"end", text:"The hunter checks the straps on a snare and says nothing more." }
        }
      }
    ]
  };

  window.DIALOGUE_HUNTER = DIALOGUE_HUNTER;
})();

/* ===== Troll Chief (NPC 11) — Kur-Duggal ===== */
(function(){
  "use strict";

  const DIALOGUE_TROLLCHIEF = {
    npcId: "trollchief",
    npcName: "Kur-Duggal",
    version: "1.1",
    defaultState: {
      flags: {
        met_trollchief: false,
        asked_name: false,
        asked_bonefires: false,
        asked_oldpaths: false,
        asked_city: false,
        asked_duel: false,
        duel_ready: false,
        duel_won: false
      }
    },

    conversations: [
      {
        id: "root",
        title: "Kur-Duggal — Bonefires",
        startNode: "tc_gate_met",
        nodes: {
          tc_gate_met: { type:"gate", ifFlag:"met_trollchief", then:"tc_repeat_001", else:"tc_first_001" },

          tc_first_001: { type:"set", set:{ met_trollchief:true }, next:"tc_first_002" },
          tc_first_002: {
            type:"npc",
            text:
`You stand in the smoke of my fires.\nSpeak, small-walker.\n\nIf you lie, the ash will remember.`,
            next:"tc_menu"
          },

          tc_repeat_001:{
            type:"npc",
            text:`Back to my bonefires.\n\nYour feet still work… so your courage is not dead.`,
            next:"tc_menu"
          },

          tc_menu:{
            type:"choice",
            prompt:"Kur-Duggal watches you through the smoke.",
            choices:[
              { text:"Who are you?", set:{ asked_name:true }, next:"tc_name_001" },
              { text:"Why are there bonefires here?", set:{ asked_bonefires:true }, next:"tc_bonefires_001" },
              { text:"I need the old paths.", set:{ asked_oldpaths:true }, next:"tc_oldpaths_001" },
              { text:"Tell me about the city.", set:{ asked_city:true }, next:"tc_city_001" },
              { text:"I came for your trial.", set:{ asked_duel:true }, next:"tc_duel_gate" },
              { text:"Enough talk.", next:"tc_end" }
            ]
          },

          tc_name_001:{
            type:"npc",
            text:
`Kur-Duggal.\n\nI was chieftain before your beard knew how to grow.\nBefore your people learned to stack stone into pride.\n\nNames matter because oaths bite.`,
            next:"tc_menu"
          },

          tc_bonefires_001:{
            type:"npc",
            text:
`Bones burn long.\n\nWe keep smoke in the air so the hungry things taste it and turn aside.\nNot all fear flame… but most fear *witnesses*.\n\nSmoke is a witness.`,
            next:"tc_bonefires_002"
          },
          tc_bonefires_002:{
            type:"npc",
            text:
`These hills remember war.\nIf you listen at night you can hear old shouting.\n\nThat is why we do not sleep without fire.`,
            next:"tc_menu"
          },

          tc_oldpaths_001:{
            type:"npc",
            text:
`Old paths are not roads.\nThey are agreements.\n\nStep wrong and you will meet a thing that thinks your ribs are a harp.`,
            next:"tc_oldpaths_002"
          },
          tc_oldpaths_002:{
            type:"npc",
            text:
`If you want my guidance, earn my respect.\n\nStrength is the only language the deep places speak clearly.`,
            next:"tc_menu"
          },

          tc_city_001:{
            type:"npc",
            text:
`The city wears gold like armor and calls it law.\n\nNephilim rule there.\nSome are kings.\nSome are cages that learned to talk.\n\nDo not let their politeness fool you.`,
            next:"tc_city_002"
          },
          tc_city_002:{
            type:"npc",
            text:
`If you make enemies in that city, their riders will come.\nDark knights.\nNo laughter. No mercy.\n\nWhen that day comes—run toward friends, not away from them.`,
            next:"tc_menu"
          },

          tc_duel_gate:{
            type:"gate",
            ifFlag:"duel_won",
            then:"tc_duel_won_001",
            else:"tc_duel_offer_001"
          },

          tc_duel_offer_001:{
            type:"npc",
            text:
`Trial?\n\nGood.\nWords are cheap.\nBlood is honest.\n\nYou want the old paths? Then prove you can walk them.`,
            next:"tc_duel_offer_002"
          },
          tc_duel_offer_002:{
            type:"choice",
            prompt:"Face Kur-Duggal’s trial?",
            choices:[
              { text:"I’m ready.", set:{ duel_ready:true }, action:"start_troll_duel", actionArgs:{ encounterId:"encounter.troll_duel_grath" }, next:"tc_duel_ready_001" },
              { text:"Not yet.", next:"tc_menu" }
            ]
          },

          tc_duel_ready_001:{
            type:"npc",
            text:
`Then go.\n\nWhen you step out of this circle, the trial begins.\nIf you fall, the ash will cover you.\n\nIf you win… you may speak as an equal.`,
            next:"tc_menu"
          },

          tc_duel_won_001:{
            type:"npc",
            text:
`You have fought.\nAnd you did not break.\n\nThe old paths will tolerate you.\nFor now.\n\nGo—before the smoke changes its mind.`,
            next:"tc_menu"
          },

          tc_end:{ type:"end", text:"Kur-Duggal turns back to the fires." }
        }
      },
      // Case-insensitive convenience alias
      {
        id: "Root",
        title: "Kur-Duggal — Bonefires",
        startNode: "tc_gate_met",
        nodes: {} // will be filled below
      }
    ]
  };

  // Alias Root nodes to root nodes so both work
  DIALOGUE_TROLLCHIEF.conversations[1].nodes = DIALOGUE_TROLLCHIEF.conversations[0].nodes;

  window.DIALOGUE_TROLLCHIEF = DIALOGUE_TROLLCHIEF;
})();

/* ===== Sanity ===== */
(function(){
  try{
    // Expose a tiny debug list (optional)
    window.__DIALOGUE_DATASETS__ = window.__DIALOGUE_DATASETS__ || {};
    ["NAAMRIEL","ZURIEL","ENOCH","HUNTER"].forEach((k)=>{
      const g = "DIALOGUE_" + k;
      if(window[g]) window.__DIALOGUE_DATASETS__[k] = window[g];
    });
  }catch(_){}
})();
