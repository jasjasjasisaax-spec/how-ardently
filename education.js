// ═══════════════════════════════════════════════════════════
// education.js — Education stats, schooling system, careers
// Lady-specific. Gentleman education handled separately later.
// ═══════════════════════════════════════════════════════════

// ── EDUCATION STATE ────────────────────────────────────────
// G.eduStats = {
//   literacy:  { reading, writing, arithmetic, calligraphy, total }
//   reason:    { science, philosophy, history, total }
//   faith:     { theology, scripture, total }
//   decorum:   { music, dancing, art, manners, needlework, languages, total }
//   collapsed: bool   — header display state
// }
// G.schooling = {
//   type:        'none'|'sunday'|'governess'|'boarding'
//   name:        string
//   governess:   null | { name, cost, quality, subjects[] }
//   boarding:    null | { name, tier, cost }
//   startAge:    number
//   tutors:      [ { subject, boost, season } ]
//   selfStudy:   [ { subject, boost, season } ]
// }
// G.careers = { unlocked:[], active:null, history:[] }
// G.eligibility = 0-100  (calculated at debut, updated each season after)

function initEducation() {
  if (G.gender !== 'female') return; // gentleman system TBD
  G.eduStats = {
    literacy: { reading:5, writing:5, arithmetic:5, calligraphy:0, total:0 },
    reason:   { science:0, philosophy:0, history:0,  total:0 },
    faith:    { theology:5, scripture:5, total:0 },
    decorum:  { music:0, dancing:0, art:0, manners:5, needlework:0, languages:0, total:0 },
    collapsed: false,
  };
  G.schooling = {
    type:      'none',
    name:      null,
    governess: null,
    boarding:  null,
    startAge:  null,
    tutors:    [],
    selfStudy: [],
  };
  G.careers  = { unlocked:[], active:null, history:[] };
  G.eligibility = 0;
  recalcEduTotals();
}

// ── SUB-STAT RECALCULATION ─────────────────────────────────

function recalcEduTotals() {
  if (!G.eduStats) return;
  const e = G.eduStats;
  e.literacy.total = Math.round(
    (e.literacy.reading + e.literacy.writing + e.literacy.arithmetic + e.literacy.calligraphy) / 4
  );
  e.reason.total = Math.round(
    (e.reason.science + e.reason.philosophy + e.reason.history) / 3
  );
  e.faith.total = Math.round(
    (e.faith.theology + e.faith.scripture) / 2
  );
  e.decorum.total = Math.round(
    (e.decorum.music + e.decorum.dancing + e.decorum.art +
     e.decorum.manners + e.decorum.needlework + e.decorum.languages) / 6
  );
  // Sync faith stat with G.faith
  G.faith = clamp(e.faith.total, 10, 95);
  // Sync wit with literacy+reason average
  const eduWit = Math.round((e.literacy.total + e.reason.total) / 2);
  if (eduWit > G.wit) G.wit = clamp(eduWit, G.wit, G.wit + 5); // education can only improve wit
}

function changeEduStat(group, subStat, delta) {
  if (!G.eduStats || !G.eduStats[group]) return;
  const g = G.eduStats[group];
  if (subStat in g) {
    g[subStat] = clamp(g[subStat] + delta, 0, 100);
  }
  recalcEduTotals();
  saveGame();
}

// Boost multiple sub-stats at once
function eduBoost(subStats, amounts) {
  for (let i = 0; i < subStats.length; i++) {
    const [group, sub] = subStats[i].split('.');
    changeEduStat(group, sub, amounts[i] || amounts[0]);
  }
}

// ── GOVERNESS CATALOGUE ────────────────────────────────────

const GOVERNESS_OPTIONS = {
  // Available to ALL ranks
  base: [
    {
      id:       'mother',
      name:     'Your Mother',
      cost:     0,
      quality:  'variable',
      desc:     'Free, loving, and limited to her own knowledge.',
      subjects: null, // determined dynamically from G.mother stats
      repBonus: 0,
    },
    {
      id:       'village_dame',
      name:     'Mrs Pratt (Village Dame)',
      cost:     10,
      quality:  'poor',
      desc:     'Literacy only. Reliable if unambitious.',
      subjects: ['literacy.reading','literacy.writing','literacy.arithmetic'],
      gains:    [2, 2, 1],
      repBonus: 0,
    },
  ],
  // Clergy and Trade
  modest: [
    {
      id:       'miss_brown',
      name:     'Miss Brown',
      cost:     30,
      quality:  'modest',
      desc:     'Solid literacy and basic decorum. Adequate.',
      subjects: ['literacy.reading','literacy.writing','literacy.calligraphy','decorum.manners'],
      gains:    [3, 3, 2, 2],
      repBonus: 1,
    },
    {
      id:       'mrs_gentle',
      name:     'Mrs Gentle',
      cost:     40,
      quality:  'modest',
      desc:     'Kind and arts-focused. Music and drawing are her gifts.',
      subjects: ['decorum.music','decorum.art','decorum.needlework','literacy.reading'],
      gains:    [4, 3, 3, 2],
      repBonus: 2,
    },
  ],
  // Gentry and above
  good: [
    {
      id:       'miss_sharp',
      name:     'Miss Sharp',
      cost:     55,
      quality:  'good',
      desc:     'Strict and thorough. Academic subjects her speciality.',
      subjects: ['literacy.reading','literacy.writing','literacy.arithmetic','reason.history','reason.philosophy'],
      gains:    [4, 4, 3, 3, 2],
      repBonus: 3,
    },
    {
      id:       'mrs_drummond',
      name:     'Mrs Drummond',
      cost:     65,
      quality:  'good',
      desc:     'Deportment and social grace. Dancing, manners, languages.',
      subjects: ['decorum.dancing','decorum.manners','decorum.languages','decorum.needlework'],
      gains:    [5, 4, 4, 3],
      repBonus: 4,
    },
    {
      id:       'miss_hartley',
      name:     'Miss Hartley',
      cost:     60,
      quality:  'good',
      desc:     'Faith and scripture. Deeply pious, widely respected.',
      subjects: ['faith.theology','faith.scripture','decorum.manners','literacy.reading'],
      gains:    [5, 5, 3, 2],
      repBonus: 3,
    },
  ],
  // Nobility only
  excellent: [
    {
      id:       'mlle_beaumont',
      name:     'Mlle Beaumont',
      cost:     90,
      quality:  'excellent',
      desc:     'Exacting French governess. Languages, arts, all accomplishments.',
      subjects: ['decorum.languages','decorum.music','decorum.dancing','decorum.art','literacy.calligraphy'],
      gains:    [6, 5, 5, 4, 4],
      repBonus: 8,
    },
    {
      id:       'miss_pemberton',
      name:     'Miss Pemberton',
      cost:     100,
      quality:  'excellent',
      desc:     'A scholar\'s daughter. Reason and literacy at the highest level.',
      subjects: ['reason.science','reason.philosophy','reason.history','literacy.reading','literacy.writing','literacy.arithmetic'],
      gains:    [6, 6, 5, 5, 4, 4],
      repBonus: 6,
    },
    {
      id:       'mrs_cavendish',
      name:     'Mrs Cavendish',
      cost:     120,
      quality:  'excellent',
      desc:     'Former lady-in-waiting. Every accomplishment, every grace.',
      subjects: ['decorum.music','decorum.dancing','decorum.art','decorum.manners','decorum.languages','decorum.needlework'],
      gains:    [7, 6, 6, 5, 6, 5],
      repBonus: 10,
    },
  ],
};

function getAvailableGoverness() {
  const rank = G.rankId;
  const options = [...GOVERNESS_OPTIONS.base];
  if (rank === 'clergy' || rank === 'trade' || rank === 'gentry' || rank === 'nobility') {
    options.push(...GOVERNESS_OPTIONS.modest);
  }
  if (rank === 'gentry' || rank === 'nobility') {
    options.push(...GOVERNESS_OPTIONS.good);
  }
  if (rank === 'nobility') {
    options.push(...GOVERNESS_OPTIONS.excellent);
  }
  return options;
}

// Mother-as-governess: subjects depend on her stats
function getMotherSubjects() {
  if (!G.mother) return [];
  const subs = [];
  const m = G.mother;
  // Mother teaches what she's good at based on her own stats
  if ((m.wit||50) >= 60) {
    subs.push({ subject:'literacy.reading', gain:3 });
    subs.push({ subject:'literacy.writing', gain:2 });
  } else {
    subs.push({ subject:'literacy.reading', gain:2 });
  }
  if ((m.faith||50) >= 60) {
    subs.push({ subject:'faith.theology', gain:3 });
    subs.push({ subject:'faith.scripture', gain:3 });
  }
  if ((m.looks||50) >= 60) {
    subs.push({ subject:'decorum.needlework', gain:3 });
    subs.push({ subject:'decorum.manners', gain:3 });
  }
  if ((m.wit||50) >= 70) {
    subs.push({ subject:'reason.history', gain:2 });
  }
  return subs;
}

// ── SEASONAL EDUCATION GAINS ───────────────────────────────
// Called from advanceSeason when phase === 'childhood'

function processEducationSeason() {
  if (!G.eduStats || G.gender !== 'female') return [];
  const events = [];
  const schooling = G.schooling;
  const age = G.age;

  // Sunday School
  if (schooling.type === 'sunday') {
    changeEduStat('literacy', 'reading',   rand(1,3));
    changeEduStat('literacy', 'writing',   rand(1,2));
    changeEduStat('faith',    'theology',  rand(2,4));
    changeEduStat('faith',    'scripture', rand(2,3));
    if (age >= 10) changeEduStat('decorum', 'manners', rand(1,2));
  }

  // Governess
  if (schooling.type === 'governess' && schooling.governess) {
    const gov = schooling.governess;
    if (gov.id === 'mother') {
      // Mother teaches her specialities
      const subs = getMotherSubjects();
      for (const s of subs) {
        const [grp, sub] = s.subject.split('.');
        changeEduStat(grp, sub, Math.max(1, s.gain - 1 + rand(0,1)));
      }
    } else {
      // Regular governess
      const template = findGovernessById(gov.id);
      if (template && template.subjects) {
        for (let i = 0; i < template.subjects.length; i++) {
          // Only teach age-appropriate subjects
          const subject = template.subjects[i];
          if (isSubjectUnlocked(subject, age)) {
            const [grp, sub] = subject.split('.');
            const baseGain = template.gains[i] || 2;
            changeEduStat(grp, sub, Math.max(1, Math.round(baseGain * 0.6) + rand(0,1)));
          }
        }
      }
    }
  }

  // Boarding school
  if (schooling.type === 'boarding' && schooling.boarding && age >= 10) {
    const tier = schooling.boarding.tier;
    const baseGain = tier === 3 ? 4 : tier === 2 ? 3 : 2;
    // Boarding school teaches a broad curriculum
    const boardingSubjects = [
      'literacy.reading','literacy.writing','literacy.calligraphy',
      'decorum.music','decorum.dancing','decorum.manners',
      'reason.history',
    ];
    if (tier >= 2) boardingSubjects.push('decorum.languages','reason.philosophy');
    if (tier >= 3) boardingSubjects.push('reason.science','decorum.art','literacy.arithmetic');
    for (const subject of boardingSubjects) {
      const [grp, sub] = subject.split('.');
      if (isSubjectUnlocked(subject, age)) {
        changeEduStat(grp, sub, Math.max(1, Math.round(baseGain * 0.5) + rand(0,1)));
      }
    }
    // Boarding school social bonus
    changeStat('reputation', rand(1,3));
  }

  // Introduce a new schoolmate each season (boarding/sunday)
  if ((G.schooling.type === 'boarding' || G.schooling.type === 'sunday') &&
      typeof generateSchoolmateCohort === 'function') {
    // Generate cohort if not yet done
    if (!G.schoolmates || !G.schoolmates.length) {
      generateSchoolmateCohort(G.schooling.type);
    }
    // Introduce one new schoolmate
    const newSM = introduceSchoolmate && introduceSchoolmate();
    if (newSM) {
      events.push({
        text: `You meet ${newSM.name} ${newSM.surname}.`,
        type: 'event',
        schoolmateMeet: newSM,
      });
    }
    // Seasonal schoolmate event (30% chance)
    if (Math.random() < 0.3) {
      const smEvent = schoolmateSeasonalEvent && schoolmateSeasonalEvent();
      if (smEvent) events.push({ schoolmateEvent: smEvent });
    }
  }

  // Random lesson event each season
  if (typeof fireRandomLessonEvent === 'function') {
    const lessonResult = fireRandomLessonEvent();
    if (lessonResult) events.push({ randomLesson: lessonResult });
  }

  recalcEduTotals();
  return events;
}

function isSubjectUnlocked(subject, age) {
  const earlyOnly = ['literacy.reading','literacy.writing','literacy.arithmetic','faith.theology','faith.scripture','decorum.manners'];
  if (age < 10) return earlyOnly.includes(subject);
  return true;
}

function findGovernessById(id) {
  const all = [
    ...GOVERNESS_OPTIONS.base,
    ...GOVERNESS_OPTIONS.modest,
    ...GOVERNESS_OPTIONS.good,
    ...GOVERNESS_OPTIONS.excellent,
  ];
  return all.find(g => g.id === id) || null;
}

// ── BOARDING SCHOOLS ──────────────────────────────────────

const BOARDING_SCHOOLS = [
  {
    tier:    1,
    name:    "Mrs Goddard's School",
    cost:    80,
    desc:    'A respectable country school. Reading, writing, plain needlework.',
    repBonus: 5,
    rankReq: null, // any rank
    careerUnlocks: ['schoolmistress','ladys_maid'],
  },
  {
    tier:    2,
    name:    "Miss Pinkerton's Academy",
    cost:    180,
    desc:    'For young ladies of the middling sort. Accomplishments and some learning.',
    repBonus: 12,
    rankReq: null,
    careerUnlocks: ['governess','companion','schoolmistress'],
  },
  {
    tier:    3,
    name:    'The Ladies\' Seminary at Bath',
    cost:    350,
    desc:    'Exclusive, expensive, and fashionable. Every accomplishment, every connection.',
    repBonus: 22,
    rankReq: 'gentry', // gentry or nobility only
    careerUnlocks: ['governess','companion','authoress','schoolmistress'],
    socialBonus: true, // introduces high-quality NPCs
  },
];

function getAvailableBoardingSchools() {
  return BOARDING_SCHOOLS.filter(s => {
    if (!s.rankReq) return true;
    if (s.rankReq === 'gentry') return G.rankId === 'gentry' || G.rankId === 'nobility';
    if (s.rankReq === 'nobility') return G.rankId === 'nobility';
    return true;
  });
}

// ── CAREERS ────────────────────────────────────────────────

const CAREER_DEFINITIONS = {
  // Always available (no boarding school required)
  ladys_maid: {
    name:         "Lady's Maid",
    desc:         'Personal attendant to a lady of quality. Intimate but servile.',
    repEffect:    -20,
    incomeBonus:  30,
    rankDrop:     true,
    requires:     [],
    flavour:      'You dress her hair, press her gowns, and know all her secrets. It is a living.',
  },
  missionary: {
    name:         'Missionary Work',
    desc:         'Service abroad or in the parishes. Respected by the devout.',
    repEffect:    5,
    incomeBonus:  0,
    faithReq:     75,
    requires:     [],
    flavour:      'You go where you are needed. The work is hard and the faith is harder.',
  },
  // Boarding school unlocked
  schoolmistress: {
    name:         'Schoolmistress',
    desc:         'Runs a small dame school. Modest income, modest respect.',
    repEffect:    0,
    incomeBonus:  60,
    requires:     ['schoolmistress'],
    flavour:      'You open a small school. The children are exhausting. The independence is not.',
  },
  governess: {
    name:         'Governess',
    desc:         'Teaches the children of the wealthy. Precarious but respectable.',
    repEffect:    -5,
    incomeBonus:  80,
    requires:     ['governess'],
    flavour:      'You arrive with your trunk and your references. The children size you up immediately.',
  },
  companion: {
    name:         'Companion',
    desc:         'Lives with a wealthy lady. Comfortable, constrained, occasionally tedious.',
    repEffect:    3,
    incomeBonus:  50,
    requires:     ['companion'],
    flavour:      'Lady Pemberton requires a companion. You are companion. You read aloud a great deal.',
  },
  authoress: {
    name:         'Authoress',
    desc:         'Writes novels, anonymously or otherwise. Scandalous and satisfying.',
    repEffect:    -8,
    repEffect_success: 15, // if successful
    incomeBonus:  40,
    reasonReq:    65,
    literacyReq:  70,
    requires:     ['authoress'],
    flavour:      'By A Lady. Three volumes. Your mother does not know it is you.',
  },
};

function getAvailableCareers() {
  const unlocked = G.careers ? (G.careers.unlocked || []) : [];
  const edu = G.eduStats || {};
  const careers = [];

  for (const [id, career] of Object.entries(CAREER_DEFINITIONS)) {
    // Check unlock requirements
    if (career.requires.length > 0) {
      if (!career.requires.some(r => unlocked.includes(r))) continue;
    }
    // Faith requirement
    if (career.faithReq && (G.faith || 50) < career.faithReq) continue;
    // Reason requirement
    if (career.reasonReq && ((edu.reason ? edu.reason.total : 0) || 0) < career.reasonReq) continue;
    // Literacy requirement
    if (career.literacyReq && ((edu.literacy ? edu.literacy.total : 0) || 0) < career.literacyReq) continue;

    careers.push({ id, ...career });
  }
  return careers;
}

function unlockCareers(careerIds) {
  if (!G.careers) G.careers = { unlocked:[], active:null, history:[] };
  for (const id of careerIds) {
    if (!G.careers.unlocked.includes(id)) {
      G.careers.unlocked.push(id);
    }
  }
}

// ── ELIGIBILITY CALCULATION ────────────────────────────────
// Called at debut and updated each season

function calculateEligibility() {
  if (!G.eduStats) return 0;
  var e = G.eduStats;

  // Education components
  var eduScore = (
    (e.decorum.total  * 0.30) +
    (e.literacy.total * 0.15) +
    (e.reason.total   * 0.10) +
    (e.faith.total    * 0.10)
  );

  // Personal presentation
  var looks   = G.looks   || 50;
  var fashion = G.fashion || 0;
  var presentScore = (looks * 0.10) + (fashion * 0.15);

  // Reputation — minor contribution
  var repScore = ((G.reputation || 50) * 0.05);

  // Wealth & assets — modest but real contribution
  var wealth = G.isMarried ? (G.spouse ? G.spouse.wealth : 0) : (G.income || 0);
  if (G.assets) G.assets.forEach(function(a) { wealth += (a.baseIncome||0)*2; });
  var wealthScore = wealth >= 5000 ? 8 : wealth >= 2000 ? 5 : wealth >= 500 ? 3 : wealth >= 100 ? 1 : 0;

  // Settlement / expected dowry — a significant factor for unmarried women
  // A good settlement makes a woman considerably more attractive on the marriage market
  var settlement = G.expectedSettlement || 0;
  // Also count anything already inherited (G.wealth if above a threshold)
  if (!G.isMarried && (G.wealth||0) > 100) settlement = Math.max(settlement, G.wealth);
  var settlementScore = settlement >= 1000 ? 12
                      : settlement >= 500  ? 9
                      : settlement >= 250  ? 6
                      : settlement >= 100  ? 4
                      : settlement >= 50   ? 2
                      : 0;

  // Connections — quality friends in society
  var connections = (G.npcs||[]).filter(function(n){ return n.introduced && n.closeness >= 50; }).length;
  var connScore = Math.min(5, connections);  // up to +5

  var elig = Math.round(eduScore + presentScore + repScore + wealthScore + settlementScore + connScore);
  G.eligibility = clamp(elig, 0, 100);
  return G.eligibility;
}

function eligibilityLabel(e) {
  if (e >= 85) return 'A Diamond';
  if (e >= 70) return 'Highly Accomplished';
  if (e >= 55) return 'A Good Match';
  if (e >= 40) return 'Eligible';
  if (e >= 25) return 'Modest Prospects';
  return 'Unremarkable';
}

// Affects suitor pool generation
function getEligibilityModifiers() {
  const e = G.eligibility || 0;
  const edu = G.eduStats || {};
  return {
    wealthBoost:    Math.round(e * 50),             // adds to suitor wealth floor
    titleBoost:     e >= 70 ? 2 : e >= 50 ? 1 : 0, // titleRank bonus
    clergyBoost:    G.schooling.type === 'sunday' || ((edu.faith ? edu.faith.total : 0)||0) >= 70,
    intellectBoost: ((edu.reason ? edu.reason.total : 0)||0) >= 60,   // attracts witty/scholarly suitors
    artBoost:       ((edu.decorum ? edu.decorum.total : 0)||0) >= 70,  // attracts artistic/charming suitors
  };
}

// ── TUTOR SYSTEM ───────────────────────────────────────────

const TUTOR_OPTIONS = [
  { id:'reading_tutor',     name:'Reading Tutor',      cost:15, subject:'literacy.reading',      boost:8, age:4  },
  { id:'music_master',      name:'Music Master',       cost:25, subject:'decorum.music',          boost:10, age:10 },
  { id:'dancing_master',    name:'Dancing Master',     cost:20, subject:'decorum.dancing',        boost:10, age:10 },
  { id:'drawing_master',    name:'Drawing Master',     cost:20, subject:'decorum.art',            boost:8, age:10 },
  { id:'language_tutor',    name:'French/Italian Tutor',cost:30, subject:'decorum.languages',    boost:11, age:10 },
  { id:'scripture_teacher', name:'Scripture Teacher',  cost:10, subject:'faith.scripture',       boost:8, age:4  },
  { id:'history_tutor',     name:'History Tutor',      cost:20, subject:'reason.history',        boost:8, age:10 },
];

function getTutorOptions() {
  return TUTOR_OPTIONS.filter(t => G.age >= t.age);
}

// ── SELF-STUDY ─────────────────────────────────────────────

const SELF_STUDY_OPTIONS = [
  { id:'read_novels',   name:'Read novels',        subject:'literacy.reading',    boost:3, age:8  },
  { id:'study_maps',    name:'Study maps & atlases', subject:'reason.history',   boost:3, age:8  },
  { id:'copy_psalms',   name:'Copy the Psalms',    subject:'faith.scripture',     boost:2, age:6  },
  { id:'practice_piano',name:'Practise pianoforte',subject:'decorum.music',       boost:3, age:10 },
  { id:'sketch_garden', name:'Sketch in the garden',subject:'decorum.art',        boost:3, age:8  },
  { id:'learn_phrases', name:'Learn French phrases',subject:'decorum.languages',  boost:2, age:10 },
  { id:'needlework',    name:'Needlework practice', subject:'decorum.needlework', boost:2, age:6  },
];

function getSelfStudyOptions() {
  return SELF_STUDY_OPTIONS.filter(s => G.age >= s.age);
}
