// ═══════════════════════════════════════════════════════════
// game.js — State, save/load, core game logic
// ═══════════════════════════════════════════════════════════

// ── CONSTANTS ──────────────────────────────────────────────

// RANKS kept for backward compat with save files
const RANKS = [
  { id:'nobility', title:'Nobility',  income:4000, wit:0,  looks:5,  rep:15 },
  { id:'gentry',   title:'Gentry',    income:1500, wit:5,  looks:0,  rep:5  },
  { id:'clergy',   title:'Clergy',    income:400,  wit:10, looks:0,  rep:0  },
  { id:'trade',    title:'Trade',     income:800,  wit:5,  looks:0,  rep:-5 },
];

// Father background pools — used in new character creation
const FATHER_TITLES = [
  { title:'Sir',         titleRank:1, wealthMin:800,  wealthMax:3000, rep:8  },
  { title:'The Hon.',    titleRank:2, wealthMin:1500, wealthMax:5000, rep:12 },
  { title:'Lord',        titleRank:3, wealthMin:3000, wealthMax:10000,rep:18 },
  { title:'Earl',        titleRank:4, wealthMin:5000, wealthMax:20000,rep:25 },
  { title:'Mr',          titleRank:0, wealthMin:100,  wealthMax:800,  rep:0  },
];

const FATHER_PROFESSIONS = [
  { id:'landed_gentry', label:'a gentleman of the gentry',        wealthMult:1.0, witBonus:0,  faithBonus:0  },
  { id:'clergyman',     label:'a clergyman',                       wealthMult:0.3, witBonus:10, faithBonus:20 },
  { id:'physician',     label:'a physician',                       wealthMult:0.6, witBonus:15, faithBonus:0  },
  { id:'lawyer',        label:'a lawyer',                          wealthMult:0.7, witBonus:10, faithBonus:0  },
  { id:'naval_officer', label:'a naval officer',                   wealthMult:0.5, witBonus:5,  faithBonus:5  },
  { id:'army_officer',  label:'an officer in the army',            wealthMult:0.6, witBonus:0,  faithBonus:0  },
  { id:'merchant',      label:'a merchant of some consequence',    wealthMult:0.8, witBonus:5,  faithBonus:0  },
  { id:'banker',        label:'a banker',                          wealthMult:1.2, witBonus:5,  faithBonus:0  },
  { id:'antiquary',     label:'a gentleman of scholarly pursuits', wealthMult:0.4, witBonus:20, faithBonus:5  },
];

const REP_TIERS = [
  { min:80, label:'Toast of the Ton' },
  { min:65, label:'Fashionable'      },
  { min:50, label:'Well Regarded'    },
  { min:35, label:'Respectable'      },
  { min:20, label:'Unremarkable'     },
  { min:0,  label:'Nobody'           },
];

// Life phases in order
// childhood → debut → adult → married (overlaps adult) → elder
const PHASES = ['childhood','debut','adult','elder'];

// ── NAME POOLS ─────────────────────────────────────────────

const NAMES = {
  female:  ['Eleanor','Charlotte','Georgiana','Arabella','Cecily','Harriet',
             'Lydia','Catherine','Anne','Jane','Emma','Frances','Louisa',
             'Caroline','Sophia','Beatrice','Constance','Dorothea','Helena'],
  male:    ['Edward','William','Henry','James','Frederick','Charles','Thomas',
             'Arthur','George','Edmund','Philip','Rupert','Oliver','Francis',
             'Alexander','Benedict','Clarence','Dominic','Everett'],
  surname: ['Pemberton','Ashworth','Colville','Hartley','Drummond','Fairfax',
             'Weston','Cavendish','Montague','Vane','Crawford','Willoughby',
             'Tilney','Ferrars','Bingley','Darcy','Brandon','Elton','Churchill'],
  places:  ['Netherfield','Pemberley','Donwell','Barton','Kellynch','Norland',
             'Sotherton','Mansfield','Uppercross','Longbourn','Hartfield'],
};

const NPC_TRAITS = ['witty','charming','reserved','haughty','kind',
                    'ambitious','melancholy','lively','proud','gentle',
                    'sardonic','earnest'];

const NPC_TRAIT_DESC = {
  witty:     'possessed of a quick tongue and quicker mind',
  charming:  'all easy smiles and practiced grace',
  reserved:  'measured in speech, difficult to read',
  haughty:   'accustomed to being the most important person in any room',
  kind:      'genuinely, sometimes inconveniently, good',
  ambitious: 'with an eye always on the better situation',
  melancholy:'prone to sighing dramatically at windows',
  lively:    'impossible to ignore and aware of it',
  proud:     'sensitive to slight and slow to forgive',
  gentle:    'the sort of person animals trust immediately',
  sardonic:  'finds the absurdity in everything, including you',
  earnest:   'means every single word, which is disarming',
};

// ── UTILITY ────────────────────────────────────────────────

const rand   = (a, b) => Math.floor(Math.random() * (b - a + 1)) + a;
const pick   = arr    => arr[Math.floor(Math.random() * arr.length)];
const clamp  = (v, a, b) => Math.max(a, Math.min(b, v));

function repTier(rep) {
  for (const t of REP_TIERS) if (rep >= t.min) return t.label;
  return 'Nobody';
}

function fullName(title, first, last) {
  return `${title} ${first} ${last}`;
}

// ── STATE ──────────────────────────────────────────────────

let G = {};

// ── FAMILY MORTALITY ──────────────────────────────────────
// Called each Spring to check if aging family members die

function ageFamilyMembers() {
  const deaths = [];

  // Parents — father slightly more at risk, both age naturally
  if (G.father && G.father.alive) {
    // Father mortality increases from age 55 equivalent (player age + 25ish)
    const fatherRisk = G.age > 35 ? 0.03 + (G.age - 35) * 0.015 : 0.01;
    if (Math.random() < Math.min(fatherRisk, 0.4)) {
      G.father.alive = false;
      deaths.push({ relation: 'father', name: G.father.name, processInheritance: true });
    }
  }
  if (G.mother && G.mother.alive) {
    const motherRisk = G.age > 38 ? 0.02 + (G.age - 38) * 0.012 : 0.008;
    if (Math.random() < Math.min(motherRisk, 0.35)) {
      G.mother.alive = false;
      deaths.push({ relation: 'mother', name: G.mother.name, processInheritance: true });
    }
  }

  // Siblings — low base risk, higher if closeness was low (estrangement story)
  for (const sib of G.siblings) {
    if (!sib.alive) continue;
    const sibRisk = 0.008 + (G.age > 40 ? (G.age - 40) * 0.008 : 0);
    if (Math.random() < Math.min(sibRisk, 0.2)) {
      sib.alive = false;
      deaths.push({ relation: sib.gender, name: sib.name, closeness: sib.closeness });
    }
  }

  return deaths;
}

// Sibling marriage — generates a match for an unmarried sibling
function maybeSiblingMarries() {
  const unmarried = G.siblings.filter(s => s.alive && !s.spouse);
  if (!unmarried.length || Math.random() > 0.15) return null;
  const sib = pick(unmarried);
  const spouseGender = sib.gender === 'sister' ? 'male' : 'female';
  const spouseName = pick(spouseGender === 'male' ? NAMES.male : NAMES.female)
    + ' ' + pick(NAMES.surname);
  sib.spouse = spouseName;
  sib.children = sib.children || [];
  return { sib, spouseName };
}

// Child grows up — ages children each Spring
function ageChildren() {
  const milestones = [];
  for (const child of G.children) {
    child.age = (child.age || 0) + 1;
    if (child.age === 5)  milestones.push({ child, event: 'started lessons',       needsChoice: true  });
    if (child.age === 10) milestones.push({ child, event: 'showing their character', needsChoice: true  });
    if (child.age === 16) {
      resolveChildTraits(child); // lock in personality
      milestones.push({ child, event: 'coming of age', needsChoice: false });
    }
    if (child.age === 18 && child.gender === 'daughter') {
      milestones.push({ child, event: 'debut', needsChoice: false });
    }
  }
  return milestones;
}

// ── NPC GENERATION ─────────────────────────────────────────

function generateNPC(id, forceMale = null) {
  const isMale = forceMale !== null ? forceMale : Math.random() < 0.4;
  const gender = isMale ? 'male' : 'female';
  const first  = pick(NAMES[gender]);
  const last   = pick(NAMES.surname);
  const trait  = pick(NPC_TRAITS);
  const wealth = pick([200, 500, 1000, 2500, 5000, 8000]);
  const age    = rand(18, 48);
  const title  = isMale
    ? pick(['Mr','Sir','Lord','Captain'])
    : pick(['Miss','Mrs','Lady']);

  // Full stats — makes NPCs feel like real people
  // Faith: influenced by trait
  const faithBase = { kind:75, gentle:70, earnest:65, reserved:60, proud:50,
                       witty:45, charming:50, ambitious:35, haughty:40,
                       lively:45, melancholy:55, sardonic:30 };
  const faith = clamp((faithBase[pick(NPC_TRAITS)] || 50) + rand(-15,15), 10, 95);
  return {
    id,
    first, last, trait, wealth, gender, age,
    title,
    fullName: fullName(title, first, last),
    nick: first,
    desc: NPC_TRAIT_DESC[trait] || trait,
    // Personal stats (0-100)
    health:     rand(40, 95),
    looks:      rand(30, 90),
    wit:        rand(30, 90),
    reputation: rand(25, 85),
    faith,
    // Relationship
    closeness:  0,
    approval:   50,  // their approval of YOU (0-100)
    introduced: false,
    isRival:    false,
    // Life state
    isMarried:  Math.random() < (age > 25 ? 0.4 : 0.1),
    hasChildren:Math.random() < (age > 28 ? 0.35 : 0.05),
    alive:      true,
  };
}


// ═══════════════════════════════════════════════════════════
// FATHER BACKGROUND GENERATOR
// Randomises the father's wealth, profession, title
// which determines the player's starting circumstances
// ═══════════════════════════════════════════════════════════

function generateFatherBackground() {
  // Use the previewed background from character creation if available
  if (typeof window !== 'undefined' && window._pendingFatherBg) {
    var bg = window._pendingFatherBg;
    window._pendingFatherBg = null;
    return bg;
  }
  // Pick a profession (weighted — most are middling gentry)
  var profWeights = [30, 8, 10, 10, 8, 8, 10, 6, 10]; // matches FATHER_PROFESSIONS order
  var profTotal = profWeights.reduce(function(a,b){return a+b;}, 0);
  var profRoll = Math.random() * profTotal;
  var profIdx = 0;
  var cumul = 0;
  for (var i = 0; i < profWeights.length; i++) {
    cumul += profWeights[i];
    if (profRoll < cumul) { profIdx = i; break; }
  }
  var profession = FATHER_PROFESSIONS[profIdx];

  // Title: 70% untitled, 20% Sir, 7% Hon/Lord, 3% Earl+
  var titleRoll = Math.random();
  var titleObj;
  if (titleRoll < 0.03) {
    titleObj = FATHER_TITLES[3]; // Earl
  } else if (titleRoll < 0.10) {
    titleObj = FATHER_TITLES[2]; // Lord
  } else if (titleRoll < 0.20) {
    titleObj = FATHER_TITLES[1]; // Hon
  } else if (titleRoll < 0.30) {
    titleObj = FATHER_TITLES[0]; // Sir
  } else {
    titleObj = FATHER_TITLES[4]; // Mr (untitled)
  }

  // Father's base wealth — random within title range, modified by profession
  var baseWealth = rand(titleObj.wealthMin, titleObj.wealthMax);
  var fatherWealth = Math.floor(baseWealth * profession.wealthMult);

  // Pin money: daughters get a small seasonal allowance
  // Typically 1-5% of father's annual income, per season
  var pinMoneyPct = titleObj.titleRank >= 3 ? 0.04 : titleObj.titleRank >= 1 ? 0.025 : 0.015;
  var pinMoney = Math.max(5, Math.floor(fatherWealth * pinMoneyPct));

  // Father's surname (becomes player surname)
  var surname = pick(NAMES.surname);

  // Father's title affects starting reputation
  var repBonus = titleObj.rep + (profession.id === 'clergyman' ? 5 : 0);

  // Wit and looks bonuses
  var witBonus   = profession.witBonus  + rand(-5, 5);
  var looksBonus = titleObj.titleRank >= 3 ? rand(5,10) : rand(-5, 5);
  var faithBonus = profession.faithBonus + rand(-5, 5);

  // Father's potential will — what the player might inherit
  // (actual inheritance resolved at age 18/21 or on father's death)
  var willType = 'none';
  var willValue = 0;
  var willDesc = '';

  if (fatherWealth > 8000) {
    // Very wealthy — estate likely entailed, but settlements possible
    willType  = Math.random() < 0.4 ? 'settlement' : 'investment';
    willValue = rand(500, 2000);
    willDesc  = willType === 'settlement'
      ? 'A marriage settlement of £' + willValue + ' is set aside for you.'
      : 'A share in the family investments, worth some £' + willValue + ', is intended for you.';
  } else if (fatherWealth > 2000) {
    willType  = Math.random() < 0.3 ? 'property' : 'cash';
    willValue = rand(200, 800);
    willDesc  = willType === 'property'
      ? 'Your father intends a small property for you, should you remain unmarried.'
      : '£' + willValue + ' set aside for your future.';
  } else if (fatherWealth > 500) {
    willType  = 'cash';
    willValue = rand(50, 300);
    willDesc  = '£' + willValue + ' is all that can be managed, but it is given with love.';
  } else {
    willDesc = 'There is very little to leave. Your father knows it and it weighs on him.';
  }

  return {
    profession:  profession.id,
    profLabel:   profession.label,
    titleRank:   titleObj.titleRank,
    titlePrefix: titleObj.title,
    surname:     surname,
    fatherWealth: fatherWealth,
    rankId:      titleObj.titleRank >= 3 ? 'nobility' : titleObj.titleRank >= 1 ? 'gentry' : profession.id === 'clergyman' ? 'clergy' : profession.wealthMult >= 0.8 ? 'trade' : 'gentry',
    rankLabel:   titleObj.titleRank >= 3 ? 'Nobility' : titleObj.titleRank >= 1 ? 'Gentry' : profession.label.charAt(0).toUpperCase() + profession.label.slice(1),
    pinMoney:    pinMoney,
    repBonus:    repBonus,
    witBonus:    witBonus,
    looksBonus:  looksBonus,
    faithBonus:  faithBonus,
    will: {
      type:  willType,
      value: willValue,
      desc:  willDesc,
    },
  };
}

// Generate a richer father description for the birth popup
function describeFatherBackground(bg) {
  var prefix = bg.titlePrefix !== 'Mr' ? bg.titlePrefix + ' ' : 'Mr ';
  var wealth = bg.fatherWealth > 5000 ? 'wealthy'
             : bg.fatherWealth > 2000 ? 'comfortably placed'
             : bg.fatherWealth > 500  ? 'of modest means'
             : 'of slender means';
  return prefix + bg.surname + ', ' + bg.profLabel + ', ' + wealth + '.';
}

function generateFamily() {
  // Parents are in their 30s-50s when player is born (age 6)
  const motherAge = rand(28, 48);
  const fatherAge = rand(30, 55);
  const mTrait = pick(NPC_TRAITS);
  const fTrait = pick(NPC_TRAITS);
  const faithMap = { kind:75, gentle:70, earnest:65, reserved:60, proud:50,
                     witty:45, charming:50, ambitious:35, haughty:40,
                     lively:45, melancholy:55, sardonic:30 };
  G.mother = {
    name:      pick(NAMES.female) + ' ' + pick(NAMES.surname),
    closeness: 60, alive: true, trait: mTrait,
    age:       motherAge,
    health:    rand(50, 90),
    wit:       rand(30, 80),
    looks:     rand(35, 80),
    faith:     clamp((faithMap[mTrait]||50) + rand(-10,10), 20, 95),
    approval:  65,  // mothers start more approving
    wealth:    Math.floor(G.wealth * 0.3),
  };
  var bg = G.fatherBg || {};
  var fatherSurname = bg.surname || pick(NAMES.surname);
  var fatherPrefix  = bg.titlePrefix || 'Mr';
  G.father = {
    name:       fatherPrefix + ' ' + fatherSurname,
    surname:    fatherSurname,
    closeness:  50, alive: true, trait: fTrait,
    age:        fatherAge,
    health:     rand(50, 90),
    wit:        rand(30, 80),
    faith:      clamp((faithMap[fTrait]||50) + rand(-10,10), 20, 95),
    approval:   55,
    wealth:     bg.fatherWealth || rand(200, 2000),
    titleRank:  bg.titleRank || 0,
    profession: bg.profession || 'landed_gentry',
    will:       bg.will || null,
  };
  G.siblings = [];
  const count = rand(1, 3);
  for (let i = 0; i < count; i++) {
    const gender  = Math.random() < 0.5 ? 'sister' : 'brother';
    const sibAge  = rand(4, 18); // mix of older and younger
    const sTrait = pick(NPC_TRAITS);
    G.siblings.push({
      name:      pick(gender === 'sister' ? NAMES.female : NAMES.male),
      surname:   pick(NAMES.surname),
      gender, closeness: rand(40, 70),
      trait:     sTrait,
      alive:     true, eloped: false,
      age:       sibAge,
      health:    rand(50, 90),
      wit:       rand(30, 80),
      faith:     clamp((faithMap[sTrait]||50) + rand(-10,10), 20, 95),
      approval:  50,
      wealth:    rand(50, 500),
    });
  }
}

// ── NEW GAME ───────────────────────────────────────────────

function newGame(name, gender, rankId) {
  // rankId kept for backward compat but no longer drives stats
  // Father background is generated randomly and drives starting conditions
  var fatherBg = generateFatherBackground();

  G = {
    // Identity
    name: name, gender: gender,
    rankId:   fatherBg.rankId,
    rank:     fatherBg.rankLabel,
    fatherBg: fatherBg,  // stored for use in family events

    // Age & time
    age:    0,
    season: 'Spring',

    // Core stats — driven by father's background, not player choice
    health:     80,
    looks:      clamp(40 + fatherBg.looksBonus, 0, 100),
    wit:        clamp(30 + fatherBg.witBonus,   0, 100),
    reputation: clamp(40 + fatherBg.repBonus,   0, 100),

    // Finances — player starts with nothing personally
    // Pin money is provided by father each season
    wealth: 0,
    income: 0,
    pinMoney: fatherBg.pinMoney,  // seasonal allowance from father

    // Life phase
    phase: 'childhood',  // childhood | debut | adult | elder

    // Marriage & children
    isMarried: false,
    spouse:    null,
    children:  [],

    // Social
    npcs:     [],        // introduced NPCs
    npcPool:  [],        // all generated NPCs
    rival:    null,

    // Childhood
    governess: null,     // null | 'Miss Sharp' etc.
    schooling: null,     // null | school name

    // Family
    mother:   null,
    father:   null,
    siblings: [],

    // Player faith (0-100) — affects family approval, some events
    faith:       clamp(40 + fatherBg.faithBonus, 10, 95),
    // Education & debut
    eduStats:    null,   // populated by initEducation()
    eligibility: 0,
    debutDone:   false,
    debutAge:    null,
    debutPlan:   null,
    // Tracking
    scandals:    0,
    pets:        [],   // { name, animal, age:0, health:100, alive:true }
    household:   null, // populated by initHousehold() at marriage
    schoolmates: [],  // generated when boarding/sunday school starts
    timesIll:    0,
    log:         [],     // { text, type } — kept for feed rendering

    // Assets, title, will
    assets:        [],
    // Pregnancy
    pregnancy:     null,
    // Suitors — persistent across seasons
    suitorPool:    [],  // { suitor, metHow, metSeason, courted, declined }
    weddingPlan:   null,
    // Finance
    investments:   [],
    debts:         [],
    title:         null,
    will:          null,

    // Social system
    relationships: {},  // npcId → { closeness, status, lastInteraction }
    // status: 'stranger'|'acquaintance'|'friend'|'dear_friend'|'confidante'|'rival'|'enemy'
    familyEvents: [],   // log of notable family story moments
  };

  generateFamily();
  initTitle(rankId);
  initWill();
  if (typeof initEducation === 'function') initEducation();

  // Generate NPC pool — introduced gradually during play
  for (let i = 0; i < 12; i++) {
    G.npcPool.push(generateNPC('npc' + i));
  }
}

// ── STAT MUTATION ──────────────────────────────────────────
// All stat changes go through this so we can add hooks later
// (e.g. logging, achievements, reputation tier crossing)

function changeStat(stat, delta) {
  const isFinancial = stat === 'wealth' || stat === 'income';
  const max = isFinancial ? 9999999 : 100;
  const before = G[stat];
  G[stat] = clamp(G[stat] + delta, 0, max);
  const actual = G[stat] - before;

  // Check for reputation tier crossing (could trigger popup in ui.js)
  if (stat === 'reputation') {
    checkRepTierCross(before, G[stat]);
  }
  return actual; // returns the actual change (may differ from delta if clamped)
}

function checkRepTierCross(before, after) {
  const tierBefore = repTier(before);
  const tierAfter  = repTier(after);
  if (tierBefore !== tierAfter) {
    const up = after > before;
    const msg = up
      ? `You are now considered ${tierAfter}.`
      : `You are now considered ${tierAfter}. Your mother is not pleased.`;
    // Queue a flavour popup via the UI layer
    if (typeof queuePopup === 'function') {
      queuePopup(msg, up ? '★ ' + tierAfter : tierAfter, null, null, true);
    }
  }
}

// ── MORTALITY ──────────────────────────────────────────────

function checkMortality() {
  // Critical health — chance of death scales with how low health is
  if (G.health <= 0)  return Math.random() < 0.90;  // 90% at 0
  if (G.health <= 5)  return Math.random() < 0.60;
  if (G.health <= 10) return Math.random() < 0.30;
  if (G.health <= 20) return Math.random() < 0.12;

  // Elder phase — age-based mortality (starts at 60, accelerates)
  if (G.phase === 'elder') {
    const elderYears = G.age - 60;
    const chance = Math.min(0.05 + elderYears * 0.04, 0.75);
    return Math.random() < chance;
  }

  return false;
}

function buildDeathMessage() {
  // Returns flavour text for cause of death based on state
  if (G.health <= 10) {
    const causes = [
      'A long illness finally prevailed.',
      'The doctor had warned against overexertion. Nobody listened.',
      'A winter chill that simply never lifted.',
      'The constitution, always delicate, gave way at last.',
    ];
    return pick(causes);
  }
  if (G.phase === 'elder') {
    const elder = [
      'A peaceful end, in the fullness of years.',
      'They slipped away quietly one Autumn morning.',
      'At a very great age, and reportedly still with opinions about everything.',
      'Surrounded by those who loved them, in the house they had always lived in.',
    ];
    return pick(elder);
  }
  return 'Unexpectedly, and far too soon.';
}

// ── RELATIONSHIP HELPERS ───────────────────────────────────

function changeCloseness(personObj, delta) {
  personObj.closeness = clamp((personObj.closeness || 0) + delta, 0, 100);
}

function closenessLabel(n) {
  if (n >= 80) return 'Confidante';
  if (n >= 60) return 'Dear Friend';
  if (n >= 40) return 'Friend';
  if (n >= 20) return 'Acquaintance';
  return 'Stranger';
}

function familyClosenessLabel(n) {
  if (n >= 80) return 'Devoted';
  if (n >= 60) return 'Close';
  if (n >= 40) return 'Cordial';
  if (n >= 20) return 'Distant';
  return 'Estranged';
}

// ── NPC INTRODUCTION ───────────────────────────────────────

function introduceRandomNPC() {
  const pool = G.npcPool.filter(n => !n.introduced);
  if (!pool.length) return null;

  const npc = pick(pool);
  npc.introduced = true;
  npc.closeness  = rand(15, 30);
  G.npcs.push(npc);

  // 25% chance this NPC becomes a rival
  const becomeRival = !G.rival && Math.random() < 0.25;
  if (becomeRival) {
    npc.isRival = true;
    G.rival = npc;
  }
  return { npc, isRival: becomeRival };
}

function getIntroducedNPCs()  { return G.npcs.filter(n => n.introduced); }
function getFriendlyNPCs()    { return G.npcs.filter(n => n.introduced && !n.isRival); }

// ── SEASON ADVANCE ─────────────────────────────────────────
// Called when player taps "Advance the Season"
// Returns an object describing what happened this season
// so the UI layer can show appropriate popups/log entries

function advanceSeason() {
  const events = []; // { text, type, popup? }

  const wasSpring = G.season === 'Spring';
  G.season = wasSpring ? 'Autumn' : 'Spring';
  const isNewYear = G.season === 'Spring'; // Spring = new year = birthday

  // ── Age up (once per year, on Spring) ──
  if (isNewYear) {
    G.age += 1;

    // Governess annual wit bonus
    if (G.governess && G.phase === 'childhood') {
      changeStat('wit', rand(2, 4));
      events.push({ text: `${G.governess} approves of your progress. Grudgingly.`, type: 'good' });
    }
    // School annual bonus
    if (G.schooling && G.phase === 'childhood') {
      changeStat('wit', rand(2, 5));
      changeStat('reputation', rand(1, 3));
      const schoolName = G.schooling && G.schooling.name ? G.schooling.name
                  : G.schooling && G.schooling.type ? G.schooling.type
                  : 'school';
      events.push({ text: `Another year at ${schoolName}. The education continues relentlessly.`, type: 'good' });
    }
    // Seasonal health check
    if (rand(1, 10) <= 2) {
      const dmg = rand(8, 18);
      changeStat('health', -dmg);
      events.push({ text: `You suffer an illness over the winter.`, type: 'bad' });
    }
    // Annual income (base + asset net income)
    const assetNet = typeof netAssetIncome === 'function' ? netAssetIncome() : 0;
    G.wealth += Math.floor(G.income / 2) + assetNet;
    // Pin money — father's seasonal allowance for unmarried female players
    if (G.gender === 'female' && !G.isMarried && G.phase === 'childhood' && G.pinMoney > 0) {
      G.wealth += G.pinMoney;
      if (G.age >= 6) events.push({ text: 'Your father’s quarterly allowance arrives. £' + G.pinMoney + '.', type: 'good' });
    }
  } else {
    // Autumn: smaller income payment
    const assetNetA = typeof netAssetIncome === 'function' ? netAssetIncome() : 0;
    G.wealth += Math.floor(G.income / 4) + Math.floor(assetNetA / 2);
    if (rand(1, 10) === 1) {
      const dmg = rand(5, 12);
      changeStat('health', -dmg);
      events.push({ text: `A summer cold takes hold. Inconvenient.`, type: 'bad' });
    }
  }

  // ── Household seasonal update (married female players) ──
  if (G.isMarried && G.gender === 'female' && typeof householdSeasonalUpdate === 'function') {
    const hhEvents = householdSeasonalUpdate();
    if (hhEvents) hhEvents.forEach(function(e) { events.push(e); });
  }

  // ── Finance processing (debt interest, investment returns) ──
  if (typeof processDebts === 'function') {
    const debtEvts = processDebts();
    for (const de of debtEvts) events.push(de);
  }
  if (typeof processInvestments === 'function') {
    const invEvts = processInvestments();
    for (const ie of invEvts) events.push(ie);
  }

  // ── Asset decay ──
  if (typeof decayAssets === 'function') {
    const assetEvents = decayAssets();
    if (assetEvents) {
      for (const ae of assetEvents) events.push({ text: ae.text, type: ae.type });
    }
  }

  // ── Mortality check ──
  // Critical health (below 20): escalating death chance
  // Elder phase: additional age-based mortality
  if (G.health <= 0 || checkMortality()) {
    events.push({ death: true });
    return { isNewYear, events, died: true };
  }

  // ── Reputation decay (social standing requires maintenance) ──
  if (G.phase !== 'childhood' && isNewYear) {
    const tier = repTier(G.reputation);
    // Higher tiers decay faster — the Ton is demanding
    const decay = tier === 'Toast of the Ton' ? rand(3,6)
                : tier === 'Fashionable'       ? rand(2,4)
                : tier === 'Well Regarded'      ? rand(1,3)
                : tier === 'Respectable'        ? rand(0,2)
                : 0; // Nobody and below don't decay further
    if (decay > 0) changeStat('reputation', -decay);
  }

  // ── Phase transitions (Spring only) ──
  if (isNewYear) {
    // ── Early childhood milestones ──────────────────────────
    // Age 4: schooling choice (first time only)
    if (G.phase === 'childhood' && G.age === 4 && !G.schoolingOffered) {
      G.schoolingOffered = true;
      events.push({ earlyMilestone: 'schooling_age', age: 4 });
    }
    // Age 10: full curriculum unlocks
    if (G.phase === 'childhood' && G.age === 10 && !G.fullCurriculumUnlocked) {
      G.fullCurriculumUnlocked = true;
      events.push({ earlyMilestone: 'full_curriculum', age: 10 });
    }
    // Future talk — father/guardian conversation about prospects, fires once at 13
    if (G.phase === 'childhood' && G.age === 13 && !G.futureTalkDone && G.gender === 'female') {
      G.futureTalkDone = true;
      events.push({ earlyMilestone: 'future_talk', age: 13 });
    }
    // Age 16+: debut negotiation
    // ── Coming of age inheritance (18 and 21) ──────────────
    if (G.gender === 'female' && !G.inheritanceHandled18 && G.age === 18) {
      G.inheritanceHandled18 = true;
      events.push({ comingOfAge: 18 });
    }
    if (G.gender === 'female' && !G.inheritanceHandled21 && G.age === 21) {
      G.inheritanceHandled21 = true;
      events.push({ comingOfAge: 21 });
    }

    if (G.phase === 'childhood' && G.age >= 16 && !G.debutAge) {
      events.push({ debutNegotiation: true });
    }
    if (G.phase === 'childhood' && G.debutAge && G.age >= G.debutAge && !G.debutDone) {
      // Time to debut
      events.push({
        text: `You are ${G.age}. It is time.`,
        type: 'event',
        transition: 'debut',
      });
    }
    if (G.phase === 'debut' && !G.debutDone) {
      // Legacy fallback
      G.phase = 'adult';
    }
    if (G.age >= 60 && G.phase !== 'elder') {
      G.phase = 'elder';
      events.push({
        text: 'You have reached a certain age. The young people are slightly afraid of you.',
        type: 'event',
        transition: 'elder',
      });
    }
    // Spinster note
    if (G.age === 25 && !G.isMarried && G.gender === 'female') {
      changeStat('reputation', -5);
      events.push({
        text: '"Five and twenty," your mother says, as if you had done something illegal.',
        type: 'bad',
        popup: { text: '"Five and twenty," your mother says, as if you had done something illegal.', badge: 'Reputation -5' },
      });
    }
  }

  // ── Family ageing (all phases, Spring only) ──
  if (isNewYear) {
    const deaths = ageFamilyMembers();
    for (const d of deaths) {
      events.push({ familyDeath: d });
    }
    const sibMarriage = maybeSiblingMarries();
    if (sibMarriage) events.push({ siblingMarriage: sibMarriage });
    const childMilestones = ageChildren();
    for (const m of childMilestones) {
      events.push({ childMilestone: m });
    }
    // Check for orphan condition
    const motherDead = !G.mother || !G.mother.alive;
    const fatherDead = !G.father || !G.father.alive;
    if (motherDead && fatherDead && G.phase === 'childhood' && !G.orphanHandled) {
      G.orphanHandled = false; // will be set true by UI handler
      events.push({ orphaned: true });
    }
  }

  // ── Education season processing ──
  if (G.phase === 'childhood' && typeof processEducationSeason === 'function') {
    processEducationSeason();
  }

  // ── Pregnancy events ──
  if (G.pregnancy && !G.pregnancy.miscarried) {
    events.push({ pregnancyEvents: true });
  }

  // ── Infancy events (age 0-3) ──
  if (G.phase === 'childhood' && G.age < 4) {
    const infEv = fireInfancyEvent();
    if (infEv) events.push(infEv);
    // Age automatically on every season at this age (no player interaction needed)
  }

  // ── Infancy events (age 0-3) ──
  if (G.phase === 'childhood' && G.age < 4 && typeof fireInfancyEvent === 'function') {
    const infEv = fireInfancyEvent();
    if (infEv) events.push(infEv);
  }

  // ── Childhood random event (40%) ──
  if (G.phase === 'childhood' && Math.random() < 0.4) {
    events.push({ childhoodEvent: true });
  }

  // ── Random event (30%) ──
  if (Math.random() < 0.3 && G.phase !== 'childhood') {
    events.push({ randomEvent: true });
  }

  // ── NPC introduction (35%) ──
  if (
    G.phase !== 'childhood' &&
    getIntroducedNPCs().length < 8 &&
    Math.random() < 0.35
  ) {
    events.push({ introduceNPC: true });
  }

  return { isNewYear, events };
}

// ── SUITOR POOL ───────────────────────────────────────────
// Persistent list of eligible men the player has encountered

function addToSuitorPool(suitor, metHow) {
  if (!G.suitorPool) G.suitorPool = [];
  // Don't add duplicates
  if (G.suitorPool.find(e => e.suitor.first === suitor.first && e.suitor.last === suitor.last)) return;
  G.suitorPool.push({
    suitor,
    metHow,       // 'mart' | 'ball' | 'park' | 'church' | 'family'
    metSeason:    G.season + ' ' + G.year,
    courted:      false,
    declined:     false,
    interest:     rand(20,60), // their interest in you (0-100), changes with interactions
  });
  saveGame();
}

function getAvailableSuitors() {
  if (!G.suitorPool) return [];
  return G.suitorPool.filter(e => !e.declined && !G.isMarried);
}

function getSuitorEntry(suitorFirst) {
  if (!G.suitorPool) return null;
  return G.suitorPool.find(e => e.suitor.first === suitorFirst);
}

// ── MARRIAGE ───────────────────────────────────────────────

// Courtship styles — affects how flirt/dance/enquire land
const COURTSHIP_STYLES = [
  { id:'romantic',  label:'Romantic',   flirtBonus:2,  danceBonus:2,  enquireBonus:-1, proposeSpeech:'heartfelt' },
  { id:'practical', label:'Practical',  flirtBonus:-1, danceBonus:0,  enquireBonus:3,  proposeSpeech:'businesslike' },
  { id:'nervous',   label:'Nervous',    flirtBonus:-1, danceBonus:-1, enquireBonus:1,  proposeSpeech:'stumbling' },
  { id:'arrogant',  label:'Arrogant',   flirtBonus:1,  danceBonus:1,  enquireBonus:0,  proposeSpeech:'presumptuous' },
  { id:'charming',  label:'Charming',   flirtBonus:3,  danceBonus:2,  enquireBonus:1,  proposeSpeech:'polished' },
  { id:'reserved',  label:'Reserved',   flirtBonus:-2, danceBonus:0,  enquireBonus:2,  proposeSpeech:'formal' },
];

function generateSuitors(count = 3) {
  // Generate fresh suitors — mix of NPC pool and generated
  const pool = G.npcPool.filter(n => n.gender === 'male' && !n.introduced);
  const suitors = [];
  const usedNames = new Set();

  for (let i = 0; i < count; i++) {
    let base = pool[i];
    if (!base || usedNames.has(base.first + base.last)) {
      base = generateNPC('suitor_fresh_' + i, true);
    }
    usedNames.add(base.first + base.last);

    // Rank-appropriate wealth ranges
    const rankRoll = rand(1,10);
    const wealth = rankRoll >= 9 ? rand(5000, 15000)  // Earl+
                 : rankRoll >= 7 ? rand(2000, 6000)    // Gentleman
                 : rankRoll >= 4 ? rand(800,  2500)    // Officer/Clergyman
                 :                 rand(200,  900);    // Modest

    const title = wealth > 5000 ? pick(['Lord', 'Sir', 'The Honourable'])
                : wealth > 2000 ? 'Mr'
                : wealth > 1200 ? pick(['Mr', 'Captain', 'Major'])
                : pick(['Mr', 'Reverend', 'Dr']);
    const rankLabel = wealth > 8000 ? 'Earl' : wealth > 4000 ? 'Gentleman of fortune'
                    : wealth > 1500 ? 'Gentleman' : wealth > 800 ? 'Officer' : 'Clergyman';

    // Assign courtship style — influenced by trait
    const styleMap = {
      witty:'charming', charming:'charming', reserved:'reserved', haughty:'arrogant',
      kind:'romantic', ambitious:'practical', melancholy:'reserved', lively:'charming',
      proud:'arrogant', gentle:'romantic', sardonic:'reserved', earnest:'romantic',
    };
    const style = COURTSHIP_STYLES.find(s => s.id === (styleMap[base.trait] || 'charming')) || COURTSHIP_STYLES[0];

    // Title rank for title system
    const titleRank = wealth > 8000 ? 4 : wealth > 4000 ? 3 : wealth > 2000 ? 1 : 0;

    suitors.push({
      ...base,
      wealth,
      title,
      fullName: fullName(title, base.first, base.last),
      rankLabel,
      courtshipStyle: style,
      titleRank,
    });
  }
  return suitors;
}

function acceptProposal(suitor) {
  G.isMarried        = true;
  if (typeof initHousehold === 'function') initHousehold();
  G.spouse           = suitor;
  G.spouse.closeness = 65; // start married with a solid relationship
  G.spouse.approval  = 70; // spouse starts approving of you
  G.wealth          += suitor.wealth;
  G.income          += Math.floor(suitor.wealth / 2);
  changeStat('reputation', rand(10, 20));
  if (G.phase === 'debut') G.phase = 'adult';
  if (typeof acquireTitleThroughMarriage === 'function') {
    acquireTitleThroughMarriage(suitor);
  }
  // Generate spouse's family
  if (!suitor.parents) {
    const rnd = pick(['Davies','Morton','Fenton','Granger','Holt','Price']);
    suitor.parents = [
      { name: 'Mr ' + (suitor.last||rnd), role:'Father-in-law', age: (suitor.age||30)+rand(25,35), alive: Math.random()>0.3 },
      { name: 'Mrs ' + (suitor.last||rnd), role:'Mother-in-law', age: (suitor.age||30)+rand(22,32), alive: Math.random()>0.4 },
    ].filter(p => p.alive);
  }
  if (!suitor.siblings) {
    const count = rand(0,3);
    suitor.siblings = [];
    for (let i=0; i<count; i++) {
      const g = Math.random()<0.5?'sister':'brother';
      suitor.siblings.push({
        name: g==='sister' ? pick(NAMES.female) : pick(NAMES.male),
        gender: g, age: (suitor.age||30)+rand(-8,8), closeness:rand(20,50),
      });
    }
  }
}

// Refresh household tier when wealth or assets change
// Called after inheritances, investments etc.
function onWealthChange() {
  if (typeof refreshHouseholdTier === 'function') refreshHouseholdTier();
}

// ── CHILDREN ───────────────────────────────────────────────

const CHILD_NAMES = {
  son:      ['Edward','William','George','Henry','Charles','Frederick','Arthur','James'],
  daughter: ['Charlotte','Anne','Eleanor','Harriet','Louisa','Cecily','Jane','Sophia'],
};

function attemptConception() {
  // Chance decreases with age
  const threshold = G.age <= 25 ? 5
                  : G.age <= 30 ? 6
                  : G.age <= 35 ? 7
                  : G.age <= 40 ? 8 : 9;
  return rand(1, 10) >= threshold;
}

function birthOutcome() {
  // Returns { survived, childGender, childName, motherSurvived, complications }
  const safeThreshold = G.health >= 70 ? 3 : G.health >= 50 ? 5 : 7;
  const roll = rand(1, 10);
  const safe = roll >= safeThreshold;
  const childGender = Math.random() < 0.5 ? 'son' : 'daughter';
  const existingOfGender = G.children.filter(c => c.gender === childGender).length;
  const childName = CHILD_NAMES[childGender][Math.min(existingOfGender, 7)];

  if (safe) {
    return { survived: true, childGender, childName, motherSurvived: true, complications: false };
  } else {
    const outcome = rand(1, 10);
    if (outcome >= 5) {
      return { survived: true, childGender, childName, motherSurvived: true, complications: true };
    } else if (outcome >= 2) {
      return { survived: false, childGender, childName, motherSurvived: true, complications: true };
    } else {
      return { survived: false, childGender, childName, motherSurvived: false, complications: true };
    }
  }
}

// Child personality traits — shaped by player choices at milestones
// Each child has a 'seeds' object tracking what shaped them
// and a resolved 'traits' array once they come of age

const CHILD_TRAITS = {
  // Positive
  scholarly:  { label:'scholarly',    desc:'bookish and thoughtful, always with a question' },
  spirited:   { label:'spirited',     desc:'energetic and wilful, impossible to ignore'      },
  kind:       { label:'kind',         desc:'gentle with everyone, even when it costs them'   },
  witty:      { label:'witty',        desc:'sharp-tongued and quick, the image of their parent' },
  artistic:   { label:'artistic',     desc:'always drawing or playing, easily lost in beauty' },
  brave:      { label:'brave',        desc:'unafraid of things that should frighten them'    },
  // Negative / complex
  stubborn:   { label:'stubborn',     desc:'their own way in everything — a quality that will serve them, eventually' },
  anxious:    { label:'anxious',      desc:'careful and cautious, easily overwhelmed by the world' },
  wild:       { label:'wild',         desc:'ungovernable, thrilling, and a source of considerable anxiety' },
  melancholy: { label:'melancholy',   desc:'thoughtful to the point of sadness, with a deep inner life' },
};

function addChild(childGender, childName) {
  // Starting stats: average of both parents + random variation
  const spouse = G.spouse;
  const baseHealth = Math.round(((G.health || 70) + (spouse ? (spouse.health||70) : 70)) / 2);
  const baseWit    = Math.round(((G.wit    || 50) + (spouse ? (spouse.wit   ||50) : 50)) / 2);
  const baseLooks  = Math.round(((G.looks  || 50) + (spouse ? (spouse.looks ||50) : 50)) / 2);

  // Add ±15 random variation to each stat
  const childHealth = clamp(baseHealth + rand(-15, 15), 20, 95);
  const childWit    = clamp(baseWit    + rand(-15, 15), 20, 95);
  const childLooks  = clamp(baseLooks  + rand(-15, 15), 20, 95);

  // Personality seeds — influenced by both parents
  const seeds = {};
  if (G.wit >= 60 || (spouse && spouse.wit  >= 60)) seeds.scholarly = 1;
  if (G.looks >= 60|| (spouse && spouse.looks>=60)) seeds.artistic  = 1;
  if (G.health>=70 || (spouse && spouse.health>=70))seeds.spirited  = 1;
  if (G.reputation >= 65)                           seeds.kind      = 1;
  if (G.scandals >= 3)                              seeds.wild      = 1;
  // Spouse trait influence
  if (spouse && spouse.trait === 'witty')           seeds.witty     = 1;
  if (spouse && spouse.trait === 'kind')            seeds.kind      = (seeds.kind||0)+1;
  if (spouse && spouse.trait === 'melancholy')      seeds.melancholy= 1;

  G.children.push({
    gender:    childGender,
    name:      childName,
    age:       0,
    health:    childHealth,
    wit:       childWit,
    looks:     childLooks,
    seeds,
    traits:    [],
    closeness: 50,
  });
  changeStat('reputation', childGender === 'son' ? rand(15, 20) : rand(8, 12));
}

// Called at milestone choices — player decisions shape the child
function shapeChildPersonality(child, seed, weight = 1) {
  child.seeds[seed] = (child.seeds[seed] || 0) + weight;
}

// Called at age 16 — resolves seeds into 1-2 defining traits
function resolveChildTraits(child) {
  if (child.traits && child.traits.length) return; // already resolved
  const entries = Object.entries(child.seeds || {});
  if (!entries.length) {
    child.traits = [pick(Object.keys(CHILD_TRAITS))];
    return;
  }
  // Sort by weight, take top 1-2
  entries.sort((a,b) => b[1]-a[1]);
  child.traits = entries.slice(0, rand(1,2)).map(e => e[0]);
}

function childTraitDesc(child) {
  if (!child.traits || !child.traits.length) return 'still forming';
  return child.traits.map(t => (CHILD_TRAITS[t] ? CHILD_TRAITS[t].desc : t)).join('; ');
}

// ── FAITH & APPROVAL ───────────────────────────────────────

// Faith labels
function faithLabel(f) {
  if (f >= 80) return 'Devout';
  if (f >= 60) return 'Observant';
  if (f >= 40) return 'Modest';
  if (f >= 20) return 'Indifferent';
  return 'Irreligious';
}

// How much faith alignment affects approval
// Similar faith = small approval bonus; very different = penalty
function faithAlignmentEffect(personFaith) {
  const pFaith = personFaith || 50;
  const playerFaith = G.faith || 50; // player has a faith stat too
  const diff = Math.abs(pFaith - playerFaith);
  if (diff <= 10) return 5;   // very aligned
  if (diff <= 25) return 2;   // mostly aligned
  if (diff <= 45) return 0;   // neutral
  if (diff <= 60) return -3;  // divergent
  return -8;                  // strongly opposed
}

// Get effective approval (closeness + faith alignment + behaviour)
function effectiveApproval(person) {
  if (!person || !person.alive) return 50;
  const base = person.approval !== undefined ? person.approval : (person.closeness || 50);
  const faithMod = faithAlignmentEffect(person.faith);
  // Scandals reduce approval
  const scandalMod = -(G.scandals || 0) * 3;
  return clamp(base + faithMod + scandalMod, 0, 100);
}

function approvalLabel(score) {
  if (score >= 75) return 'Strongly approves';
  if (score >= 55) return 'Approves';
  if (score >= 40) return 'Neutral';
  if (score >= 25) return 'Disapproves';
  return 'Strongly disapproves';
}

// ── PARENT APPROVAL ────────────────────────────────────────
// Parent closeness affects reputation at key moments
// and gates certain options

function parentApprovalBonus() {
  // Combined approval score 0-100, averaged from living parents
  const living = [G.mother, G.father].filter(p => p && p.alive);
  if (!living.length) return 50; // orphaned — neutral
  return Math.round(living.reduce((s,p) => s + (p.closeness||50), 0) / living.length);
}

function parentApprovalLabel() {
  const score = parentApprovalBonus();
  if (score >= 75) return 'Your parents approve of you warmly';
  if (score >= 55) return 'Your parents are reasonably satisfied';
  if (score >= 35) return 'Your parents are somewhat disappointed';
  return 'Your parents are deeply concerned';
}

// Called when accepting a marriage proposal — parents react
function parentReactionToMarriage(suitorWealth) {
  const approval = parentApprovalBonus();
  // High-approval parents give a reputation boost on good marriages
  if (suitorWealth >= 3000 && approval >= 60) {
    changeStat('reputation', rand(5,12));
    if (G.mother && G.mother.alive) changeCloseness(G.mother, rand(10,20));
    if (G.father && G.father.alive) changeCloseness(G.father, rand(8,15));
    return { text: 'Your parents are overjoyed. Your mother has already begun planning the wedding breakfast.', badge: 'Reputation +8' };
  } else if (suitorWealth < 800 && approval >= 60) {
    changeStat('reputation', -rand(3,8));
    if (G.mother && G.mother.alive) changeCloseness(G.mother, -rand(10,20));
    if (G.father && G.father.alive) changeCloseness(G.father, -rand(5,12));
    return { text: 'Your parents are not entirely pleased. Your mother says nothing. This is worse than if she had.', badge: 'Reputation -5' };
  } else if (approval < 35) {
    // Estranged parents barely react
    return { text: 'Word reaches your parents. They acknowledge it briefly.', badge: null };
  }
  return null;
}

// Called when player declines a good match — parents react
function parentReactionToDecline(suitorWealth) {
  const approval = parentApprovalBonus();
  if (suitorWealth >= 2000 && approval >= 55) {
    if (G.mother && G.mother.alive) changeCloseness(G.mother, -rand(8,15));
    if (G.father && G.father.alive) changeCloseness(G.father, -rand(5,10));
    return { text: 'Your mother does not speak to you for a week. Your father sends a very short letter.' };
  }
  return null;
}

// Gate: some options require parental support
function hasParentalSupport() {
  return parentApprovalBonus() >= 45;
}

// ── SAVE / LOAD ────────────────────────────────────────────

// ═══════════════════════════════════════════════════════════
// STORAGE SHIM — replaces localStorage with IndexedDB
// Works on file://, http://, TWA, and PWA
// Falls back to memory if IndexedDB also unavailable
// ═══════════════════════════════════════════════════════════

const _DB_NAME    = 'HowArdentlyDB';
const _DB_VERSION = 1;
const _STORE_NAME = 'saves';
let   _db         = null;
let   _memStore   = {}; // in-memory fallback

// Open the database once
function _openDB() {
  return new Promise((resolve, reject) => {
    if (_db) { resolve(_db); return; }
    if (!window.indexedDB) { reject('no indexedDB'); return; }
    const req = indexedDB.open(_DB_NAME, _DB_VERSION);
    req.onupgradeneeded = e => {
      e.target.result.createObjectStore(_STORE_NAME);
    };
    req.onsuccess = e => { _db = e.target.result; resolve(_db); };
    req.onerror   = e => reject(e);
  });
}

// Save a string value by key
function dbSet(key, value) {
  _memStore[key] = value; // always update memory too
  return _openDB().then(db => {
    return new Promise((resolve, reject) => {
      const tx  = db.transaction(_STORE_NAME, 'readwrite');
      const st  = tx.objectStore(_STORE_NAME);
      const req = st.put(value, key);
      req.onsuccess = () => resolve();
      req.onerror   = e => reject(e);
    });
  }).catch(() => {}); // silent fail — memory has it
}

// Get a string value by key — returns Promise<string|null>
function dbGet(key) {
  return _openDB().then(db => {
    return new Promise((resolve, reject) => {
      const tx  = db.transaction(_STORE_NAME, 'readonly');
      const st  = tx.objectStore(_STORE_NAME);
      const req = st.get(key);
      req.onsuccess = () => resolve(req.result || null);
      req.onerror   = e => reject(e);
    });
  }).catch(() => _memStore[key] || null);
}

// Remove a key
function dbRemove(key) {
  delete _memStore[key];
  return _openDB().then(db => {
    return new Promise((resolve, reject) => {
      const tx  = db.transaction(_STORE_NAME, 'readwrite');
      const req = tx.objectStore(_STORE_NAME).delete(key);
      req.onsuccess = () => resolve();
      req.onerror   = e => reject(e);
    });
  }).catch(() => {});
}

// Check if a key exists — returns Promise<bool>
function dbHas(key) {
  return dbGet(key).then(v => v !== null);
}


const SAVE_KEY     = 'how_ardently_v3';
const MAX_SAVE_SLOTS = 5;

function getSaveSlotKey(slot) { return SAVE_KEY + '_slot_' + slot; }

function saveToSlot(slot, label) {
  var key  = getSaveSlotKey(slot);
  var meta = {
    label:  label || ('Save ' + (slot + 1)),
    name:   G.name || 'Unknown',
    age:    G.age  || 0,
    phase:  G.phase || 'childhood',
    season: G.season || 'Spring',
    saved:  new Date().toLocaleDateString(),
  };
  dbSet(key,           JSON.stringify(G)).catch(function(){});
  dbSet(key + '_meta', JSON.stringify(meta)).catch(function(){});
}

function loadFromSlot(slot) {
  return dbGet(getSaveSlotKey(slot)).then(function(raw) {
    if (!raw) return false;
    try { G = JSON.parse(raw); _memStore[SAVE_KEY] = raw; return true; }
    catch(e) { return false; }
  });
}

function deleteSlot(slot) {
  dbRemove(getSaveSlotKey(slot)).catch(function(){});
  dbRemove(getSaveSlotKey(slot) + '_meta').catch(function(){});
}

function getAllSlotsMeta() {
  var promises = [];
  for (var i = 0; i < MAX_SAVE_SLOTS; i++) {
    promises.push((function(s) {
      return dbGet(getSaveSlotKey(s) + '_meta').then(function(raw) {
        if (!raw) return { slot:s, empty:true };
        try { var m = JSON.parse(raw); m.slot = s; m.empty = false; return m; }
        catch(e) { return { slot:s, empty:true }; }
      });
    })(i));
  }
  return Promise.all(promises);
}

function saveGame() {
  try {
    var data = JSON.stringify(G);
    dbSet(SAVE_KEY, data).catch(function(){});
    // Auto-save to slot 0 on every save — always current, no manual saves needed
    var meta = {
      label:  'Autosave',
      name:   G.name  || 'Unknown',
      age:    G.age   || 0,
      phase:  G.phase || 'childhood',
      season: G.season || 'Spring',
      saved:  new Date().toLocaleDateString(),
      auto:   true,
    };
    if (typeof getSaveSlotKey === 'function') {
      dbSet(getSaveSlotKey(0), data).catch(function(){});
      dbSet(getSaveSlotKey(0) + '_meta', JSON.stringify(meta)).catch(function(){});
    }
  } catch(e) {}
}

function loadGame() {
  // loadGame is now async — use loadGameAsync() instead
  // This sync version checks memory store for backward compat
  const raw = _memStore[SAVE_KEY] || null;
  if (!raw) return false;
  try {
    G = JSON.parse(raw);
    return true;
  } catch(e) { return false; }
}

// Async version — called by continueGame()
function loadGameAsync() {
  return dbGet(SAVE_KEY).then(raw => {
    if (!raw) return false;
    try {
      G = JSON.parse(raw);
      _memStore[SAVE_KEY] = raw; // populate memory cache
      return true;
    } catch(e) { return false; }
  });
}

function deleteSave() {
  _memStore[SAVE_KEY] = null;
  dbRemove(SAVE_KEY).catch(() => {});
}

function hasSave() {
  // Sync check against memory cache (populated on load)
  return !!_memStore[SAVE_KEY];
}

// Async version — used on title screen
function hasSaveAsync() {
  return dbHas(SAVE_KEY);
}
