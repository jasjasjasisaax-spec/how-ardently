// ═══════════════════════════════════════════════════════════
// ui.js — All rendering and UI state
// ═══════════════════════════════════════════════════════════

// ── UI STATE ───────────────────────────────────────────────
let currentView = 'home';  // 'home' | 'society' | 'self' | 'personal' | 'education' | 'tutors' | 'life'

// ── POPUP QUEUE ────────────────────────────────────────────
let popQueue = [];
let popOpen  = false;

// ═══════════════════════════════════════════════════════════
// GAME PROMPT — replaces window.prompt() for Android compat
// ═══════════════════════════════════════════════════════════

function gamePrompt(label, defaultValue, onConfirm, onCancel) {
  const modal = document.getElementById('input-modal');
  const field = document.getElementById('input-modal-field');
  const lbl   = document.getElementById('input-modal-label');
  const btnOk = document.getElementById('input-modal-confirm');
  const btnNo = document.getElementById('input-modal-cancel');
  if (!modal) {
    // Fallback if modal not in DOM
    const v = prompt(label, defaultValue || '');
    if (v !== null) onConfirm(v);
    else if (onCancel) onCancel();
    return;
  }
  lbl.textContent = label;
  field.value = defaultValue || '';
  modal.style.display = 'flex';
  field.focus();
  // Clean up old listeners
  const newOk = btnOk.cloneNode(true);
  const newNo = btnNo.cloneNode(true);
  btnOk.parentNode.replaceChild(newOk, btnOk);
  btnNo.parentNode.replaceChild(newNo, btnNo);
  function close() { modal.style.display = 'none'; }
  newOk.addEventListener('click', () => {
    const val = document.getElementById('input-modal-field').value.trim();
    close();
    onConfirm(val || defaultValue || '');
  });
  newNo.addEventListener('click', () => {
    close();
    if (onCancel) onCancel();
  });
  // Enter key confirms
  field.addEventListener('keydown', function handler(e) {
    if (e.key === 'Enter') {
      field.removeEventListener('keydown', handler);
      newOk.click();
    }
  });
}

function queuePopup(text, badge = null, choices = null, onContinue = null, skipQueue = false) {
  const item = { text, badge, choices, onContinue };
  if (skipQueue) {
    // Insert at front (for tier-crossing notifications etc.)
    popQueue.unshift(item);
  } else {
    popQueue.push(item);
  }
  if (!popOpen) nextPopup();
}

function nextPopup() {
  if (!popQueue.length) { popOpen = false; return; }
  popOpen = true;
  const { text, badge, choices, onContinue } = popQueue.shift();

  // Badge
  let badgeHtml = '';
  if (badge) {
    const cls = badge.startsWith('+') ? 'pos' : badge.startsWith('-') ? 'neg' : 'neu';
    badgeHtml = `<div class="pop-bw"><span class="pop-badge ${cls}">${badge}</span></div>`;
  }

  // Split text from stats HTML — stats cards live outside the italic <p>
  // Convention: text before the first HTML tag (div or strong) is narrative
  const divIdx    = text.indexOf('<div');
  const strongIdx = text.indexOf('<strong');
  let splitAt = -1;
  if (divIdx > -1 && strongIdx > -1) splitAt = Math.min(divIdx, strongIdx);
  else if (divIdx > -1) splitAt = divIdx;
  else if (strongIdx > -1) splitAt = strongIdx;
  let narrativeText, statsHtml;
  if (splitAt === -1) {
    narrativeText = text;
    statsHtml = '';
  } else {
    narrativeText = text.slice(0, splitAt);
    statsHtml = text.slice(splitAt);
  }
  document.getElementById('pop-body').innerHTML =
    `<p class="pop-txt">${narrativeText.replace(/\n/g, '<br>')}</p>${statsHtml}${badgeHtml}<div class="pop-rule"></div>`;

  // Footer: choices or continue button
  if (choices && choices.length) {
    document.getElementById('pop-foot').innerHTML =
      `<div class="pop-choices">${choices.map((c, i) =>
        `<button class="ch-btn" data-i="${i}">${c.text}</button>`
      ).join('')}</div>`;
    document.getElementById('pop-foot').querySelectorAll('.ch-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const idx = parseInt(btn.dataset.i);
        closePopup();
        // fn() handles its own result — just call it after popup closes
        setTimeout(() => {
          if (choices[idx] && choices[idx].fn) {
            choices[idx].fn();
          }
        }, 180);
      });
    });
  } else {
    document.getElementById('pop-foot').innerHTML =
      `<button class="cont-btn" id="cont-btn">Continue →</button>`;
    document.getElementById('cont-btn').addEventListener('click', () => {
      closePopup();
      if (onContinue) setTimeout(() => { onContinue(); renderStats(); }, 200);
    });
  }

  document.getElementById('pop-ov').classList.add('open');
}

function closePopup() {
  document.getElementById('pop-ov').classList.remove('open');
  setTimeout(() => { if (popQueue.length) nextPopup(); else popOpen = false; }, 240);
}

// ── ACTION DISPATCH ────────────────────────────────────────
// Handles the result object from actions.js

function handleAction(key) {
  // Special multi-step actions handled in UI directly
  if (key === 'circle')         { switchView('people'); renderPeopleView(); return; }
  if (key === 'save_game')      { if(typeof openSaveSlots==='function') openSaveSlots('save'); return; }
  if (key === 'load_game')      { if(typeof openSaveSlots==='function') openSaveSlots('load'); return; }
  if (key === 'choose_schooling')  {
    if (G.schooling && G.schooling.type !== 'none') openCurrentSchoolView();
    else openSchoolingChoice();
    return;
  }
  // Subject lesson event keys — fire interactive lesson
  const lessonSubjects = ['music','dancing','scripture','history','languages','needlework','art','reading','writing','french','drawing','study'];
  if (lessonSubjects.includes(key)) { fireLessonUI(key); return; }
  if (key === 'adopt_pet')         { openAdoptPet();           return; }
  if (key.startsWith('pet_'))      { const petName=key.slice(4); const pet=(G.pets||[]).find(p=>p.name===petName); if(pet) openPetProfile(pet); return; }
  if (key === 'boarding_school')   { openBoardingSchoolChoice(); return; }
  if (key === 'hire_tutor')        { openTutorMenu();          return; }
  if (key === 'self_study')        { openSelfStudyMenu();      return; }
  if (key === 'view_edu_stats')    { openEduStatsDetail();     return; }
  if (key === 'view_schoolmates')  { openSchoolmatesView();    return; }
  if (key === 'family')   { switchView('people'); renderPeopleView(); return; }
  if (key === 'mart')     { openMarriageMart(); return; }
  if (key === 'hostball') { if(typeof openBallPlanning==='function') openBallPlanning(); return; }
  if (key === 'children') { openChildrenMenu(); return; }

  const result = doAction(key);
  if (!result) return;

  // Log entry
  if (result.log) {
    const entry = typeof result.log === 'string'
      ? { text: result.log, type: '' }
      : result.log;
    addFeedEntry(entry.text, entry.type || '');
  }

  // Popup — pass choices through properly
  if (result.popup) {
    const { text, badge, choices } = result.popup;
    // Wrap choices so their fn() result is handled correctly
    const wrappedChoices = choices
      ? choices.map(c => ({
          text: c.text,
          fn() {
            const r = c.fn();
            if (!r) return null;
            if (r.log) addFeedEntry(typeof r.log === 'string' ? r.log : r.log.text, typeof r.log === 'string' ? '' : (r.log.type||''));
            if (r.text) queuePopup(r.text, r.badge || null);
            renderStats(); saveGame();
            if (currentView !== 'home') renderCatView(currentView);
            return null; // prevent double-handling
          },
        }))
      : null;
    queuePopup(text, badge || null, wrappedChoices || null);
  }

  renderStats();
  if (currentView !== 'home') renderCatView(currentView);
}

// ── STAT HEADER ────────────────────────────────────────────

function renderStats() {
  const tier   = repTier(G.reputation);
  const phase  = G.phase === 'childhood'
    ? (G.age === 0 ? 'Newborn'
      : G.age < 2  ? 'Infant · Age ' + G.age
      : G.age < 4  ? 'Toddler · Age ' + G.age
      : 'Childhood · Age ' + G.age)
    : `Age ${G.age} · ${G.season}`;


  // Education stats section (childhood, female, collapsible)
  let eduHtml = '';
  if (G.phase === 'childhood' && G.gender === 'female' && G.eduStats && G.age >= 4) {
    const e = G.eduStats;
    const collapsed = e.collapsed;
    eduHtml = `<div class="edu-hdr" onclick="toggleEduStats()">
      <span class="edu-hdr-label">▸ Education</span>
      <span class="edu-hdr-toggle">${collapsed ? '' : ''}</span>
    </div>`;
    if (!collapsed) {
      eduHtml += `<div class="edu-bars">
        ${bar('Literacy', e.literacy.total, '#7a4f2d')}
        ${bar('Reason',   e.reason.total,   '#2d5016')}
        ${bar('Faith',    e.faith.total,    '#4a3080')}
        ${bar('Decorum',  e.decorum.total,  '#b8860b')}
      </div>`;
    }
  }

  document.getElementById('stat-hdr').innerHTML = `
    <div class="sh-top">
      <span class="sh-name" onclick="devTitleTap()" style="cursor:default">${typeof getTitlePrefix==='function'&&G.title&&G.title.rank>0?getTitlePrefix()+' '+G.name:G.name}</span>
      <span class="sh-meta">${phase}</span>
      <button class="sh-settings-btn" onclick="openSettingsMenu()" title="Settings">⚙</button>
    </div>
    <div class="bars">
      ${bar('Health', G.health,     '#8b2020')}
      ${bar('Looks',  G.looks,      '#7a4f2d')}
      ${bar('Wit',    G.wit,        '#2d5016')}
      ${bar('Rep',    G.reputation, '#b8860b')}
    </div>
    <div class="sh-bot">
      <span class="wv">£${G.wealth.toLocaleString()}${typeof netAssetIncome==='function'&&G.assets&&G.assets.length?' (£'+netAssetIncome()+'/s)':''}</span>
      <span class="tb">★ ${tier}</span>
    </div>
    ${eduHtml}`;

  // Age-up button label
  const nextSeason = G.season === 'Spring' ? 'Autumn' : 'Spring';
  document.getElementById('au-label').textContent =
    G.phase === 'childhood'
      ? (G.age < 4 ? '⏭  GROW UP' : '⏭  GROW UP A SEASON')
      : '⏭  ADVANCE TO ' + nextSeason.toUpperCase();
  document.getElementById('au-sub').textContent =
    G.phase === 'childhood' ? `age ${G.age}` : `currently ${G.season}`;
}

function bar(label, val, colour) {
  return `<div class="sb">
    <span class="sb-l">${label}</span>
    <div class="sb-t"><div class="sb-f" style="width:${val}%;background:${colour}"></div></div>
    <span class="sb-n">${val}</span>
  </div>`;
}

// ── FEED ───────────────────────────────────────────────────

function addFeedEntry(text, type = '') {
  const feed = document.getElementById('view-home');
  const el   = document.createElement('div');
  el.className = 'log-entry ' + type;
  el.textContent = text;
  feed.insertAdjacentElement('afterbegin', el);
}

function addSeasonBanner() {
  const feed = document.getElementById('view-home');
  const el   = document.createElement('div');
  el.className = 'yr-banner';
  // Show season + age (no calendar year)
  const ageNote = G.season === 'Spring' ? ` · Age ${G.age}` : '';
  el.innerHTML = `<span>${G.season}${ageNote}</span>`;
  feed.insertAdjacentElement('afterbegin', el);
}

// ── BOTTOM NAV ─────────────────────────────────────────────

const TABS = {
  childhood: [
    { id:'home',      icon:'🏠', label:'Home'     },
    { id:'schooling', icon:'📖', label:'Schooling' },
    { id:'life',      icon:'🌳', label:'Life'      },
    { id:'people',    icon:'👥', label:'People'    },
  ],
  adult: [
    { id:'home',     icon:'🏠', label:'Home'    },
    { id:'society',  icon:'🎵', label:'Society' },
    { id:'self',     icon:'📚', label:'Self'    },
    { id:'people',   icon:'👥', label:'People'  },
    { id:'assets',   icon:'🏡', label:'Assets'  },
  ],
};


// ── SETTINGS MENU ──────────────────────────────────────────

function openSettingsMenu() {
  queuePopup(
    'Settings',
    null,
    [
      {
        text: '\u{1F4BE} Save Game',
        fn() {
          if (typeof openSaveSlots === 'function') openSaveSlots('save');
          return null;
        },
      },
      {
        text: '\u{1F4C2} Load / Switch Life',
        fn() {
          if (typeof openSaveSlots === 'function') openSaveSlots('load');
          return null;
        },
      },
      {
        text: '\u{1F3E0} Return to Title Screen',
        fn() {
          queuePopup(
            'Return to the title screen? Unsaved progress will be lost.',
            null,
            [
              { text: 'Save first, then return', fn() {
                if (typeof openSaveSlots === 'function') openSaveSlots('save');
                return null;
              }},
              { text: 'Return without saving', fn() {
                if (typeof showScreen === 'function') showScreen('s-title');
                return null;
              }},
              { text: 'Stay', fn() { return {}; } },
            ]
          );
          return null;
        },
      },
      { text: 'Close', fn() { return {}; } },
    ]
  );
}

function buildNav() {
  const phase = G.phase === 'childhood' ? 'childhood' : 'adult';
  const tabs  = TABS[phase];

  document.getElementById('bnav').innerHTML = tabs.map(t => `
    <button class="ntab${t.id === currentView ? ' active' : ''}" data-id="${t.id}">
      <span class="ni">${t.icon}</span>
      <span class="nl">${t.label}</span>
    </button>`).join('');

  document.getElementById('bnav').querySelectorAll('.ntab').forEach(btn => {
    btn.addEventListener('click', () => switchView(btn.dataset.id));
  });
}

function switchView(id) {
  currentView = id;

  // Update nav highlights
  document.querySelectorAll('.ntab').forEach(b =>
    b.classList.toggle('active', b.dataset.id === id)
  );

  // Show/hide views
  const allViews = ['home','society','self','personal','education','tutors','schooling','life','people','assets'];
  allViews.forEach(v => {
    const el = document.getElementById('view-' + v);
    if (el) el.classList.toggle('active', v === id);
  });

  // Age-up bar: only visible on home screen
  const auBar = document.querySelector('.au-bar');
  if (auBar) auBar.style.display = id === 'home' ? 'block' : 'none';

  // Populate category if needed
  if (id === 'people') { renderPeopleView(); return; }
  if (id === 'assets') { renderAssetsView(); return; }
  if (id !== 'home') renderCatView(id);

}

// ── CATEGORY VIEW BUILDER ──────────────────────────────────

function renderCatView(id) {
  const el = document.getElementById('view-' + id);
  if (!el) return;

  const cfg = getCatConfig(id);
  if (!cfg) return;

  let html = `<div class="cat-hdr">
    <div class="cat-hdr-title">${cfg.title}</div>
    <div class="cat-hdr-sub">${cfg.sub}</div>
  </div>`;

  for (const section of cfg.sections) {
    if (section.label) {
      html += `<div class="act-section">${section.label}</div>`;
    }
    for (const a of section.items) {
      html += `<div class="act-item${a.locked ? ' locked' : ''}" data-key="${a.key}">
        <span class="act-icon">${a.icon}</span>
        <div class="act-body">
          <span class="act-name">${a.name}</span>
          <span class="act-hint">${a.hint}</span>
        </div>
        <span class="act-arr">›</span>
      </div>`;
    }
  }

  el.innerHTML = html;

  // Bind clicks
  el.querySelectorAll('.act-item:not(.locked)').forEach(item => {
    item.addEventListener('click', () => {
      // Special multi-step actions handled here
      if (item.dataset.key === 'mart') {
        openMarriageMart();
      } else if (item.dataset.key === 'children') {
        openChildrenMenu();
      } else if (item.dataset.key === 'circle') {
        handleAction('circle');
      } else {
        handleAction(item.dataset.key);
      }
    });
  });
}

// ── CATEGORY CONFIGURATIONS ────────────────────────────────

function getCatConfig(id) {
  const spring = G.season === 'Spring';

  switch (id) {
    case 'society': return {
      title: 'Society',
      sub:   spring ? 'The Season is in full swing' : 'The country holds its breath',
      sections: [
        { label: 'Town', items: [
          { key:'ball',    icon:'🎵', name:'Attend a Ball',       hint: spring ? 'Dancing, intrigue, opportunity' : 'Out of season', locked: !spring },
          { key:'park',    icon:'🌿', name:'Hyde Park',           hint: spring ? 'See and be seen'                : 'Out of season', locked: !spring },
          { key:'almacks', icon:'✨', name:"Almack's Assembly",   hint: spring ? 'The ultimate social test'       : 'Out of season', locked: !spring },
          { key:'letters', icon:'💌', name:'Write Letters',       hint: 'Maintain your correspondences' },
        ]},
        { label: 'Country', items: [
          { key:'country', icon:'🍂', name:'Country Life',        hint: !spring ? 'Autumn retreat' : 'You are in Town', locked: spring },
          { key:'visit',   icon:'🏡', name:'Visit Neighbours',    hint: 'Local calls and morning visits' },
        ]},
        { label: 'Your Circle', items: [
          { key:'social',  icon:'🤝', name:'Pay a Social Call',   hint: 'Visit your acquaintances' },
        ...(G.assets && G.assets.some(a=>a.type==='estate') || true ? [{ key:'hostball', icon:'🎊', name:'Host a Ball', hint: G.assets && G.assets.some(a=>a.type==='estate') ? 'At your estate' : 'Hire assembly rooms' }] : []),
        ]},
        ...(!G.isMarried && G.age >= 16 ? [{ label: 'Marriage', items: [
          { key:'mart', icon:'💒', name:'The Marriage Mart', hint: spring ? 'The Season — prime time' : 'Available year-round' },
        ]}] : []),
      ],
    };

    case 'self': return {
      title: 'Self Improvement',
      sub:   'Your mind, your health, your accomplishments',
      sections: [
        { label: 'Mind', items: [
          { key:'read',    icon:'📚', name:'Read Books',   hint: 'Expand your mind considerably' },
          { key:'letters', icon:'✒',  name:'Write Letters', hint: 'Wit exercised by correspondence' },
        ]},
        { label: 'Accomplishments', items: [
          G.gender === 'female'
            ? { key:'piano', icon:'🎹', name:'Pianoforte', hint: 'Practise your instrument' }
            : { key:'fencing', icon:'🤺', name:'Fencing',  hint: 'With the fencing master' },
          { key:'sketch', icon:'🎨', name:'Sketching', hint: 'Watercolours and composition' },
        ]},
        { label: 'Virtue', items: [
          { key:'parish', icon:'🙏', name:'Visit the Parish', hint: 'Be charitable and be seen to be' },
        ]},
      ],
    };

    case 'personal': return {
      title: 'Personal',
      sub:   G.mother || G.father ? parentApprovalLabel() : 'Marriage, family, and your social circle',
      sections: [
        { label: 'Marriage', items: [
          G.isMarried
            ? { key:'spouse',  icon:'💒', name:'Married', hint:'To ' + G.spouse.fullName, locked: true }
            : { key:'mart',    icon:'💒', name:'The Marriage Mart', hint: G.age < 16 ? 'You are far too young' : 'Find a suitable match', locked: G.age < 16 },
        ]},
        { label: 'Children', items: [
          G.isMarried && G.children.length < 8
            ? { key:'children', icon:'👶', name: G.children.length ? `Children (${G.children.length})` : 'Try for a Child', hint: G.children.length ? 'Your family' : 'Start your family' }
            : { key:'children', icon:'👶', name: G.children.length ? `Children (${G.children.length})` : 'No Children Yet', hint: G.isMarried ? 'Your family' : 'Marriage comes first', locked: !G.isMarried },
        ]},
        { label: 'Family', items: [
          { key:'family', icon:'👨‍👩‍👧', name:'Write to Family', hint:'Mother, father, siblings' },
        ]},
        { label: 'Circle', items: [
          { key:'circle', icon:'👥', name:'Your Acquaintances', hint: G.npcs.filter(n=>n.introduced).length + ' known' },
        ]},

      ],
    };

    case 'schooling': return {
      title: 'Schooling & Education',
      sub: G.schooling && G.schooling.type !== 'none'
        ? (G.schooling.name || G.schooling.type)
        : 'Arrange your education',
      sections: [
        { label: 'Your Schooling', items: [
          { key:'choose_schooling', icon:'🏫',
            name: G.schooling && G.schooling.name ? G.schooling.name : 'Choose Schooling',
            hint: G.schooling && G.schooling.type !== 'none' ? G.schooling.type : 'Sunday school or governess' },
          ...(G.age >= 10 ? [{ key:'boarding_school', icon:'🎓',
            name: G.schooling && G.schooling.boarding ? G.schooling.boarding.name : 'Boarding School',
            hint: G.schooling && G.schooling.boarding ? 'Currently enrolled' : 'Requires parental approval' }] : []),
        ]},
        { label: 'Extra Tuition', items: [
          { key:'hire_tutor',  icon:'📐', name:'Hire a Tutor',   hint:'One-time boost to a subject' },
          { key:'self_study',  icon:'📖', name:'Self-Study',     hint:'Free, slower progress' },
        ]},
        ...(G.gender === 'female' && G.eduStats ? [{ label: 'Education Stats', items: [
          { key:'view_edu_stats', icon:'📊', name:'View Education Stats', hint:'Literacy, Reason, Faith, Decorum' },
        ]}] : []),
        ...(G.schoolmates && G.schoolmates.filter(s=>s.introduced).length ? [{ label: 'Schoolmates', items: [
          { key:'view_schoolmates', icon:'👩‍👧', name:`Schoolmates (${G.schoolmates.filter(s=>s.introduced).length} known)`, hint:`${G.schoolmates.filter(s=>s.status==='friend').length} friends · ${G.schoolmates.filter(s=>s.status==='rival').length} rivals` },
        ]}] : []),
      ],
    };

    case 'education': return {
      title: 'Education',
      sub:   'Your mind is your greatest asset',
      sections: [
        { label: 'Studies', items: [
          { key:'study',   icon:'📖', name:'Study Hard',    hint:'Improve your wit considerably' },
          { key:'french',  icon:'🇫🇷', name:'Learn French', hint:'Parlez-vous français?' },
          { key:'music',   icon:'🎵', name:'Music Lesson',  hint:'Practise your instrument' },
          { key:'drawing', icon:'🎨', name:'Drawing Class', hint:'Watercolours and sketching' },
        ]},
      ],
    };

    case 'tutors': return {
      title: 'Tutors & Schooling',
      sub:   'How you are educated shapes who you become',
      sections: [
        { label: 'In the Home', items: [
          { key:'governess', icon:'👩‍🏫',
            name:  G.governess ? 'Governess: ' + G.governess : 'Hire a Governess',
            hint:  G.governess ? 'Currently employed' : 'From £40 per year' },
        ]},
        { label: 'Away at School', items: [
          { key:'boarding', icon:'🎓',
            name: G.schooling ? 'School: ' + G.schooling : 'Boarding School',
            hint: G.schooling ? 'Currently enrolled' : 'Send away to school' },
        ]},
      ],
    };

    case 'life': return {
      title: G.age < 2 ? 'Infancy' : G.age < 4 ? 'Early Childhood' : 'Life & Health',
      sub:   `A well-rounded childhood${(G.pets||[]).filter(p=>p.alive).length ? ' · ' + (G.pets||[]).filter(p=>p.alive).length + ' pet(s)' : ''}`,
      sections: [
        { label: 'Play', items: [
          { key:'play',   icon:'🌳', name:'Play Outside',  hint: G.age < 3 ? 'A little young for this' : 'Fresh air and mischief', locked: G.age < 3 },
          { key:'riding', icon:'🏇', name:'Horse Riding',  hint: G.age < 6 ? 'Not yet' : 'In the grounds',  locked: G.age < 6 },
        ]},
        { label: 'Virtue', items: [
          { key:'church', icon:'🙏', name:'Sunday Church', hint: G.age < 3 ? 'You sleep through the sermon' : 'Be seen being good', locked: G.age < 3 },
        ]},
        { label: 'Family', items: [
          { key:'family', icon:'👨‍👩‍👧', name:'Spend Time with Family', hint:'Your nearest and dearest' },
        ]},
        { label: 'Pets', items: [
          { key:'adopt_pet', icon:'🐾', name:'Acquire a Pet', hint:(G.pets||[]).filter(p=>p.alive).length ? 'You already have pets' : 'A companion for life' },
          ...((G.pets||[]).filter(p=>p.alive).map(p => ({
            key:'pet_'+p.name, icon:p.emoji||'🐾', name:p.name, hint:`Your ${p.animal} · Health ${p.health}`
          }))),
        ]},
      ],
    };

    default: return null;
  }
}

// ── MARRIAGE MART ──────────────────────────────────────────

function openMarriageMart() {
  if (G.isMarried) {
    queuePopup('You are already married. Though some would say that has never stopped anyone.');
    return;
  }
  if (G.age < 16) {
    queuePopup('You are far too young to be thinking of such things. Your mother disagrees.');
    return;
  }

  const suitors = generateSuitors(3);

  // Save mart suitors to persistent pool
  suitors.forEach(s => { if(typeof addToSuitorPool==='function') addToSuitorPool(s,'mart'); });

  queuePopup(
    'Your mother thrusts a list of eligible prospects into your hands with barely concealed urgency.',
    null,
    [
      ...suitors.map(s => ({
        text: `${s.fullName} — ${s.rankLabel}, £${s.wealth.toLocaleString()}/yr`,
        fn()  { beginCourtship(s); return null; },
      })),
      { text: 'Return without choosing', fn() { renderPeopleView && renderPeopleView(); return {}; } },
    ]
  );
}

function beginCourtship(suitor) {
  addFeedEntry('You turn your attention to ' + suitor.fullName + '.', 'event');
  queuePopup(
    `${suitor.fullName}. ${suitor.rankLabel}, £${suitor.wealth.toLocaleString()} per annum. ${suitor.desc.charAt(0).toUpperCase() + suitor.desc.slice(1)}.`,
    null,
    [
      { text: 'Flirt delicately',          fn() { courtAction(suitor, 'flirt');   return null; } },
      { text: 'Request a dance',           fn() { courtAction(suitor, 'dance');   return null; } },
      { text: 'Enquire about his estate',  fn() { courtAction(suitor, 'enquire'); return null; } },
      { text: 'Encourage a proposal',      fn() { courtAction(suitor, 'propose'); return null; } },
      { text: 'Think better of it',        fn() { return {}; } },
    ]
  );
}

function courtAction(suitor, action) {
  const style = suitor.courtshipStyle || { flirtBonus:0, danceBonus:0 };
  switch (action) {
    case 'flirt': {
      const flirtThreshold = Math.max(3, 6 - (style.flirtBonus||0));
      if (rand(1,10) >= flirtThreshold) {
        changeStat('reputation', rand(3,7));
        queuePopup(
          `You deploy your most winning smile. ${suitor.first} responds with gratifying warmth.`,
          'Reputation +5', null, null, false
        );
        // Give option to continue
        setTimeout(() => beginCourtship(suitor), 600);
      } else {
        queuePopup(`${suitor.first} receives your smile with polite bafflement.`);
      }
      break;
    }
    case 'dance': {
      const danceThreshold = Math.max(3, 5 - (style.danceBonus||0));
      if (rand(1,10) >= danceThreshold) {
        changeStat('reputation', rand(5,10));
        queuePopup('The dance is a triumph. You move together perfectly. Several people notice.', 'Reputation +8');
      } else {
        changeStat('reputation', -rand(2,5));
        queuePopup('Disaster strikes mid-quadrille. Someone gasps audibly.', 'Reputation -4');
      }
      renderStats(); saveGame();
      break;
    }
    case 'enquire': {
      const place = pick(NAMES.places);
      queuePopup(
        `"My estate at ${place} has been in the family for ${rand(2,8)} generations," he says. He appears pleased you asked. A practical man.`
      );
      setTimeout(() => beginCourtship(suitor), 600);
      break;
    }
    case 'propose': {
      if (G.reputation < 45) {
        changeStat('reputation', -5);
        queuePopup('Your reputation is not quite sufficient for such boldness. He looks alarmed and excuses himself.', 'Reputation -5');
        renderStats(); saveGame();
      } else {
        const speeches = [
          `${suitor.first} clears his throat. "Miss ${G.name.split(' ')[0]}. I find your company — acceptable. My estate requires a mistress. I am asking you to be my wife." Not exactly poetry.`,
          `${suitor.first} drops to one knee with considerable drama. "Say you will make me the happiest man in England!" Several people are watching.`,
          `${suitor.first} takes your hand gently. "I know I have little to offer. But I offer it entirely and completely." Your heart does something quite alarming.`,
        ];
        queuePopup(pick(speeches), null, [
          {
            text: 'Accept — yes!',
            fn()  {
              // Wedding planning flow replaces instant marriage
              if (typeof startWeddingPlanning === 'function') {
                startWeddingPlanning(suitor);
              } else {
                acceptProposal(suitor);
                addFeedEntry('You are married to ' + suitor.fullName + '.', 'event');
                queuePopup('The wedding takes place. You are married.', 'Married ✓', null,
                  () => { buildNav(); renderStats(); saveGame(); });
              }
              return null;
            },
          },
          {
            text: 'Ask for time to consider',
            fn()  {
              addFeedEntry('You asked for time to consider.');
              queuePopup('The question hangs in the air. He accepts your hesitation with quiet dignity.');
              return null;
            },
          },
          {
            text: 'Decline firmly',
            fn()  {
              if (G.age >= 25) changeStat('reputation', -10);
              const parentDeclineReaction = parentReactionToDecline(suitor.wealth);
              addFeedEntry(suitor.first + ' bows and withdraws.');
              queuePopup(
                `${suitor.first} bows and withdraws. He is ${pick(['stoic','visibly wounded','more irritated than heartbroken','surprisingly gracious'])} about it.`,
                null, null,
                () => {
                  if (parentDeclineReaction) queuePopup(parentDeclineReaction.text);
                  renderStats(); saveGame();
                }
              );
              return null;
            },
          },
        ]);
      }
      break;
    }
  }
}

// ── CHILDREN ───────────────────────────────────────────────

function openChildrenMenu() {
  if (G.children.length) {
    const list = G.children.map(c => `${c.name} (${c.gender})`).join(', ');
    queuePopup(
      `Your children: ${list}.`,
      null,
      G.children.length < 8
        ? [
            { text: 'Try for another child', fn() { tryForChild(); return null; } },
            { text: 'Leave it there',        fn() { return {}; } },
          ]
        : [{ text: 'Your family is complete', fn() { return {}; } }]
    );
  } else {
    queuePopup(
      'You have no children yet.',
      null,
      [
        { text: 'Try for a child', fn() { tryForChild(); return null; } },
        { text: 'Not yet',         fn() { return {}; } },
      ]
    );
  }
}

function tryForChild() {
  if (G.pregnancy) {
    queuePopup(pregnancyStatusText() || 'You are already with child. The season will tell.');
    return;
  }
  if (G.age > 42) {
    queuePopup('The doctor is doubtful. "At your age, the chances are very slim." But not impossible.', null, [
      { text: 'Try anyway', fn() { attemptConceptionFlow(); return null; } },
      { text: 'The doctor is probably right', fn() { return {}; } },
    ]);
  } else {
    attemptConceptionFlow();
  }
}

function attemptConceptionFlow() {
  const conceived = attemptConception();
  if (!conceived) {
    queuePopup('Several months pass. This time there is no news.', null, [
      { text: 'Try again next season',  fn() { return {}; } },
      { text: 'Perhaps it is not time', fn() { return {}; } },
    ]);
    return;
  }
  // Pregnancy begins — birth is next season
  initPregnancy();
  const multiples = G.pregnancy.triplets ? '…three heartbeats.' : G.pregnancy.twins ? '…two heartbeats.' : '';
  addFeedEntry('You are with child.', 'event');
  queuePopup(
    'The doctor confirms it. You are with child. The news travels through the household before you have decided who to tell first.' + (multiples ? ' He pauses. ' + multiples : ''),
    G.pregnancy.triplets ? '★ Triplets!' : G.pregnancy.twins ? '★ Twins!' : 'With child',
  );
  renderStats(); saveGame();
}

// Old attemptBirth kept for reference — actual birth now in handleBirth()
function attemptBirth() {
  const conceived = attemptConception();
  if (!conceived) {
    queuePopup('Several months pass. This time there is no news.', null, [
      { text: 'Try again next season',  fn() { return {}; } },
      { text: 'Perhaps it is not time', fn() { return {}; } },
    ]);
    return;
  }
  initPregnancy();
  addFeedEntry('You are with child.', 'event');
  queuePopup('You are with child.', 'With child');
  renderStats(); saveGame();
}

function handleBirth(outcome) {
  if (!outcome) return;

  if (outcome.motherDied) {
    addFeedEntry('You did not survive the birth.', 'bad');
    queuePopup(
      'The doctor does everything he can. It is not enough. ' + G.name + ' passed away bringing life into the world.',
      'GAME OVER', null, () => showLifeSummary()
    );
    return;
  }

  const survivedBabies = outcome.babies ? outcome.babies.filter(b => b.survived) : [];
  const lostBabies     = outcome.babies ? outcome.babies.filter(b => !b.survived) : [];

  if (!survivedBabies.length) {
    changeStat('health', -20);
    addFeedEntry('The child did not survive.', 'bad');
    queuePopup('The child does not survive. The house is in mourning. There are no words adequate to this.', 'Health -20');
    renderStats(); saveGame(); return;
  }

  nameNextBaby(survivedBabies, 0, outcome.complications, lostBabies);
}

function nameNextBaby(babies, idx, complications, lostBabies) {
  if (idx >= babies.length) {
    if (lostBabies && lostBabies.length) {
      changeStat('health', -15);
      queuePopup(
        lostBabies.length === 1
          ? 'One of the babies did not survive. The grief sits alongside the joy in a way that never quite resolves.'
          : 'Not all the babies survived. You hold the ones who did and grieve those you will not know.',
        'Health -15'
      );
    }
    if (complications) changeStat('health', -10);
    renderStats(); saveGame();
    if (currentView === 'people') renderPeopleView();
    return;
  }

  const baby = babies[idx];
  const gender  = baby.gender;
  const pronoun = gender === 'son' ? 'boy' : 'girl';
  const names   = gender === 'son' ? CHILD_NAMES.son : CHILD_NAMES.daughter;

  queuePopup(
    `Here is your little ${pronoun}. ${complications && idx === 0 ? 'The birth was difficult. But you are both here.' : 'The doctor smiles. Everyone breathes.'}

What shall you name ${gender === 'son' ? 'him' : 'her'}?`,
    null,
    [
      ...names.slice(0,5).map(name => ({
        text: name,
        fn() { finaliseChild(baby, name); nameNextBaby(babies, idx+1, complications, lostBabies); return null; },
      })),
      {
        text: 'Choose a name…',
        fn() {
          gamePrompt(`Name your ${pronoun}:`, names[0], (custom) => {
            const name = (custom && custom.trim()) || names[0];
            finaliseChild(baby, name); nameNextBaby(babies, idx+1, complications, lostBabies);
          }); return null;
        },
      },
    ]
  );
}

function finaliseChild(baby, name) {
  baby.name = name;
  addChild(baby.gender, name);
  addFeedEntry(`${name} — your ${baby.gender === 'son' ? 'son' : 'daughter'} — is born.`, 'event');
}

// ── SEASON ADVANCE ─────────────────────────────────────────

function doAgeUp() {
  const result = advanceSeason();

  // Check for death first
  if (result.died) {
    const deathMsg = buildDeathMessage();
    addFeedEntry(deathMsg, 'bad');
    addSeasonBanner();
    setTimeout(() => {
      queuePopup(
        deathMsg + ' ' + G.name + ' passed away at the age of ' + G.age + '.',
        'GAME OVER',
        null,
        () => showLifeSummary()
      );
    }, 300);
    saveGame();
    return;
  }

  // Season banner in feed
  addSeasonBanner();

  // Process events from advanceSeason()
  for (const ev of result.events) {
    if (ev.text) addFeedEntry(ev.text, ev.type || '');
    if (ev.popup) queuePopup(ev.popup.text, ev.popup.badge || null);

    // Phase transitions
    // Early childhood milestones
    if (ev.earlyMilestone) {
      if (ev.earlyMilestone === 'schooling_age') {
        setTimeout(() => {
          queuePopup(
            G.name + ' is four years old. It is time to think about her education.',
            null,
            [
              { text: 'Choose her schooling →', fn() {
                if (typeof openSchoolingChoice === 'function') openSchoolingChoice();
                return null;
              }},
              { text: 'Later', fn() { return {}; } },
            ]
          );
        }, 500);
      }
      if (ev.earlyMilestone === 'full_curriculum') {
        setTimeout(() => {
          addFeedEntry('You are ten years old. A whole new world of study opens.', 'event');
          queuePopup(
            'You are ten years old. Your studies can now extend beyond the basics — history, languages, dancing, art. The world of accomplishment is before you.',
            'Full curriculum unlocked'
          );
          // Re-open schooling choice so player can upgrade
          if (G.schooling && G.schooling.type !== 'none') {
            setTimeout(() => {
              queuePopup(
                'Would you like to review your schooling arrangements now that more subjects are available?',
                null,
                [
                  { text: 'Yes, review schooling', fn() { if(typeof openCurrentSchoolView==='function') openCurrentSchoolView(); return null; }},
                  { text: 'Not now', fn() { return {}; } },
                ]
              );
            }, 800);
          }
        }, 500);
      }
    }

    if (ev.debutNegotiation) {
      setTimeout(() => {
        if (typeof triggerDebutNegotiation === 'function') triggerDebutNegotiation();
      }, 500);
    }

    if (ev.transition === 'debut') {
      setTimeout(() => {
        if (typeof showPreDebutSummary === 'function') {
          showPreDebutSummary();
        } else {
          G.phase = 'adult';
          buildNav(); switchView('society');
        }
      }, 600);
    }
    if (ev.transition === 'elder') {
      queuePopup(
        'You have reached a certain age. The young people are slightly afraid of you. This is enormously satisfying.',
        '★ Elder',
        null,
        () => {
          // After the elder popup, offer the life summary
          setTimeout(() => {
            queuePopup(
              'Your story is drawing to a close. Shall we look back on it?',
              null,
              [
                { text:'Review my life', fn() { showLifeSummary(); return null; } },
                { text:'Carry on a little longer', fn() { return {}; } },
              ]
            );
          }, 400);
        }
      );
    }

    // Pregnancy events
    if (ev.pregnancyEvents) {
      const pregnancyEvts = typeof pregnancySeasonEvents === 'function' ? pregnancySeasonEvents() : [];
      for (const pe of pregnancyEvts) {
        if (pe.text && !pe.birth) addFeedEntry(pe.text, pe.type || '');
        if (pe.popup) queuePopup(pe.popup.text, pe.popup.badge||null, pe.popup.choices||null);
        if (pe.lockActions) G._bedRest = true;
        if (pe.birth) {
          // Birth resolution
          setTimeout(() => {
            const outcome = typeof resolveBirth === 'function' ? resolveBirth() : null;
            if (outcome) handleBirth(outcome);
          }, 500);
        }
      }
    }

    // Schoolmate introduced
    if (ev.schoolmateMeet) {
      const sm = ev.schoolmateMeet;
      addFeedEntry(`You meet ${sm.name} ${sm.surname} at school.`, 'event');
      queuePopup(
        `A new face: ${sm.name} ${sm.surname}. ${sm.desc}.`,
        `New schoolmate: ${sm.name}`,
        [
          { text:'Introduce yourself', fn() {
            sm.closeness = Math.min(100, sm.closeness + rand(5,12));
            queuePopup(`You introduce yourself. ${sm.name} smiles — genuinely, you think. A beginning.`, `Closeness +8`);
            saveGame(); return null;
          }},
          { text:'Observe from a distance first', fn() {
            sm.closeness = Math.min(100, sm.closeness + rand(2,6));
            queuePopup(`You watch ${sm.name} for a season before approaching. By then you know a great deal about her.`);
            saveGame(); return null;
          }},
        ]
      );
    }

    // Schoolmate seasonal event
    if (ev.schoolmateEvent) {
      const smEv = ev.schoolmateEvent;
      addFeedEntry(smEv.text, smEv.type || 'event');
      if (smEv.popup) {
        queuePopup(smEv.popup.text, smEv.popup.badge||null, smEv.popup.choices||null);
      }
    }

    // Random lesson event
    if (ev.randomLesson) {
      const { event: lessonEv, subject } = ev.randomLesson;
      if (lessonEv) {
        addFeedEntry(`${subject} lesson.`, 'good');
        queuePopup(
          lessonEv.text,
          null,
          lessonEv.choices.map(c => ({
            text: c.text,
            fn() {
              const result = c.fn();
              if (result) {
                if (result.log) addFeedEntry(result.log, result.type||'good');
                if (result.text) queuePopup(result.text, result.badge||null);
                renderStats(); saveGame();
                if (result.schoolmateMoment) handleSchoolmateMoment(result.schoolmateMoment);
              }
              return null;
            },
          }))
        );
      }
    }

    // Childhood event
    if (ev.childhoodEvent) {
      setTimeout(() => {
        const evResult = typeof fireChildhoodEvent === 'function' ? fireChildhoodEvent() : null;
        if (evResult) {
          if (evResult.log)   addFeedEntry(evResult.log.text || evResult.log, evResult.log.type || '');
          if (evResult.popup) queuePopup(evResult.popup.text, evResult.popup.badge || null, evResult.popup.choices || null);
          renderStats(); saveGame();
        }
      }, 350);
    }

    // Random event
    if (ev.randomEvent) {
      setTimeout(() => {
        const evResult = fireRandomEvent();
        if (evResult) {
          if (evResult.log)   addFeedEntry(evResult.log.text, evResult.log.type);
          if (evResult.popup) queuePopup(evResult.popup.text, evResult.popup.badge || null, evResult.popup.choices || null);
          renderStats(); saveGame();
        }
      }, 400);
    }

    // Orphaned — both parents dead during childhood
    if (ev.orphaned && !G.orphanHandled) {
      G.orphanHandled = true;
      addFeedEntry('You are alone. Both your parents are gone.', 'bad');
      // Build gated choices based on circumstances
      const orphanChoices = buildOrphanChoices();
      queuePopup(
        'Both your parents are gone. You are a child alone in the world. What happens next will shape everything.',
        'Orphaned',
        orphanChoices
      );
    }

    // Family death
    if (ev.familyDeath) {
      const d = ev.familyDeath;
      const pronoun = d.relation === 'mother' ? 'Your mother' : d.relation === 'father' ? 'Your father' : d.name;
      const msg = d.relation === 'mother' || d.relation === 'father'
        ? `${pronoun} has passed away.`
        : `${d.name}, your ${d.relation}, has passed away.`;
      addFeedEntry(msg, 'bad');
      const flavour = d.relation === 'mother'
        ? `Your mother has passed away. The house is very quiet without her. Quieter than you expected.`
        : d.relation === 'father'
        ? `Your father has passed away. You did not realise how much of the world he held up until it was you holding it.`
        : d.closeness >= 60
        ? `${d.name} has passed away. You had not spoken in some time. You wish you had.`
        : `${d.name} has passed away. You mourn them as best you can.`;
      changeStat('health', -5);
      // Process inheritance if applicable
      if (d.processInheritance && typeof processParentDeath === 'function') {
        const iResult = processParentDeath(d.relation);
        if (iResult && iResult.text) {
          queuePopup(flavour, 'Health -5', null, () => {
            queuePopup(iResult.text,
              iResult.wealthInherited > 0 ? `+£${iResult.wealthInherited.toLocaleString()}` : null);
            renderStats(); saveGame();
          });
        } else {
          queuePopup(flavour, 'Health -5');
        }
      } else {
        queuePopup(flavour, 'Health -5');
      }
      renderStats();
    }

    // Sibling marriage
    if (ev.siblingMarriage) {
      const { sib, spouseName } = ev.siblingMarriage;
      addFeedEntry(`${sib.name} is to be married.`, 'event');
      queuePopup(
        `${sib.name} is to be married to ${spouseName}. The match is ${pick(['excellent','surprising','inevitable','very suitable'])}. You attend the wedding.`,
        'Family news'
      );
    }

    // Child milestone
    if (ev.childMilestone) {
      const { child, event: evt, needsChoice } = ev.childMilestone;

      if (evt === 'started lessons' && needsChoice) {
        addFeedEntry(child.name + ' is five. It is time to think about their education.', 'event');
        queuePopup(
          `${child.name} is five years old. How shall they be educated?`,
          'Age 5 — Choose Education',
          [
            {
              text: `Hire a governess (£40-80/yr) — in the home, personal`,
              fn() {
                if (G.wealth < 80) {
                  queuePopup('You cannot presently afford a governess. ' + child.name + ' will learn from you for now.');
                  shapeChildPersonality(child, 'witty', 1);
                  return null;
                }
                const govs = [
                  { name:'Miss Hartley',  cost:40, focus:'arts',   trait:'artistic',  desc:'gentle and encouraging, focused on watercolours and music' },
                  { name:'Mr Clarke',     cost:50, focus:'academic',trait:'scholarly', desc:'rigorous and demanding, Latin and mathematics above all' },
                  { name:'Mrs Drummond',  cost:60, focus:'manners', trait:'kind',      desc:'focused on deportment, virtue, and social grace' },
                  { name:'Mlle Rousseau', cost:80, focus:'french',  trait:'witty',     desc:'exacting and Parisian, French and accomplishments' },
                ];
                queuePopup(
                  `Who shall teach ${child.name}?`,
                  null,
                  govs.map(g => ({
                    text: `${g.name} — £${g.cost}/yr (${g.focus})`,
                    fn() {
                      G.wealth -= g.cost;
                      child.governess = g.name;
                      shapeChildPersonality(child, g.trait, 2);
                      changeCloseness(child, rand(3,8));
                      addFeedEntry(g.name + ' is engaged for ' + child.name + '.', 'good');
                      queuePopup(
                        `${g.name} is engaged — ${g.desc}. ${child.name} regards them with a mixture of wariness and curiosity.`,
                        `${g.focus.charAt(0).toUpperCase()+g.focus.slice(1)} shaped`
                      );
                      renderStats(); saveGame(); return null;
                    },
                  }))
                );
                return null;
              },
            },
            {
              text: `Send to a local dame school (£10/yr) — modest but sociable`,
              fn() {
                if (G.wealth < 10) { queuePopup('Even this is beyond your means at present.'); return null; }
                G.wealth -= 10;
                child.schooling = 'Dame School';
                shapeChildPersonality(child, 'kind', 1);
                shapeChildPersonality(child, 'spirited', 1);
                changeCloseness(child, rand(5,10));
                addFeedEntry(child.name + ' starts at the local dame school.', 'good');
                queuePopup(
                  `${child.name} starts at the local dame school. They come home with muddy knees and three new friends. A good start.`,
                  'Sociable shaped'
                );
                renderStats(); saveGame(); return null;
              },
            },
            {
              text: `Teach them yourself — free, but time-consuming`,
              fn() {
                child.schooling = 'Home';
                shapeChildPersonality(child, G.wit >= 60 ? 'scholarly' : 'witty', 2);
                changeCloseness(child, rand(10,18));
                changeStat('wit', -rand(1,3)); // you spend considerable energy
                addFeedEntry('You teach ' + child.name + ' yourself.', 'good');
                queuePopup(
                  `You take on ${child.name}'s education yourself. It is exhausting and occasionally maddening and one of the best things you have ever done.`,
                  'Closeness +12'
                );
                renderStats(); saveGame(); return null;
              },
            },
            {
              text: `Leave it for now — they are only five`,
              fn() {
                shapeChildPersonality(child, 'spirited', 1);
                queuePopup(`${child.name} spends another year running wild in the garden. There are worse educations.`);
                return null;
              },
            },
          ]
        );

      } else if (evt === 'showing their character' && needsChoice) {
        addFeedEntry(child.name + ' at ten — their character is showing.', 'event');
        queuePopup(
          `${child.name} is ten years old. A moment arises that will shape them.`,
          'Age 10',
          [
            { text: 'Encourage their strongest tendency', fn() {
              const topSeed = Object.entries(child.seeds || {}).sort((a,b)=>b[1]-a[1])[0];
              const trait = topSeed ? topSeed[0] : 'kind';
              shapeChildPersonality(child, trait, 2);
              changeCloseness(child, rand(8,15));
              queuePopup(`${child.name} lights up when you pay attention to what they love. This will stay with them.`, 'Closeness +10');
              return null;
            }},
            { text: 'Be strict — they need discipline', fn() {
              shapeChildPersonality(child, rand(1,10)>=5 ? 'brave' : 'anxious', 2);
              changeCloseness(child, -rand(3,8));
              queuePopup(`${child.name} becomes more controlled. Whether this is good depends on how you look at it.`);
              return null;
            }},
            { text: 'Listen to what they actually want', fn() {
              shapeChildPersonality(child, 'witty', 1);
              changeCloseness(child, rand(10,18));
              changeStat('wit', rand(2,4));
              queuePopup(`${child.name} tells you something unexpected. You listen properly. This matters more than you know.`, 'Closeness +12');
              return null;
            }},
          ]
        );

      } else if (evt === 'coming of age') {
        const traitDesc = childTraitDesc(child);
        addFeedEntry(child.name + ' is sixteen.', 'event');
        queuePopup(
          `${child.name} has turned sixteen. They are ${traitDesc}. You cannot quite believe this person grew from the infant you once held.`,
          'Age 16'
        );

      } else if (evt === 'debut') {
        addFeedEntry(child.name + "'s debut.", 'event');
        queuePopup(
          `${child.name} makes her debut this Season. You know exactly how she feels — and then you catch her laughing across the room and realise she is entirely her own person.`,
          'Coming Out'
        );
      }
    }

    // NPC introduction
    if (ev.introduceNPC) {
      setTimeout(() => {
        const intro = introduceRandomNPC();
        if (intro) {
          const { npc, isRival } = intro;
          addFeedEntry(
            isRival
              ? `You meet ${npc.fullName}. Something makes you uneasy.`
              : `You are introduced to ${npc.fullName}.`,
            isRival ? 'bad' : 'event'
          );
          queuePopup(
            isRival
              ? `You are introduced to ${npc.fullName}. They smile at you with perfect sweetness. Something about them makes you instantly uneasy.`
              : `You are introduced to ${npc.fullName}. They are ${npc.desc}.`,
            isRival ? '⚔ Rival: ' + npc.nick : 'New: ' + npc.nick
          );
          saveGame();
        }
      }, 700);
    }
  }

  // Nav rebuild if phase changed
  buildNav();
  renderStats();
  if (currentView !== 'home') renderCatView(currentView);
  saveGame();
}

// ── SCREEN MANAGEMENT ──────────────────────────────────────

function showScreen(id) {
  document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
  document.getElementById(id).classList.add('active');
}

// ── CHARACTER CREATION ─────────────────────────────────────

let selGender = null;
let selRank   = null;

function buildRankGrid() {
  document.getElementById('rank-grid').innerHTML = RANKS.map(r => `
    <div class="r-btn" id="rb-${r.id}">
      <div class="rt">${r.title}</div>
      <div class="ri">£${r.income.toLocaleString()}/yr</div>
    </div>`).join('');

  document.querySelectorAll('.r-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      selRank = btn.id.replace('rb-', '');
      document.querySelectorAll('.r-btn').forEach(b => b.classList.remove('sel'));
      btn.classList.add('sel');
      checkCreate();
    });
  });
}

function selectGender(g) {
  selGender = g;
  document.getElementById('gb-f').classList.toggle('sel', g === 'female');
  document.getElementById('gb-m').classList.toggle('sel', g === 'male');
  checkCreate();
}

function checkCreate() {
  const name = document.getElementById('inp-name').value.trim();
  document.getElementById('btn-enter').disabled = !(name && selGender && selRank);
}

function beginGame() {
  const name = document.getElementById('inp-name').value.trim();
  newGame(name, selGender, selRank);
  showScreen('s-game');
  currentView = 'home';
  buildNav();
  renderStats();
  addFeedEntry('Your story begins.', 'event');
  queuePopup(
    `Welcome to the world, ${name}. The season is ${G.season}, and everything lies ahead of you.`,
    G.gender === 'female' ? 'A Lady of the Regency' : 'A Gentleman of the Regency'
  );
  saveGame();
}


// ═══════════════════════════════════════════════════════════
// LIFE SUMMARY SCREEN
// ═══════════════════════════════════════════════════════════

function buildSummaryScreen() {
  // Inject the screen HTML if not already present
  if (!document.getElementById('s-summary')) {
    const div = document.createElement('div');
    div.id = 's-summary';
    div.className = 'screen';
    div.innerHTML = `
      <div class="sum-scroll" id="sum-scroll"></div>
      <div class="sum-foot">
        <button class="btn-title" onclick="showScreen('s-title');deleteSave();">Begin a New Life</button>
      </div>`;
    document.body.appendChild(div);
  }
}

function showLifeSummary() {
  buildSummaryScreen();

  const scroll = document.getElementById('sum-scroll');
  scroll.innerHTML = renderSummaryHTML();

  showScreen('s-summary');
}

function renderSummaryHTML() {
  const g = G;
  const tier = repTier(g.reputation);
  const married = g.isMarried && g.spouse;
  const kids = g.children.length;
  const friends = g.npcs.filter(n => n.introduced && !n.isRival && n.closeness >= 50);
  const rival = g.rival;
  const rank = RANKS.find(r => r.id === g.rankId) || RANKS[1];

  // ── OBITUARY VOICE ─────────────────────────────────────
  function obituary() {
    const pronoun = g.gender === 'female' ? 'She' : 'He';
    const possessive = g.gender === 'female' ? 'Her' : 'His';

    let body = `${g.name} of the ${rank.title} passed from this world at the age of ${g.age}, `;
    body += married
      ? `beloved ${g.gender === 'female' ? 'wife' : 'husband'} of ${g.spouse.fullName}.`
      : 'unmarried.';

    body += ` ${pronoun} was known throughout ${tier === 'Toast of the Ton' || tier === 'Fashionable' ? 'all of society' : 'their circle'} as a person of `;

    const qualities = [];
    if (g.wit >= 70)        qualities.push('considerable wit');
    if (g.looks >= 70)      qualities.push('notable elegance');
    if (g.health >= 70)     qualities.push('robust constitution');
    if (g.reputation >= 65) qualities.push('excellent standing');
    if (g.scandals >= 3)    qualities.push('eventful history');
    if (qualities.length === 0) qualities.push('quiet dignity');

    body += qualities.slice(0,2).join(' and ') + '.';

    if (kids > 0) {
      body += ` ${pronoun} leaves behind ${kids === 1 ? 'one child' : kids + ' children'}: ${g.children.map(c=>c.name).join(', ')}.`;
    }

    if (friends.length > 0) {
      body += ` ${possessive} friendship with ${friends[0].nick} was, by all accounts, one of the great pleasures of ${possessive.toLowerCase()} life.`;
    }

    body += ` ${pronoun} will be greatly missed by those who knew ${g.gender === 'female' ? 'her' : 'him'} well, `;
    body += `and by several people who did not know ${g.gender === 'female' ? 'her' : 'him'} at all but admired ${g.gender === 'female' ? 'her' : 'him'} from a distance.`;

    return body;
  }

  // ── NEWSPAPER COLUMN VOICE ────────────────────────────
  function newspaper() {
    let lines = [];

    lines.push(`We note with ${g.reputation >= 60 ? 'considerable' : 'polite'} regret the passing of ${g.name}.`);

    if (tier === 'Toast of the Ton') {
      lines.push(`${g.gender === 'female' ? 'She' : 'He'} was, for many seasons, the brightest fixture of London society — a distinction achieved by very few and maintained by fewer still.`);
    } else if (tier === 'Fashionable' || tier === 'Well Regarded') {
      lines.push(`${g.gender === 'female' ? 'She' : 'He'} was a recognised and well-regarded presence in the better drawing rooms.`);
    } else if (tier === 'Respectable') {
      lines.push(`${g.gender === 'female' ? 'She' : 'He'} was perfectly respectable — a quality more valuable, and rarer, than it is generally credited.`);
    } else {
      lines.push(`${g.gender === 'female' ? 'She' : 'He'} passed through society without, it must be said, leaving a particularly deep impression upon it.`);
    }

    if (g.scandals >= 4) {
      lines.push(`We shall draw a veil over certain episodes which, while memorable to those present, need not be rehearsed here.`);
    } else if (g.scandals >= 2) {
      lines.push(`There were moments of colourful incident, as there are in any interesting life.`);
    }

    if (married) {
      lines.push(`${g.gender === 'female' ? 'Her' : 'His'} union with ${g.spouse.fullName} was, we understand, ${rand(1,10) >= 5 ? 'a genuine love match' : 'a source of mutual satisfaction'}.`);
    } else {
      lines.push(`${g.gender === 'female' ? 'She' : 'He'} remained unmarried, which was ${g.gender === 'female' ? 'her' : 'his'} own business and nobody else's, whatever they may say.`);
    }

    if (rival) {
      lines.push(`We note that ${rival.fullName} was unavailable for comment.`);
    }

    return lines.join(' ');
  }

  // ── PERSONAL REFLECTION VOICE ─────────────────────────
  function reflection() {
    const pronoun = g.gender === 'female' ? 'she' : 'he';
    let parts = [];

    parts.push(`The things that mattered, in the end:`);

    const memories = [];

    if (married) memories.push(`${g.spouse.first}'s face on the morning of the wedding`);
    if (kids > 0) memories.push(`the first time ${g.children[0].name} laughed`);
    if (friends.length > 0) memories.push(`every conversation with ${friends[0].nick} that went on too long`);
    if (g.governess) memories.push(`${g.governess}, who was stricter than one deserved and kinder than one knew`);
    if (g.schooling) memories.push(`${g.schooling} — miserable and wonderful and formative in ways still being discovered`);
    if (g.siblings.length > 0) memories.push(`${g.siblings[0].name}, always`);
    if (g.reputation >= 70) memories.push(`the season ${pronoun} was at the absolute top of the world and knew it`);
    if (g.scandals >= 2) memories.push(`the incidents that cannot be named here, which were entirely worth it`);
    memories.push(`the Autumn evenings that went on forever`);
    memories.push(`the letters that arrived at exactly the right moment`);

    parts.push(memories.slice(0, 5).map(m => `— ${m}`).join('\n'));
    parts.push(`A life, in full.`);

    return parts.join('\n\n');
  }

  // ── STAT SUMMARY ─────────────────────────────────────
  function statSummary() {
    const lines = [
      `Health at death: ${g.health}`,
      `Final reputation: ${g.reputation} (${tier})`,
      `Wit: ${g.wit}`,
      `Looks: ${g.looks}`,
      `Wealth: £${g.wealth.toLocaleString()}`,
      `Seasons lived: ${Math.round(g.age * 2)}`,
      `Scandals: ${g.scandals}`,
      `Children: ${kids}`,
      `Friends made: ${friends.length}`,
    ];
    return lines;
  }

  // ── ASSEMBLE HTML ─────────────────────────────────────
  const stats = statSummary();
  return `
    <div class="sum-hdr">
      <div class="sum-orn">✦ ✦ ✦</div>
      <div class="sum-name">${g.name}</div>
      <div class="sum-years">A Life · Age ${g.age}</div>
      <div class="sum-rule"></div>
    </div>

    <div class="sum-section">
      <div class="sum-section-label">In Memoriam</div>
      <div class="sum-body">${obituary()}</div>
    </div>

    <div class="sum-section">
      <div class="sum-section-label">The Morning Post</div>
      <div class="sum-body">${newspaper()}</div>
    </div>

    <div class="sum-section">
      <div class="sum-section-label">What ${g.gender === "female" ? "She" : "He"} Remembered</div>
      <div class="sum-body sum-reflection">${reflection().replace(/\n/g,'<br>')}</div>
    </div>

    <div class="sum-section">
      <div class="sum-section-label">A Life in Numbers</div>
      <div class="sum-stats">
        ${stats.map(s=>`<div class="sum-stat">${s}</div>`).join('')}
      </div>
    </div>
  `;
}


// ═══════════════════════════════════════════════════════════
// SOCIAL SYSTEM — NPC & FAMILY PROFILES WITH FULL INTERACTIONS
// ═══════════════════════════════════════════════════════════

// ── PERSON CARD BUILDER ───────────────────────────────────
// Uses .sb/.sb-l/.sb-t/.sb-f/.sb-n — same classes as player stat header

function personBar(label, value, color) { return pbar(label, value, color); }

// All named bars (Relationship, Approval, Wealth) use the same layout as stat bars
// label on left, tier/amount label on right, bar below — matches .sb exactly
function namedBar(label, value, color, rightText) { return pbar(label, value, color, rightText, true); }

function relationshipBarHTML(closeness, isFamilyStyle) {
  const pct   = Math.min(100, Math.max(0, closeness || 0));
  const color = pct >= 70 ? '#2d5016' : pct >= 40 ? '#b8860b' : '#8b2020';
  const label = isFamilyStyle
    ? (pct>=80?'Devoted':pct>=60?'Close':pct>=40?'Cordial':pct>=20?'Distant':'Estranged')
    : (pct>=80?'Confidante':pct>=60?'Dear Friend':pct>=40?'Friend':pct>=20?'Acquaintance':'Stranger');
  return pbar('Relationship', pct, color, label, true);
}

function approvalBarHTML(score) {
  const pct   = Math.min(100, Math.max(0, score || 0));
  const color = pct >= 65 ? '#2d5016' : pct >= 40 ? '#b8860b' : '#8b2020';
  const label = typeof approvalLabel === 'function' ? approvalLabel(pct)
    : (pct>=65?'Approves':pct>=40?'Neutral':'Disapproves');
  return pbar('Approval', pct, color, label, true);
}

function wealthBarHTML(wealth, label) {
  const maxWealth = 10000;
  const pct = Math.min(100, Math.floor(((wealth||0) / maxWealth) * 100));
  const wStr = wealth >= 1000 ? `£${(Math.round(wealth/100)*100).toLocaleString()}` : `£${wealth||0}`;
  return pbar(label||'Wealth', pct, '#b8860b', wStr, true);
}

function cardDivider() { return '<div class="pbar-divider"></div>'; }

function buildPersonCard(person, opts={}) {
  const h  = person.health     != null ? person.health     : null;
  const w  = person.wit        != null ? person.wit        : null;
  const l  = person.looks      != null ? person.looks      : null;
  const r  = person.reputation != null ? person.reputation : null;
  const f  = person.faith      != null ? person.faith      : null;
  const cl = person.closeness  != null ? person.closeness  : null;
  const ap = typeof effectiveApproval === 'function' ? effectiveApproval(person) : (person.approval||50);
  const wl = person.wealth     != null ? person.wealth     : null;

  let html = '';

  // Stat bars — single column to avoid 5-bar grid issues
  if (h!=null||w!=null||l!=null||r!=null||f!=null) {
    html += cardDivider();
    if (h!=null) html += personBar('Health', h, '#8b2020');
    if (w!=null) html += personBar('Wit',    w, '#2d5016');
    if (l!=null) html += personBar('Looks',  l, '#7a4f2d');
    if (r!=null) html += personBar('Rep',    r, '#b8860b');
    if (f!=null) html += personBar('Faith',  f, '#4a3080');
  }

  // Named bars
  const hasExtra = cl!=null || opts.showApproval || (opts.showWealth && wl!=null);
  if (hasExtra) {
    html += cardDivider();
    if (cl != null)                    html += relationshipBarHTML(cl, opts.isFamily);
    if (opts.showApproval)             html += approvalBarHTML(ap);
    if (opts.showWealth && wl != null) html += wealthBarHTML(wl);
  }

  return html;
}

function familyRelBar(closeness) { return relationshipBarHTML(closeness, true); }
// ═══════════════════════════════════════════

// ── UI STATE ───────────────────────────────────────────────
// currentView declared at top of file

// ── POPUP QUEUE ────────────────────────────────────────────
// (declared at top of file)
// (declared at top of file)

// ── ACTION DISPATCH ────────────────────────────────────────
// Handles the result object from actions.js

// ── STAT HEADER ────────────────────────────────────────────


function pbar(label, value, color, rightText, wide, variant) {
  const pct = Math.min(100, Math.max(0, value || 0));
  const lblClass = wide ? 'pbar-lbl-wide' : 'pbar-lbl';
  const right = rightText !== undefined ? rightText : String(pct);
  const cls = variant ? `pbar pbar-${variant}` : 'pbar';
  return `<div class="${cls}">
    <span class="${lblClass}">${label}</span>
    <div class="pbar-track"><div class="pbar-fill" style="width:${pct}%;background:${color}"></div></div>
    <span class="pbar-val">${right}</span>
  </div>`;
}

// Group bar (larger, brighter) + sub-bars beneath it
function pbarGroup(groupLabel, groupValue, color, subStats) {
  let html = '';
  html += pbar(groupLabel, groupValue, color, String(groupValue), false, 'group');
  if (subStats && subStats.length) {
    for (const s of subStats) {
      html += pbar(s.label, s.value, color, String(s.value), false, 'sub');
    }
  }
  return html;
}

function personStatBar(label, value, color) { return pbar(label, value, color); }

function popDivider() {
  return `<div style="height:1px;background:linear-gradient(90deg,transparent,rgba(180,134,11,.25),transparent);margin:8px 0"></div>`;
}

function popSectionLabel(label) {
  return `<div style="font-family:'Palatino Linotype','Book Antiqua',Palatino,Georgia,serif;font-size:9px;letter-spacing:2px;color:#c4a882;margin:8px 0 5px">${label}</div>`;
}

function openNPCProfile(npc) {
  const status   = npcStatus(npc);
  const canCourt = !G.isMarried && npc.gender === 'male' && G.gender === 'female'
    && npc.closeness >= 30 && G.age >= 16;
  const wealthLine = `£${(npc.wealth||0).toLocaleString()}/yr · Age ${npc.age || '?'} · ${npc.isMarried ? 'Married' : 'Unmarried'}`;
  const npcCard = buildPersonCard(npc, { isFamily:false, showApproval: npc.closeness>=40, showWealth:false });
  queuePopup(
    `${npc.fullName}\n${wealthLine}\n\n${(npc.desc||'').charAt(0).toUpperCase() + (npc.desc||'').slice(1)}.${npcCard}`,
    null,
    [
      { text: '🏠 Visit in person',       fn() { doSocialVisit(npc);   return null; } },
      { text: '💌 Write a letter',        fn() { doSocialLetter(npc);  return null; } },
      { text: '🎁 Send a gift',           fn() { doSocialGift(npc);    return null; } },
      ...(G.season === 'Spring' && npc.closeness >= 25
        ? [{ text: '🎵 Invite to an event', fn() { doSocialInvite(npc); return null; } }]
        : []),
      ...(canCourt
        ? [{ text: '💒 Begin courting',    fn() { beginCourtship(npc); return null; } }]
        : []),
      ...(npc.closeness >= 40
        ? [{ text: '🤝 Ask a favour',      fn() { doSocialFavour(npc); return null; } }]
        : []),
      { text: '💢 Have a falling out',    fn() { doSocialFallout(npc); return null; } },
      { text: '← People', fn() { switchView('people'); renderPeopleView(); return null; } },
    ]
  );
}


function npcStatus(npc) {
  if (npc.isRival)          return '⚔ Rival';
  if (npc.closeness >= 80)  return '★ Confidante';
  if (npc.closeness >= 60)  return '★ Dear Friend';
  if (npc.closeness >= 40)  return 'Friend';
  if (npc.closeness >= 20)  return 'Acquaintance';
  return 'Stranger';
}

// ── SOCIAL INTERACTIONS ────────────────────────────────────

function doSocialVisit(npc) {
  const g = rand(8, 16);
  changeCloseness(npc, g);
  const msgs = [
    `You spend a long afternoon with ${npc.nick}. The conversation goes in every direction. You leave feeling energised.`,
    `${npc.fullName} receives you in their finest room. The tea is excellent. The company is better.`,
    `You call on ${npc.nick} and stay two hours longer than you planned. Neither of you notices.`,
    `A most agreeable visit. ${npc.nick} tells you something you suspect very few people know.`,
  ];
  addFeedEntry('You visit ' + npc.nick + '.', 'good');
  queuePopup(pick(msgs), `Closeness +${g}`);
  renderStats(); saveGame();
  setTimeout(() => openNPCProfile(npc), 400);
}

function doSocialLetter(npc) {
  const g = rand(4, 9);
  changeCloseness(npc, g);
  const msgs = [
    `You compose a letter to ${npc.nick} — witty, warm, and precisely the right length.`,
    `A letter to ${npc.nick}. You say things it is easier to write than to speak.`,
    `You write to ${npc.nick} with news of the season. The reply, when it comes, is delightful.`,
  ];
  addFeedEntry('You write to ' + npc.nick + '.', 'good');
  queuePopup(pick(msgs), `Closeness +${g}`);
  renderStats(); saveGame();
  setTimeout(() => openNPCProfile(npc), 400);
}

function doSocialGift(npc) {
  const gifts = [
    { item: 'a book you loved',       cost: 20,  g: rand(10,18) },
    { item: 'a small piece of music', cost: 15,  g: rand(8,14)  },
    { item: 'flowers from your garden',cost: 5,  g: rand(6,10)  },
    { item: 'a fine bottle of wine',  cost: 40,  g: rand(12,20) },
    { item: 'a silk handkerchief',    cost: 30,  g: rand(10,16) },
  ];
  queuePopup(
    `What shall you send ${npc.nick}?`,
    null,
    [
      ...gifts.map(gift => ({
        text: `${gift.item} (£${gift.cost})`,
        fn() {
          if (G.wealth < gift.cost) {
            queuePopup('You cannot presently afford this.');
            return null;
          }
          changeStat('wealth', -gift.cost);
          changeCloseness(npc, gift.g);
          addFeedEntry(`You send ${npc.nick} ${gift.item}.`, 'good');
          queuePopup(
            `You send ${npc.nick} ${gift.item}. The gesture is received with evident pleasure.`,
            `Closeness +${gift.g}`
          );
          renderStats(); saveGame();
          setTimeout(() => openNPCProfile(npc), 400);
          return null;
        },
      })),
      { text: 'Perhaps another time', fn() { setTimeout(() => openNPCProfile(npc), 200); return null; } },
    ]
  );
}

function doSocialInvite(npc) {
  if (G.season !== 'Spring') {
    queuePopup('Invitations to events are a Spring matter. The country does not lend itself to this.');
    return;
  }
  const g = rand(6, 12);
  changeCloseness(npc, g);
  changeStat('reputation', rand(3, 7));
  addFeedEntry(`You invite ${npc.nick} to an event.`, 'good');
  queuePopup(
    `You invite ${npc.fullName} to the Pembridge assembly. They accept with evident pleasure. You are seen together. This reflects well on both of you.`,
    `Closeness +${g} · Reputation +4`
  );
  renderStats(); saveGame();
  setTimeout(() => openNPCProfile(npc), 400);
}

function doSocialFavour(npc) {
  const favours = [
    {
      text: 'Ask them to vouch for you socially',
      cost: rand(15,25),
      fn() {
        if (npc.closeness < 50) {
          queuePopup(`${npc.nick} hesitates. You are not yet close enough for this kind of favour.`);
          return null;
        }
        changeCloseness(npc, -rand(10,18));
        changeStat('reputation', rand(10,18));
        addFeedEntry(npc.nick + ' speaks for you.', 'good');
        queuePopup(
          `${npc.fullName} speaks very warmly of you to exactly the right people. Doors open.`,
          'Reputation +14'
        );
        renderStats(); saveGame();
        return null;
      },
    },
    {
      text: 'Ask for a loan',
      cost: 0,
      fn() {
        if (npc.closeness < 60) {
          queuePopup(`${npc.nick} looks uncomfortable. You are not close enough to ask this.`);
          return null;
        }
        const amt = rand(100, 400);
        changeCloseness(npc, -rand(15,25));
        changeStat('wealth', amt);
        addFeedEntry(npc.nick + ' lends you money.', 'good');
        queuePopup(
          `${npc.nick} lends you £${amt} without making you feel badly about asking. You will repay it. Eventually.`,
          `Wealth +£${amt}`
        );
        renderStats(); saveGame();
        return null;
      },
    },
    {
      text: 'Ask for information about someone',
      cost: 0,
      fn() {
        changeCloseness(npc, -rand(5,12));
        changeStat('wit', rand(5, 10));
        const target = pick(NAMES.surname.map(s => pick(['Lady','Lord','Miss','Mr']) + ' ' + s));
        addFeedEntry('You learn something useful about ' + target + '.', 'event');
        queuePopup(
          `${npc.nick} tells you something about ${target} that changes how you see several recent events entirely.`,
          'Wit +7'
        );
        renderStats(); saveGame();
        return null;
      },
    },
  ];

  queuePopup(
    `What favour would you ask of ${npc.nick}? Asking costs closeness — choose carefully.`,
    null,
    [
      ...favours.map(f => ({ text: f.text, fn: f.fn })),
      { text: 'Ask nothing', fn() { setTimeout(() => openNPCProfile(npc), 200); return null; } },
    ]
  );
}

function doSocialFallout(npc) {
  queuePopup(
    `Are you certain you wish to fall out with ${npc.nick}? This cannot easily be undone.`,
    null,
    [
      {
        text: 'Yes — we have words',
        fn() {
          const d = rand(20, 35);
          changeCloseness(npc, -d);
          changeStat('reputation', -rand(3, 8));
          if (npc.closeness <= 10 && !npc.isRival) {
            npc.isRival = true;
            if (!G.rival) G.rival = npc;
            addFeedEntry(npc.nick + ' is now your rival.', 'bad');
            queuePopup(
              `The falling out with ${npc.fullName} is complete. Something has hardened between you that will not easily soften. They are your rival now.`,
              '⚔ New Rival'
            );
          } else {
            addFeedEntry('You have words with ' + npc.nick + '.', 'bad');
            queuePopup(
              `You and ${npc.nick} have words. Some of them cannot be taken back. The friendship cools considerably.`,
              `Closeness -${d}`
            );
          }
          renderStats(); saveGame();
          return null;
        },
      },
      { text: 'No — think better of it', fn() { setTimeout(() => openNPCProfile(npc), 200); return null; } },
    ]
  );
}

// ── CIRCLE VIEW ────────────────────────────────────────────
// Full list of all known NPCs — replaces the old plain text popup

function openCircleView() {
  const known = G.npcs.filter(n => n.introduced);
  if (!known.length) {
    queuePopup('Your social circle is not yet formed. Attend social events and you will meet people.');
    return;
  }

  const lines = known.map(n =>
    `${npc_status_icon(n)} ${n.fullName} — ${npcStatus(n)} (${n.closeness})`
  ).join('\n');

  queuePopup(
    `Your acquaintances:\n\n${lines}\n\nTap a name to interact.`,
    null,
    [
      ...known.map(n => ({
        text: `${npc_status_icon(n)} ${n.nick} (${npcStatus(n)})`,
        fn() { openNPCProfile(n); return null; },
      })),
      { text: '← Close', fn() { return {}; } },
    ]
  );
}

function npc_status_icon(npc) {
  if (npc.isRival)          return '⚔';
  if (npc.closeness >= 80)  return '★';
  if (npc.closeness >= 60)  return '♦';
  if (npc.closeness >= 40)  return '·';
  return '○';
}

// ── FAMILY PROFILE ─────────────────────────────────────────

function openFamilyView() {
  const people = [];

  if (G.mother) people.push({
    label: `Mother — ${G.mother.name}`,
    sub:   G.mother.alive ? familyClosenessLabel(G.mother.closeness) + ` (${G.mother.closeness})` : 'Deceased',
    alive: G.mother.alive,
    fn: () => openFamilyMemberProfile('mother'),
  });
  if (G.father) people.push({
    label: `Father — ${G.father.name}`,
    sub:   G.father.alive ? familyClosenessLabel(G.father.closeness) + ` (${G.father.closeness})` : 'Deceased',
    alive: G.father.alive,
    fn: () => openFamilyMemberProfile('father'),
  });
  for (let i = 0; i < G.siblings.length; i++) {
    const s = G.siblings[i];
    people.push({
      label: `${s.gender === 'sister' ? 'Sister' : 'Brother'} — ${s.name}${s.spouse ? ' (married)' : ''}`,
      sub:   s.alive ? familyClosenessLabel(s.closeness) + ` (${s.closeness})` : 'Deceased',
      alive: s.alive,
      fn: () => openSiblingProfile(i),
    });
  }
  if (G.children.length) {
    for (const child of G.children) {
      people.push({
        label: `${child.gender === 'son' ? 'Son' : 'Daughter'} — ${child.name} (age ${child.age || 0})`,
        sub:   'Your child',
        alive: true,
        fn: () => openChildProfile(child),
      });
    }
  }
  if (G.isMarried && G.spouse) {
    people.push({
      label: `Spouse — ${G.spouse.fullName}`,
      sub:   'Your husband',
      alive: true,
      fn:    () => openSpouseProfile(),
    });
  }

  queuePopup(
    'Your family:',
    null,
    [
      ...people.map(p => ({
        text: `${p.alive ? '' : '✝ '}${p.label}\n${p.sub}`,
        fn() { p.fn(); return null; },
      })),
      { text: '← Close', fn() { return {}; } },
    ]
  );
}

function openFamilyMemberProfile(key) {
  const person = key === 'mother' ? G.mother : G.father;
  if (!person) return;
  if (!person.alive) {
    queuePopup(`${person.name} has passed away. You think of them often.`, null, [
      { text: 'Close', fn() { return {}; } },
    ]);
    return;
  }
  const label = key === 'mother' ? 'Mother' : 'Father';
  const card = buildPersonCard(person, { isFamily:true, showApproval:true, showWealth:true });
  const age = person.age ? ` (${person.age})` : '';
  queuePopup(
    `${person.name}${age}
${label}${card}`,
    null,
    [
      {
        text: '💌 Write a letter',
        fn() {
          const g = rand(5,10); changeCloseness(person, g);
          person.approval = clamp((person.approval||50)+rand(2,5), 0, 100);
          addFeedEntry('You write to your ' + label.toLowerCase() + '.', 'good');
          queuePopup(
            key === 'mother'
              ? `Your letter is returned with four pages of questions and one of genuine warmth.`
              : `Your father writes back briefly but warmly. He is proud of you, in his way.`,
            `Closeness +${g}`
          );
          renderStats(); saveGame(); return null;
        },
      },
      {
        text: '🏠 Visit them',
        fn() {
          const g = rand(8,15); changeCloseness(person, g);
          person.approval = clamp((person.approval||50)+rand(3,8), 0, 100);
          changeStat('health', rand(3,7));
          addFeedEntry('You visit your ' + label.toLowerCase() + '.', 'good');
          queuePopup(
            key === 'mother'
              ? 'You spend several days at home. Your mother has opinions about everything. You find you have missed them.'
              : 'You spend time with your father. He shows you the estate. You talk more honestly than you usually do.',
            `Closeness +${g}`
          );
          renderStats(); saveGame(); return null;
        },
      },
      { text: '← People', fn() { switchView('people'); renderPeopleView(); return null; } },
    ]
  );
}

function openSiblingProfile(idx) {
  const sib = G.siblings[idx];
  if (!sib) return;
  if (!sib.alive) {
    queuePopup(`${sib.name} has passed away. The loss sits with you still.`, null, [
      { text: 'Close', fn() { return {}; } },
    ]);
    return;
  }
  const sibCard = buildPersonCard(sib, { isFamily:true, showApproval:true, showWealth: !!(sib.wealth>0) });
  const sibAge  = sib.age ? ` (${sib.age})` : '';
  const sibRel  = (sib.gender === 'sister' ? 'Sister' : 'Brother') +
    (sib.spouse ? ` · Married to ${sib.spouse}` : '') +
    (sib.children && sib.children.length ? ` · ${sib.children.length} child(ren)` : '');
  queuePopup(
    `${sib.name}${sibAge}\n${sibRel}${sibCard}`,
    null,
    [
      {
        text: '💌 Write to them',
        fn() {
          const g = rand(5,12); changeCloseness(sib, g);
          sib.approval = clamp((sib.approval||50)+rand(2,5), 0, 100);
          addFeedEntry(`You write to ${sib.name}.`, 'good');
          queuePopup(`${sib.name} writes back at once. The letter smells faintly of home.`, `Closeness +${g}`);
          renderStats(); saveGame(); return null;
        },
      },
      {
        text: '🏠 Visit them',
        fn() {
          const g = rand(10,18); changeCloseness(sib, g);
          sib.approval = clamp((sib.approval||50)+rand(3,8), 0, 100);
          changeStat('health', rand(5,10));
          addFeedEntry(`You visit ${sib.name}.`, 'good');
          queuePopup(`You spend several days with ${sib.name}. You argue about something old and laugh about something new.`, `Closeness +${g}`);
          renderStats(); saveGame(); return null;
        },
      },
      ...(sib.closeness < 30 ? [{
        text: '🤝 Make amends',
        fn() {
          const g = rand(15,25); changeCloseness(sib, g);
          addFeedEntry('You make amends with ' + sib.name + '.', 'good');
          queuePopup(`You write honestly to ${sib.name}, without excuses. The reply takes a week. But it comes.`, `Closeness +${g}`);
          renderStats(); saveGame(); return null;
        },
      }] : []),
      { text: '← People', fn() { switchView('people'); renderPeopleView(); return null; } },
    ]
  );
}


function openChildProfile(child) {
  const traitText = child.traits && child.traits.length ? `Personality: ${childTraitDesc(child)}`
    : child.age >= 10 ? `Forming: ${Object.keys(child.seeds||{}).slice(0,2).join(', ') || 'uncertain'}`
    : '';
  const educLine = child.governess ? `Governess: ${child.governess}`
    : child.schooling ? `School: ${child.schooling}` : 'No formal education yet';
  const childCard = buildPersonCard(child, { isFamily:true, showApproval:false, showWealth:false });
  queuePopup(
    `${child.name} (${child.age||0})\n${child.gender === 'son' ? 'Son' : 'Daughter'} · ${educLine}${traitText ? '\n'+traitText : ''}${childCard}`,
    null,
    [
      {
        text: '💬 Spend time with them',
        fn() {
          const g = rand(4,10); changeCloseness(child, g);
          changeStat('health', rand(3,6));
          const msgs = [
            `${child.name} asks you a question you cannot answer. You say "I don't know." They accept this completely.`,
            `${child.name} makes you laugh until you spill your tea. Worth every drop.`,
            `You read to ${child.name} until they fall asleep. You keep reading after.`,
            `${child.name} shows you something small that matters enormously to them. You pay attention.`,
          ];
          addFeedEntry(`You spend time with ${child.name}.`, 'good');
          queuePopup(pick(msgs), `Closeness +${g}`);
          renderStats(); saveGame();
          setTimeout(() => openChildProfile(child), 400);
          return null;
        },
      },
      ...(child.age >= 5 && child.age <= 15 ? [{
        text: '📖 Encourage their interests',
        fn() {
          const traits = ['scholarly','artistic','kind','witty','brave'];
          queuePopup(`What do you encourage in ${child.name}?`, null,
            traits.map(t => ({
              text: `Encourage ${(CHILD_TRAITS[t] ? CHILD_TRAITS[t].label : t) || t}`,
              fn() {
                shapeChildPersonality(child, t, 1);
                changeCloseness(child, rand(3,7));
                queuePopup(`You nurture ${child.name}'s ${(CHILD_TRAITS[t] ? CHILD_TRAITS[t].label : t) || t} tendencies.`, 'Character shaped');
                renderStats(); saveGame(); return null;
              },
            }))
          );
          return null;
        },
      }] : []),
      { text: '← People', fn() { switchView('people'); renderPeopleView(); return null; } },
    ]
  );
}


function childDesc(child) {
  const age = child.age || 0;
  if (age < 3)  return 'Very small. Very loud. Entirely wonderful.';
  if (age < 7)  return 'Full of questions. Afraid of nothing. Exhausting.';
  if (age < 12) return 'Starting to show who they will become.';
  if (age < 16) return 'Growing up faster than you expected.';
  if (age < 20) return 'Almost grown. You are not sure when that happened.';
  return 'Grown. Their own person now.';
}

function openSpouseProfile() {
  const s = G.spouse;
  if (!s) return;
  const spouseCard = buildPersonCard(s, { isFamily:true, showApproval:true, showWealth:true });
  queuePopup(
    `${s.fullName} (${s.age||'?'})\nYour husband · £${s.wealth.toLocaleString()}/yr\n\n${s.desc.charAt(0).toUpperCase() + s.desc.slice(1)}.${spouseCard}`,
    null,
    [
      {
        text: '🌹 A moment together',
        fn() {
          changeStat('health', rand(4,10));
          addFeedEntry('A good moment with ' + s.first + '.', 'good');
          queuePopup(
            pick([
              `${s.first} says something that reminds you exactly why you chose him.`,
              `An evening at home with ${s.first}. Nothing remarkable happens. It is the best kind of evening.`,
              `${s.first} notices something is wrong before you have said a word. This is very useful and occasionally alarming.`,
            ]),
            'Health +6'
          );
          renderStats(); saveGame();
          return null;
        },
      },
      { text: '← People', fn() { switchView('people'); renderPeopleView(); return null; } },
    ]
  );
}

// circle and family are handled directly in handleAction above


// ═══════════════════════════════════════════════════════════
// ORPHAN SYSTEM — GATED CHOICES
// ═══════════════════════════════════════════════════════════

function buildOrphanChoices() {
  const choices = [];
  const rank        = G.rankId;
  const motherClose = G.mother ? (G.mother.closeness || 0) : 0;
  const fatherClose = G.father ? (G.father.closeness || 0) : 0;
  const avgClose    = Math.round((motherClose + fatherClose) / 2);
  const wealth      = G.wealth;
  const rep         = G.reputation;
  const livingSib   = G.siblings.find(s => s.alive && s.age >= 18);

  // ── Option 1: Wealthy relative ──────────────────────────
  // Available: nobility or gentry AND (parent closeness >= 40 OR reputation >= 45)
  // Logic: wealthy relatives only step in if the family had connections and
  // the parents were actually engaged with society
  const wealthyRelAvail = (rank === 'nobility' || rank === 'gentry')
    && (avgClose >= 40 || rep >= 45);

  if (wealthyRelAvail) {
    const relName = pick(NAMES.female.concat(NAMES.male)) + ' ' + pick(NAMES.surname);
    choices.push({
      text: `Taken in by a wealthy relation — ${relName}`,
      fn() {
        changeStat('reputation', rand(5,10));
        G.guardian = { name: relName, type: 'wealthy_family', closeness: 40 };
        addFeedEntry('You go to live with ' + relName + '.', 'event');
        queuePopup(
          `You are taken in by ${relName}, a distant relation of some standing. Their house is large and very quiet and not yours. They are not unkind. This will have to be enough for now.`,
          'Reputation +7'
        );
        renderStats(); saveGame(); return null;
      },
    });
  } else if (rank === 'nobility' || rank === 'gentry') {
    // Wealthy relative exists but didn't step in — harsh message
    choices.push({
      text: `Appeal to wealthy relations (they may refuse)`,
      fn() {
        const roll = rand(1, 10);
        if (roll >= 7) {
          const relName = pick(NAMES.female.concat(NAMES.male)) + ' ' + pick(NAMES.surname);
          changeStat('reputation', rand(2,5));
          G.guardian = { name: relName, type: 'wealthy_family', closeness: 20 };
          addFeedEntry(relName + ' agrees, reluctantly.', 'event');
          queuePopup(
            `${relName} agrees to take you in — reluctantly, and with conditions made perfectly clear. You are not quite a guest and not quite a servant. You learn to navigate this carefully.`,
            'Reputation +3'
          );
        } else {
          changeStat('reputation', -rand(5,10));
          addFeedEntry('Your relations decline.', 'bad');
          queuePopup(
            `Your relations decline. The letter is polite and brief and says nothing kind between its lines. You are on your own.`,
            'Reputation -7'
          );
          // Force orphanage as fallback
          setTimeout(() => triggerOrphanageFallback(), 400);
        }
        renderStats(); saveGame(); return null;
      },
    });
  }

  // ── Option 2: Warm modest family ────────────────────────
  // Available: parent closeness >= 50 (people who loved them will help their child)
  // AND reputation >= 30 (a family with reputation this low is known for bad reasons)
  // AND wealth < 2000 (wealthy families take option 1; this is for those who can't)
  const warmFamilyAvail = avgClose >= 50 && rep >= 30;

  if (warmFamilyAvail) {
    const friendName = pick(NAMES.female) + ' ' + pick(NAMES.surname);
    choices.push({
      text: `Taken in by ${friendName}, a family friend`,
      fn() {
        changeStat('health', rand(8,15));
        G.guardian = { name: friendName, type: 'kind_family', closeness: 65 };
        addFeedEntry('You go to live with ' + friendName + '.', 'event');
        queuePopup(
          `You are taken in by ${friendName}, who loved your parents and will not see their child suffer for it. The house is small and warm and full of noise. You are, slowly, all right.`,
          'Health +10'
        );
        renderStats(); saveGame(); return null;
      },
    });
  } else if (avgClose >= 35 && rep >= 25) {
    // Borderline — they might help but it costs something
    const friendName = pick(NAMES.female) + ' ' + pick(NAMES.surname);
    choices.push({
      text: `Ask ${friendName} for shelter — they may say yes`,
      fn() {
        const roll = rand(1,10);
        if (roll >= 5) {
          changeStat('health', rand(4,8));
          G.guardian = { name: friendName, type: 'kind_family', closeness: 45 };
          addFeedEntry(friendName + ' takes you in.', 'good');
          queuePopup(
            `${friendName} takes you in, though it is a strain on their household. You are aware of this. You try to be useful.`,
            'Health +6'
          );
        } else {
          addFeedEntry(friendName + ' cannot help.', 'bad');
          queuePopup(`${friendName} cannot take you in. They are sorry. The word sorry does very little at the moment.`);
          setTimeout(() => triggerOrphanageFallback(), 400);
        }
        renderStats(); saveGame(); return null;
      },
    });
  }

  // ── Option 3: Older sibling ──────────────────────────────
  // Only available if sibling is genuinely old enough AND alive
  // Closeness matters — estranged sibling is less likely to step up
  if (livingSib) {
    const sibClose = livingSib.closeness || 50;
    const sibWilling = sibClose >= 45 || (sibClose >= 25 && rand(1,10) >= 6);
    if (sibWilling) {
      choices.push({
        text: `${livingSib.name} (your ${livingSib.gender}, age ${livingSib.age}) takes you in`,
        fn() {
          changeCloseness(livingSib, rand(20,35));
          changeStat('health', rand(5,10));
          G.guardian = { name: livingSib.name, type: 'sibling', closeness: 70 };
          addFeedEntry(livingSib.name + ' takes you in.', 'event');
          queuePopup(
            `${livingSib.name} takes you in without hesitation. You will not forget this. Not ever.`,
            'Closeness +25'
          );
          renderStats(); saveGame(); return null;
        },
      });
    } else {
      choices.push({
        text: `${livingSib.name} (your ${livingSib.gender}) — estranged, but worth trying`,
        fn() {
          const roll = rand(1,10);
          if (roll >= 7) {
            changeCloseness(livingSib, rand(15,30));
            G.guardian = { name: livingSib.name, type: 'sibling', closeness: 50 };
            addFeedEntry(livingSib.name + ' agrees.', 'event');
            queuePopup(
              `${livingSib.name} takes you in. There is something unspoken between you — years of distance, and this. It is, perhaps, a beginning.`,
              'Closeness +20'
            );
          } else {
            addFeedEntry(livingSib.name + ' does not come.', 'bad');
            queuePopup(
              `${livingSib.name} does not come. Perhaps they did not get the letter in time. Perhaps they did.`,
              'Closeness -10'
            );
            changeCloseness(livingSib, -10);
            setTimeout(() => triggerOrphanageFallback(), 400);
          }
          renderStats(); saveGame(); return null;
        },
      });
    }
  }

  // ── Option 4: Orphanage ──────────────────────────────────
  // Always available as last resort — but framed differently
  // by wealth and rank: wealthy family going to orphanage is
  // a scandal; poor family it's simply what happens
  const orphanageLabel = wealth >= 500
    ? `The parish orphanage (a last resort — this will be noticed)`
    : `The parish orphanage`;

  choices.push({
    text: orphanageLabel,
    fn() {
      triggerOrphanageFallback();
      return null;
    },
  });

  // If NO choices were built (extreme edge case — no connections at all)
  // ensure orphanage is always there
  if (!choices.length) {
    choices.push({
      text: 'The parish orphanage',
      fn() { triggerOrphanageFallback(); return null; },
    });
  }

  return choices;
}

function triggerOrphanageFallback() {
  const repPenalty = G.rankId === 'nobility' ? rand(15,25) : rand(8,15);
  changeStat('health',     -rand(10,20));
  changeStat('wit',         rand(5,12));
  changeStat('reputation', -repPenalty);
  G.guardian = { name: 'Parish Orphanage', type: 'orphanage', closeness: 0 };
  addFeedEntry('You are sent to the parish orphanage.', 'bad');
  queuePopup(
    'You are sent to the parish orphanage. It is cold and strict and you learn things no schoolroom would teach. You emerge tougher, lonelier, and considerably more resourceful than anyone expected.',
    `Wit +8 · Reputation -${repPenalty}`
  );
  renderStats(); saveGame();
}


// ═══════════════════════════════════════════════════════════
// DEV / ADMIN PANEL
// Triggered by tapping the title "How Ardently" 5 times quickly
// ═══════════════════════════════════════════════════════════

let devTapCount = 0;
let devTapTimer = null;

function devTitleTap() {
  devTapCount++;
  clearTimeout(devTapTimer);
  devTapTimer = setTimeout(() => { devTapCount = 0; }, 1500);
  if (devTapCount >= 5) {
    devTapCount = 0;
    openDevPanel();
  }
}

function openDevPanel() {
  // Only works if a game is in progress
  if (!G || !G.name) {
    alert('Start a game first, then use the dev panel.');
    return;
  }
  queuePopup(
    `🛠 DEV PANEL\n${G.name} · Age ${G.age} · ${G.phase} · ${G.season}`,
    null,
    [
      { text: '📊 Set Stats',           fn() { devSetStats();       return null; } },
      { text: '⚡ Trigger Event',        fn() { devTriggerEvent();   return null; } },
      { text: '🔀 Jump Life Phase',      fn() { devJumpPhase();      return null; } },
      { text: '💒 Fast-Track Marriage',  fn() { devFastMarriage();   return null; } },
      { text: '👶 Add Child Instantly',  fn() { devAddChild();       return null; } },
      { text: '👥 Introduce All NPCs',   fn() { devIntroAllNPCs();   return null; } },
      { text: '⏭ Clean Season Advance', fn() { devCleanAdvance();   return null; } },
      { text: '💀 Kill Family Member',   fn() { devKillFamily();     return null; } },
      { text: '← Close', fn() { return {}; } },
    ]
  );
}

// ── DEV: Set Stats ──────────────────────────────────────────
function devSetStats() {
  queuePopup('Set which stat?', null, [
    { text: `Health (currently ${G.health})`,         fn() { devSetStat('health');     return null; } },
    { text: `Wit (currently ${G.wit})`,               fn() { devSetStat('wit');        return null; } },
    { text: `Looks (currently ${G.looks})`,           fn() { devSetStat('looks');      return null; } },
    { text: `Reputation (currently ${G.reputation})`, fn() { devSetStat('reputation'); return null; } },
    { text: `Wealth (currently £${G.wealth})`,        fn() { devSetStat('wealth');     return null; } },
    { text: `Age (currently ${G.age})`,               fn() { devSetStat('age');        return null; } },
    { text: '← Back', fn() { openDevPanel(); return null; } },
  ]);
}

function devSetStat(stat) {
  const val = prompt(`Set ${stat} to:`, G[stat]);
  if (val === null) { openDevPanel(); return; }
  const n = parseInt(val);
  if (isNaN(n)) { alert('Enter a number.'); devSetStats(); return; }
  G[stat] = stat === 'wealth' ? n : Math.max(0, Math.min(100, n));
  addFeedEntry(`[DEV] ${stat} set to ${G[stat]}.`, 'event');
  renderStats(); saveGame();
  queuePopup(`${stat} set to ${G[stat]}.`, null, null, () => devSetStats());
}

// ── DEV: Trigger Event ──────────────────────────────────────
function devTriggerEvent() {
  const eventIds = [
    'gossip','letter_inheritance','letter_anonymous','letter_bills','letter_love',
    'illness','financial_loss','financial_gain','social_disaster',
    'inheritance_money','inheritance_library','rival_sabotage',
    'runaway_sibling','unexpected_compliment',
    'spring_picnic','spring_theatre','autumn_harvest','autumn_visitor',
    'marriage_content','marriage_disagreement','child_milestone',
    'friend_favour','rival_gossip_attempt',
  ];

  const allLists = [
    ...EVENT_REGISTRY,
    ...SPRING_EVENTS,
    ...AUTUMN_EVENTS,
    ...MARRIAGE_EVENTS,
    ...NPC_EVENTS,
    ...CHILDHOOD_EVENTS,
  ];

  queuePopup('Trigger which event?', null, [
    ...eventIds.slice(0, 12).map(id => ({
      text: id,
      fn() {
        const ev = allLists.find(e => e.id === id);
        if (!ev) { queuePopup('Event not found: ' + id); return null; }
        const result = ev.execute();
        if (result) {
          if (result.log)   addFeedEntry(result.log.text || result.log, result.log.type || 'event');
          if (result.popup) queuePopup(result.popup.text, result.popup.badge || null, result.popup.choices || null);
        }
        renderStats(); saveGame(); return null;
      },
    })),
    { text: '→ More events', fn() { devTriggerEvent2(); return null; } },
    { text: '🧒 Trigger Orphan System', fn() {
      G.orphanHandled = false;
      if (G.mother) G.mother.alive = false;
      if (G.father) G.father.alive = false;
      G.phase = 'childhood';
      const orphanChoices = buildOrphanChoices();
      queuePopup('Both your parents are gone. You are a child alone in the world.', 'Orphaned', orphanChoices);
      return null;
    }},
    { text: '← Back', fn() { openDevPanel(); return null; } },
  ]);
}

function devTriggerEvent2() {
  const allLists = [...SPRING_EVENTS, ...AUTUMN_EVENTS, ...MARRIAGE_EVENTS, ...NPC_EVENTS, ...CHILDHOOD_EVENTS];
  queuePopup('More events:', null, [
    ...allLists.slice(0, 10).map(ev => ({
      text: ev.id,
      fn() {
        const result = ev.execute();
        if (result) {
          if (result.log)   addFeedEntry(result.log.text || result.log, result.log.type || 'event');
          if (result.popup) queuePopup(result.popup.text, result.popup.badge || null, result.popup.choices || null);
        }
        renderStats(); saveGame(); return null;
      },
    })),
    { text: '← Back', fn() { devTriggerEvent(); return null; } },
  ]);
}

// ── DEV: Jump Phase ─────────────────────────────────────────
function devJumpPhase() {
  queuePopup('Jump to which life phase?', null, [
    { text: '🧒 Childhood (age 8)',   fn() { G.phase='childhood'; G.age=8;  G.season='Spring'; buildNav(); renderStats(); addFeedEntry('[DEV] Jumped to childhood.','event'); queuePopup('Jumped to childhood, age 8.', null, null, ()=>devJumpPhase()); return null; } },
    { text: '🌸 Debut (age 16)',      fn() { G.phase='debut';     G.age=16; G.season='Spring'; buildNav(); renderStats(); addFeedEntry('[DEV] Jumped to debut.','event');    queuePopup('Jumped to debut, age 16.',    null, null, ()=>devJumpPhase()); return null; } },
    { text: '👤 Adult (age 20)',      fn() { G.phase='adult';     G.age=20; G.season='Spring'; buildNav(); renderStats(); addFeedEntry('[DEV] Jumped to adult.','event');    queuePopup('Jumped to adult, age 20.',    null, null, ()=>devJumpPhase()); return null; } },
    { text: '👴 Elder (age 60)',      fn() { G.phase='elder';     G.age=60; G.season='Autumn'; buildNav(); renderStats(); addFeedEntry('[DEV] Jumped to elder.','event');    queuePopup('Jumped to elder, age 60.',    null, null, ()=>devJumpPhase()); return null; } },
    { text: '🔢 Set age manually',    fn() {
      const v = prompt('Set age to:', G.age);
      if (v) { G.age = parseInt(v)||G.age; renderStats(); saveGame(); }
      openDevPanel(); return null;
    }},
    { text: '← Back', fn() { openDevPanel(); return null; } },
  ]);
}

// ── DEV: Fast-Track Marriage ────────────────────────────────
function devFastMarriage() {
  if (G.isMarried) {
    queuePopup(`Already married to ${G.spouse.fullName}.`, null, [
      { text: 'Divorce (dev only)', fn() {
        G.isMarried = false; G.spouse = null;
        addFeedEntry('[DEV] Marriage dissolved.', 'event');
        buildNav(); renderStats(); saveGame();
        queuePopup('Marriage dissolved.'); return null;
      }},
      { text: '← Back', fn() { openDevPanel(); return null; } },
    ]);
    return;
  }
  const suitors = generateSuitors(5);
  queuePopup('Choose a suitor — marriage happens immediately:', null, [
    ...suitors.map(s => ({
      text: `${s.fullName} · £${s.wealth.toLocaleString()}/yr · Wit ${s.wit||'?'} Looks ${s.looks||'?'}`,
      fn() {
        acceptProposal(s);
        G.phase = 'adult';
        addFeedEntry('[DEV] Fast-track married to ' + s.fullName + '.', 'event');
        buildNav(); renderStats(); saveGame();
        queuePopup(`Married to ${s.fullName}. Stats: Wit ${s.wit||'?'}, Looks ${s.looks||'?'}, Health ${s.health||'?'}.`, 'Married ✓');
        return null;
      },
    })),
    { text: '← Back', fn() { openDevPanel(); return null; } },
  ]);
}

// ── DEV: Add Child Instantly ────────────────────────────────
function devAddChild() {
  queuePopup('Add a child:', null, [
    { text: 'Son', fn() {
      const name = pick(CHILD_NAMES.son);
      addChild('son', name);
      const c = G.children[G.children.length-1];
      addFeedEntry('[DEV] Added son ' + name + '.', 'event');
      saveGame();
      queuePopup(
        `Son added: ${name}\nHealth ${c.health} · Wit ${c.wit} · Looks ${c.looks}\n(Inherited from both parents)`,
        'Son added',
        null, () => devAddChild()
      );
      return null;
    }},
    { text: 'Daughter', fn() {
      const name = pick(CHILD_NAMES.daughter);
      addChild('daughter', name);
      const c = G.children[G.children.length-1];
      addFeedEntry('[DEV] Added daughter ' + name + '.', 'event');
      saveGame();
      queuePopup(
        `Daughter added: ${name}\nHealth ${c.health} · Wit ${c.wit} · Looks ${c.looks}\n(Inherited from both parents)`,
        'Daughter added',
        null, () => devAddChild()
      );
      return null;
    }},
    { text: 'Age up existing children +5', fn() {
      G.children.forEach(c => { c.age = (c.age||0) + 5; });
      addFeedEntry('[DEV] All children aged up +5.', 'event');
      saveGame(); renderStats();
      queuePopup('All children aged up by 5 years.', null, null, () => devAddChild());
      return null;
    }},
    { text: '← Back', fn() { openDevPanel(); return null; } },
  ]);
}

// ── DEV: Introduce All NPCs ─────────────────────────────────
function devIntroAllNPCs() {
  let count = 0;
  G.npcPool.forEach(npc => {
    if (!npc.introduced) {
      npc.introduced = true;
      npc.closeness = rand(20, 50);
      if (!G.npcs.find(n => n.id === npc.id)) G.npcs.push(npc);
      count++;
    }
  });
  if (!G.rival && G.npcs.length) {
    const rivalCandidate = G.npcs.find(n => !n.isRival);
    if (rivalCandidate) { rivalCandidate.isRival = true; G.rival = rivalCandidate; }
  }
  addFeedEntry(`[DEV] ${count} NPCs introduced.`, 'event');
  saveGame();
  queuePopup(`${count} NPCs introduced. Rival assigned if none existed.`, null, null, () => openDevPanel());
}

// ── DEV: Clean Season Advance ───────────────────────────────
function devCleanAdvance() {
  // Advance season without triggering random events or NPC introductions
  G.season = G.season === 'Spring' ? 'Autumn' : 'Spring';
  if (G.season === 'Spring') { G.age++; G.wealth += Math.floor(G.income/2); }
  else { G.wealth += Math.floor(G.income/4); }
  addSeasonBanner();
  addFeedEntry('[DEV] Clean season advance.', 'event');
  renderStats(); buildNav(); saveGame();
  queuePopup(`Advanced to ${G.season}. Age ${G.age}.`, null, null, () => openDevPanel());
}

// ── DEV: Kill Family Member ──────────────────────────────────
function devKillFamily() {
  const alive = [
    G.mother && G.mother.alive ? { label: 'Mother — ' + G.mother.name, fn: () => { G.mother.alive = false; } } : null,
    G.father && G.father.alive ? { label: 'Father — ' + G.father.name, fn: () => { G.father.alive = false; } } : null,
    ...G.siblings.filter(s => s.alive).map(s => ({
      label: s.name + ' (' + s.gender + ')',
      fn: () => { s.alive = false; },
    })),
  ].filter(Boolean);

  if (!alive.length) {
    queuePopup('No living family members remain.', null, null, () => openDevPanel());
    return;
  }

  queuePopup('Kill which family member?', null, [
    ...alive.map(p => ({
      text: p.label,
      fn() {
        p.fn();
        addFeedEntry('[DEV] ' + p.label + ' killed.', 'bad');
        // Check if this triggers orphan
        const mDead = !G.mother || !G.mother.alive;
        const fDead = !G.father || !G.father.alive;
        if (mDead && fDead && G.phase === 'childhood' && !G.orphanHandled) {
          G.orphanHandled = false;
          const choices = buildOrphanChoices();
          queuePopup('Both parents gone. Orphan system triggered.', 'Orphaned', choices);
        } else {
          queuePopup(p.label + ' is gone.', null, null, () => devKillFamily());
        }
        saveGame(); return null;
      },
    })),
    { text: '← Back', fn() { openDevPanel(); return null; } },
  ]);
}





function openEligibilityDetail() {
  if (!G.eligibility) { queuePopup('Your eligibility has not yet been calculated. Complete your debut first.'); return; }
  const e = G.eduStats || {};
  const mods = typeof getEligibilityModifiers === 'function' ? getEligibilityModifiers() : {};
  let html = '';
  html += pbar('Decorum',  e.decorum  ? e.decorum.total  : 0, '#b8860b', null, true);
  html += pbar('Literacy', e.literacy ? e.literacy.total : 0, '#7a4f2d', null, true);
  html += pbar('Reason',   e.reason   ? e.reason.total   : 0, '#2d5016', null, true);
  html += pbar('Faith',    e.faith    ? e.faith.total    : 0, '#4a3080', null, true);
  html += pbar('Looks',    G.looks,                           '#7a4f2d', null, true);
  html += pbar('Reputation',G.reputation,                     '#b8860b', null, true);
  html += cardDivider();
  html += pbar('Eligibility', G.eligibility, '#b8860b', typeof eligibilityLabel==='function'?eligibilityLabel(G.eligibility):G.eligibility, true);
  const notes = [];
  if (mods.clergyBoost) notes.push('High faith — clergy suitors more likely');
  if (mods.intellectBoost) notes.push('Strong reason — intellectual suitors attracted');
  if (mods.artBoost) notes.push('High decorum — artistic and charming suitors');
  const noteText = notes.length ? '\n' + notes.join('\n') : '';
  queuePopup(`Your Eligibility${noteText}${html}`, null, [{ text: 'Close', fn(){return{};} }]);
}

// ═══════════════════════════════════════════════════════════
// EDUCATION UI — Schooling choices, tutors, self-study
// ═══════════════════════════════════════════════════════════

function openSchoolingChoice() {
  if (G.schooling && G.schooling.type !== 'none') {
    queuePopup(
      `You are currently at ${G.schooling.name || G.schooling.type}. Change your schooling arrangement?`,
      null,
      [
        { text: 'Yes — explore other options', fn() { chooseNewSchooling(); return null; } },
        { text: 'No — stay as I am',           fn() { return {}; } },
      ]
    );
    return;
  }
  chooseNewSchooling();
}

function chooseNewSchooling() {
  const age = G.age;
  queuePopup(
    `How shall you be educated?${age < 10 ? '\nAt your age: reading, writing, faith and manners only.' : '\nFull curriculum now available.'}`,
    null,
    [
      {
        text: 'Sunday School — free, faith and literacy',
        fn() {
          G.schooling = { type:'sunday', name:'Sunday School', governess:null, boarding:null, startAge:age, tutors:[], selfStudy:[] };
          addFeedEntry('You begin attending Sunday School.', 'good');
          queuePopup('You begin attending Sunday School every week. The vicar is kind. The Bible is long. Your faith grows.', 'Faith +/season');
          saveGame(); if(currentView!=='home') renderCatView('schooling'); return null;
        },
      },
      {
        text: 'Hire a Governess',
        fn() { openGovernessHire(); return null; },
      },
      {
        text: `Your mother teaches you${G.mother && G.mother.alive ? '' : ' (unavailable)'}`,
        fn() {
          if (!G.mother || !G.mother.alive) { queuePopup('Your mother is not available.'); return null; }
          const subs = typeof getMotherSubjects === 'function' ? getMotherSubjects() : [];
          const subNames = subs.map(s => s.subject.split('.').pop()).join(', ') || 'what she knows';
          G.schooling = { type:'governess', name:'Your Mother', governess:{ id:'mother', name:'Your Mother', cost:0 }, boarding:null, startAge:age, tutors:[], selfStudy:[] };
          addFeedEntry('Your mother becomes your teacher.', 'good');
          queuePopup(`Your mother teaches you ${subNames}. She does so with love, if not always expertise.`, 'Free tuition');
          saveGame(); if(currentView!=='home') renderCatView('schooling'); return null;
        },
      },
    ]
  );
}

function openGovernessHire() {
  const options = typeof getAvailableGoverness === 'function' ? getAvailableGoverness() : [];
  // Filter out 'mother' option here (handled above)
  const hireable = options.filter(g => g.id !== 'mother');

  queuePopup(
    `Several governesses are available. You have £${G.wealth.toLocaleString()}.`,
    null,
    [
      ...hireable.map(g => ({
        text: `${g.name} — £${g.cost}/yr (${g.quality})\n${g.desc}`,
        fn() {
          if (G.wealth < g.cost * 2) {
            queuePopup(`Your family cannot afford ${g.name} at £${g.cost}/yr.`);
            return null;
          }
          G.wealth -= g.cost;
          G.schooling = {
            type: 'governess', name: g.name,
            governess: g, boarding: null,
            startAge: G.age, tutors: [], selfStudy: [],
          };
          if (g.repBonus) changeStat('reputation', g.repBonus);
          addFeedEntry(g.name + ' arrives. Your education begins properly.', 'good');
          queuePopup(`${g.name} arrives. ${g.desc} Your education begins in earnest.`, `Rep +${g.repBonus||0}`);
          saveGame(); if(currentView!=='home') renderCatView('schooling'); return null;
        },
      })),
      { text: '← Back', fn() { chooseNewSchooling(); return null; } },
    ]
  );
}

function openBoardingSchoolChoice() {
  if (G.age < 10) {
    queuePopup('Boarding school is not considered until you are ten years old.');
    return;
  }
  if (G.schooling && G.schooling.boarding) {
    queuePopup(`You are already enrolled at ${G.schooling.boarding.name}.`);
    return;
  }

  const schools = typeof getAvailableBoardingSchools === 'function' ? getAvailableBoardingSchools() : [];
  const parentApproval = typeof parentApprovalBonus === 'function' ? parentApprovalBonus() : 50;

  // Parents must approve — chance based on approval score
  const approvalChance = parentApproval >= 70 ? 0.9
                       : parentApproval >= 50 ? 0.65
                       : parentApproval >= 35 ? 0.4
                       : 0.2;

  queuePopup(
    `You would like to attend boarding school. Your parents must agree.\n\nParental approval: ${typeof approvalLabel === 'function' ? approvalLabel(parentApproval) : parentApproval}`,
    null,
    [
      {
        text: 'Ask your parents',
        fn() {
          if (Math.random() > approvalChance) {
            queuePopup('Your parents decline. "You will learn everything you need at home." You do not agree, but you cannot change their minds today.', 'Refused');
            return null;
          }
          openBoardingSchoolSelect(schools); return null;
        },
      },
      {
        text: 'Petition them formally (costs closeness, higher chance)',
        fn() {
          if (G.mother && G.mother.alive) changeCloseness(G.mother, -rand(5,10));
          if (G.father && G.father.alive) changeCloseness(G.father, -rand(5,10));
          const higherChance = Math.min(0.95, approvalChance + 0.25);
          if (Math.random() > higherChance) {
            queuePopup('Even your formal petition is refused. They are not yet persuaded.', 'Refused');
            return null;
          }
          openBoardingSchoolSelect(schools); return null;
        },
      },
      { text: 'Perhaps another time', fn() { return {}; } },
    ]
  );
}

function openBoardingSchoolSelect(schools) {
  queuePopup(
    'Which school?',
    null,
    [
      ...schools.map(s => ({
        text: `${s.name} — £${s.cost}/yr (${s.desc})`,
        fn() {
          if (G.wealth < s.cost) { queuePopup(`Your family cannot afford £${s.cost}/yr at ${s.name}.`); return null; }
          G.wealth -= s.cost;
          if (!G.schooling) G.schooling = { type:'none', tutors:[], selfStudy:[] };
          G.schooling.type    = 'boarding';
          G.schooling.name    = s.name;
          G.schooling.boarding= s;
          changeStat('reputation', s.repBonus || 0);
          // Unlock careers
          if (s.careerUnlocks && typeof unlockCareers === 'function') unlockCareers(s.careerUnlocks);
          addFeedEntry(`You are sent to ${s.name}.`, 'event');
          queuePopup(`You arrive at ${s.name}. You cry for the first week. Then you make several excellent friends and learn more than you expected.`, `Reputation +${s.repBonus}`);
          saveGame(); if(currentView!=='home') renderCatView('schooling'); return null;
        },
      })),
      { text: '← Back', fn() { return {}; } },
    ]
  );
}

function openTutorMenu() {
  const tutors = typeof getTutorOptions === 'function' ? getTutorOptions() : [];
  queuePopup(
    `Hire a tutor for a one-time boost. You have £${G.wealth.toLocaleString()}.`,
    null,
    [
      ...tutors.map(t => ({
        text: `${t.name} — £${t.cost} (${t.subject.split('.').pop()})`,
        fn() {
          if (G.wealth < t.cost) { queuePopup(`You cannot afford £${t.cost} for a tutor.`); return null; }
          G.wealth -= t.cost;
          const [grp, sub] = t.subject.split('.');
          if (typeof changeEduStat === 'function') {
            const boost = typeof rand === 'function' ? rand(6,12) : 8;
            changeEduStat(grp, sub, boost);
            addFeedEntry(`${t.name}: a significant boost to ${sub}.`, 'good');
            queuePopup(`${t.name} spends an intensive fortnight on your ${sub}. The improvement is noticeable.`, `${sub} +${boost}`);
          }
          saveGame(); return null;
        },
      })),
      { text: 'Perhaps another time', fn() { return {}; } },
    ]
  );
}

function openSelfStudyMenu() {
  const options = typeof getSelfStudyOptions === 'function' ? getSelfStudyOptions() : [];
  queuePopup(
    'What shall you study on your own?',
    null,
    [
      ...options.map(o => ({
        text: `${o.name} (${o.subject.split('.').pop()})`,
        fn() {
          const [grp, sub] = o.subject.split('.');
          if (typeof changeEduStat === 'function') {
            const boost = typeof rand === 'function' ? rand(2,4) : 3;
            changeEduStat(grp, sub, boost);
            addFeedEntry(`You study ${o.name}.`, 'good');
            queuePopup(`You spend several hours with ${o.name}. Progress is slow but genuine.`, `${sub} +${boost}`);
          }
          saveGame(); return null;
        },
      })),
      { text: 'Perhaps another time', fn() { return {}; } },
    ]
  );
}

function openEduStatsDetail() {
  if (!G.eduStats) { queuePopup('No education stats yet.'); return; }
  const e = G.eduStats;
  let html = '';

  html += pbarGroup('Literacy', e.literacy.total, '#7a4f2d', [
    { label:'Reading',    value: e.literacy.reading    },
    { label:'Writing',    value: e.literacy.writing    },
    { label:'Arithmetic', value: e.literacy.arithmetic },
    { label:'Calligraphy',value: e.literacy.calligraphy },
  ]);
  html += cardDivider();
  html += pbarGroup('Reason', e.reason.total, '#2d5016', [
    { label:'Science',    value: e.reason.science    },
    { label:'Philosophy', value: e.reason.philosophy },
    { label:'History',    value: e.reason.history    },
  ]);
  html += cardDivider();
  html += pbarGroup('Faith', e.faith.total, '#4a3080', [
    { label:'Theology',  value: e.faith.theology  },
    { label:'Scripture', value: e.faith.scripture },
  ]);
  html += cardDivider();
  html += pbarGroup('Decorum', e.decorum.total, '#b8860b', [
    { label:'Music',      value: e.decorum.music      },
    { label:'Dancing',    value: e.decorum.dancing    },
    { label:'Art',        value: e.decorum.art        },
    { label:'Manners',    value: e.decorum.manners    },
    { label:'Needlework', value: e.decorum.needlework },
    { label:'Languages',  value: e.decorum.languages  },
  ]);

  queuePopup('Your Education' + html, null, [{ text: 'Close', fn() { return {}; } }]);
}


// ═══════════════════════════════════════════════════════════
// PET ADOPTION
// ═══════════════════════════════════════════════════════════

const PET_CATALOGUE = [
  // Free / found
  { animal:'dog',    emoji:'🐕', names:['Biscuit','Wellington','Admiral','Nelson','Pepper','Bramble'], cost:0,   upkeep:5,  healthBonus:8, desc:'A loyal companion. Always pleased to see you.' },
  { animal:'cat',    emoji:'🐈', names:['Minerva','Shadow','Duchess','Pounce','Smoky','Biscuit'],      cost:0,   upkeep:3,  healthBonus:5, desc:'Agreeable on their own terms, which is most of the time.' },
  { animal:'rabbit', emoji:'🐇', names:['Clover','Snowdrop','Button','Pip','Fern','Cotton'],           cost:0,   upkeep:2,  healthBonus:4, desc:'Soft and surprisingly opinionated.' },
  // Purchased
  { animal:'spaniel',emoji:'🦮', names:['Hero','Captain','Regent','Prince','Dash'],                    cost:20,  upkeep:8,  healthBonus:10, desc:'A fashionable breed. You will be envied.' },
  { animal:'parrot', emoji:'🦜', names:['Polly','Admiral','Cicero','Caesar','Juno'],                   cost:40,  upkeep:5,  healthBonus:6,  desc:'Repeats things at inopportune moments. Endlessly entertaining.' },
  { animal:'pony',   emoji:'🐴', names:['Nutmeg','Hazel','Flint','Arrow','Clover'],                    cost:60,  upkeep:20, healthBonus:12, desc:'For riding out. Also for showing off.' },
];

function openAdoptPet() {
  const currentPets = (G.pets || []).filter(p => p.alive);
  if (currentPets.length >= 4) {
    queuePopup('You have quite enough pets for the moment. Your household staff disagree with the current number already.');
    return;
  }

  queuePopup(
    `A new companion. You have £${G.wealth.toLocaleString()}.`,
    null,
    [
      ...PET_CATALOGUE.map(p => ({
        text: `${p.emoji} ${p.animal.charAt(0).toUpperCase()+p.animal.slice(1)}${p.cost > 0 ? ` — £${p.cost}` : ' — free'}\n${p.desc}`,
        fn() {
          if (p.cost > 0 && G.wealth < p.cost) {
            queuePopup(`You cannot presently afford a ${p.animal}.`);
            return null;
          }
          if (p.cost > 0) G.wealth -= p.cost;
          const name = pick(p.names);
          if (!G.pets) G.pets = [];
          const newPet = { name, animal:p.animal, emoji:p.emoji, age:0, health:100, alive:true, upkeep:p.upkeep };
          G.pets.push(newPet);
          changeStat('health', p.healthBonus);
          addFeedEntry(`You acquire a ${p.animal}. Its name is ${name}.`, 'good');
          queuePopup(
            `You acquire a ${p.animal}. You name it ${name}. ${p.desc}`,
            `Health +${p.healthBonus}`
          );
          renderStats(); saveGame();
          if (currentView !== 'home') renderCatView(currentView);
          return null;
        },
      })),
      { text: 'Perhaps another time', fn() { return {}; } },
    ]
  );
}


// ═══════════════════════════════════════════════════════════
// LESSON UI — fires lesson events when subjects are clicked
// ═══════════════════════════════════════════════════════════

// Map action keys to lesson subject keys
const SUBJECT_KEY_MAP = {
  music:      'music',
  dancing:    'dancing',
  scripture:  'scripture',
  history:    'history',
  languages:  'languages',
  french:     'languages',  // alias
  needlework: 'needlework',
  art:        'art',
  drawing:    'art',        // alias
  reading:    'reading',
  writing:    'writing',
  study:      'reading',    // generic study maps to reading
};

function fireLessonUI(key) {
  if (!G.eduStats) {
    // Fall back to old stat boost if no edu stats
    handleAction(key);
    return;
  }

  const subjectKey = SUBJECT_KEY_MAP[key] || key;
  const event = typeof fireLessonEvent === 'function' ? fireLessonEvent(subjectKey) : null;

  if (!event) {
    // No lesson event defined — fall back
    if (typeof doAction === 'function') {
      const result = doAction(key);
      if (result) {
        if (result.log) addFeedEntry(typeof result.log==='string'?result.log:result.log.text, typeof result.log==='string'?'':result.log.type||'');
        if (result.popup) queuePopup(result.popup.text, result.popup.badge||null, result.popup.choices||null);
      }
    }
    renderStats(); saveGame();
    return;
  }

  addFeedEntry(`${subjectKey} lesson.`, 'good');
  queuePopup(
    event.text,
    null,
    event.choices.map(c => ({
      text: c.text,
      fn() {
        const result = c.fn();
        if (result) {
          if (result.log)  addFeedEntry(result.log, 'good');
          if (result.text) queuePopup(result.text, result.badge||null);
          if (result.schoolmateMoment) handleSchoolmateMoment(result.schoolmateMoment);
          renderStats(); saveGame();
          if (currentView !== 'home') renderCatView(currentView);
        }
        return null;
      },
    }))
  );
}

// Handle schoolmate moments that arise from lesson choices
function handleSchoolmateMoment(momentType) {
  if (!G.schoolmates) return;
  const candidates = G.schoolmates.filter(s => s.introduced && s.status !== 'rival');
  if (!candidates.length) return;

  const sm = pick(candidates);

  if (momentType === 'helped_needlework' || momentType === 'teaches_dancing') {
    sm.closeness = Math.min(100, sm.closeness + rand(8,15));
    if (sm.closeness >= 45 && sm.status === 'acquaintance') sm.status = 'friend';
    setTimeout(() => {
      queuePopup(
        momentType === 'helped_needlework'
          ? `${sm.name} finds you later and thanks you quietly. "Nobody ever helped me before," she says. You do not know what to say. You smile instead. It is enough.`
          : `${sm.name} catches your eye across the room and gives you a small nod. "You've got it," she says. Coming from her, that means something.`,
        `Closeness with ${sm.name} +10`
      );
      saveGame();
    }, 300);
  }
}


// ═══════════════════════════════════════════════════════════
// HOUSEHOLD UI
// ═══════════════════════════════════════════════════════════

function openHouseholdView() {
  if (!G.household) {
    if (typeof initHousehold === 'function') initHousehold();
    if (!G.household) { queuePopup('Household management becomes available after marriage.'); return; }
  }
  const h   = G.household;
  const sum = typeof getHouseholdSummary === 'function' ? getHouseholdSummary() : null;
  const tierLabel = h.tier.charAt(0).toUpperCase() + h.tier.slice(1);

  queuePopup(
    `Your Household\n${tierLabel} · Management ${h.management.total}/100`,
    null,
    [
      { text: '👥 Staff',           fn() { openStaffView();     return null; } },
      { text: '📒 Account Book',    fn() { openAccountBook();   return null; } },
      { text: '🍽 Entertaining',    fn() { openEntertainingView(); return null; } },
      { text: '👶 Nursery',         fn() { openNurseryView();   return null; } },
      { text: '← Assets',          fn() { renderAssetsView();  return null; } },
    ]
  );
}

// ── STAFF ─────────────────────────────────────────────────

function openStaffView() {
  if (!G.household) return;
  const h     = G.household;
  const avail = typeof getAvailableStaff === 'function' ? getAvailableStaff() : [];
  const wages = typeof recalcStaffWages  === 'function' ? recalcStaffWages()  : 0;

  queuePopup(
    `Household Staff\nTotal wages: £${wages}/season`,
    null,
    [
      // Hired staff
      ...Object.keys(h.staff)
        .filter(function(r) {
          return r === 'footmen'
            ? h.staff.footmen.count > 0
            : h.staff[r].hired;
        })
        .map(function(r) {
          if (r === 'footmen') {
            return {
              text: `${h.staff.footmen.count} Footm${h.staff.footmen.count===1?'an':'en'} · £${h.staff.footmen.count * h.staff.footmen.wage}/yr`,
              fn() { openStaffProfile(r); return null; },
            };
          }
          const st = h.staff[r];
          const happy = st.happiness >= 70 ? '😊' : st.happiness >= 40 ? '😐' : '😟';
          return {
            text: `${happy} ${st.name} (${r}) · Quality ${st.quality}`,
            fn() { openStaffProfile(r); return null; },
          };
        }),
      // Hire new staff
      ...avail
        .filter(function(r) {
          return r === 'footmen' ? true : !(h.staff[r] && h.staff[r].hired);
        })
        .map(function(r) {
          const wage = typeof STAFF_WAGES !== 'undefined' && STAFF_WAGES[r]
            ? STAFF_WAGES[r][h.tier] || 0 : 0;
          return {
            text: `+ Hire ${r}${wage ? ' (£' + wage + '/yr)' : ''}`,
            fn() { doHireStaff(r); return null; },
          };
        }),
      { text: '← Household', fn() { openHouseholdView(); return null; } },
    ]
  );
}

function openStaffProfile(role) {
  if (!G.household) return;
  if (role === 'footmen') {
    const count = G.household.staff.footmen.count;
    queuePopup(
      `${count} footm${count===1?'an':'en'} in your service.\n\nThey carry, open doors, and lend the house its proper consequence.`,
      null,
      [
        { text: '+ Engage another', fn() { doHireStaff('footmen'); return null; } },
        { text: '− Dismiss one',    fn() {
          const r = typeof dismissStaff==='function' ? dismissStaff('footmen') : null;
          if (r) queuePopup(r.message);
          renderAssetsView(); return null;
        }},
        { text: '← Staff',         fn() { openStaffView(); return null; } },
      ]
    );
    return;
  }
  const st = G.household.staff[role];
  if (!st || !st.hired) { openStaffView(); return; }
  const relBar = typeof relationshipBarHTML === 'function'
    ? relationshipBarHTML(st.happiness, false) : '';
  const qualBar = typeof pbar === 'function'
    ? pbar('Quality', st.quality, '#b8860b') : '';
  queuePopup(
    `${st.name}\n${role.replace(/([A-Z])/g,' $1').trim()} · £${st.wage}/yr${relBar}${qualBar}`,
    null,
    [
      { text: '👏 Praise her work',  fn() {
        const r = typeof interactWithStaff==='function' ? interactWithStaff(role,'praise') : null;
        if (r) queuePopup(r.text, r.badge||null);
        saveGame(); return null;
      }},
      { text: '💰 Give a bonus (£5)', fn() {
        const r = typeof interactWithStaff==='function' ? interactWithStaff(role,'bonus') : null;
        if (r) queuePopup(r.text, r.badge||null);
        renderStats(); saveGame(); return null;
      }},
      { text: '📋 Reprimand her',    fn() {
        const r = typeof interactWithStaff==='function' ? interactWithStaff(role,'reprimand') : null;
        if (r) queuePopup(r.text, r.badge||null);
        saveGame(); return null;
      }},
      { text: '✕ Dismiss her',       fn() {
        const r = typeof dismissStaff==='function' ? dismissStaff(role) : null;
        if (r) { addFeedEntry(r.message, 'event'); queuePopup(r.message); saveGame(); }
        return null;
      }},
      { text: '← Staff',             fn() { openStaffView(); return null; } },
    ]
  );
}

function doHireStaff(role) {
  if (typeof hireStaff !== 'function') return;
  const result = hireStaff(role);
  addFeedEntry(result.message, result.success ? 'good' : 'event');
  queuePopup(result.message, result.success ? `£${result.wage}/yr` : null);
  renderStats(); saveGame();
}

// ── ACCOUNT BOOK ──────────────────────────────────────────

function openAccountBook() {
  if (!G.household) return;
  const a    = G.household.accounts;
  const last = a.history.slice(-8).reverse();
  const lines = last.length
    ? last.map(function(e) {
        return (e.amount >= 0 ? '+' : '') + '£' + Math.abs(e.amount) + ' — ' + e.description;
      }).join('\n')
    : 'No entries yet.';

  queuePopup(
    `Account Book\n\nAllowance: £${a.seasonlyAllowance}/season\nStaff wages: £${a.staffWages}/season\nBalance: £${a.balance}\n\nRecent entries:\n${lines}`,
    null,
    [{ text: '← Household', fn() { openHouseholdView(); return null; } }]
  );
}

// ── ENTERTAINING ──────────────────────────────────────────

function openEntertainingView() {
  if (!G.household) return;
  const e = G.household.entertaining;
  queuePopup(
    `Entertaining\n\nMorning calls received: ${e.morningCalls.received}\nDinner parties hosted: ${e.dinnerParties.hosted}\nBalls hosted: ${e.balls.hosted}`,
    null,
    [
      { text: '☕ Receive morning callers', fn() {
        e.morningCalls.received++;
        const rep = rand(2,6);
        changeStat('reputation', rep);
        addFeedEntry('You receive morning callers.', 'good');
        queuePopup('The drawing room is pleasantly full for an hour. Several connections are made or maintained.', `Reputation +${rep}`);
        renderStats(); saveGame(); return null;
      }},
      { text: '🍽 Host a dinner party', fn() {
        if (G.wealth < 30) { queuePopup('You cannot presently afford to entertain at dinner.'); return null; }
        G.wealth -= 30;
        e.dinnerParties.hosted++;
        const rep = rand(4,10);
        changeStat('reputation', rep);
        addFeedEntry('You host a dinner party.', 'event');
        queuePopup('The dinner is a success. Eight covers, two removes, excellent conversation.', `Reputation +${rep}`);
        renderStats(); saveGame(); return null;
      }},
      { text: '🃏 Host a card evening', fn() {
        if (G.wealth < 10) { queuePopup('You cannot presently afford an evening party.'); return null; }
        G.wealth -= 10;
        e.cardEvenings.hosted++;
        changeStat('reputation', rand(2,5));
        addFeedEntry('You host an evening of cards.', 'good');
        queuePopup('A pleasant evening of whist and loo. Nobody loses more than they can afford. Mostly.', 'Reputation +3');
        renderStats(); saveGame(); return null;
      }},
      { text: '← Household', fn() { openHouseholdView(); return null; } },
    ]
  );
}

// ── NURSERY ───────────────────────────────────────────────

function openNurseryView() {
  if (!G.household) return;
  const n = G.household.nursery;
  const childCount = G.children ? G.children.length : 0;

  if (!childCount) {
    queuePopup('There are no children in the nursery yet.', null,
      [{ text: '← Household', fn() { openHouseholdView(); return null; } }]);
    return;
  }

  queuePopup(
    `The Nursery\n${childCount} child${childCount!==1?'ren':''}\nWet nurse: ${n.hasWetNurse?'Yes':'No'}\nGoverness: ${n.governessName||'None'}`,
    null,
    [
      ...(!n.hasWetNurse && G.children.some(function(c){ return (c.age||0) < 2; }) ? [{
        text: '🍼 Engage a wet nurse',
        fn() {
          if (G.wealth < 8) { queuePopup('You cannot afford a wet nurse at present.'); return null; }
          G.wealth -= 8;
          n.hasWetNurse = true;
          const name = 'Mrs ' + pick(['Brook','Lane','Field','Heath','Dale']);
          addFeedEntry(name + ' engaged as wet nurse.', 'good');
          queuePopup(name + ' is engaged. The infant thrives.', 'Health +5');
          changeStat('health', 5);
          renderStats(); saveGame(); return null;
        },
      }] : []),
      ...(!n.governessName && G.children.some(function(c){ return (c.age||0) >= 4; }) ? [{
        text: '📚 Engage a governess for the children',
        fn() {
          if (G.wealth < 20) { queuePopup('You cannot afford a governess at present.'); return null; }
          G.wealth -= 20;
          n.governessName = 'Miss ' + pick(['Webb','Sharp','Lane','Hart','Moore']);
          addFeedEntry(n.governessName + ' engaged as children\'s governess.', 'good');
          queuePopup(n.governessName + ' arrives. The children regard her with cautious interest.', 'Children\'s education begun');
          saveGame(); return null;
        },
      }] : []),
      { text: '← Household', fn() { openHouseholdView(); return null; } },
    ]
  );
}
