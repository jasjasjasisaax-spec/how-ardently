// ═══════════════════════════════════════════════════════════
// schoolmates.js — Schoolmate cohort system
// Separate from adult NPCs. Shown in Schooling tab.
// Can convert to adult social circle after debut.
// ═══════════════════════════════════════════════════════════

// ── SCHOOLMATE NAMES ──────────────────────────────────────
const SCHOOLMATE_NAMES = {
  female: ['Arabella','Cecily','Harriet','Lydia','Charlotte','Frances','Kitty','Maria',
           'Penelope','Rosalie','Dorothea','Constance','Agnes','Beatrice','Prudence'],
  surname:['Thornton','Bates','Ferrars','Wickham','Crawford','Price','Brandon','Grey',
           'Norris','Lucas','Long','Bennet','Elliot','Wentworth','Musgrove'],
};

// Schoolmate personalities — different from adult NPC traits
const SCHOOLMATE_TRAITS = [
  { id:'clever',      desc:'Quick and sharp, always first with the answer' },
  { id:'artistic',    desc:'Paints and plays and seems to live inside her own head' },
  { id:'kind',        desc:'The sort of girl who notices when you are having a bad day' },
  { id:'mischievous', desc:'Always on the edge of trouble, always laughing' },
  { id:'pious',       desc:'Genuinely devout, not performatively so' },
  { id:'proud',       desc:'Conscious of her own consequence at all times' },
  { id:'anxious',     desc:'Worries about everything but tries not to show it' },
  { id:'sociable',    desc:'Knows everyone\'s name within a fortnight' },
  { id:'melancholy',  desc:'Thoughtful and somewhat sad — interesting company' },
  { id:'bold',        desc:'Says exactly what she thinks, which is frequently uncomfortable' },
];

// ── COHORT GENERATION ──────────────────────────────────────

function generateSchoolmateCohort(schoolType) {
  if (G.schoolmates && G.schoolmates.length > 0) return; // already generated
  if (!G.schoolmates) G.schoolmates = [];

  const count = schoolType === 'boarding' ? rand(8,10) : rand(5,7);

  for (let i = 0; i < count; i++) {
    const name    = pick(SCHOOLMATE_NAMES.female);
    const surname = pick(SCHOOLMATE_NAMES.surname);
    const trait   = pick(SCHOOLMATE_TRAITS);
    const ageDiff = rand(-3, 3); // close in age to player
    G.schoolmates.push({
      id:          'sm_' + i,
      name,
      surname,
      fullName:    name + ' ' + surname,
      trait:       trait.id,
      desc:        trait.desc,
      age:         Math.max(8, (G.age || 10) + ageDiff),
      school:      schoolType,
      closeness:   0,        // 0-100
      introduced:  false,    // becomes true gradually
      status:      'unknown', // unknown / acquaintance / friend / rival
      outcome:     null,     // set when relationship resolves
      // Relationship potential
      canTeach:    trait.id === 'clever' || trait.id === 'artistic' || trait.id === 'pious',
      canTrouble:  trait.id === 'mischievous' || trait.id === 'bold',
      willRival:   trait.id === 'proud' && Math.random() < 0.4,
    });
  }
  saveGame();
}

// ── GRADUAL INTRODUCTION ───────────────────────────────────
// Called each season at school — introduces one new schoolmate

function introduceSchoolmate() {
  if (!G.schoolmates || !G.schoolmates.length) return null;
  const unknown = G.schoolmates.filter(s => !s.introduced);
  if (!unknown.length) return null;
  const sm = pick(unknown);
  sm.introduced = true;
  sm.closeness  = rand(10, 25);
  sm.status     = 'acquaintance';
  saveGame();
  return sm;
}

function getIntroducedSchoolmates() {
  return (G.schoolmates || []).filter(s => s.introduced);
}

// ── SCHOOLMATE STATUS LABEL ────────────────────────────────
function schoolmateStatusLabel(sm) {
  if (sm.status === 'rival')         return '⚔ Rival';
  if (sm.closeness >= 70)            return '★ Dear friend';
  if (sm.closeness >= 45)            return 'Friend';
  if (sm.closeness >= 20)            return 'Acquaintance';
  return 'Barely know her';
}

// ── INTERACTIONS ───────────────────────────────────────────

function openSchoolmateProfile(sm) {
  const statusLbl = schoolmateStatusLabel(sm);
  const card = `\n${sm.desc}\n\nAge ${sm.age} · ${statusLbl}`;
  const relBar = typeof relationshipBarHTML === 'function'
    ? relationshipBarHTML(sm.closeness, false) : '';

  queuePopup(
    `${sm.fullName}${card}${relBar}`,
    null,
    buildSchoolmateActions(sm)
  );
}

function buildSchoolmateActions(sm) {
  const actions = [];

  // Spend time together
  actions.push({
    text: '☕ Spend time with her',
    fn() {
      const g = rand(6,14);
      sm.closeness = Math.min(100, sm.closeness + g);
      if (sm.closeness >= 45 && sm.status === 'acquaintance') sm.status = 'friend';
      const msgs = [
        `You and ${sm.name} talk through the dinner hour and do not notice the time passing.`,
        `You walk together in the grounds. She tells you something about herself that surprises you.`,
        `${sm.name} makes you laugh so hard you nearly choke on your tea.`,
        `You stay up whispering after lights-out. The housemother does not notice. Probably.`,
      ];
      addFeedEntry('You spend time with ' + sm.name + '.', 'good');
      queuePopup(pick(msgs), `Closeness +${g}`);
      saveGame(); return null;
    },
  });

  // Ask for help with a subject (if she can teach)
  if (sm.canTeach && sm.closeness >= 25) {
    const subject = sm.trait === 'clever'   ? 'reason'
                  : sm.trait === 'artistic' ? 'decorum'
                  : sm.trait === 'pious'    ? 'faith'
                  : 'literacy';
    const subStat = sm.trait === 'clever'   ? 'history'
                  : sm.trait === 'artistic' ? 'art'
                  : sm.trait === 'pious'    ? 'theology'
                  : 'reading';
    actions.push({
      text: `📖 Ask her to help you with ${subStat}`,
      fn() {
        if (sm._taught) {
          queuePopup(`${sm.name} has already shared everything she knows on the subject. The well is dry.`);
          return null;
        }
        const g = rand(8,15);
        if (typeof changeEduStat === 'function') changeEduStat(subject, subStat, g);
        sm.closeness = Math.min(100, sm.closeness + rand(5,10));
        sm._taught = true;
        addFeedEntry(sm.name + ' teaches you something valuable.', 'good');
        queuePopup(
          `${sm.name} is remarkably good at this. She explains it in a way that makes it entirely clear. You leave the library knowing considerably more than when you entered.`,
          `${subStat} +${g}`
        );
        saveGame(); return null;
      },
    });
  }

  // Mischief (if she can get you in trouble)
  if (sm.canTrouble && sm.closeness >= 30) {
    actions.push({
      text: '😈 Get into mischief with her',
      fn() {
        const roll = rand(1,10);
        sm.closeness = Math.min(100, sm.closeness + rand(8,15));
        if (roll <= 3) {
          // Caught
          changeStat('reputation', -rand(5,12));
          G.scandals = (G.scandals||0) + 1;
          addFeedEntry('You were caught getting into mischief with ' + sm.name + '.', 'bad');
          queuePopup(
            `The adventure goes wrong. You are caught. ${sm.name} looks entirely unrepentant. You are less certain about your own expression. There are consequences.`,
            'Reputation -8 · Scandal'
          );
        } else {
          changeStat('health', rand(4,8));
          addFeedEntry('A successful adventure with ' + sm.name + '.', 'good');
          queuePopup(
            `It all works perfectly. Nobody sees you. ${sm.name} is exhilarated. You are exhilarated. You have never liked anyone quite this much.`,
            `Closeness +12`
          );
        }
        saveGame(); return null;
      },
    });
  }

  // Have a falling out
  if (sm.closeness >= 20) {
    actions.push({
      text: '💢 Have a falling out',
      fn() {
        const d = rand(20, 40);
        sm.closeness = Math.max(0, sm.closeness - d);
        if (sm.willRival || sm.closeness <= 5) {
          sm.status = 'rival';
          addFeedEntry(sm.name + ' has become your rival.', 'bad');
          queuePopup(
            `What started as a disagreement has hardened into something else. ${sm.name} is no longer simply a girl you dislike. She is your rival. This will matter later.`,
            '⚔ New rival'
          );
        } else {
          addFeedEntry('You had a falling out with ' + sm.name + '.', 'bad');
          queuePopup(
            `You and ${sm.name} do not speak for a week. The silence in the classroom is specific and everyone notices it.`,
            `Closeness -${d}`
          );
        }
        saveGame(); return null;
      },
    });
  }

  // Make amends (if relationship is damaged)
  if (sm.status === 'rival' || sm.closeness < 15) {
    actions.push({
      text: '🤝 Try to make amends',
      fn() {
        const roll = rand(1,10);
        if (roll >= 5) {
          const g = rand(10,20);
          sm.closeness = Math.min(100, sm.closeness + g);
          if (sm.status === 'rival') sm.status = 'acquaintance';
          addFeedEntry('You made amends with ' + sm.name + '.', 'good');
          queuePopup(
            `It takes courage to go to her first. She receives your attempt with — not warmth, exactly, but openness. It is a beginning.`,
            `Closeness +${g}`
          );
        } else {
          addFeedEntry(sm.name + ' is not ready to make amends.', 'bad');
          queuePopup(`${sm.name} is not yet ready. She is civil. Nothing more. You will have to wait.`);
        }
        saveGame(); return null;
      },
    });
  }

  actions.push({ text: '← Schoolmates', fn() { openSchoolmatesView(); return null; } });
  return actions;
}

// ── SCHOOLMATES VIEW ───────────────────────────────────────
// Separate from People tab — shown in Schooling tab

function openSchoolmatesView() {
  const all = G.schoolmates || [];
  if (!all.length) {
    queuePopup('Your school has not yet introduced you to your fellow pupils. Give it a season or two.');
    return;
  }

  const introduced = all.filter(s => s.introduced);
  const unknown    = all.filter(s => !s.introduced);

  if (!introduced.length) {
    queuePopup(`You know none of your schoolmates yet. There are ${unknown.length} girls here you have not yet spoken to.`);
    return;
  }

  queuePopup(
    `Your schoolmates (${introduced.length} known, ${unknown.length} yet to meet):`,
    null,
    [
      ...introduced.map(sm => ({
        text: `${sm.name} ${sm.surname} — ${schoolmateStatusLabel(sm)}`,
        fn() { openSchoolmateProfile(sm); return null; },
      })),
      { text: '← Back', fn() { return {}; } },
    ]
  );
}

// ── DEBUT CONVERSION ───────────────────────────────────────
// Called at debut — converts qualifying schoolmates to adult NPCs

function convertSchoolmatesToAdultNPCs() {
  if (!G.schoolmates || !G.schoolmates.length) return 0;
  let converted = 0;

  for (const sm of G.schoolmates) {
    if (!sm.introduced) continue;

    if (sm.closeness >= 50 && sm.status !== 'rival') {
      // Convert to lifelong friend — add to adult NPC pool
      const adultNPC = {
        id:         sm.id + '_adult',
        first:      sm.name,
        last:       sm.surname,
        fullName:   'Miss ' + sm.name + ' ' + sm.surname,
        nick:       sm.name,
        title:      'Miss',
        trait:      sm.trait,
        desc:       sm.desc,
        wealth:     rand(300, 2000),
        gender:     'female',
        age:        sm.age,
        closeness:  sm.closeness,
        approval:   60,
        faith:      rand(30,70),
        introduced: true,
        isRival:    false,
        alive:      true,
        metHow:     'school',
        isSchoolmate: true,
      };
      if (!G.npcs) G.npcs = [];
      G.npcs.push(adultNPC);
      converted++;

      addFeedEntry(sm.name + ' will be in London this Season.', 'event');
    }

    if (sm.status === 'rival' && sm.closeness < 30) {
      // Convert to social rival
      const rivalNPC = {
        id:         sm.id + '_rival',
        first:      sm.name,
        last:       sm.surname,
        fullName:   'Miss ' + sm.name + ' ' + sm.surname,
        nick:       sm.name,
        title:      'Miss',
        trait:      sm.trait,
        desc:       sm.desc,
        wealth:     rand(200, 1500),
        gender:     'female',
        age:        sm.age,
        closeness:  sm.closeness,
        approval:   25,
        faith:      rand(30,70),
        introduced: true,
        isRival:    true,
        alive:      true,
        metHow:     'school',
        isSchoolmate: true,
      };
      if (!G.npcs) G.npcs = [];
      G.npcs.push(rivalNPC);
      if (!G.rival) G.rival = rivalNPC;
      addFeedEntry(sm.name + ' will also be in London this Season.', 'bad');
    }

    // Correspondence — mid-closeness girls write letters
    if (sm.closeness >= 30 && sm.closeness < 50 && sm.status !== 'rival') {
      sm.outcome = 'correspondence';
    }
  }

  saveGame();
  return converted;
}

// ── SEASONAL SCHOOLMATE EVENTS ─────────────────────────────
// Called from processEducationSeason

function schoolmateSeasonalEvent() {
  if (!G.schoolmates || !G.schoolmates.length) return null;
  const known = G.schoolmates.filter(s => s.introduced && s.status !== 'rival');
  if (!known.length) return null;

  const sm = pick(known);
  const roll = rand(1,10);

  // Random schoolmate moment
  if (roll >= 8 && sm.canTrouble) {
    return {
      text: `${sm.name} gets you involved in something you should probably have avoided.`,
      type: 'event',
      popup: {
        text: `${sm.name} appears at your elbow with that expression that means something is about to happen. "Come with me," she says. You go. You should not have gone.`,
        badge: null,
        choices: [
          { text:'Go along with it', fn() {
            const caught = Math.random() < 0.3;
            if (caught) { changeStat('reputation',-rand(3,8)); G.scandals++; sm.closeness=Math.min(100,sm.closeness+10); return {text:'You are caught. There are consequences. ' + sm.name + ' is unrepentant.', badge:'Reputation -5'}; }
            changeStat('health', rand(4,8)); sm.closeness=Math.min(100,sm.closeness+15);
            return {text:'It works perfectly. Nobody sees. ' + sm.name + ' grabs your arm and you run and it is wonderful.', badge:'Health +6'};
          }},
          { text:'Decline and go to bed', fn() { return {text:'You are sensible. You are also slightly bored about it.'}; }},
        ],
      },
    };
  }

  if (roll >= 5 && sm.canTeach && !sm._seasonTaught) {
    sm._seasonTaught = true;
    const subject = sm.trait === 'clever' ? 'reason' : sm.trait === 'artistic' ? 'decorum' : 'faith';
    const subStat  = sm.trait === 'clever' ? 'history' : sm.trait === 'artistic' ? 'art' : 'theology';
    return {
      text: `${sm.name} shows you something in your ${subStat} lesson.`,
      type: 'good',
      popup: {
        text: `${sm.name} leans over and points to something in your book you had missed entirely. "It makes more sense if you read it backwards," she says. She is not wrong.`,
        badge: `${subStat} +4`,
        choices: [
          { text:'Thank her properly', fn() {
            if (typeof changeEduStat==='function') changeEduStat(subject, subStat, 4);
            sm.closeness = Math.min(100, sm.closeness + rand(5,10));
            return {text:'She shrugs but looks pleased. You are beginning to like her.', badge:`${subStat} +4`};
          }},
        ],
      },
    };
  }

  // Simple closeness moment
  sm.closeness = Math.min(100, sm.closeness + rand(2,5));
  return {
    text: `A pleasant afternoon with ${sm.name}.`,
    type: 'good',
    popup: null, // just a log entry
  };
}
