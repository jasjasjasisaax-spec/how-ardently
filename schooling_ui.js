// ═══════════════════════════════════════════════════════════
// schooling_ui.js — Full schooling tab view
// Subjects list, teachers, schoolmates, school info
// ═══════════════════════════════════════════════════════════

// ── SCHOOL SUBJECT FOCUS ──────────────────────────────────
// Each school emphasises certain subjects — affects seasonal gains

const SCHOOL_FOCUS = {
  sunday_school: {
    name:    'Sunday School',
    strong:  ['faith.theology','faith.scripture','literacy.reading'],
    weak:    ['decorum.music','decorum.dancing','reason.science'],
    bonus:   0.5,  // 50% extra gain on strong subjects
    desc:    'Faith and letters. Simple but earnest.',
  },
  mrs_goddards: {
    name:    "Mrs Goddard's School",
    strong:  ['literacy.reading','literacy.writing','faith.scripture','decorum.needlework'],
    weak:    ['reason.science','decorum.dancing','decorum.languages'],
    bonus:   0.4,
    desc:    'Plain learning, good needlework, solid faith.',
  },
  miss_pinkertons: {
    name:    "Miss Pinkerton's Academy",
    strong:  ['decorum.dancing','decorum.languages','decorum.manners','literacy.calligraphy'],
    weak:    ['reason.science','reason.philosophy'],
    bonus:   0.5,
    desc:    'Accomplishments and deportment above all.',
  },
  ladies_seminary: {
    name:    'The Ladies\' Seminary at Bath',
    strong:  ['decorum.music','decorum.dancing','decorum.languages','reason.history','literacy.calligraphy'],
    weak:    [],
    bonus:   0.6,
    desc:    'Every subject, taught excellently.',
  },
};

function getSchoolFocusKey() {
  if (!G.schooling) return null;
  if (G.schooling.type === 'sunday') return 'sunday_school';
  if (G.schooling.type === 'boarding' && G.schooling.boarding) {
    const tier = G.schooling.boarding.tier;
    return tier === 1 ? 'mrs_goddards' : tier === 2 ? 'miss_pinkertons' : 'ladies_seminary';
  }
  return null;
}

// Apply focus bonus to a subject gain
function applySchoolFocusBonus(subjectKey, baseGain) {
  const focusKey = getSchoolFocusKey();
  if (!focusKey) return baseGain;
  const focus = SCHOOL_FOCUS[focusKey];
  if (!focus) return baseGain;
  if (focus.strong.includes(subjectKey))  return Math.round(baseGain * (1 + focus.bonus));
  if (focus.weak.includes(subjectKey))    return Math.max(1, Math.round(baseGain * 0.6));
  return baseGain;
}

// ── TEACHER SYSTEM ────────────────────────────────────────

const TEACHER_POOL = {
  literacy: [
    { name:'Mrs Clarke',  strictness:70, warmth:40, quality:65, desc:'Exacting and precise. Every comma matters.' },
    { name:'Miss Webb',   strictness:45, warmth:75, quality:55, desc:'Encouraging and patient. Slower but kinder.' },
    { name:'Mr Holt',     strictness:80, warmth:30, quality:80, desc:'The best teacher here. Nobody likes him.' },
  ],
  decorum: [
    { name:'Mme Fontaine', strictness:65, warmth:60, quality:80, desc:'French. Effortlessly superior. But fair.' },
    { name:'Miss Rowe',    strictness:50, warmth:70, quality:65, desc:'Cheerful. Loves music. Loves dancing more.' },
    { name:'Mr Tilney',    strictness:40, warmth:80, quality:60, desc:'The dancing master. Very charming. Knows it.' },
  ],
  reason: [
    { name:'Dr Pell',      strictness:75, warmth:35, quality:85, desc:'A genuine scholar. Treats you like one too.' },
    { name:'Mrs Ashford',  strictness:55, warmth:65, quality:70, desc:'Thoughtful. Asks questions instead of lecturing.' },
  ],
  faith: [
    { name:'Reverend Cox', strictness:60, warmth:70, quality:65, desc:'Genuinely devout. Answers hard questions.' },
    { name:'Miss Pryor',   strictness:70, warmth:50, quality:60, desc:'Scripture first. Context optional.' },
  ],
};

function generateTeachers(schoolType) {
  const teachers = {};
  if (schoolType === 'boarding') {
    // Boarding school: one teacher per group
    for (const [group, pool] of Object.entries(TEACHER_POOL)) {
      const t = pick(pool);
      teachers[group] = {
        ...t,
        group,
        closeness: rand(20, 45),
        impressed: false,
        fell_out: false,
        wrote_reference: false,
      };
    }
  } else if (schoolType === 'governess') {
    // Governess: the governess IS the teacher for everything she covers
    // Built from the G.schooling.governess object
  } else if (schoolType === 'sunday') {
    // Sunday school: vicar teaches faith; dame teaches literacy
    teachers.faith = {
      name: 'Reverend ' + pick(['Cox','Mills','Drake','Stone']),
      strictness: 55, warmth: 65, quality: 60, group: 'faith',
      closeness: 30, impressed: false, fell_out: false, wrote_reference: false,
      desc: 'The village vicar. Patient with children. Patient with questions.',
    };
    teachers.literacy = {
      name: 'Mrs ' + pick(['Pratt','Holt','Webb','Lane']),
      strictness: 50, warmth: 60, quality: 50, group: 'literacy',
      closeness: 25, impressed: false, fell_out: false, wrote_reference: false,
      desc: 'The dame school teacher. Has been here for thirty years.',
    };
  }
  return teachers;
}

function initTeachers() {
  if (!G.schooling || G.schooling.type === 'none') return;
  if (G.teachers && Object.keys(G.teachers).length > 0) return; // already set

  if (G.schooling.type === 'governess' && G.schooling.governess) {
    const gov = G.schooling.governess;
    G.teachers = {
      governess: {
        name:       gov.name,
        strictness: gov.quality === 'excellent' ? 75 : gov.quality === 'good' ? 60 : 45,
        warmth:     gov.quality === 'excellent' ? 55 : gov.quality === 'good' ? 65 : 70,
        quality:    gov.quality === 'excellent' ? 85 : gov.quality === 'good' ? 70 : 50,
        group:      'all',
        closeness:  40,
        impressed:  false,
        fell_out:   false,
        wrote_reference: false,
        desc:       gov.desc || 'Your governess. The whole of your education rests on her.',
      },
    };
  } else {
    G.teachers = generateTeachers(G.schooling.type);
  }
  saveGame();
}

// Teacher quality modifier on seasonal gains
function teacherGainModifier(group) {
  if (!G.teachers) return 1.0;
  const key = G.schooling.type === 'governess' ? 'governess' : group;
  const t = G.teachers[key];
  if (!t || t.fell_out) return 0.7; // fell out = worse gains
  const closeness = t.closeness || 30;
  // Quality × relationship modifier
  const qualityMod = (t.quality || 60) / 60;
  const relMod     = closeness >= 70 ? 1.3 : closeness >= 45 ? 1.1 : closeness >= 25 ? 1.0 : 0.85;
  return Math.round(qualityMod * relMod * 10) / 10;
}

// ── MAIN SCHOOLING VIEW ───────────────────────────────────

function openCurrentSchoolView() {
  if (!G.schooling || G.schooling.type === 'none') {
    openSchoolingChoice();
    return;
  }
  // Ensure teachers are initialised
  initTeachers();

  const type = G.schooling.type;
  const focusKey = getSchoolFocusKey();
  const focus    = focusKey ? SCHOOL_FOCUS[focusKey] : null;

  // Build sections
  queuePopup(
    `${G.schooling.name || G.schooling.type}\n${focus ? focus.desc : ''}`,
    null,
    [
      { text: '📚 Subjects & Practise',     fn() { openSubjectsView();    return null; } },
      { text: '👩‍🏫 Teachers',                fn() { openTeachersView();   return null; } },
      { text: '👧 Schoolmates',              fn() { openFullSchoolmatesView(); return null; } },
      ...(focus ? [{ text: 'ℹ School Info',  fn() { openSchoolInfoView();  return null; } }] : []),
      { text: '← Back',                     fn() { return {}; } },
    ]
  );
}

// ── SUBJECTS VIEW ─────────────────────────────────────────

const ALL_SUBJECTS = [
  // Literacy group
  { key:'literacy.reading',    label:'Reading',     group:'literacy', minAge:4  },
  { key:'literacy.writing',    label:'Writing',     group:'literacy', minAge:4  },
  { key:'literacy.arithmetic', label:'Arithmetic',  group:'literacy', minAge:6  },
  { key:'literacy.calligraphy',label:'Calligraphy', group:'literacy', minAge:8  },
  // Reason group
  { key:'reason.history',      label:'History',     group:'reason',   minAge:10 },
  { key:'reason.philosophy',   label:'Philosophy',  group:'reason',   minAge:12 },
  { key:'reason.science',      label:'Science',     group:'reason',   minAge:12 },
  // Faith group
  { key:'faith.theology',      label:'Theology',    group:'faith',    minAge:4  },
  { key:'faith.scripture',     label:'Scripture',   group:'faith',    minAge:4  },
  // Decorum group
  { key:'decorum.manners',     label:'Manners',     group:'decorum',  minAge:4  },
  { key:'decorum.needlework',  label:'Needlework',  group:'decorum',  minAge:6  },
  { key:'decorum.music',       label:'Music',       group:'decorum',  minAge:8  },
  { key:'decorum.dancing',     label:'Dancing',     group:'decorum',  minAge:10 },
  { key:'decorum.art',         label:'Art',         group:'decorum',  minAge:10 },
  { key:'decorum.languages',   label:'Languages',   group:'decorum',  minAge:10 },
];

const GROUP_COLORS = {
  literacy: '#7a4f2d',
  reason:   '#2d5016',
  faith:    '#4a3080',
  decorum:  '#b8860b',
};

function openSubjectsView() {
  const age     = G.age || 8;
  const edu     = G.eduStats;
  const focusKey= getSchoolFocusKey();
  const focus   = focusKey ? SCHOOL_FOCUS[focusKey] : null;

  if (!edu) { queuePopup('Education not yet initialised.'); return; }

  // Filter to age-appropriate subjects
  const available = ALL_SUBJECTS.filter(s => age >= s.minAge);

  const choices = [];

  let lastGroup = '';
  for (const subj of available) {
    // Group header as separator text
    const [grp, sub] = subj.key.split('.');
    const value = edu[grp] ? edu[grp][sub] || 0 : 0;
    const isFocus = focus && focus.strong.includes(subj.key);
    const isWeak  = focus && focus.weak.includes(subj.key);
    const isMastered = value >= 85;
    const focusTag = isFocus ? ' ★' : isWeak ? ' ▿' : '';
    const masterTag = isMastered ? ' ✦' : '';

    choices.push({
      text: `${subj.label}${focusTag}${masterTag} — ${value}`,
      fn() { openSubjectDetail(subj, value); return null; },
    });
  }

  choices.push({ text: '← Back', fn() { openCurrentSchoolView(); return null; } });

  queuePopup(
    `Subjects${focus ? `\n★ = school focus  ▿ = less emphasised` : ''}\n✦ = mastered`,
    null,
    choices
  );
}

function openSubjectDetail(subj, currentValue) {
  const [grp, sub] = subj.key.split('.');
  const edu   = G.eduStats;
  const value = edu && edu[grp] ? edu[grp][sub] || 0 : 0;
  const color = GROUP_COLORS[grp] || '#b8860b';
  const statBar = pbar(subj.label, value, color, String(value), false, 'group');
  const isMastered = value >= 85;
  const focusKey = getSchoolFocusKey();
  const focus    = focusKey ? SCHOOL_FOCUS[focusKey] : null;
  const isFocus  = focus && focus.strong.includes(subj.key);

  const masteryText = isMastered
    ? '\n✦ Mastered — you may demonstrate this accomplishment in society.'
    : value >= 70 ? '\nYou are highly proficient.'
    : value >= 45 ? '\nYou are making good progress.'
    : '\nYou are still developing this skill.';

  queuePopup(
    `${subj.label}${isFocus ? ' ★ School Focus' : ''}${masteryText}${statBar}`,
    null,
    [
      {
        text: `📖 Practise ${subj.label}`,
        fn() {
          // Fire lesson event if available, otherwise direct gain
          const lessonKey = sub;
          const event = typeof fireLessonEvent === 'function' ? fireLessonEvent(lessonKey) : null;
          if (event) {
            addFeedEntry(`${subj.label} practice.`, 'good');
            queuePopup(
              event.text, null,
              event.choices.map(c => ({
                text: c.text,
                fn() {
                  const result = c.fn();
                  if (result) {
                    if (result.log)  addFeedEntry(result.log, 'good');
                    if (result.text) queuePopup(result.text, result.badge||null);
                    if (result.schoolmateMoment && typeof handleSchoolmateMoment === 'function') handleSchoolmateMoment(result.schoolmateMoment);
                    // Check for talent discovery
                    checkTalentDiscovery(grp, sub);
                    renderStats(); saveGame();
                  }
                  return null;
                },
              }))
            );
          } else {
            // Direct gain with school focus bonus
            let gain = rand(3,7);
            gain = applySchoolFocusBonus(subj.key, gain);
            const mod = teacherGainModifier(grp);
            gain = Math.round(gain * mod);
            changeEduStat(grp, sub, gain);
            checkTalentDiscovery(grp, sub);
            addFeedEntry(`You practise ${subj.label}.`, 'good');
            queuePopup(`You spend the afternoon on ${subj.label}. Progress is steady.`, `${subj.label} +${gain}`);
            renderStats(); saveGame();
          }
          return null;
        },
      },
      ...(isMastered ? [{
        text: '✦ Demonstrate this accomplishment',
        fn() {
          changeStat('reputation', rand(5,12));
          changeStat('looks', rand(2,5));
          addFeedEntry(`You demonstrate your mastery of ${subj.label}.`, 'event');
          queuePopup(
            `You perform for a small gathering. Your mastery of ${subj.label} is evident to everyone present. Several people make a point of seeking you out afterwards.`,
            'Reputation +8'
          );
          renderStats(); saveGame(); return null;
        },
      }] : []),
      { text: '← Subjects', fn() { openSubjectsView(); return null; } },
    ]
  );
}

// Talent discovery — rare event when a stat crosses certain thresholds naturally
function checkTalentDiscovery(grp, sub) {
  if (!G.eduStats || !G.eduStats[grp]) return;
  const value = G.eduStats[grp][sub] || 0;
  if (!G._talentsDiscovered) G._talentsDiscovered = {};
  const key = `${grp}.${sub}`;
  // Trigger at 40, 65, 85
  const thresholds = [40, 65, 85];
  for (const t of thresholds) {
    const tkey = `${key}_${t}`;
    if (value >= t && !G._talentsDiscovered[tkey]) {
      G._talentsDiscovered[tkey] = true;
      const messages = {
        40:  `Something shifts in your ${sub} lessons. It is beginning to feel natural.`,
        65:  `You realise you are genuinely good at ${sub}. Not just practised — good.`,
        85:  `Your ${sub} has reached a point where others notice without being told. You have a talent.`,
      };
      changeStat('wit', rand(1,3));
      changeStat('reputation', rand(2,5));
      addFeedEntry(`A talent for ${sub} discovered.`, 'event');
      queuePopup(messages[t], `✦ Talent: ${sub}`);
      return;
    }
  }
}

// ── TEACHERS VIEW ─────────────────────────────────────────

function openTeachersView() {
  if (!G.teachers || !Object.keys(G.teachers).length) {
    queuePopup('No teachers assigned yet.');
    return;
  }

  const teacherList = Object.values(G.teachers);
  queuePopup(
    'Your teachers:',
    null,
    [
      ...teacherList.map(t => ({
        text: `${t.name} — ${t.group === 'all' ? 'All subjects' : t.group} · Closeness ${t.closeness}`,
        fn() { openTeacherProfile(t); return null; },
      })),
      { text: '← Back', fn() { openCurrentSchoolView(); return null; } },
    ]
  );
}

function openTeacherProfile(teacher) {
  const relBar      = typeof relationshipBarHTML === 'function' ? relationshipBarHTML(teacher.closeness, false) : '';
  const strictBar   = pbar('Strictness', teacher.strictness, '#8b2020', String(teacher.strictness));
  const warmthBar   = pbar('Warmth',     teacher.warmth,     '#2d5016', String(teacher.warmth));
  const qualityBar  = pbar('Quality',    teacher.quality,    '#b8860b', String(teacher.quality));
  const gainMod     = teacherGainModifier(teacher.group);
  const gainText    = gainMod >= 1.2 ? 'Excellent gains' : gainMod >= 1.0 ? 'Good gains' : gainMod >= 0.8 ? 'Reduced gains' : 'Poor gains';

  queuePopup(
    `${teacher.name}\n${teacher.desc}\n\nTeaching effect: ${gainText}${relBar}${strictBar}${warmthBar}${qualityBar}`,
    null,
    [
      {
        text: '✨ Try to impress them',
        fn() {
          const relevantStat = teacher.group === 'decorum' ? G.looks
                             : teacher.group === 'reason'  ? G.wit
                             : teacher.group === 'faith'   ? G.faith
                             : G.wit;
          const roll = rand(1,10) + Math.floor((relevantStat - 50) / 10);
          if (roll >= 7) {
            teacher.closeness = Math.min(100, teacher.closeness + rand(10,20));
            teacher.impressed = true;
            addFeedEntry(`You impressed ${teacher.name}.`, 'good');
            queuePopup(
              `${teacher.name} notices. There is a particular quality to their attention today — the way a teacher looks when they realise a student is worth more effort. You have made an impression.`,
              'Relationship +15'
            );
          } else {
            teacher.closeness = Math.max(0, teacher.closeness - rand(3,8));
            queuePopup(
              `Your attempt to impress ${teacher.name} does not quite land. They are neither harsh nor encouraging. You will try again.`
            );
          }
          saveGame(); return null;
        },
      },
      {
        text: '📘 Seek extra tuition (£20)',
        fn() {
          if (G.wealth < 20) { queuePopup('You cannot afford extra tuition at present.'); return null; }
          G.wealth -= 20;
          teacher.closeness = Math.min(100, teacher.closeness + rand(5,10));
          // Boost all subjects in teacher's group
          const grp = teacher.group === 'all' ? null : teacher.group;
          if (grp && G.eduStats && G.eduStats[grp]) {
            for (const sub of Object.keys(G.eduStats[grp]).filter(k => k !== 'total')) {
              changeEduStat(grp, sub, rand(3,7));
            }
          } else if (!grp && G.eduStats) {
            // Governess teaches everything
            changeEduStat('literacy','reading', rand(2,5));
            changeEduStat('decorum','manners',  rand(2,5));
          }
          addFeedEntry(`Extra tuition from ${teacher.name}.`, 'good');
          queuePopup(`An extra hour with ${teacher.name}. Intense and productive. Worth every shilling.`, 'All subjects +4');
          renderStats(); saveGame(); return null;
        },
      },
      {
        text: '💢 Have a falling out',
        fn() {
          if (teacher.fell_out) {
            queuePopup('You are already on poor terms. Things could not be much worse on that front.');
            return null;
          }
          teacher.closeness = Math.max(0, teacher.closeness - rand(25,40));
          teacher.fell_out = true;
          addFeedEntry(`You had a falling out with ${teacher.name}.`, 'bad');
          queuePopup(
            `Something goes wrong. A misunderstanding, or perhaps just an honest collision of personalities. ${teacher.name} is now politely, permanently cold. Your gains in their subject will suffer.`,
            'Relationship -30'
          );
          saveGame(); return null;
        },
      },
      ...(teacher.impressed && !teacher.wrote_reference ? [{
        text: '📋 Ask for a reference letter',
        fn() {
          teacher.wrote_reference = true;
          if (!G.careers) G.careers = { unlocked:[], active:null, history:[] };
          if (!G.careers.references) G.careers.references = [];
          G.careers.references.push({ from: teacher.name, subject: teacher.group, quality: teacher.quality });
          addFeedEntry(teacher.name + ' writes you a reference.', 'good');
          queuePopup(
            `${teacher.name} agrees to write you a reference. "For whatever you need it for," they say, which implies they know you have ambitions and approve of them. This will be useful.`,
            'Reference secured'
          );
          saveGame(); return null;
        },
      }] : []),
      { text: '← Teachers', fn() { openTeachersView(); return null; } },
    ]
  );
}

// ── FULL SCHOOLMATES VIEW ─────────────────────────────────
// Shows ALL schoolmates — introduced tappable, unknown greyed

function openFullSchoolmatesView() {
  const all = G.schoolmates || [];
  if (!all.length) {
    queuePopup(
      'School has not yet started properly. The other girls are still strangers.',
      null, [{ text: '← Back', fn() { openCurrentSchoolView(); return null; } }]
    );
    return;
  }

  const introduced = all.filter(s => s.introduced);
  const unknown    = all.filter(s => !s.introduced);

  queuePopup(
    `${G.schooling.name || 'School'} · ${all.length} girls\n${introduced.length} known · ${unknown.length} yet to meet`,
    null,
    [
      // Introduced schoolmates — tappable
      ...introduced.map(sm => ({
        text: `${sm.name} ${sm.surname} — ${schoolmateStatusLabel(sm)} · ${sm.closeness}`,
        fn() { openSchoolmateProfile(sm); return null; },
      })),
      // Unknown schoolmates — greyed label only (but can try to meet)
      ...unknown.map(sm => ({
        text: `${sm.name} ${sm.surname} — not yet introduced`,
        fn() {
          // Can attempt introduction but costs an action
          queuePopup(
            `You have not been formally introduced to ${sm.name} ${sm.surname} yet.`,
            null,
            [
              { text: 'Introduce yourself anyway', fn() {
                sm.introduced = true;
                sm.closeness  = rand(5,15);
                sm.status     = 'acquaintance';
                addFeedEntry(`You introduce yourself to ${sm.name}.`, 'good');
                queuePopup(`You approach ${sm.name} ${sm.surname} without a formal introduction. ${sm.desc}. She seems ${rand(1,2)===1?'surprised':'pleased'}.`, `Met ${sm.name}`);
                saveGame(); return null;
              }},
              { text: 'Wait for a proper introduction', fn() { return null; } },
            ]
          );
          return null;
        },
      })),
      { text: '← Back', fn() { openCurrentSchoolView(); return null; } },
    ]
  );
}

// ── SCHOOL INFO VIEW ──────────────────────────────────────

function openSchoolInfoView() {
  const focusKey = getSchoolFocusKey();
  const focus    = focusKey ? SCHOOL_FOCUS[focusKey] : null;
  if (!focus) { queuePopup('No school focus information.'); return; }

  const strongList = focus.strong.map(s => s.split('.').pop()).join(', ');
  const weakList   = focus.weak.length ? focus.weak.map(s => s.split('.').pop()).join(', ') : 'None';
  const careers    = G.schooling.boarding ? G.schooling.boarding.careerUnlocks.join(', ') : 'None';

  queuePopup(
    `${focus.name}\n\n${focus.desc}\n\nStrong subjects: ${strongList}\nWeaker subjects: ${weakList}${G.schooling.boarding ? '\nCareer paths: ' + careers : ''}`,
    null,
    [{ text: '← Back', fn() { openCurrentSchoolView(); return null; } }]
  );
}

// ── GOVERNESS ACTIONS ─────────────────────────────────────

function openGovernessActions() {
  if (!G.schooling || G.schooling.type !== 'governess' || !G.schooling.governess) {
    openSchoolingChoice();
    return;
  }
  initTeachers();
  openCurrentSchoolView();
}
