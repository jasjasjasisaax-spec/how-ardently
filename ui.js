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

// Runs doAction and displays the result — popup + feed entry + stat render
function dispatchDoAction(key) {
  var result = typeof doAction === 'function' ? doAction(key) : null;
  if (!result) { renderStats(); saveGame(); return; }
  if (result.log) {
    var entry = typeof result.log === 'string' ? { text: result.log, type: '' } : result.log;
    addFeedEntry(entry.text, entry.type || '');
  }
  if (result.popup) {
    var p = result.popup;
    var choices = p.choices ? p.choices.map(function(c) {
      return { text: c.text, fn() {
        var r2 = c.fn ? c.fn() : null;
        if (r2 && r2.text)  queuePopup(r2.text, r2.badge||null);
        if (r2 && r2.log)   addFeedEntry(typeof r2.log==='string'?r2.log:r2.log.text, '');
        renderStats(); saveGame(); return null;
      }};
    }) : null;
    queuePopup(p.text, p.badge||null, choices);
  }
  renderStats(); saveGame();
}

function handleAction(key) {
  // Special multi-step actions handled in UI directly
  if (key === 'circle')         { switchView('people'); renderPeopleView(); return; }
  if (key === 'save_game')      { if(typeof openSaveSlots==='function') openSaveSlots('save'); return; }
  if (key === 'hh_staff')        { renderHouseholdStaffView(); return; }
  if (key === 'hh_accounts')     { openAccountBook();          return; }
  if (key === 'hh_entertaining') { openEntertainingView();     return; }
  if (key === 'hh_nursery')      { openNurseryView();          return; }
  if (key === 'modiste')          { openModiste();                    return; }
  if (key === 'needlework')       { dispatchDoAction('needlework');   return; }
  if (key === 'tea_party')        { openTeaParty();                   return; }
  if (key === 'cards')            { openCards();                      return; }
  if (key === 'lawn_games')       { dispatchDoAction('lawn_games');   return; }
  if (key === 'charity')          { openCharityWork();                return; }
  if (key === 'riding')           { dispatchDoAction('riding');       return; }
  if (key === 'physician')        { openPhysician();                  return; }
  if (key === 'stillroom')        { dispatchDoAction('stillroom');    return; }
  if (key === 'country_walk')    { dispatchDoAction('country_walk');  return; }
  if (key === 'visit_tenants')   { openVisitTenants();          return; }
  if (key === 'hear_grievances') { openVillageComes();          return; }
  if (key === 'tend_sick')       { dispatchDoAction('tend_sick');     return; }
  if (key === 'send_baskets')    { openSendBaskets();           return; }
  if (key === 'village_fete')    { openVillageFete();             return; }
  if (key === 'visit')           { openVisitNeighbours();        return; }
  if (key === 'hh_none')         { return; }
  if (key === 'assets_view') {
    // Show owned assets then buy options by category
    var choices = [];
    if (G.assets && G.assets.length) {
      G.assets.forEach(function(a) {
        choices.push({ text: a.name + ' — £' + (a.currentValue||0).toLocaleString() + ' · ' + a.type,
          fn() { if(typeof openAssetProfile==='function') openAssetProfile(a); return null; } });
      });
    }
    choices.push({ text: '+ Buy an estate',    fn() { if(typeof openBuyMenu==='function') openBuyMenu('estates');   return null; } });
    choices.push({ text: '+ Buy a carriage',   fn() { if(typeof openBuyMenu==='function') openBuyMenu('carriages'); return null; } });
    choices.push({ text: '+ Buy a horse',      fn() { if(typeof openBuyMenu==='function') openBuyMenu('horses');    return null; } });
    choices.push({ text: '+ Buy jewellery',    fn() { if(typeof openBuyMenu==='function') openBuyMenu('jewellery'); return null; } });
    choices.push({ text: '← Household', fn() { switchView('household'); renderCatView('household'); return null; } });
    queuePopup(G.assets && G.assets.length ? 'Your Property & Assets' : 'You own no property yet.', null, choices);
    return;
  }
  if (key.startsWith('asset_')) { var a=(G.assets||[]).find(function(x){return 'asset_'+x.instanceId===key;}); if(a&&typeof openAssetProfile==='function')openAssetProfile(a); return; }
  if (key === 'invest_view')     { if(typeof openInvestmentMenu==='function') openInvestmentMenu(); return; }
  if (key === 'debt_view')       { if(typeof openDebtMenu==='function') openDebtMenu(); return; }
  if (key === 'will_view')       { if(typeof openWillView==='function') openWillView(); return; }
  if (key === 'dynasty')         { openDynastyView();                  return; }
  if (key.startsWith('career_')) { openCareerDetail(key.replace('career_','')); return; }
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
  if (key === 'hostball') {
    var hh = G.household;
    var hasCook = hh && hh.staff && hh.staff.cook && hh.staff.cook.hired;
    var hasHK   = hh && hh.staff && hh.staff.housekeeper && hh.staff.housekeeper.hired;
    if (!hasCook || !hasHK) {
      queuePopup(
        'To host a ball you need at minimum a cook and a housekeeper.'
          + (!hasCook ? '\nNo cook engaged.' : '')
          + (!hasHK   ? '\nNo housekeeper engaged.' : ''),
        null,
        [
          { text: 'Hire staff first', fn() { renderHouseholdStaffView(); return null; } },
          { text: 'Host anyway (it will not go well)', fn() {
            changeStat('reputation', -rand(10,20));
            addFeedEntry('The ball was ill-prepared. People will remember.', 'bad');
            queuePopup('The ball is a disaster. The food is inadequate, the house in disarray.', 'Reputation -15');
            renderStats(); saveGame(); return null;
          }},
          { text: 'Cancel', fn() { return {}; } },
        ]
      );
    } else {
      if(typeof openBallPlanning==='function') openBallPlanning();
    }
    return;
  }
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
  var tier  = typeof standingTier === 'function' ? standingTier() : repTier(G.reputation);
  var phase = G.phase === 'childhood'
    ? (G.age === 0 ? 'Newborn'
      : G.age < 2  ? 'Infant · Age ' + G.age
      : G.age < 4  ? 'Toddler · Age ' + G.age
      : 'Childhood · Age ' + G.age)
    : 'Age ' + G.age + ' · ' + G.season;

  var nameDisplay = typeof getTitlePrefix==='function' && G.title && G.title.rank > 0
    ? getTitlePrefix() + ' ' + G.name : G.name;
  var wealthDisplay = '£' + G.wealth.toLocaleString()
    + (typeof netAssetIncome==='function' && G.assets && G.assets.length
        ? ' (£' + netAssetIncome() + '/s)' : '');

  // Top header: name / age / wealth / tier
  var hdrEl = document.getElementById('stat-hdr');
  if (hdrEl) {
    hdrEl.innerHTML =
      '<div class="sh-top">'
      + '<span class="sh-name" onclick="devTitleTap()" style="cursor:default">' + nameDisplay + '</span>'
      + '<span class="sh-meta">' + phase + '</span>'
      + '<button class="sh-settings-btn" onclick="openSettingsMenu()" title="Settings">⚙</button>'
      + '</div>'
      + '<div class="sh-bot">'
      + '<span class="wv">' + wealthDisplay + '</span>'
      + '<span class="tb">★ ' + tier + '</span>'
      + '</div>';
  }

  // Stat bars below nav tabs
  var barsEl = document.getElementById('stat-bars');
  if (barsEl) {
    var eduHtml = '';
    if (G.phase === 'childhood' && G.gender === 'female' && G.eduStats && G.age >= 4) {
      var e = G.eduStats;
      eduHtml = '<div class="edu-hdr" onclick="toggleEduStats()">'
        + '<span class="edu-hdr-label">▸ Education</span></div>';
      if (!e.collapsed) {
        eduHtml += '<div class="edu-bars">'
          + bar('Literacy', e.literacy.total, '#7a4f2d')
          + bar('Reason',   e.reason.total,   '#2d5016')
          + bar('Faith',    e.faith.total,    '#4a3080')
          + bar('Decorum',  e.decorum.total,  '#b8860b')
          + '</div>';
      }
    }
    barsEl.innerHTML = '<div class="bars">'
      + bar('Health',  G.health,       '#8b2020')
      + bar('Looks',   G.looks,        '#7a4f2d')
      + bar('Wit',     G.wit,          '#2d5016')
      + bar('Rep',     G.reputation,   '#b8860b')
      + bar('Fashion', G.fashion || 0, '#8b4513')
      + '</div>' + eduHtml;
  }

  // Age-up button label
  var nextSeason = G.season === 'Spring' ? 'Autumn' : 'Spring';
  document.getElementById('au-label').textContent =
    G.phase === 'childhood'
      ? (G.age < 4 ? '⏭  GROW UP' : '⏭  GROW UP A SEASON')
      : '⏭  ADVANCE TO ' + nextSeason.toUpperCase();
  document.getElementById('au-sub').textContent =
    G.phase === 'childhood' ? 'age ' + G.age : 'currently ' + G.season;
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
    { id:'home',       icon:'🏠', label:'Home'       },
    { id:'society',    icon:'🎵', label:'Society'    },
    { id:'activities', icon:'📖', label:'Activities' },
    { id:'household',  icon:'🏡', label:'Household'  },
    { id:'people',     icon:'👥', label:'People'     },
  ],
};


// ── HOUSEHOLD HINT HELPERS ────────────────────────────────

function householdStaffHint() {
  if (!G.household) return 'Manage your staff';
  var h = G.household;
  var hiredCount = Object.keys(h.staff).filter(function(r) {
    return r === 'footmen' ? h.staff.footmen.count > 0 : h.staff[r].hired;
  }).length;
  var wages = typeof recalcStaffWages === 'function' ? recalcStaffWages() : 0;
  return hiredCount + ' staff · £' + wages + '/season';
}

function householdAccountHint() {
  if (!G.household) return 'Household finances';
  var a = G.household.accounts;
  var bal = a.balance || 0;
  return 'Balance: £' + bal + ' · Allowance: £' + (a.seasonlyAllowance || 0) + '/season';
}

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
  console.log('[switchView] called with:', id);
  currentView = id;

  // Update nav highlights
  document.querySelectorAll('.ntab').forEach(b =>
    b.classList.toggle('active', b.dataset.id === id)
  );

  // Show/hide views
  const allViews = ['home','society','self','life','activities','household','personal','education','tutors','schooling','people','assets'];
  allViews.forEach(v => {
    const el = document.getElementById('view-' + v);
    if (el) el.classList.toggle('active', v === id);
  });

  // Age-up bar: only visible on home screen
  const auBar = document.querySelector('.au-bar');
  if (auBar) auBar.style.display = id === 'home' ? 'block' : 'none';

  // Populate category if needed
  if (id === 'people')     { renderPeopleView();          return; }
  if (id === 'assets')     { renderAssetsView();          return; }
  if (id === 'life')       { renderLifeView();            return; }
  if (id === 'society')    { renderCatView('society');    return; }
  if (id === 'activities') { renderCatView('activities'); return; }
  if (id === 'household')  { renderCatView('household');  return; }
  if (id !== 'home') renderCatView(id);

}

// ── CATEGORY VIEW BUILDER ──────────────────────────────────

function renderCatView(id) {
  console.log('[renderCatView] called with id:', id);
  const el = document.getElementById('view-' + id);
  console.log('[renderCatView] el found:', !!el);
  if (!el) { console.error('[renderCatView] NO ELEMENT for view-' + id); return; }

  let cfg;
  try { cfg = getCatConfig(id); } catch(e) { console.error('[renderCatView] getCatConfig threw:', e); return; }
  console.log('[renderCatView] cfg:', cfg ? 'OK, sections=' + cfg.sections.length : 'NULL');
  if (!cfg) { console.error('[renderCatView] getCatConfig returned null for', id); return; }

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
        { label: 'Country Life', items: [
          { key:'country_walk',    icon:'\u{1F33F}', name:'Walk in the Countryside', hint: !spring ? 'Fine eyes require exercise' : 'You are in Town', locked: spring },
          { key:'visit_tenants',   icon:'\u{1F3E1}', name:'Visit Tenants',           hint: G.assets && G.assets.some(function(a){return a.type==='estate';}) ? 'Your estate depends on them' : 'Requires an estate', locked: !(G.assets && G.assets.some(function(a){return a.type==='estate';})) },
          { key:'hear_grievances', icon:'\u{1F4AC}', name:'Hear Grievances',         hint: !spring ? 'Hear local concerns' : 'You are in Town', locked: spring },
          { key:'tend_sick',       icon:'\u{1F33C}', name:'Tend the Sick',           hint: 'Visit the cottage poor' },
          { key:'send_baskets',    icon:'\u{1F9FA}', name:'Send Baskets',            hint: G.wealth >= 10 ? 'Provisions to the needy (£5+)' : 'Cannot afford it', locked: G.wealth < 5 },
          { key:'village_fete',    icon:'\u{1F3AA}', name:'Village Fete',            hint: !spring ? 'Autumn fair — open to all' : 'Held in summer', locked: spring },
          { key:'visit',           icon:'\u{1F3E0}', name:'Visit Neighbours',        hint: 'Morning calls and local society' },
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

    case 'activities': return {
      title: 'Activities',
      sub:   'Your mind, your health, your accomplishments',
      sections: [
        { label: 'Mind', items: [
          { key:'read',       icon:'\u{1F4DA}', name:'Read Books',       hint:'Expand your mind considerably' },
          { key:'letters',    icon:'\u270C',    name:'Write Letters',    hint:'Wit exercised by correspondence' },
        ]},
        { label: 'Accomplishments', items: [
          G.gender === 'female'
            ? { key:'piano',      icon:'\u{1F3B9}', name:'Pianoforte',   hint:'Practise your instrument' }
            : { key:'fencing',    icon:'\u{1F93A}', name:'Fencing',      hint:'With the fencing master' },
          { key:'sketch',     icon:'\u{1F3A8}', name:'Sketching',        hint:'Watercolours and composition' },
          { key:'needlework', icon:'\u{1F9F5}', name:'Needlework',       hint:'Quiet industry and fine stitches' },
        ]},
        { label: 'Social', items: [
          { key:'tea_party',  icon:'\u{1F375}', name:'Tea Party',
            hint: spring ? 'Morning calls and afternoon society' : 'A domestic pleasure any season' },
          { key:'cards',      icon:'\u{1F0CF}', name:'Cards',            hint:'Whist, loo, and the occasional wager' },
          { key:'lawn_games', icon:'\u{1F3CF}', name:'Lawn Games',       hint:'Pall-mall, archery, fresh air' },
        ]},
        { label: 'Virtue & Duty', items: [
          { key:'parish',     icon:'\u{1F64F}', name:'Visit the Parish', hint:'Be charitable and be seen to be' },
          { key:'charity',    icon:'\u{1F90D}', name:'Charity Work',     hint:'Good works, quietly done' },
        ]},
        { label: 'Health & Home', items: [
          { key:'riding',     icon:'\u{1F40E}', name:'Horse Riding',
            hint: G.assets && G.assets.some(function(a){return a.type==='horse';}) ? 'Ride out' : 'Requires a horse',
            locked: !(G.assets && G.assets.some(function(a){return a.type==='horse';})) },
          { key:'physician',  icon:'\u{1F48A}', name:'Visit the Physician',
            hint: G.wealth >= 5 ? 'For what ails you (£5+)' : 'Cannot afford it at present', locked: G.wealth < 5 },
          { key:'stillroom',  icon:'\u{1F9EA}', name:'Stillroom & Soap', hint:'Domestic science and useful industry' },
        ]},
        ...(G.phase !== 'childhood' && G.gender === 'female' ? [{ label: 'Fashion', items: [
          { key:'modiste',    icon:'\u{1F397}', name:'Visit the Modiste',
            hint: spring ? 'Gowns, gossip, and fashion plates' : 'Visit when in Town', locked: !spring },
        ]}] : []),
      ],
    };

    case 'household': return {
      title: 'Household',
      sub: (function() {
        if (!G.household) return 'Your domestic life';
        var tierDescs = {
          humble:      'Humble establishment \u00b7 one servant',
          modest:      'Modest establishment \u00b7 small staff',
          comfortable: 'Comfortable establishment \u00b7 a proper household',
          wealthy:     'Wealthy establishment \u00b7 full staff',
          grand:       'Grand establishment \u00b7 a house of consequence',
        };
        return tierDescs[G.household.tier] || G.household.tier;
      })(),
      sections: [
        ...(G.isMarried && G.gender === 'female' && G.household ? [
          { label: 'Staff & Management', items: [
            { key:'hh_staff',        icon:'\u{1F465}', name:'Staff',        hint: householdStaffHint() },
            { key:'hh_accounts',     icon:'\u{1F4D2}', name:'Account Book', hint: householdAccountHint() },
            { key:'hh_entertaining', icon:'\u{1F37D}', name:'Entertaining', hint:'Morning calls, dinners, card parties' },
            { key:'hh_nursery',      icon:'\u{1F476}', name:'Nursery',      hint: G.children && G.children.length ? G.children.length + ' child(ren)' : 'No children yet', locked: !G.children || !G.children.length },
          ]},
        ] : [{ label: 'Household', items: [
          { key:'hh_none', icon:'\u{1F3E1}', name:'No household yet', hint:'Available after marriage', locked: true },
        ]}]),
        { label: 'Assets & Property', items: [
          // Each owned asset as its own tappable row
          ...((G.assets && G.assets.length) ? G.assets.map(function(a) {
            var icon = a.type==='estate'    ? '\u{1F3E0}'
                     : a.type==='carriage'  ? '\u{1F4BA}'
                     : a.type==='horse'     ? '\u{1F40E}'
                     : a.type==='jewellery' ? '\u{1F48E}'
                     : '\u{1F4BC}';
            var hint = '\u00a3' + (a.currentValue||0).toLocaleString() + ' \u00b7 Condition ' + (a.condition||100)
                     + (a.rentedOut ? ' \u00b7 Rented out' : '');
            return { key:'asset_' + a.instanceId, icon:icon, name:a.name, hint:hint };
          }) : [{ key:'assets_view', icon:'\u{1F3E0}', name:'No property yet', hint:'Tap to browse and buy', locked:false }]),
          // Buy more / manage
          { key:'assets_view', icon:'+', name:'Buy Property', hint:'Estates, carriages, horses, jewellery' },
          { key:'invest_view', icon:'\u{1F4B0}', name:'Investments', hint: G.investments && G.investments.length ? G.investments.length + ' active' : 'None yet' },
          { key:'debt_view',   icon:'\u{1F4DC}', name:'Debts',       hint: G.debts && G.debts.length ? G.debts.length + ' outstanding' : 'No debts', locked: !G.debts || !G.debts.length },
          { key:'will_view',   icon:'\u{1F4CB}', name: G.will && G.will.written ? 'Review Will' : 'Write Your Will', hint: G.will && G.will.written ? 'Will written' : 'No will yet' },
          { key:'dynasty',     icon:'\u{1F3F0}', name:'Dynasty & Family', hint: 'Marriages, heirs, and legacy' },
        ]},
        ...(G.gender === 'female' && !G.isMarried && typeof getAvailableCareers === 'function' ? (function() { try { var c = getAvailableCareers(); return c && c.length ? [{ label: 'Career', items: c.slice(0,4).map(function(x){ return { key:'career_'+x.id, icon:'\u{1F4BC}', name:x.name, hint:x.desc }; }) }] : []; } catch(e) { return []; } })() : []),
      ],
    };

    case 'self':
    case 'life': return {
      title: 'Life',
      sub:   G.isMarried && G.gender === 'female' ? 'Your household, your mind, your ambitions' : 'Your mind, your health, your accomplishments',
      sections: [
        { label: 'Mind & Accomplishments', items: [
          { key:'read',    icon:'📚', name:'Read Books',       hint:'Expand your mind considerably' },
          { key:'letters', icon:'✒',  name:'Write Letters',    hint:'Wit exercised by correspondence' },
          G.gender === 'female'
            ? { key:'piano',   icon:'🎹', name:'Pianoforte',   hint:'Practise your instrument' }
            : { key:'fencing', icon:'🤺', name:'Fencing',      hint:'With the fencing master' },
          { key:'sketch',  icon:'🎨', name:'Sketching',        hint:'Watercolours and composition' },
          { key:'parish',  icon:'🙏', name:'Visit the Parish', hint:'Be charitable and be seen to be' },
        ]},
        ...(G.isMarried && G.gender === 'female' && G.household ? [{
          label: 'Household',
          items: [
            { key:'hh_staff',       icon:'👥', name:'Staff',         hint: householdStaffHint() },
            { key:'hh_accounts',    icon:'📒', name:'Account Book',  hint: householdAccountHint() },
            { key:'hh_entertaining',icon:'🍽', name:'Entertaining',  hint:'Morning calls, dinners, card parties' },
            { key:'hh_nursery',     icon:'👶', name:'Nursery',       hint: G.children && G.children.length ? G.children.length + ' child(ren)' : 'No children yet', locked: !G.children || !G.children.length },
          ],
        }] : []),
        ...(!G.isMarried && G.phase !== 'childhood' && G.gender === 'female' && typeof getAvailableCareers === 'function' && getAvailableCareers().length ? [{
          label: 'Career',
          items: getAvailableCareers().slice(0,4).map(function(c) {
            return { key:'career_' + c.id, icon:'💼', name:c.name, hint:c.desc };
          }),
        }] : []),
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
            key:'pet_'+p.name, icon:p.emoji||'\u{1F43E}', name:p.name, hint:'Your ' + p.animal + ' · Age ' + (p.age||0) + ' · Health ' + (p.health||100)
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
  // Calculate compatibility if not already done
  if (suitor.compatibility === undefined && typeof calculateCompatibility === 'function') {
    suitor.compatibility = calculateCompatibility(suitor);
  }
  var compatScore = suitor.compatibility || 50;
  var compatDesc  = typeof compatibilityLabel === 'function' ? compatibilityLabel(compatScore) : '';

  queuePopup(
    suitor.fullName + '. ' + suitor.rankLabel + ', £' + suitor.wealth.toLocaleString() + ' per annum. '
      + suitor.desc.charAt(0).toUpperCase() + suitor.desc.slice(1) + '.'
      + (compatDesc ? '\nCompatibility: ' + compatDesc + '.' : ''),
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
        var flirtLine = compatScore >= 65
          ? 'You deploy your most winning smile. ' + suitor.first + ' responds with gratifying warmth. There is something here.'
          : compatScore >= 45
          ? 'You deploy your most winning smile. ' + suitor.first + ' responds with polite warmth.'
          : 'You deploy your most winning smile. ' + suitor.first + ' responds correctly but the warmth is somewhat studied.';
        queuePopup(flirtLine, 'Reputation +5', null, null, false);
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

  // Fortune hunter follow-up
  if (G._fortuneHunterFollowUp && typeof checkFortuneHunterFollowUp === 'function') {
    setTimeout(function() { checkFortuneHunterFollowUp(); }, 900);
  }

  // Season banner in feed
  addSeasonBanner();

  // Process events from advanceSeason()
  for (const ev of result.events) {
    if (ev.text) addFeedEntry(ev.text, ev.type || '');
    if (ev.popup) queuePopup(ev.popup.text, ev.popup.badge || null, ev.popup.choices || null);

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
      if (ev.earlyMilestone === 'future_talk') {
        setTimeout(function() { fireFutureTalkConversation(); }, 600);
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

    // Coming of age inheritance
    if (ev.comingOfAge) {
      var coa = ev.comingOfAge;
      setTimeout(function() { fireComingOfAgeEvent(coa); }, 600);
    }

    // Child marriage age — arrange a match
    if (ev.childMilestone && ev.childMilestone.event === 'marriage_age') {
      var cma = ev.childMilestone;
      setTimeout(function(){ openArrangeMarriage(cma.child); }, 600);
    }

    // Child married independently
    if (ev.childMilestone && ev.childMilestone.event === 'married_independently') {
      var cmi = ev.childMilestone;
      setTimeout(function(){
        var spouseNames = ['a Mr Holt of Derbyshire', 'a Miss Cartwright of Surrey', 'a Captain Vane', 'a Miss Drummond', 'a Mr Pendleton'];
        var sp = pick(spouseNames);
        cmi.child.isMarried = true;
        cmi.child.spouseName = sp;
        addFeedEntry(cmi.child.name + ' marries ' + sp + '.', 'event');
        queuePopup(
          cmi.child.name + ' has made their own arrangements. They are to marry ' + sp + '. You were not, precisely, consulted.',
          'Family news'
        );
        saveGame();
      }, 600);
    }

    // Childless moment
    if (ev.childlessMoment) {
      setTimeout(function(){ fireChildlessMoment(); }, 800);
    }

    // Fortune hunter
    if (ev.fortuneHunter) {
      setTimeout(function() { fireFortunehunter(ev.fortuneHunter); }, 700);
    }

    // Autonomous proposal
    if (ev.autonomousProposal) {
      setTimeout(function() { fireAutonomousProposal(ev.autonomousProposal); }, 700);
    }

    // Autonomous pregnancy
    if (ev.autonomousPregnancy) {
      setTimeout(function() { fireAutonomousPregnancy(); }, 500);
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
  // Rank grid removed — family background now randomised at game start
  // Function kept to avoid errors from DOMContentLoaded call
}

function selectGender(g) {
  selGender = g;
  document.getElementById('gb-f').classList.toggle('sel', g === 'female');
  document.getElementById('gb-m').classList.toggle('sel', g === 'male');
  checkCreate();
}

function checkCreate() {
  var name = document.getElementById('inp-name').value.trim();
  document.getElementById('btn-enter').disabled = !(name && selGender);
  // Show family preview once name + gender chosen
  if (name && selGender) {
    if (!_previewBg || _previewGender !== selGender) {
      _previewBg     = typeof generateFatherBackground === 'function' ? generateFatherBackground() : null;
      _previewGender = selGender;
    }
    var wrap = document.getElementById('family-preview-wrap');
    var prev = document.getElementById('family-preview');
    if (wrap) wrap.style.display = 'block';
    if (prev && _previewBg) {
      prev.textContent = 'Your father is ' + _previewBg.profLabel + '. '
        + (_previewBg.fatherWealth > 3000 ? 'The family is comfortably wealthy.'
         : _previewBg.fatherWealth > 800  ? 'The family is of middling means.'
         : 'The family income is modest.')
        + ' Your pin money will be £' + _previewBg.pinMoney + ' a season.';
    }
  }
}
var _previewBg = null;
var _previewGender = null;

function beginGame() {
  var name = document.getElementById('inp-name').value.trim();
  // Use the previewed background if available, otherwise generate fresh
  if (_previewBg && typeof newGame === 'function') {
    // Store previewBg so newGame can use it
    window._pendingFatherBg = _previewBg;
  }
  newGame(name, selGender, 'gentry'); // rankId kept for compat
  showScreen('s-game');
  currentView = 'home';
  buildNav();
  renderStats();
  addFeedEntry('Your story begins.', 'event');
  // Brief birth popup with father's background and will hint
  queuePopup(
    'Welcome to the world, ' + name + '. The season is ' + G.season + ', and everything lies ahead of you.',
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
  if (!G || !G.name) { alert('Start a game first.'); return; }

  var info = G.name + ' · Age ' + G.age + ' · ' + G.phase + ' · ' + G.season
    + '\nWealth: £' + (G.wealth||0).toLocaleString()
    + (G.pinMoney ? '  Pin money: £' + G.pinMoney + '/season' : '')
    + (G.fatherBg ? '\nFather: ' + (G.fatherBg.profLabel||'?') + ' · £' + (G.fatherBg.fatherWealth||0) : '')
    + (G.household ? '\nHousehold tier: ' + G.household.tier + '  Balance: £' + (G.household.accounts.balance||0) : '')
    + '\nFertility: ' + (G.fertility !== undefined ? (G.fertility >= 70 ? 'High (' : G.fertility >= 40 ? 'Normal (' : G.fertility >= 20 ? 'Low (' : 'Very low (') + G.fertility + ')' : 'unknown') + (G.age >= 28 ? ' · declining' : '')
    + (G.expectedSettlement ? '\nExpected settlement: £' + G.expectedSettlement.toLocaleString() : '');

  queuePopup(
    'DEV PANEL\n' + info,
    null,
    [
      { text: 'Stats & Money',          fn() { devSetStats();          return null; } },
      { text: 'Jump Life Phase',        fn() { devJumpPhase();         return null; } },
      { text: 'Trigger Event',          fn() { devTriggerEvent();      return null; } },
      { text: 'Trigger More Events',    fn() { devTriggerEvent2();     return null; } },
      { text: 'Fast-Track Marriage',    fn() { devFastMarriage();      return null; } },
      { text: 'Add Child',              fn() { devAddChild();          return null; } },
      { text: 'Introduce All NPCs',     fn() { devIntroAllNPCs();      return null; } },
      { text: 'Clean Season Advance',   fn() { devCleanAdvance();      return null; } },
      { text: 'Kill Family Member',     fn() { devKillFamily();        return null; } },
      { text: 'Household Tools',        fn() { devHouseholdTools();    return null; } },
      { text: 'Inheritance Tools',      fn() { devInheritanceTools();  return null; } },
      { text: 'Schooling Tools',        fn() { devSchoolingTools();    return null; } },
      { text: 'Assets & Property',      fn() { devAssetTools();        return null; } },
      { text: 'Close', fn() { return {}; } },
    ]
  );
}

// ── DEV: Set Stats ──────────────────────────────────────────
function devSetStats() {
  queuePopup('Set which stat?', null, [
    { text: 'Health (' + G.health + ')',        fn() { devSetStat('health');     return null; } },
    { text: 'Wit (' + G.wit + ')',              fn() { devSetStat('wit');        return null; } },
    { text: 'Looks (' + G.looks + ')',          fn() { devSetStat('looks');      return null; } },
    { text: 'Reputation (' + G.reputation + ')',fn() { devSetStat('reputation'); return null; } },
    { text: 'Faith (' + G.faith + ')',          fn() { devSetStat('faith');      return null; } },
    { text: 'Wealth £' + (G.wealth||0),    fn() { devSetStat('wealth');     return null; } },
    { text: 'Income £' + (G.income||0),    fn() { devSetStat('income');     return null; } },
    { text: 'Pin Money £' + (G.pinMoney||0),fn() { devSetStat('pinMoney'); return null; } },
    { text: 'Fertility ' + (G.fertility!==undefined?G.fertility:'?'), fn() { devSetStat('fertility'); return null; } },
    { text: 'Age (' + G.age + ')',              fn() { devSetStat('age');        return null; } },
    { text: '← Dev Panel', fn() { openDevPanel(); return null; } },
  ]);
}

function devSetStat(stat) {
  gamePrompt('Set ' + stat + ' to:', String(G[stat] || 0), function(val) {
    var n = parseInt(val);
    if (isNaN(n)) { queuePopup('Enter a number.'); devSetStats(); return; }
    var noClamp = ['wealth','income','pinMoney','age'];
    G[stat] = noClamp.includes(stat) ? n : Math.max(0, Math.min(100, n));
    addFeedEntry('[DEV] ' + stat + ' set to ' + G[stat] + '.', 'event');
    renderStats(); saveGame();
    queuePopup(stat + ' set to ' + G[stat] + '.', null, null, function(){ devSetStats(); });
  }, function() { openDevPanel(); });
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
    { text: 'Newborn (age 0)',     fn() { G.phase='childhood'; G.age=0;  G.season='Spring'; buildNav(); renderStats(); addFeedEntry('[DEV] Jumped to newborn.','event'); saveGame(); queuePopup('Age 0 — Newborn.'); return null; } },
    { text: 'Childhood (age 8)',   fn() { G.phase='childhood'; G.age=8;  G.season='Spring'; buildNav(); renderStats(); addFeedEntry('[DEV] Jumped to childhood.','event'); saveGame(); queuePopup('Age 8 — Childhood.'); return null; } },
    { text: 'Future Talk (age 13)',fn() {
      G.phase='childhood'; G.age=13; G.season='Spring';
      G.futureTalkDone = false; // reset so it fires
      buildNav(); renderStats(); saveGame();
      setTimeout(function(){ fireFutureTalkConversation(); }, 300);
      return null;
    } },
    { text: 'Debut prep (age 16)', fn() { G.phase='childhood'; G.age=16; G.season='Spring'; buildNav(); renderStats(); addFeedEntry('[DEV] Jumped to pre-debut.','event'); saveGame(); queuePopup('Age 16 — Debut year.'); return null; } },
    { text: 'Adult (post-debut)',  fn() {
      G.phase='adult'; G.age=18; G.season='Spring'; G.debutDone=true;
      if (!G.suitorPool) G.suitorPool = [];
      buildNav(); renderStats(); addFeedEntry('[DEV] Jumped to adult.','event'); saveGame();
      switchView('society'); renderCatView('society');
      return null;
    } },
    { text: 'Married adult',       fn() {
      if (!G.isMarried) { devFastMarriage(); return null; }
      G.phase='adult'; G.age=25; G.season='Spring';
      buildNav(); renderStats(); addFeedEntry('[DEV] Jumped to married adult.','event'); saveGame();
      return null;
    } },
    { text: 'Elder (age 55)',      fn() { G.phase='elder'; G.age=55; G.season='Autumn'; buildNav(); renderStats(); addFeedEntry('[DEV] Jumped to elder.','event'); saveGame(); queuePopup('Age 55 — Elder.'); return null; } },
    { text: '← Dev Panel', fn() { openDevPanel(); return null; } },
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
  var a      = G.household.accounts;
  var wages  = typeof recalcStaffWages === 'function' ? recalcStaffWages() : 0;
  var bal    = a.balance || 0;
  var allow  = a.seasonlyAllowance || 0;
  var hubAllow = a.husbandAllowance || allow;
  var balColour = bal >= 0 ? '' : ' (deficit)';

  var last = a.history.slice(-8).reverse();
  var lines = last.length
    ? last.map(function(e) {
        return (e.amount >= 0 ? '+' : '') + '\u00a3' + Math.abs(e.amount) + ' \u2014 ' + e.description;
      }).join('\n')
    : 'No entries yet.';

  var surplus = allow - wages;
  var surplusText = surplus >= 0
    ? '\u00a3' + surplus + ' surplus this season'
    : '\u00a3' + Math.abs(surplus) + ' shortfall this season';

  queuePopup(
    'Account Book'
      + '\n\nHusband\'s allowance: \u00a3' + hubAllow + '/season'
      + '\nYour personal wealth: \u00a3' + (G.wealth||0).toLocaleString()
      + '\nStaff wages: \u00a3' + wages + '/season'
      + '\nBalance: \u00a3' + bal + balColour
      + '\n' + surplusText
      + '\n\nRecent entries:\n' + lines,
    null,
    [
      {
        text: 'Add personal funds to household budget',
        fn() {
          if (!G.wealth || G.wealth <= 0) {
            queuePopup('You have no personal funds to contribute.');
            return null;
          }
          // Offer amounts based on what player can afford
          var opts = [10,25,50,100,200].filter(function(x){ return G.wealth >= x; });
          if (!opts.length) { queuePopup('You cannot afford to contribute anything.'); return null; }
          queuePopup(
            'How much will you add from your personal funds?\nYour wealth: \u00a3' + G.wealth.toLocaleString(),
            null,
            opts.map(function(amt) {
              return {
                text: '\u00a3' + amt,
                fn() {
                  var ok = typeof topUpHouseholdBudget === 'function' && topUpHouseholdBudget(amt);
                  if (ok) {
                    addFeedEntry('You add \u00a3' + amt + ' to the household accounts.', 'good');
                    queuePopup('You transfer \u00a3' + amt + ' into the household accounts. The books look a little healthier.', '+\u00a3' + amt);
                    renderStats(); saveGame();
                  }
                  return null;
                },
              };
            }).concat([{ text: 'Cancel', fn() { openAccountBook(); return null; } }])
          );
          return null;
        },
      },
      { text: '\u2190 Household', fn() { if(typeof switchView==='function'){switchView('household');renderCatView('household');} return null; } },
    ]
  );
}

// ── ENTERTAINING ──────────────────────────────────────────

function openEntertainingView() {
  if (!G.household) return;
  var e     = G.household.entertaining;
  var staff = G.household.staff;
  var hasCook       = staff.cook       && staff.cook.hired;
  var hasHousekeeper= staff.housekeeper&& staff.housekeeper.hired;
  var hasButler     = staff.butler     && staff.butler.hired;
  var cookQuality   = hasCook ? (staff.cook.quality || 60) : 0;
  var hkQuality     = hasHousekeeper ? (staff.housekeeper.quality || 60) : 0;

  queuePopup(
    'Entertaining'
      + '\nMorning calls received: ' + (e.morningCalls.received||0)
      + '\nDinner parties hosted: '  + (e.dinnerParties.hosted||0)
      + '\nBalls hosted: '           + (e.balls.hosted||0)
      + (!hasCook ? '\n\nNote: no cook engaged — entertaining will suffer.' : ''),
    null,
    [
      {
        text: 'Receive morning callers',
        fn() {
          e.morningCalls.received = (e.morningCalls.received||0) + 1;
          // Housekeeper quality affects how smoothly it runs
          var rep = rand(2,5) + (hasHousekeeper ? Math.floor(hkQuality/25) : 0);
          changeStat('reputation', rep);
          addFeedEntry('You receive morning callers.', 'good');
          var outcome = hasHousekeeper
            ? 'The drawing room is well-ordered. Refreshments are perfectly judged. Several connections are made.'
            : 'The morning calls go pleasantly enough, though the tea was not quite right and you cannot work out why.';
          queuePopup(outcome, 'Reputation +' + rep);
          renderStats(); saveGame(); return null;
        },
      },
      {
        text: 'Host a dinner party'
          + (hasCook ? ' (\u00a330)' : ' \u2014 no cook hired'),
        fn() {
          if (!hasCook) {
            queuePopup(
              'You cannot host a proper dinner without a cook. The attempt would be a social disaster.',
              null,
              [
                { text: 'Hire a cook first', fn() { renderHouseholdStaffView(); return null; } },
                { text: 'Cancel', fn() { openEntertainingView(); return null; } },
              ]
            );
            return null;
          }
          if (G.wealth < 30) { queuePopup('You cannot presently afford to entertain at dinner.'); return null; }
          G.wealth -= 30;
          e.dinnerParties.hosted = (e.dinnerParties.hosted||0) + 1;
          // Outcome depends on cook + housekeeper quality
          var combined = (cookQuality + (hasHousekeeper ? hkQuality : 30)) / 2;
          var rep, outcome;
          if (combined >= 75) {
            rep = rand(8, 14);
            outcome = 'The dinner is a triumph. The food is excellent, the table immaculate, the conversation brilliant. '
              + (staff.cook.name||'Your cook') + ' has excelled herself.';
          } else if (combined >= 50) {
            rep = rand(4, 8);
            outcome = 'A pleasant dinner. Nothing remarkable, but nothing amiss. Your guests leave satisfied.';
          } else {
            rep = rand(1, 4);
            changeStat('reputation', -rand(2, 5)); // bad cooking overshadows the rep gain
            outcome = 'The dinner is not a success. The food is disappointing and the household somewhat disordered. '
              + 'You smile through it but the evening is noted.';
          }
          changeStat('reputation', rep);
          addFeedEntry('You host a dinner party.', 'event');
          queuePopup(outcome, 'Reputation +' + rep);
          renderStats(); saveGame(); return null;
        },
      },
      {
        text: 'Host a card evening (\u00a310)',
        fn() {
          if (G.wealth < 10) { queuePopup('You cannot presently afford an evening party.'); return null; }
          G.wealth -= 10;
          e.cardEvenings = (e.cardEvenings||0) + 1;
          var rep = rand(2,5) + (hasButler ? 2 : 0);
          changeStat('reputation', rep);
          addFeedEntry('You host an evening of cards.', 'good');
          var outcome = hasButler
            ? 'An elegant evening. ' + (staff.butler.name||'Your butler') + ' manages the room with perfect composure.'
            : 'A pleasant evening of whist and loo. Nobody loses more than they can afford. Mostly.';
          queuePopup(outcome, 'Reputation +' + rep);
          renderStats(); saveGame(); return null;
        },
      },
      { text: '\u2190 Household', fn() { if(typeof switchView==='function'){switchView('household');renderCatView('household');} return null; } },
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


// ═══════════════════════════════════════════════════════════
// LIFE TAB — renderLifeView
// The Life tab is a proper scrollable view (not cat-view)
// when household is active; otherwise falls through to
// renderCatView('life') for the standard action list.
// ═══════════════════════════════════════════════════════════

function renderLifeView() {
  // If married female with household — show household view inline
  // Otherwise fall back to the category action list
  var el = document.getElementById('view-life');
  if (!el) { renderCatView('life'); return; }
  renderCatView('life');
}

// ═══════════════════════════════════════════════════════════
// HOUSEHOLD STAFF VIEW — proper scrollable page
// ═══════════════════════════════════════════════════════════

function renderHouseholdStaffView() {
  if (!G.household) { if(typeof switchView==='function'){switchView('household');renderCatView('household');} return; }

  var h     = G.household;
  var wages = typeof recalcStaffWages === 'function' ? recalcStaffWages() : 0;
  var bal   = h.accounts.balance || 0;
  var allow = h.accounts.seasonlyAllowance || 0;

  var roleLabels = {
    housekeeper:"Housekeeper", cook:"Cook", ladysMaid:"Lady's Maid",
    butler:"Butler", nursemaid:"Nursemaid", wetNurse:"Wet Nurse",
    governess:"Governess", coachman:"Coachman", footmen:"Footmen",
  };

  var ALL_ROLES = ['housekeeper','cook','ladysMaid','butler','nursemaid',
                   'wetNurse','governess','coachman','footmen'];

  var balStr = (bal >= 0 ? '' : '-') + '\u00a3' + Math.abs(bal);
  var header = 'Household Staff'
    + '\nAllowance: \u00a3' + allow + '/season'
    + '  \u00b7  Wages: \u00a3' + wages + '/season'
    + '  \u00b7  Balance: ' + balStr;

  var choices = [];

  // ── Currently hired ──
  var hiredAny = false;
  ALL_ROLES.forEach(function(r) {
    var isHired = r === 'footmen'
      ? h.staff.footmen.count > 0
      : h.staff[r] && h.staff[r].hired;
    if (!isHired) return;
    hiredAny = true;
    var label, hint;
    if (r === 'footmen') {
      var cnt = h.staff.footmen.count;
      var fw  = h.staff.footmen.wage || 0;
      label = 'Footmen (' + cnt + ')';
      hint  = '\u00a3' + (fw * cnt) + '/yr';
    } else {
      var st    = h.staff[r];
      var happy = st.happiness >= 70 ? 'Content' : st.happiness >= 40 ? 'Neutral' : 'Unhappy';
      label = st.name + ' \u2014 ' + roleLabels[r];
      hint  = '\u00a3' + st.wage + '/yr \u00b7 ' + happy;
    }
    choices.push({
      text: label + '  ' + hint,
      fn: (function(role) { return function() { openStaffProfile(role); return null; }; })(r),
    });
  });

  if (!hiredAny) choices.push({ text: 'No staff hired yet', fn() { return null; } });

  // ── Hire new staff ── (all roles available, no tier gating)
  choices.push({ text: '\u2500\u2500 Hire staff \u2500\u2500', fn() { return null; } });
  ALL_ROLES.forEach(function(r) {
    var alreadyHired = r === 'footmen'
      ? false
      : h.staff[r] && h.staff[r].hired;
    if (alreadyHired) return;

    // Get flat wage
    var wage = 0;
    if (r === 'footmen') {
      wage = typeof FOOTMAN_WAGE !== 'undefined' ? FOOTMAN_WAGE : 12;
    } else {
      wage = typeof STAFF_WAGES !== 'undefined' ? (STAFF_WAGES[r] || 0) : 0;
    }
    var canAfford = bal >= wage;

    choices.push({
      text: '+ ' + roleLabels[r] + ' \u2014 \u00a3' + wage + '/yr'
        + (canAfford ? '' : '  (budget short \u2014 top up accounts first)'),
      fn: (function(role, affordable) {
        return function() {
          if (!affordable) {
            queuePopup(
              'Your household budget does not cover this wage.\nGo to Account Book to add personal funds.',
              null,
              [
                { text: 'Go to Account Book', fn() { openAccountBook(); return null; } },
                { text: 'Cancel', fn() { renderHouseholdStaffView(); return null; } },
              ]
            );
            return null;
          }
          doHireStaff(role);
          return null;
        };
      })(r, canAfford),
    });
  });

  choices.push({ text: '\u2190 Household', fn() { if(typeof switchView==='function'){switchView('household');renderCatView('household');} return null; } });

  queuePopup(header, null, choices);
}


function happinessBar(happiness) {
  var pct   = Math.min(100, Math.max(0, happiness || 0));
  var color = pct >= 70 ? '#2d5016' : pct >= 40 ? '#b8860b' : '#8b2020';
  var label = pct >= 70 ? 'Content' : pct >= 40 ? 'Neutral' : 'Unhappy';
  return '<div class="people-rel-wrap">'
    + '<div class="people-rel-track"><div class="people-rel-fill" style="width:' + pct + '%;background:' + color + '"></div></div>'
    + '<span class="people-rel-label">' + label + '</span>'
    + '</div>';
}

// Bind staff view clicks after render
function bindStaffViewClicks(el) {
  if (!el) return;
  el.querySelectorAll('.act-item[data-type="staff"]').forEach(function(item) {
    item.addEventListener('click', function() { openStaffProfile(item.dataset.id); });
  });
  el.querySelectorAll('.act-item[data-type="hire"]').forEach(function(item) {
    item.addEventListener('click', function() { doHireStaff(item.dataset.id); });
  });
}

// ── CAREER DETAIL ─────────────────────────────────────────

function openCareerDetail(careerId) {
  if (typeof CAREER_DEFINITIONS === 'undefined') return;
  var career = CAREER_DEFINITIONS[careerId];
  if (!career) return;

  var hasRef = G.careers && G.careers.references && G.careers.references.length > 0;
  var isActive = G.careers && G.careers.active === careerId;

  queuePopup(
    career.name + '\n\n' + career.desc + '\n\n' + career.flavour,
    null,
    [
      ...(isActive ? [{ text: '✓ Currently working', fn() { return {}; } }] : [{
        text: 'Take up this career',
        fn() {
          if (!G.careers) G.careers = { unlocked:[], active:null, history:[] };
          G.careers.active = careerId;
          G.income += career.incomeBonus || 0;
          if (career.repEffect) changeStat('reputation', career.repEffect);
          addFeedEntry('You begin work as a ' + career.name + '.', 'event');
          queuePopup(career.flavour, career.incomeBonus ? '+£' + career.incomeBonus + '/season' : null);
          renderStats(); saveGame(); return null;
        },
      }]),
      ...(G.careers && G.careers.active === careerId ? [{
        text: 'Give it up',
        fn() {
          G.income = Math.max(0, G.income - (career.incomeBonus || 0));
          G.careers.history.push({ id: careerId, ended: G.age });
          G.careers.active = null;
          addFeedEntry('You leave your position as ' + career.name + '.', 'event');
          renderStats(); saveGame(); return null;
        },
      }] : []),
      { text: '← Life', fn() { switchView('life'); renderCatView('life'); return null; } },
    ]
  );
}

// Opens the asset buy/browse popup from Household tab
function openAssetsViewPopup() {
  var choices = [];
  if (G.assets && G.assets.length) {
    G.assets.forEach(function(a) {
      choices.push({ text: a.name + ' — £' + (a.currentValue||0).toLocaleString(),
        fn() { if(typeof openAssetProfile==='function') openAssetProfile(a); return null; } });
    });
  }
  choices.push({ text: '+ Buy an estate',   fn() { if(typeof openBuyMenu==='function') openBuyMenu('estates');   return null; } });
  choices.push({ text: '+ Buy a carriage',  fn() { if(typeof openBuyMenu==='function') openBuyMenu('carriages'); return null; } });
  choices.push({ text: '+ Buy a horse',     fn() { if(typeof openBuyMenu==='function') openBuyMenu('horses');    return null; } });
  choices.push({ text: '+ Buy jewellery',   fn() { if(typeof openBuyMenu==='function') openBuyMenu('jewellery'); return null; } });
  choices.push({ text: '← Household',  fn() { switchView('household'); renderCatView('household'); return null; } });
  queuePopup(G.assets && G.assets.length ? 'Your Property & Assets' : 'You own no property yet.', null, choices);
}


// ═══════════════════════════════════════════════════════════
// COMING OF AGE — inheritance and settlements at 18 and 21
// ═══════════════════════════════════════════════════════════

function fireComingOfAgeEvent(age) {
  var bg   = G.fatherBg;
  var will = G.father ? G.father.will : (bg ? bg.will : null);

  if (age === 18) {
    // At 18: father (if alive) increases pin money; if dead, will may resolve
    if (G.father && G.father.alive) {
      // Father increases allowance
      var increase = Math.max(5, Math.floor((G.pinMoney || 10) * 0.5));
      G.pinMoney = (G.pinMoney || 10) + increase;
      addFeedEntry('Your father increases your allowance on your eighteenth birthday.', 'good');
      queuePopup(
        'You are eighteen. Your father sends a note with your birthday gift — a small increase to your quarterly allowance, and a few kind words about your prospects.'
          + '\n\nYour pin money is now \u00a3' + G.pinMoney + ' a season.',
        'Allowance increased'
      );
    } else if (G.father && !G.father.alive && will && will.type !== 'none' && !G.inheritanceReceived18) {
      // Father dead — partial inheritance at 18
      G.inheritanceReceived18 = true;
      var partialValue = Math.floor((will.value || 0) * 0.5);
      if (partialValue > 0) {
        G.wealth += partialValue;
        addFeedEntry('A portion of your father\'s estate reaches you.', 'event');
        queuePopup(
          'On your eighteenth birthday, the solicitor arrives. Your father\u2019s will provided for you. A portion of the estate is now yours.'
            + '\n\n\u00a3' + partialValue + ' is placed in your name.',
          '+\u00a3' + partialValue
        );
        renderStats(); saveGame();
      }
    }
  }

  if (age === 21) {
    // At 21: full inheritance resolution
    var inherited = false;

    if (will && will.type !== 'none') {
      var val = will.value || 0;
      // Subtract anything already given at 18
      if (G.inheritanceReceived18) val = Math.floor(val * 0.5);

      if (will.type === 'cash' || will.type === 'settlement') {
        G.wealth += val;
        addFeedEntry('Your inheritance is settled.', 'event');
        queuePopup(
          'You are twenty-one. The terms of your father\u2019s will are now fully settled.'
            + '\n\n' + will.desc
            + '\n\u00a3' + val + ' is now entirely your own.',
          '+\u00a3' + val
        );
        renderStats(); saveGame();
        inherited = true;

      } else if (will.type === 'investment') {
        // Add an investment
        if (!G.investments) G.investments = [];
        G.investments.push({
          id:       'inheritance_invest',
          name:     'Family Investment (Inheritance)',
          amount:   val,
          type:     'consols',
          return:   0.04,
          seasons:  0,
        });
        addFeedEntry('Your inheritance: a share of family investments.', 'event');
        queuePopup(
          'Your father\u2019s investments pass to you at twenty-one. '
            + will.desc
            + '\n\nA modest income will follow.',
          'Investment received'
        );
        saveGame();
        inherited = true;

      } else if (will.type === 'property') {
        // Rare — a small property
        if (typeof buyAsset === 'function') {
          var propEntry = {
            instanceId:   'inherited_' + Date.now(),
            id:           'cottage',
            name:         'Inherited Cottage',
            type:         'estate',
            price:        val,
            currentValue: val,
            baseIncome:   Math.floor(val * 0.05),
            upkeep:       Math.floor(val * 0.02),
            condition:    80,
            improvements: ['kitchen_garden', 'stable_yard'],
            improvements_done: [],
            rentedOut:    false,
          };
          if (!G.assets) G.assets = [];
          G.assets.push(propEntry);
        }
        addFeedEntry('A small property passes to you on your twenty-first birthday.', 'event');
        queuePopup(
          'A small property — a cottage, with a little land — passes to you at twenty-one. '
            + will.desc
            + '\n\nIt is not much. But it is yours.',
          'Property inherited'
        );
        saveGame();
        inherited = true;
      }
    }

    if (!inherited) {
      // Nothing to inherit — but still a moment
      addFeedEntry('You are twenty-one.', 'event');
      queuePopup(
        'You are twenty-one years old. By law, you are a woman of full age. In practice, very little changes. But something in you knows it.'
      );
    }

    // Rare bonus: distant relative legacy (5% chance)
    if (Math.random() < 0.05) {
      setTimeout(function() { fireDistantLegacy(); }, 800);
    }
  }
}

function fireDistantLegacy() {
  var names   = ['a great-aunt', 'a distant cousin', 'a godmother', 'an elderly neighbour'];
  var amounts = [50, 100, 150, 200, 300, 500];
  var types   = ['cash', 'jewellery', 'books'];
  var giver   = pick(names);
  var type    = pick(types);
  var amount  = pick(amounts);

  if (type === 'cash') {
    G.wealth += amount;
    addFeedEntry('A legacy from ' + giver + '.', 'event');
    queuePopup(
      'A letter from a solicitor. ' + giver.charAt(0).toUpperCase() + giver.slice(1) + ' — whom you barely knew — has left you \u00a3' + amount + '.'
        + '\n\nYou sit with the news for a moment. Then you write a grateful letter to no one in particular.',
      'Legacy: +\u00a3' + amount
    );
    renderStats(); saveGame();
  } else if (type === 'jewellery') {
    addFeedEntry('A legacy from ' + giver + ': a piece of jewellery.', 'event');
    queuePopup(
      giver.charAt(0).toUpperCase() + giver.slice(1) + ' has left you a piece of jewellery in her will. A brooch, a set of pearls — something worn on occasions that mattered to her.'
        + '\n\nYou will wear it carefully.',
      'Legacy received'
    );
  } else {
    addFeedEntry('A legacy from ' + giver + ': a small library.', 'event');
    changeStat('wit', rand(3,8));
    queuePopup(
      giver.charAt(0).toUpperCase() + giver.slice(1) + ' has left you her books. Thirty volumes, some of them extraordinary. You spend the next month reading.'
        + '\n\nSomething shifts in how you think.',
      'Wit +5'
    );
    renderStats(); saveGame();
  }
}


// ═══════════════════════════════════════════════════════════
// FUTURE TALK — father/guardian conversation at age 13
// Sets the inheritance type and gives the player a scene
// ═══════════════════════════════════════════════════════════

function fireFutureTalkConversation() {
  var father    = G.father;
  var bg        = G.fatherBg || {};
  var will      = father ? father.will : (bg.will || null);
  var guardianName = father && father.alive
    ? father.name
    : (G.guardian ? G.guardian.name : 'your guardian');
  var isFather  = father && father.alive;
  var relation  = isFather ? 'father' : 'guardian';
  var wealth    = father ? (father.wealth || bg.fatherWealth || 500) : 500;
  var trait     = father ? (father.trait || 'reserved') : 'reserved';
  var profession = bg.profession || 'landed_gentry';
  var willType  = will ? will.type : 'none';

  // Build the conversation opening based on wealth + will type
  var opening, scenario, inheritanceLabel;

  if (willType === 'property') {
    // Property inheritance — conditional or unconditional
    var conditional = Math.random() < 0.5;
    if (conditional) {
      opening = guardianName + ' sets down his book and looks at you over his spectacles.'
        + ' \u201cYou are thirteen,\u201d he says, as though this is a fact requiring verification.'
        + ' \u201cIt is time we spoke plainly about your future.\u201d';
      scenario = '\u201cYour grandfather has made provision. There is a property \u2014 a small one, perfectly respectable \u2014 to be yours upon the event of your marriage to a man of suitable standing. It is not entailed. It will be yours to keep.\u201d\n\nHe pauses. \u201cSuitable stock,\u201d he adds. \u201cYour grandfather was particular about that.\u201d';
      inheritanceLabel = 'Property on marriage';
      G.inheritanceCondition = 'marriage';
    } else {
      opening = guardianName + ' walks with you in the garden one afternoon and speaks more openly than usual.';
      scenario = '\u201cYour great-aunt has left you something rather remarkable,\u201d ' + relation + ' says. \u201cA small property, to be yours on your twenty-first birthday. No conditions. No entail. Yours, entirely.\u201d\n\nHe looks at you steadily. \u201cYou will have the rare privilege of independence. I hope you will use it wisely \u2014 but I suspect you will use it well.\u201d';
      inheritanceLabel = 'Property at 21 \u2014 independent';
      G.inheritanceCondition = 'none';
    }

  } else if (willType === 'investment' || wealth > 3000) {
    opening = guardianName + ' asks you to sit with him after supper. He is formal about it, which means it is important.';
    scenario = '\u201cThere are investments set aside,\u201d he says. \u201cYour great-aunt \u2014 God rest her \u2014 was a woman of unusual foresight. What she has left you is not a fortune, but it is independence of a kind. Upon your twenty-first birthday, a share in the family\u2019s holdings will pass to you.\u201d\n\nHe adds, more quietly: \u201cA woman with her own income is less at the mercy of circumstance. Your aunt knew that.\u201d';
    inheritanceLabel = 'Investment at 21';
    G.inheritanceCondition = 'none';

  } else if (willType === 'settlement' || wealth > 1500) {
    opening = guardianName + ' calls you to his study. It smells of leather and old paper. He gestures to the chair across from him.';
    if (profession === 'clergyman') {
      scenario = '\u201cI will be direct,\u201d he says. \u201cA clergyman\u2019s income does not extend to great settlements. But there is a modest sum \u2014 set aside properly, legally, yours for a marriage settlement. Enough to make you respectable. To attract a man of good character, which is worth more than rank.\u201d\n\nHe folds his hands. \u201cWork hard. Be good. That, at least, is within your power.\u201d';
    } else {
      scenario = '\u201cYou should know your situation,\u201d ' + relation + ' says. \u201cA settlement has been arranged \u2014 not lavish, but sound. Upon a suitable marriage, you will bring something to the arrangement. A man worth having will value that.\u201d\n\nHe pauses. \u201cA man not worth having will value only the money. Learn to tell the difference.\u201d';
    }
    inheritanceLabel = 'Marriage settlement';
    G.inheritanceCondition = 'marriage';

  } else {
    // Very little to leave
    opening = guardianName + ' finds you reading one evening and sits beside you \u2014 unusual enough that you put the book down.';
    scenario = '\u201cI want to speak plainly,\u201d ' + relation + ' says. \u201cThere is very little I can settle on you. The estate is entailed. What money there is goes to your brothers. I am sorry for it \u2014 it is unjust, and I know it.\u201d\n\nA pause. \u201cYou are clever and you are good. A suitable husband is your surest path. I do not say this to diminish you. I say it because I want you prepared.\u201d';
    inheritanceLabel = 'Modest sum';
    G.inheritanceCondition = 'none';
  }

  // Trait-based flavour for the opening
  var closingFlavour = {
    kind:      ' He squeezes your hand briefly before you leave.',
    gentle:    ' He looks, briefly, as though he wants to say something more tender. He does not.',
    reserved:  ' He nods once, as though something has been settled, and returns to his papers.',
    proud:     ' He straightens in his chair. The interview is over.',
    witty:     ' \u201cAnd if you could manage to be a little less obvious about being the cleverest person in the room,\u201d he adds, \u201cthat would help considerably.\u201d',
    ambitious: ' \u201cAim high,\u201d he says simply. \u201cThere is nothing wrong with knowing what you want.\u201d',
    earnest:   ' He means every word of it. You can tell.',
    melancholy:' He is quiet for a long time afterward. So are you.',
    sardonic:  ' \u201cTry not to look quite so horrified,\u201d he says. \u201cIt could be worse.\u201d',
    charming:  ' He smiles at you with such genuine warmth that you almost forget you have just been told the terms of your life.',
    haughty:   ' He does not wait for your response. The conversation, evidently, is concluded.',
    lively:    ' He claps you on the shoulder. \u201cCome now. It is not so bad. You are excellent company and that counts for more than you think.\u201d',
  };
  var flavour = closingFlavour[trait] || closingFlavour.reserved;

  addFeedEntry('Your ' + relation + ' speaks to you about your future.', 'event');

  queuePopup(
    opening + '\n\n' + scenario + flavour,
    inheritanceLabel,
    [
      {
        text: 'Listen carefully and ask a question',
        fn() {
          var closeBonus = rand(5, 12);
          if (father) father.closeness = Math.min(100, (father.closeness||50) + closeBonus);
          changeStat('wit', rand(2, 4));
          queuePopup(
            relation.charAt(0).toUpperCase() + relation.slice(1) + ' looks pleased \u2014 or at least, less guarded than usual. The question is a good one. He answers honestly.',
            'Closeness +' + closeBonus
          );
          renderStats(); saveGame(); return null;
        },
      },
      {
        text: 'Accept what you are told quietly',
        fn() {
          if (father) father.approval = Math.min(100, (father.approval||55) + rand(3, 8));
          queuePopup(
            'You nod. You understand more than you let on. ' + relation.charAt(0).toUpperCase() + relation.slice(1) + ' looks satisfied.',
            'Approval +5'
          );
          saveGame(); return null;
        },
      },
      {
        text: 'Say what you actually think about it',
        fn() {
          var repBonus = rand(2, 5);
          changeStat('wit', repBonus);
          // Father reaction depends on trait
          var opinionReaction = ['kind','earnest','lively','witty'].includes(trait)
            ? relation.charAt(0).toUpperCase() + relation.slice(1) + ' listens. Then, unexpectedly, he laughs. \u201cYou are right,\u201d he says. \u201cIt is not fair. But I am glad you said so.\u201d'
            : relation.charAt(0).toUpperCase() + relation.slice(1) + ' is quiet for a moment. \u201cPerhaps,\u201d he says at last. \u201cBut the world is as it is, not as it ought to be.\u201d';
          queuePopup(opinionReaction, 'Wit +' + repBonus);
          renderStats(); saveGame(); return null;
        },
      },
    ]
  );
}


// ── DEV: Household Tools ────────────────────────────────────

function devHouseholdTools() {
  if (!G.isMarried) {
    queuePopup('Household tools require marriage. Use Fast-Track Marriage first.', null,
      [{ text: '\u2190 Dev Panel', fn() { openDevPanel(); return null; } }]);
    return;
  }
  if (!G.household && typeof initHousehold === 'function') initHousehold();
  var h = G.household;
  var bal = h ? h.accounts.balance : 0;
  var tier = h ? h.tier : 'none';
  queuePopup(
    'Household Tools\nTier: ' + tier + '  Balance: \u00a3' + bal,
    null,
    [
      { text: 'Add \u00a3500 to household budget', fn() {
        if (!h) return null;
        h.accounts.balance = (h.accounts.balance||0) + 500;
        addAccountEntry('dev', '[DEV] Budget added', 500);
        queuePopup('Household balance +\u00a3500.'); saveGame(); return null;
      }},
      { text: 'Set tier: humble',       fn() { if(h){h.tier='humble';    saveGame();} queuePopup('Tier set: humble.');      return null; } },
      { text: 'Set tier: comfortable',  fn() { if(h){h.tier='comfortable';saveGame();} queuePopup('Tier set: comfortable.'); return null; } },
      { text: 'Set tier: grand',        fn() { if(h){h.tier='grand';     saveGame();} queuePopup('Tier set: grand.');       return null; } },
      { text: 'Hire all staff (dev)',   fn() {
        if (!h) return null;
        var roles = ['housekeeper','cook','ladysMaid','butler','nursemaid','wetNurse','governess','coachman'];
        roles.forEach(function(r) {
          if (!h.staff[r].hired) {
            h.staff[r] = { hired:true, name:'[Dev] ' + r, quality:80, wage:0, happiness:90 };
          }
        });
        h.staff.footmen.count = 2; h.staff.footmen.wage = 0;
        if(typeof recalcHouseholdStats==='function') recalcHouseholdStats();
        addFeedEntry('[DEV] All staff hired.', 'event');
        saveGame(); queuePopup('All staff hired at no cost.'); return null;
      }},
      { text: 'Reset household',        fn() {
        G.household = null;
        if(typeof initHousehold==='function') initHousehold();
        saveGame(); queuePopup('Household reset and reinitialised.'); return null;
      }},
      { text: '\u2190 Dev Panel', fn() { openDevPanel(); return null; } },
    ]
  );
}

// ── DEV: Inheritance Tools ──────────────────────────────────

function devInheritanceTools() {
  queuePopup(
    'Inheritance & Future Talk Tools',
    null,
    [
      { text: 'Fire future talk now', fn() {
        G.futureTalkDone = false;
        if(typeof fireFutureTalkConversation==='function') fireFutureTalkConversation();
        return null;
      }},
      { text: 'Fire age-18 inheritance', fn() {
        if(typeof fireComingOfAgeEvent==='function') fireComingOfAgeEvent(18);
        return null;
      }},
      { text: 'Fire age-21 inheritance', fn() {
        if(typeof fireComingOfAgeEvent==='function') fireComingOfAgeEvent(21);
        return null;
      }},
      { text: 'Fire distant legacy', fn() {
        if(typeof fireDistantLegacy==='function') fireDistantLegacy();
        return null;
      }},
      { text: 'Set will: cash \u00a3500', fn() {
        var w = {type:'cash', value:500, desc:'\u00a3500 set aside for your future.'};
        if(G.father) G.father.will = w;
        if(G.fatherBg) G.fatherBg.will = w;
        saveGame(); queuePopup('Will set to: cash \u00a3500.'); return null;
      }},
      { text: 'Set will: property', fn() {
        var w = {type:'property', value:800, desc:'A small cottage, to be yours.'};
        if(G.father) G.father.will = w;
        if(G.fatherBg) G.fatherBg.will = w;
        saveGame(); queuePopup('Will set to: property.'); return null;
      }},
      { text: 'Set will: investment', fn() {
        var w = {type:'investment', value:600, desc:'A share of the family investments.'};
        if(G.father) G.father.will = w;
        if(G.fatherBg) G.fatherBg.will = w;
        saveGame(); queuePopup('Will set to: investment.'); return null;
      }},
      { text: 'Show father background', fn() {
        var bg = G.fatherBg;
        var info = bg
          ? 'Profession: ' + bg.profLabel
            + '\nWealth: \u00a3' + bg.fatherWealth
            + '\nTitle rank: ' + bg.titleRank
            + '\nPin money: \u00a3' + bg.pinMoney + '/season'
            + '\nWill: ' + (bg.will ? bg.will.type + ' \u00a3' + bg.will.value : 'none')
          : 'No fatherBg on G.';
        queuePopup(info); return null;
      }},
      { text: '\u2190 Dev Panel', fn() { openDevPanel(); return null; } },
    ]
  );
}

// ── DEV: Schooling Tools ────────────────────────────────────

function devSchoolingTools() {
  queuePopup(
    'Schooling & Education Tools\nSchooling: ' + (G.schooling ? G.schooling.type : 'none'),
    null,
    [
      { text: 'Max all edu stats',  fn() {
        if (!G.eduStats) { if(typeof initEducation==='function') initEducation(); }
        if (G.eduStats) {
          ['literacy','reason','faith','decorum'].forEach(function(grp) {
            Object.keys(G.eduStats[grp]).forEach(function(sub) {
              if (sub !== 'total') G.eduStats[grp][sub] = 85;
            });
            if(typeof recalcEduTotals==='function') recalcEduTotals();
          });
        }
        renderStats(); saveGame(); queuePopup('All education stats set to 85.'); return null;
      }},
      { text: 'Introduce all schoolmates', fn() {
        if (!G.schoolmates || !G.schoolmates.length) {
          if(typeof generateSchoolmateCohort==='function') generateSchoolmateCohort('boarding');
        }
        (G.schoolmates||[]).forEach(function(s) {
          s.introduced = true;
          if (s.closeness < 20) s.closeness = rand(20,45);
          s.status = s.status === 'unknown' ? 'acquaintance' : s.status;
        });
        saveGame(); queuePopup('All schoolmates introduced.'); return null;
      }},
      { text: 'Fire schooling popup', fn() {
        G.schoolingOffered = false;
        G.age = 4;
        queuePopup(G.name + ' is four years old. It is time to think about her education.', null, [
          { text: 'Choose schooling', fn() { if(typeof openSchoolingChoice==='function') openSchoolingChoice(); return null; }},
          { text: 'Later', fn() { return {}; } },
        ]);
        return null;
      }},
      { text: 'Trigger talent discovery', fn() {
        if(typeof checkTalentDiscovery==='function') checkTalentDiscovery('decorum','music');
        return null;
      }},
      { text: '\u2190 Dev Panel', fn() { openDevPanel(); return null; } },
    ]
  );
}

// ── DEV: Asset Tools ────────────────────────────────────────

function devAssetTools() {
  var assetCount = (G.assets||[]).length;
  var investCount = (G.investments||[]).length;
  queuePopup(
    'Assets & Property Tools\n' + assetCount + ' asset(s)  ' + investCount + ' investment(s)',
    null,
    [
      { text: 'Add grand estate (free)', fn() {
        if (!G.assets) G.assets = [];
        G.assets.push({
          instanceId: 'dev_estate_' + Date.now(),
          id: 'grand_estate', name: 'Dev Grand Estate', type: 'estate',
          price: 20000, currentValue: 20000, baseIncome: 1200,
          upkeep: 400, condition: 100, improvements: ['home_farm','tenant_cottages','walled_garden','stables','pleasure_grounds','folly'],
          improvements_done: [], rentedOut: false,
        });
        if(typeof refreshHouseholdTier==='function') refreshHouseholdTier();
        saveGame(); queuePopup('Grand estate added.'); return null;
      }},
      { text: 'Add cottage (free)', fn() {
        if (!G.assets) G.assets = [];
        G.assets.push({
          instanceId: 'dev_cottage_' + Date.now(),
          id: 'cottage', name: 'Dev Cottage', type: 'estate',
          price: 800, currentValue: 800, baseIncome: 40,
          upkeep: 15, condition: 100, improvements: ['kitchen_garden','stable_yard'],
          improvements_done: [], rentedOut: false,
        });
        saveGame(); queuePopup('Cottage added.'); return null;
      }},
      { text: 'Add investment (Consols \u00a3500)', fn() {
        if (!G.investments) G.investments = [];
        G.investments.push({ id:'dev_consols', name:'Dev Consols', amount:500, type:'consols', return:0.04, seasons:0 });
        saveGame(); queuePopup('Investment added.'); return null;
      }},
      { text: 'Clear all assets',  fn() {
        G.assets = []; saveGame(); queuePopup('All assets cleared.'); return null;
      }},
      { text: '\u2190 Dev Panel', fn() { openDevPanel(); return null; } },
    ]
  );
}


// ═══════════════════════════════════════════════════════════
// COUNTRY LIFE — popup functions
// ═══════════════════════════════════════════════════════════

function openVisitTenants() {
  var estate = G.assets && G.assets.find(function(a){ return a.type === 'estate'; });
  if (!estate) { queuePopup('You must own an estate before you can visit tenants.'); return; }

  var hasHousekeeper = G.household && G.household.staff && G.household.staff.housekeeper && G.household.staff.housekeeper.hired;

  queuePopup(
    'Visiting Tenants\n' + estate.name + '\n\nYour tenants depend on the estate as much as the estate depends on them.',
    null,
    [
      {
        text: 'Make a full round of visits',
        fn() {
          // Good estate relations — income bonus, reputation, faith
          var rep = rand(3, 7); changeStat('reputation', rep);
          var faith = rand(2, 5); changeStat('faith', faith);
          if (estate.baseIncome) estate.baseIncome = Math.min(estate.baseIncome + 10, estate.baseIncome * 1.1);
          addFeedEntry('You visit all your tenants.', 'good');
          var msgs = [
            'A full day of visits. You hear about the Millers\' roof, the dispute over the south field, and who has had a baby and who has lost one. It is exhausting and necessary.',
            'You go round all the cottages. Some receive you with tea and warmth; others are more reserved. You leave knowing your estate rather better than when you arrived.',
            'The tenants receive you well. You listen more than you speak, which seems to be the right instinct. Several small problems come to light before they became large ones.',
          ];
          queuePopup(pick(msgs), 'Rep +' + rep + '\u00b7 Faith +' + faith);
          renderStats(); saveGame(); return null;
        },
      },
      {
        text: 'Inspect the farms and speak to the labourers',
        fn() {
          var witBonus = rand(2, 5); changeStat('wit', witBonus);
          changeStat('reputation', rand(1, 3));
          // If there's a home farm improvement, it generates a little more
          if (estate.improvements_done && estate.improvements_done.includes('home_farm')) {
            estate.baseIncome = (estate.baseIncome||0) + rand(5, 15);
            addFeedEntry('You inspect the home farm. The crops look well.', 'good');
            queuePopup('The home farm is in good order. The bailiff explains the rotation. You understand most of it and ask sensible questions about the rest.', 'Wit +' + witBonus + ' \u00b7 Farm income increased');
          } else {
            addFeedEntry('You inspect the estate farms.', 'good');
            queuePopup('You walk the fields with the bailiff. The land is working but there is room for improvement. You find yourself thinking about home farms.', 'Wit +' + witBonus);
          }
          renderStats(); saveGame(); return null;
        },
      },
      {
        text: 'Send the housekeeper in your stead',
        fn() {
          if (!hasHousekeeper) {
            queuePopup('You have no housekeeper to send. You will need to go yourself, or the tenants will notice the neglect.');
            return null;
          }
          changeStat('reputation', rand(1, 2));
          addFeedEntry(G.household.staff.housekeeper.name + ' visits the tenants on your behalf.', 'event');
          queuePopup(G.household.staff.housekeeper.name + ' makes the round efficiently. The visits are noted and appreciated, though it is not quite the same as going yourself.');
          saveGame(); return null;
        },
      },
      { text: '\u2190 Back', fn() { switchView('society'); renderCatView('society'); return null; } },
    ]
  );
}

function openHearGrievances() {
  queuePopup(
    'Hear Grievances\n\nPeople bring their troubles to the house. You can listen, judge, or refer on.',
    null,
    [
      {
        text: 'Hold an informal hearing',
        fn() {
          // Generate a random local dispute
          var disputes = [
            { text: 'A dispute between two farming families about a shared water source. Both are convinced they are right. One of them is.', type: 'practical' },
            { text: 'A widow asks for a reduction in her rent. Her husband died in the spring. The farm is struggling.', type: 'compassion' },
            { text: 'A young man from the village was dismissed from a nearby house and wants a character reference. His former employer says he was dishonest. He says otherwise.', type: 'moral' },
            { text: 'Two neighbours have been in dispute about a hedge for eleven years. They want you to settle it. You suspect nobody can.', type: 'impossible' },
            { text: 'A family asks for help with their roof before winter. They cannot afford the repair.', type: 'practical' },
          ];
          var d = pick(disputes);
          var outcome = d.type === 'compassion' || d.type === 'practical' ? rand(2,5) : rand(1,3);
          queuePopup(
            d.text,
            null,
            [
              { text: 'Decide in their favour (costs goodwill elsewhere)', fn() {
                changeStat('faith', rand(2,5));
                changeStat('reputation', outcome);
                if (d.type === 'compassion') {
                  G.wealth -= Math.min(G.wealth, rand(5,15));
                }
                addFeedEntry('You hear a grievance and decide generously.', 'good');
                queuePopup('Your decision is received with gratitude. The word spreads that the house is a fair one.', 'Faith +3  Rep +' + outcome);
                renderStats(); saveGame(); return null;
              }},
              { text: 'Refer to the local magistrate', fn() {
                changeStat('wit', rand(1,3));
                addFeedEntry('You refer a case to the magistrate.', 'event');
                queuePopup('You listen carefully and refer the matter to the appropriate authority. Not the most satisfying resolution, but a sensible one.');
                saveGame(); return null;
              }},
              { text: 'Listen, then find a compromise', fn() {
                changeStat('reputation', rand(3,6));
                changeStat('wit', rand(2,4));
                addFeedEntry('You broker a local compromise.', 'good');
                queuePopup('Neither party gets everything they wanted, which probably means it is roughly fair. They accept it. So do you.', 'Rep +4  Wit +2');
                renderStats(); saveGame(); return null;
              }},
            ]
          );
          return null;
        },
      },
      {
        text: 'Leave your door open for callers this afternoon',
        fn() {
          changeStat('faith', rand(2,4));
          changeStat('reputation', rand(1,3));
          addFeedEntry('You receive callers from the village.', 'good');
          var msgs = [
            'Several people come. Most want to be heard more than helped. You listen well.',
            'The afternoon is busy. A dozen small matters, two genuine crises, and one very long story about a goat.',
            'You hear more than you expected to. The village is more complicated than it appears from the drawing room.',
          ];
          queuePopup(pick(msgs), 'Faith +3');
          renderStats(); saveGame(); return null;
        },
      },
      { text: '\u2190 Back', fn() { switchView('society'); renderCatView('society'); return null; } },
    ]
  );
}

function openSendBaskets() {
  if (G.wealth < 5) { queuePopup('You cannot afford to send provisions at present.'); return; }

  var options = [
    { text: 'Modest provisions (\u00a35) \u2014 bread, candles, coal', cost: 5,  faith: rand(3,6),  rep: rand(1,2) },
    { text: 'A generous hamper (\u00a315) \u2014 preserves, cloth, medicine', cost: 15, faith: rand(5,9),  rep: rand(2,4) },
    { text: 'Full winter provisions (\u00a330) \u2014 the whole village', cost: 30, faith: rand(8,14), rep: rand(4,7) },
  ];

  queuePopup(
    'Send Baskets\n\nProvisions to the village poor. A duty, a kindness, and noticed by all.',
    null,
    options
      .filter(function(o){ return G.wealth >= o.cost; })
      .map(function(o) {
        return {
          text: o.text,
          fn() {
            G.wealth -= o.cost;
            changeStat('faith', o.faith);
            changeStat('reputation', o.rep);
            var msgs = [
              'The baskets are received with quiet gratitude. You do not wait to be thanked.',
              'You send the baskets and think no more of it. The village thinks rather more of you.',
              'Several families receive provisions. The vicar mentions it in his sermon. You were not expecting that.',
              'The work is done before anyone else is awake. You prefer it that way.',
            ];
            addFeedEntry('You send provisions to the village.', 'good');
            queuePopup(pick(msgs), 'Faith +' + o.faith + '  Rep +' + o.rep + '  -\u00a3' + o.cost);
            renderStats(); saveGame(); return null;
          },
        };
      })
      .concat([{ text: '\u2190 Back', fn() { switchView('society'); renderCatView('society'); return null; } }])
  );
}

function openVisitNeighbours() {
  // Richer version of visit — targets known NPCs or generates a local call
  var localNPCs = (G.npcs||[]).filter(function(n) {
    return n.introduced && !n.isRival && n.metHow !== 'ball' && n.metHow !== 'mart';
  });
  var choices = [];

  if (localNPCs.length) {
    localNPCs.slice(0,5).forEach(function(npc) {
      choices.push({
        text: npc.fullName + ' \u2014 ' + (npc.closeness >= 60 ? 'Good friend' : npc.closeness >= 35 ? 'Neighbour' : 'Acquaintance'),
        fn() {
          var g = rand(5, 12); changeCloseness(npc, g);
          changeStat('reputation', rand(1, 3));
          var msgs = [
            'A pleasant call on ' + npc.nick + '. You stay two hours. The conversation is good and the cake is better.',
            npc.nick + ' is full of news. You leave better informed about everything in a five-mile radius.',
            'You and ' + npc.nick + ' walk in the garden. She tells you something that changes how you think about something else entirely.',
            npc.nick + ' receives you in the library this time. A new intimacy. You are pleased.',
          ];
          addFeedEntry('You call on ' + npc.nick + '.', 'good');
          queuePopup(pick(msgs), 'Closeness +' + g);
          renderStats(); saveGame(); return null;
        },
      });
    });
  }

  // General round of calls
  choices.push({
    text: 'Make a general round of morning calls',
    fn() {
      var rep = rand(2, 5); changeStat('reputation', rep);
      var msgs = [
        'A pleasant round of calls. Three houses, four cups of tea, more information than you strictly needed.',
        'You call on everyone within half a mile. The district is well and wishes to be heard on several points.',
        'Morning calls. The ritual is ancient and serves its purpose. You are seen, you are sociable, and you come home knowing everything.',
      ];
      addFeedEntry('You make a round of morning calls.', 'good');
      queuePopup(pick(msgs), 'Reputation +' + rep);
      renderStats(); saveGame(); return null;
    },
  });

  choices.push({ text: '\u2190 Back', fn() { switchView('society'); renderCatView('society'); return null; } });

  queuePopup(
    'Visit Neighbours\nWho shall you call upon?',
    null,
    choices
  );
}


// ═══════════════════════════════════════════════════════════
// VILLAGE FETE — multi-stage experience
// ═══════════════════════════════════════════════════════════

function openVillageFete() {
  addFeedEntry('You attend the village fete.', 'event');

  // Stage 1: Vicar approaches for a contribution
  var hasWealth = G.wealth >= 10;
  queuePopup(
    'The Village Fete\n\nThe green is full. There are stalls, a fiddle player, and the smell of pies. The vicar spots you immediately and makes his way over with purpose.',
    null,
    [
      {
        text: 'Give generously (\u00a310)',
        fn() {
          if (!hasWealth) { queuePopup('You cannot afford it. The vicar accepts your apologies graciously.'); openFeteStalls(); return null; }
          G.wealth -= 10;
          changeStat('faith', rand(3,6));
          changeStat('reputation', rand(4,7));
          addFeedEntry('You contribute to the fete fund.', 'good');
          queuePopup(
            'The vicar is visibly delighted. He announces your contribution. Several people look impressed. Your mother would be pleased.',
            'Faith +4  Rep +5',
            null,
            function() { openFeteStalls(); }
          );
          renderStats(); saveGame(); return null;
        },
      },
      {
        text: 'Give a modest amount (\u00a32)',
        fn() {
          G.wealth -= Math.min(G.wealth, 2);
          changeStat('faith', rand(1,3));
          changeStat('reputation', rand(1,3));
          queuePopup(
            'The vicar thanks you warmly. It is not a large sum, but it is given cheerfully.',
            'Faith +2  Rep +2',
            null,
            function() { openFeteStalls(); }
          );
          renderStats(); saveGame(); return null;
        },
      },
      {
        text: 'Decline politely',
        fn() {
          changeStat('reputation', -rand(1,3));
          queuePopup(
            'The vicar nods with the particular expression of a man who has been declined before and bears no grudge about it. Several people nearby witnessed it.',
            'Rep -2',
            null,
            function() { openFeteStalls(); }
          );
          renderStats(); saveGame(); return null;
        },
      },
      {
        text: 'Offer to organise a stall yourself',
        fn() {
          changeStat('reputation', rand(5,10));
          changeStat('health', -rand(2,4));
          queuePopup(
            'Magnificent. You spend the next three hours behind a jam stall. You sell everything. You are exhausted. You have never been more popular.',
            'Rep +8  Health -3',
            null,
            function() { openFeteStalls(); }
          );
          renderStats(); saveGame(); return null;
        },
      },
    ]
  );
}

function openFeteStalls() {
  // Stage 2: Choose what to do at the fete
  var stallsVisited = G._feteStalls || 0;
  G._feteStalls = (stallsVisited + 1);

  if (stallsVisited >= 3) {
    // Enough stalls — wrap up
    G._feteStalls = 0;
    changeStat('health', rand(3,6));
    queuePopup(
      'You have made a thorough circuit of the fete. Your feet ache pleasantly and you are very full of pie. A fine afternoon.',
      'Health +4'
    );
    renderStats(); saveGame(); return;
  }

  var choices = [
    {
      text: 'Browse the produce stalls',
      fn() {
        var msgs = [
          'You spend twenty minutes debating the merits of two almost identical jams. You buy both.',
          'The vegetable competition is fiercely contested. You congratulate the winner on her parsnips with genuine sincerity.',
          'You try the honey cake. It is extraordinary. You ask for the recipe. The baker smiles inscrutably and does not give it.',
          'A small child is selling posies. You buy three.',
        ];
        changeStat('health', rand(2,4));
        addFeedEntry('You browse the produce stalls.', 'good');
        queuePopup(pick(msgs), 'Health +3', null, function() { openFeteStalls(); });
        renderStats(); saveGame(); return null;
      },
    },
    {
      text: 'Watch the games and competitions',
      fn() {
        var roll = rand(1,10);
        if (roll >= 7) {
          changeStat('wit', rand(2,4));
          changeStat('reputation', rand(1,3));
          queuePopup(
            'You are persuaded to enter the skittles competition. Against all expectation, you win. The village is delighted. You are astonished.',
            'Wit +3  Rep +2', null, function() { openFeteStalls(); }
          );
        } else {
          changeStat('health', rand(2,4));
          queuePopup(
            pick([
              'You watch the races with great enthusiasm. The children are very fast and entirely unpredictable.',
              'A tug of war ends badly for one side. Nobody is injured but several are muddy. You applaud everyone equally.',
              'The egg-and-spoon race is more dramatic than you expected. You find yourself genuinely invested in the outcome.',
            ]),
            'Health +3', null, function() { openFeteStalls(); }
          );
        }
        renderStats(); saveGame(); return null;
      },
    },
    {
      text: 'Speak with the village women',
      fn() {
        changeStat('reputation', rand(3,6));
        changeStat('faith', rand(1,3));
        var msgs = [
          'You make a point of speaking to women you do not usually see. Several have opinions on matters you had not considered. You leave knowing considerably more than when you arrived.',
          'A group of older women receive you with a warmth that surprises you. They remember your grandmother. You did not know you had this history here.',
          'You talk for an hour with three women from the far end of the parish. They are forthcoming in a way they would not be at a formal call. You are glad you came.',
        ];
        addFeedEntry('You speak with the village women at the fete.', 'good');
        queuePopup(pick(msgs), 'Rep +4', null, function() { openFeteStalls(); });
        renderStats(); saveGame(); return null;
      },
    },
    {
      text: 'Investigate a commotion near the beer tent',
      fn() { openFeteDrunk(); return null; },
    },
    {
      text: 'Leave while the afternoon is still fine',
      fn() {
        G._feteStalls = 0;
        changeStat('health', rand(2,4));
        queuePopup('You leave at the right moment — before the fiddle player attempts a third encore and before the beer tent becomes a problem.');
        renderStats(); saveGame(); return null;
      },
    },
  ];

  queuePopup(
    'The Fete\n' + (stallsVisited === 0 ? 'Where shall you go first?' : stallsVisited === 1 ? 'What next?' : 'One more turn?'),
    null, choices
  );
}

function openFeteDrunk() {
  // The village drunk — chaos option
  var drunkNames = ['Old Roper', 'William Vetch', 'Tom Cleary', 'Jack Potts'];
  var drunk = pick(drunkNames);
  queuePopup(
    drunk + ' has had considerably more ale than is wise and is now holding forth at volume on the subject of enclosures, his landlord, and the price of barley. A crowd has gathered. He spots you.',
    null,
    [
      {
        text: 'Speak to him calmly and redirect him',
        fn() {
          var roll = rand(1,10);
          if (roll >= 5) {
            changeStat('reputation', rand(3,6));
            changeStat('faith', rand(2,4));
            addFeedEntry('You defuse a scene at the fete.', 'good');
            queuePopup(
              'You speak to ' + drunk + ' quietly and firmly. He is surprised into civility. The crowd disperses with approval. The vicar mouths "thank you" across the green.',
              'Rep +4', null, function() { openFeteStalls(); }
            );
          } else {
            changeStat('reputation', -rand(2,4));
            queuePopup(
              drunk + ' is not in a mood to be redirected. He makes several remarks. You maintain your composure admirably but the scene is witnessed.',
              'Rep -3', null, function() { openFeteStalls(); }
            );
          }
          renderStats(); saveGame(); return null;
        },
      },
      {
        text: 'Send for the constable and walk away',
        fn() {
          changeStat('reputation', rand(1,3));
          addFeedEntry('You send for the constable at the fete.', 'event');
          queuePopup(
            'You catch the eye of the parish constable and incline your head toward ' + drunk + '. The matter is handled. You are seen to have handled it correctly.',
            'Rep +2', null, function() { openFeteStalls(); }
          );
          renderStats(); saveGame(); return null;
        },
      },
      {
        text: 'Stay and listen — he may have a point',
        fn() {
          changeStat('reputation', -rand(3,7));
          changeStat('wit', rand(3,6));
          G.scandals = (G.scandals||0) + 1;
          addFeedEntry('You stay to listen to the village drunk. This is noted.', 'bad');
          queuePopup(
            drunk + ' is, it turns out, not entirely wrong about enclosures. You find yourself engaged in a surprisingly cogent conversation about land rights, tenancy, and the price of grain. Everyone is watching. Your reputation suffers. Your education improves.',
            'Wit +4  Rep -5  Scandal', null, function() { openFeteStalls(); }
          );
          renderStats(); saveGame(); return null;
        },
      },
      {
        text: 'Pretend you did not see him and move away quickly',
        fn() {
          changeStat('health', rand(2,4));
          queuePopup(
            'You have not seen ' + drunk + '. You have not heard ' + drunk + '. You are very interested in these preserves over here.',
            null, null, function() { openFeteStalls(); }
          );
          saveGame(); return null;
        },
      },
    ]
  );
}


// ═══════════════════════════════════════════════════════════
// THE VILLAGE COMES TO YOU — replacing "hear grievances"
// Framed as a lady of the manor, not a magistrate
// ═══════════════════════════════════════════════════════════

// Pool of village issues — all framed as coming to a woman for help/intercession
var VILLAGE_ISSUES = [
  {
    title: 'A land dispute',
    setup: 'Farmer Briggs and Farmer Noll have been in dispute over the boundary of the south field for three years. They have come to you — not for a ruling, but hoping you might speak to the steward, or at least make each of them feel heard.',
    choices: [
      {
        text: 'Arrange a meeting with both and your steward',
        outcome() {
          changeStat('reputation', rand(4,8));
          changeStat('wit', rand(2,4));
          return { badge: 'Rep +6', text: 'You arrange a proper meeting. The steward draws a line. Both men grumble but accept it. The dispute is, if not resolved, at least contained. They tip their hats to you on the way out.' };
        },
      },
      {
        text: 'Suggest they share the disputed strip in alternate years',
        outcome() {
          var roll = rand(1,10);
          if (roll >= 5) {
            changeStat('reputation', rand(3,6));
            return { badge: 'Rep +4', text: 'Briggs thinks it over. Noll is less certain. After a week, word reaches you that they have agreed to try it for a season. A small miracle.' };
          } else {
            changeStat('reputation', -rand(2,4));
            return { badge: 'Rep -3', text: 'The suggestion pleases neither man. Briggs says it is not the point. Noll says the alternate-year arrangement would favour Briggs. They leave still arguing. You did your best.' };
          }
        },
      },
      {
        text: 'Suggest their children marry and settle it that way',
        outcome() {
          changeStat('reputation', -rand(5,10));
          changeStat('wit', rand(2,4));
          G.scandals = (G.scandals||0) + 1;
          return { badge: 'Rep -8  Scandal', text: 'Briggs stares at you. Noll stares at you. Both their children are under ten. You realise immediately that this was not your best idea. The story circulates.' };
        },
      },
    ],
  },
  {
    title: 'A character reference request',
    setup: 'Young Martha Cooper has been let go from a house in the next parish under a cloud. Her mother has come to you. Martha swears she did nothing wrong. The letter from the other house implies otherwise.',
    choices: [
      {
        text: 'Write Martha a reference on her character',
        outcome() {
          var roll = rand(1,10);
          if (roll >= 6) {
            changeStat('reputation', rand(2,5));
            changeStat('faith', rand(2,4));
            return { badge: 'Rep +3  Faith +3', text: 'You write the reference. Martha finds a new position within the month. She sends a short note of thanks. You were right to believe her.' };
          } else {
            changeStat('reputation', -rand(2,5));
            return { badge: 'Rep -3', text: 'You write the reference. Three weeks later, word reaches you that Martha was let go from the new position too. The other letter was, it appears, not entirely wrong.' };
          }
        },
      },
      {
        text: 'Speak to the house that dismissed her',
        outcome() {
          changeStat('wit', rand(2,5));
          changeStat('reputation', rand(1,3));
          return { badge: 'Wit +3  Rep +2', text: 'You write a careful enquiry. The reply is guarded but informative. The truth, as usual, sits somewhere between the two accounts. You form your own view.' };
        },
      },
      {
        text: 'Decline — it is not your affair',
        outcome() {
          changeStat('reputation', -rand(1,3));
          changeStat('faith', -rand(1,2));
          return { badge: 'Rep -2  Faith -1', text: 'Martha\'s mother accepts your refusal with quiet dignity. As she leaves you feel the particular unease of having done the technically correct thing.' };
        },
      },
    ],
  },
  {
    title: 'A widow and her rent',
    setup: 'Mrs Yate\'s husband died in the spring. She has come to ask whether anything can be done about her rent. She is not begging — she is asking. Her dignity is considerable. The rent is yours to influence, if not entirely to decide.',
    choices: [
      {
        text: 'Arrange a reduction for six months',
        outcome() {
          G.wealth = Math.max(0, (G.wealth||0) - rand(10,20));
          changeStat('faith', rand(4,8));
          changeStat('reputation', rand(3,6));
          return { badge: 'Faith +6  Rep +4', text: 'You speak to the steward. Mrs Yate\'s rent is reduced for the remainder of the year. She receives the news without quite crying, which costs her visible effort. You are glad you could do it.' };
        },
      },
      {
        text: 'Offer practical help instead — provisions, firewood',
        outcome() {
          G.wealth = Math.max(0, (G.wealth||0) - rand(5,10));
          changeStat('faith', rand(3,6));
          changeStat('reputation', rand(2,4));
          return { badge: 'Faith +4  Rep +3', text: 'You cannot alter the rent, but you can send provisions. You do. Mrs Yate sends a note. It is brief and says everything it needs to.' };
        },
      },
      {
        text: 'Explain that rent decisions are your husband\'s',
        outcome() {
          changeStat('faith', -rand(1,3));
          return { badge: 'Faith -2', text: 'It is true. It is also, in Mrs Yate\'s particular case, somewhat inadequate. She thanks you and leaves. You think about it for the rest of the week.' };
        },
      },
    ],
  },
  {
    title: 'A rumour about a village girl',
    setup: 'A rumour is circulating about young Eliza March. A woman you respect has come to you quietly, worried. The rumour may be true, or it may be malicious — it is impossible to know from here.',
    choices: [
      {
        text: 'Call on Eliza yourself and speak privately',
        outcome() {
          changeStat('faith', rand(3,6));
          var roll = rand(1,10);
          if (roll >= 5) {
            changeStat('reputation', rand(2,5));
            return { badge: 'Faith +4  Rep +3', text: 'You call on Eliza quietly. The situation is complicated. You listen for a long time and offer what help you can. The rumour does not spread further. You said nothing about it to anyone.' };
          } else {
            changeStat('reputation', -rand(1,3));
            return { badge: 'Faith +4  Rep -2', text: 'You call on Eliza. The situation is not as the rumour had it. She is embarrassed that you came. You leave having done something between helpful and intrusive. It is hard to tell which.' };
          }
        },
      },
      {
        text: 'Firmly discourage the woman from spreading it further',
        outcome() {
          changeStat('reputation', rand(2,5));
          changeStat('faith', rand(1,3));
          return { badge: 'Rep +3  Faith +2', text: 'You say plainly that you will not discuss this and ask the same of her. She agrees. Whether she keeps to it is another matter, but the conversation has weight. Rumours require air to survive.' };
        },
      },
      {
        text: 'Stay out of it entirely',
        outcome() {
          return { badge: '', text: 'You say you could not possibly comment. This is both wise and somewhat unsatisfying. The rumour runs its course as rumours do.' };
        },
      },
    ],
  },
  {
    title: 'The school roof',
    setup: 'The village dame school needs a new roof before winter. The schoolmistress has written. She is too proud to ask directly so she has described the problem in great detail and then not asked. You understand her.',
    choices: [
      {
        text: 'Contribute to the repairs yourself',
        outcome() {
          var cost = rand(15,40);
          if ((G.wealth||0) < cost) {
            return { badge: '', text: 'You want to help but the sum is beyond what you can presently manage. You write to the schoolmistress explaining this with more care than necessary.' };
          }
          G.wealth -= cost;
          changeStat('reputation', rand(4,8));
          changeStat('faith', rand(3,6));
          return { badge: 'Rep +5  Faith +4  -\u00a3' + cost, text: 'You arrange for the repairs. The schoolmistress writes a letter of such formal gratitude that it takes you three readings to find the warmth in it. It is there.' };
        },
      },
      {
        text: 'Organise a parish collection',
        outcome() {
          changeStat('reputation', rand(5,9));
          changeStat('wit', rand(2,4));
          return { badge: 'Rep +6  Wit +3', text: 'You write six letters and speak to four households and within a fortnight the money is raised. You did not give the most — but you made it happen. The vicar says you have a talent for this. You suspect he is right.' };
        },
      },
      {
        text: 'Ignore the very pointed non-request',
        outcome() {
          changeStat('faith', -rand(2,4));
          return { badge: 'Faith -3', text: 'The schoolmistress did not ask. You did not offer. The roof is patched badly in November and leaks through the winter. You know about it. So does the schoolmistress. Neither of you mentions it.' };
        },
      },
    ],
  },
];

function openVillageComes() {
  // Rename from hear grievances — pick a random issue
  var issue = pick(VILLAGE_ISSUES);
  addFeedEntry('Someone from the village comes to you.', 'event');

  queuePopup(
    issue.title + '\n\n' + issue.setup,
    null,
    issue.choices.map(function(c) {
      return {
        text: c.text,
        fn() {
          var result = c.outcome();
          addFeedEntry(issue.title + ': ' + c.text.toLowerCase() + '.', 'event');
          queuePopup(result.text, result.badge || null);
          renderStats(); saveGame(); return null;
        },
      };
    }).concat([
      { text: 'Not today', fn() { return {}; } },
    ])
  );
}


// ═══════════════════════════════════════════════════════════
// THE MODISTE — Fashion, gossip, and the pursuit of elegance
// ═══════════════════════════════════════════════════════════

// Player's wardrobe — list of purchased garments
// Each: { id, name, type, cost, fashionBonus, looksBonus, desc, season, owned:true }
var MODISTE_CATALOGUE = [
  // Day wear
  { id:'muslin_morning',  name:'White Muslin Morning Dress',   type:'day',     cost:8,   fashionBonus:4,  looksBonus:2,  desc:'Simple, fresh, entirely appropriate. The foundation of any wardrobe.' },
  { id:'walking_dress',   name:'Pale Blue Walking Dress',      type:'day',     cost:15,  fashionBonus:6,  looksBonus:3,  desc:'Good wool, good cut. A dress that says you take yourself seriously.' },
  { id:'half_dress',      name:'Silk Half-Dress in Rose',      type:'evening', cost:30,  fashionBonus:10, looksBonus:5,  desc:'For dinners and card evenings. Not a ball gown, but elegant.' },
  { id:'riding_habit',    name:'Dark Green Riding Habit',      type:'riding',  cost:25,  fashionBonus:7,  looksBonus:4,  desc:'Tailored. Authoritative. You look magnificent on a horse.' },
  // Evening
  { id:'white_ball_gown', name:'White Satin Ball Gown',        type:'ball',    cost:45,  fashionBonus:15, looksBonus:8,  desc:'The gown for a Season. Understated luxury. You will be noticed.' },
  { id:'gold_silk_gown',  name:'Gold Silk Evening Gown',       type:'ball',    cost:60,  fashionBonus:18, looksBonus:10, desc:'Daring. Expensive. Not for the faint of heart or thin of purse.' },
  { id:'court_dress',     name:'Court Presentation Dress',     type:'court',   cost:80,  fashionBonus:20, looksBonus:12, desc:'Required for court. Enormous, uncomfortable, and absolutely necessary.' },
  // Accessories
  { id:'spencer_jacket',  name:'Crimson Spencer Jacket',       type:'accessory',cost:12, fashionBonus:5,  looksBonus:2,  desc:'Over a white dress. The effect is striking.' },
  { id:'chip_bonnet',     name:'Chip Straw Bonnet',            type:'accessory',cost:6,  fashionBonus:3,  looksBonus:1,  desc:'Very fashionable this season. Becoming on almost everyone.' },
  { id:'cashmere_shawl',  name:'Cashmere Shawl',               type:'accessory',cost:20, fashionBonus:8,  looksBonus:3,  desc:'From India, or so they say. Drapes beautifully. Keeps you warm.' },
  { id:'long_gloves',     name:'Long White Evening Gloves',    type:'accessory',cost:5,  fashionBonus:4,  looksBonus:2,  desc:'Essential for evening. The finishing touch.' },
];

function openModiste() {
  var modisteName = G._modisteName;
  if (!modisteName) {
    var firstNames = ['Madame Leclerc','Madame Voss','Madame Fontaine','Miss Partridge','Mrs Elliot'];
    modisteName = pick(firstNames);
    G._modisteName = modisteName;
  }

  var owned = (G.wardrobe || []).map(function(w){ return w.id; });
  var unowned = MODISTE_CATALOGUE.filter(function(g){ return !owned.includes(g.id); });

  queuePopup(
    'The Modiste\n' + modisteName + '\n\nFashion: ' + (G.fashion||0) + '/100\nYour wealth: \u00a3' + (G.wealth||0).toLocaleString(),
    null,
    [
      { text: 'Browse the new collection',        fn() { openModisteBrowse(unowned);   return null; } },
      { text: 'Browse fashion plates',            fn() { openFashionPlates();          return null; } },
      { text: 'Gossip with ' + modisteName,       fn() { openModisteGossip();          return null; } },
      { text: 'Commission a bespoke gown',        fn() { openBespokeCommission();      return null; } },
      { text: 'Review your wardrobe',             fn() { openWardrobeView();           return null; } },
      { text: '\u2190 Activities', fn() { switchView('activities'); renderCatView('activities'); return null; } },
    ]
  );
}

function openModisteBrowse(unowned) {
  if (!unowned || !unowned.length) {
    queuePopup('You already own everything in the current collection. ' + (G._modisteName||'The modiste') + ' looks simultaneously impressed and disappointed.', null,
      [{ text: '\u2190 Modiste', fn() { openModiste(); return null; } }]);
    return;
  }

  // Show up to 5 unowned items
  var available = unowned.slice(0, 5);
  queuePopup(
    'New Collection\n\nWhat catches your eye?',
    null,
    available.map(function(item) {
      var canAfford = (G.wealth||0) >= item.cost;
      return {
        text: item.name + ' \u2014 \u00a3' + item.cost
          + (!canAfford ? ' (cannot afford)' : ''),
        fn() {
          openModisteItemDetail(item);
          return null;
        },
      };
    }).concat([
      { text: '\u2190 Modiste', fn() { openModiste(); return null; } },
    ])
  );
}

function openModisteItemDetail(item) {
  var canAfford = (G.wealth||0) >= item.cost;
  queuePopup(
    item.name + '\n\n' + item.desc + '\n\nCost: \u00a3' + item.cost
      + '\nFashion: +' + item.fashionBonus
      + '\nLooks: +' + item.looksBonus,
    null,
    [
      canAfford ? {
        text: 'Purchase (\u00a3' + item.cost + ')',
        fn() {
          G.wealth -= item.cost;
          if (!G.wardrobe) G.wardrobe = [];
          G.wardrobe.push({ id: item.id, name: item.name, type: item.type, purchasedSeason: G.season });
          G.fashion = Math.min(100, (G.fashion||0) + item.fashionBonus);
          changeStat('looks', item.looksBonus);
          addFeedEntry('You purchase a ' + item.name + '.', 'good');
          queuePopup(
            'The gown is wrapped in tissue and ribbons. You wear it home and feel immediately better about everything.',
            'Fashion +' + item.fashionBonus + '  Looks +' + item.looksBonus + '  -\u00a3' + item.cost,
            null,
            function() { openModiste(); }
          );
          renderStats(); saveGame(); return null;
        },
      } : { text: 'Cannot afford at present', fn() { openModiste(); return null; } },
      { text: 'Admire but resist',
        fn() {
          // Browsing still gives a small fashion awareness boost
          G.fashion = Math.min(100, (G.fashion||0) + 1);
          queuePopup('You study the gown carefully and commit every detail to memory. One day.', null, null, function(){ openModisteBrowse(MODISTE_CATALOGUE.filter(function(g){ return !(G.wardrobe||[]).find(function(w){return w.id===g.id;}); })); });
          return null;
        },
      },
      { text: '\u2190 Back', fn() { openModisteBrowse(MODISTE_CATALOGUE.filter(function(g){ return !(G.wardrobe||[]).find(function(w){return w.id===g.id;}); })); return null; } },
    ]
  );
}

function openFashionPlates() {
  // Browsing fashion plates — free fashion boost + wit
  var fashionGain = rand(3, 8);
  G.fashion = Math.min(100, (G.fashion||0) + fashionGain);
  changeStat('wit', rand(1, 3));

  var plateMsgs = [
    'The French plates are extraordinary this season. Waistlines have moved again. You study them for half an hour and emerge with several strong opinions.',
    'La Belle Assembl\u00e9e has arrived. You go through it three times. The evening dress on page twelve is going to be everywhere.',
    'You spend an agreeable hour with Ackermann\'s Repository. The fashions are daring. You take notes.',
    'The newest plates show sleeves of impossible construction. You cannot decide if they are ridiculous or sublime. Probably both.',
    'You study the plates with the focused attention usually reserved for scripture. The trim on the third plate will transform a plain gown entirely.',
  ];
  addFeedEntry('You browse the fashion plates.', 'good');
  queuePopup(pick(plateMsgs), 'Fashion +' + fashionGain, null, function(){ openModiste(); });
  renderStats(); saveGame();
}

function openModisteGossip() {
  var modisteName = G._modisteName || 'The modiste';

  // Modiste knows everything — generates Society gossip
  var gossipPool = [
    { text: modisteName + ' informs you, while measuring your waist, that Lady Featherington\'s ball gown last Tuesday was not, in fact, her own design. The real provenance is much more interesting.', rep: rand(2,5), fashion: rand(1,3) },
    { text: 'While she pins your hem, ' + modisteName + ' mentions that a certain young man has been ordering waistcoats at a remarkable rate. A sure sign, she says, of a man in love.', wit: rand(2,4), fashion: rand(1,2) },
    { text: modisteName + ' tells you, in strictest confidence, that three different ladies have ordered the same gown this Season. She appears to be savouring this information.', fashion: rand(2,5) },
    { text: 'You learn that the Duchess of — has her court mantua made here. ' + modisteName + ' shows you the pattern book. Briefly. Just long enough to see.', fashion: rand(3,6), rep: rand(1,3) },
    { text: 'The conversation turns to a recent scandal. ' + modisteName + ' has dressed everyone involved at various points and is diplomatically uninformative, which tells you a great deal.', wit: rand(3,6) },
    { text: modisteName + ' mentions that yellow is going to be very fashionable this Autumn. She has it from an unimpeachable source. You resolve to get ahead of it.', fashion: rand(4,8) },
  ];

  var gossip = pick(gossipPool);
  if (gossip.rep)    changeStat('reputation', gossip.rep);
  if (gossip.wit)    changeStat('wit', gossip.wit);
  if (gossip.fashion) G.fashion = Math.min(100, (G.fashion||0) + gossip.fashion);

  addFeedEntry('You gossip with ' + modisteName + '.', 'good');

  var badge = '';
  if (gossip.fashion) badge += 'Fashion +' + gossip.fashion + '  ';
  if (gossip.wit)     badge += 'Wit +'     + gossip.wit     + '  ';
  if (gossip.rep)     badge += 'Rep +'     + gossip.rep;

  queuePopup(gossip.text, badge.trim() || null, null, function(){ openModiste(); });
  renderStats(); saveGame();
}

function openBespokeCommission() {
  // Commission something specific — expensive, slow, but significant fashion boost
  if ((G.wealth||0) < 30) {
    queuePopup('A bespoke commission requires at least \u00a330. Perhaps after the next season.', null,
      [{ text: '\u2190 Modiste', fn() { openModiste(); return null; } }]);
    return;
  }

  queuePopup(
    'Commission a Bespoke Gown\n\nIt will take a full season. The cost is significant. The result, ' + (G._modisteName||'she') + ' assures you, will be extraordinary.',
    null,
    [
      { text: 'Commission a ball gown (\u00a360)',    fn() { placeBesokeOrder('ball gown',   60,  22, 12); return null; } },
      { text: 'Commission a walking dress (\u00a330)', fn() { placeBesokeOrder('walking dress',30,  12, 6); return null; } },
      { text: 'Commission a riding habit (\u00a340)',  fn() { placeBesokeOrder('riding habit', 40,  14, 8); return null; } },
      { text: 'Commission morning dress (\u00a320)',   fn() { placeBesokeOrder('morning dress',20,  8,  5); return null; } },
      { text: '\u2190 Modiste', fn() { openModiste(); return null; } },
    ]
  );
}

function placeBesokeOrder(type, cost, fashionBonus, looksBonus) {
  if ((G.wealth||0) < cost) { queuePopup('You cannot presently afford this commission.'); openModiste(); return; }
  G.wealth -= cost;
  // The gown arrives next season — store as a pending delivery
  if (!G._bespokeOrder) {
    G._bespokeOrder = { type: type, cost: cost, fashionBonus: fashionBonus, looksBonus: looksBonus, deliverySeason: G.season === 'Spring' ? 'Autumn' : 'Spring' };
    addFeedEntry('You commission a bespoke ' + type + '.', 'good');
    queuePopup(
      (G._modisteName||'The modiste') + ' takes your measurements with great seriousness and promises delivery by ' + G._bespokeOrder.deliverySeason + '.\n\nYou leave feeling as though you have done something significant. You have.',
      '-\u00a3' + cost + '  Commission placed',
      null, function(){ openModiste(); }
    );
    renderStats(); saveGame();
  } else {
    queuePopup('You already have a bespoke order in progress. Allow it to be completed first.', null,
      [{ text: '\u2190 Modiste', fn() { openModiste(); return null; } }]);
  }
}

function openWardrobeView() {
  var wardrobe = G.wardrobe || [];
  if (!wardrobe.length) {
    queuePopup('Your wardrobe is as yet unadorned. A problem that ' + (G._modisteName||'the modiste') + ' stands ready to solve.', null,
      [{ text: 'Browse the collection', fn() { openModisteBrowse(MODISTE_CATALOGUE); return null; } },
       { text: '\u2190 Modiste', fn() { openModiste(); return null; } }]);
    return;
  }

  var typeLabels = { day:'Day wear', evening:'Evening', ball:'Ball gown', court:'Court', riding:'Riding', accessory:'Accessory' };
  var byType = {};
  wardrobe.forEach(function(w) {
    var t = w.type || 'other';
    if (!byType[t]) byType[t] = [];
    byType[t].push(w);
  });

  var lines = ['Your wardrobe (' + wardrobe.length + ' pieces):\n'];
  Object.keys(byType).forEach(function(t) {
    lines.push((typeLabels[t]||t) + ': ' + byType[t].map(function(w){ return w.name; }).join(', '));
  });

  queuePopup(lines.join('\n'), null, [{ text: '\u2190 Modiste', fn() { openModiste(); return null; } }]);
}


// ═══════════════════════════════════════════════════════════
// TEA PARTY
// ═══════════════════════════════════════════════════════════

function openTeaParty() {
  var hasCook = G.household && G.household.staff && G.household.staff.cook && G.household.staff.cook.hired;
  queuePopup(
    'Tea Party\n\nMorning calls, afternoon tea, and the careful art of social management.',
    null,
    [
      {
        text: 'Attend a neighbour\'s tea',
        fn() {
          var rep = rand(2,5); changeStat('reputation', rep);
          var fashion = rand(1,3);
          G.fashion = Math.min(100, (G.fashion||0) + fashion);
          var friends = (G.npcs||[]).filter(function(n){ return n.introduced && !n.isRival; });
          var close = friends.length ? rand(3,8) : 0;
          if (friends.length) changeCloseness(pick(friends), close);
          var msgs = [
            'A pleasant afternoon. The tea is excellent, the company agreeable, and you leave knowing rather more than when you arrived.',
            'Mrs — gives a tea at which the gossip is extraordinary and the sandwiches are better. A successful afternoon on both counts.',
            'You spend three hours at a neighbour\'s table. The conversation is lively. Two alliances are formed and one is ended. None of them yours.',
            'A quiet tea. Sometimes quiet is exactly right.',
          ];
          addFeedEntry('You attend a tea party.', 'good');
          queuePopup(pick(msgs), 'Rep +' + rep + (close ? '  Closeness +' + close : ''));
          renderStats(); saveGame(); return null;
        },
      },
      {
        text: 'Host a tea at home' + (hasCook ? '' : ' \u2014 no cook'),
        fn() {
          if (!hasCook) {
            queuePopup('A tea without a cook is a tea without any proper sandwiches. The guests would notice.', null,
              [{ text: 'Host anyway (it will be remarked upon)', fn() {
                changeStat('reputation', -rand(3,6));
                queuePopup('You host. The tea is improvised. The biscuits are shop-bought. Several guests remark on this. Not kindly.', 'Rep -4');
                renderStats(); saveGame(); return null;
              }},
               { text: 'Perhaps not today', fn() { return {}; } }]);
            return null;
          }
          var cost = rand(3,8); G.wealth -= cost;
          var rep = rand(3,7); changeStat('reputation', rep);
          var friends = (G.npcs||[]).filter(function(n){ return n.introduced && !n.isRival; });
          friends.slice(0,3).forEach(function(n){ changeCloseness(n, rand(2,5)); });
          addFeedEntry('You host a tea party.', 'good');
          queuePopup(
            'Your drawing room is at its best. The tea is perfectly brewed, the company well-chosen, and the conversation entirely satisfactory.',
            'Rep +' + rep + '  -\u00a3' + cost
          );
          renderStats(); saveGame(); return null;
        },
      },
      {
        text: 'Host and invite a society leader (risky)',
        fn() {
          if (!hasCook) { queuePopup('You cannot invite Lady — to a tea without a cook. That would be an act of social self-destruction.'); return null; }
          if ((G.reputation||0) < 50) {
            queuePopup('Your reputation is not yet quite high enough to risk this. Build your connections first.');
            return null;
          }
          // High-stakes invitation
          var roll = rand(1,10);
          var standScore = typeof standingScore === 'function' ? standingScore() : 50;
          var threshold = standScore >= 70 ? 4 : standScore >= 55 ? 6 : 8;
          if (roll >= threshold) {
            changeStat('reputation', rand(10,18));
            G.fashion = Math.min(100, (G.fashion||0) + rand(4,8));
            addFeedEntry('Lady — accepts your invitation. A triumph.', 'good');
            queuePopup(
              'She comes. She stays an hour. She tells you the drawing room curtains are "very nearly" right, which from her is practically a sonnet of praise. The district will hear of this for a month.',
              'Rep +14  Fashion +6'
            );
          } else {
            changeStat('reputation', -rand(5,10));
            addFeedEntry('Lady — declines. Pointedly.', 'bad');
            queuePopup(
              'The refusal arrives by note. It is brief, polite, and devastating. The problem with inviting someone above your current station is that the rejection is also very public.',
              'Rep -7'
            );
          }
          renderStats(); saveGame(); return null;
        },
      },
      {
        text: 'Enquire about a fertility tonic (£10)',
        fn() {
          if (!G.isMarried) {
            queuePopup('Dr — raises an eyebrow. This is not a conversation he expects to have with an unmarried lady.');
            return null;
          }
          if ((G.wealth||0) < 10) { queuePopup('You cannot afford the consultation.'); return null; }
          G.wealth -= 10;
          var fertility = G.fertility !== undefined ? G.fertility : 65;

          // The doctor speaks in careful euphemisms
          var doctorAssessment;
          if (fertility < 20) {
            doctorAssessment = 'Dr — examines you carefully and speaks in the measured tones of a man choosing his words with great care. "There are constitutional difficulties," he says. "I will not pretend otherwise. But I have seen surprising things."';
          } else if (fertility < 45) {
            doctorAssessment = 'Dr — is cautious. "The constitution is somewhat delicate in this regard," he says. "A course of treatment may help. I make no promises."';
          } else {
            doctorAssessment = 'Dr — finds nothing alarming. "You are in generally good health," he says. "Patience is, in my experience, the most effective treatment."';
          }

          queuePopup(
            doctorAssessment + '\n\nHe can prescribe a tonic \u2014 iron, herbs, and something imported at considerable expense from a physician in Bath. The results are uncertain.',
            null,
            [
              {
                text: 'Take the tonic (£5 more)',
                fn() {
                  if ((G.wealth||0) < 5) { queuePopup('You cannot afford it.'); return null; }
                  G.wealth -= 5;
                  var roll = Math.random();
                  if (roll < 0.15) {
                    // Harmful — quackery
                    var harm = rand(8, 18);
                    G.fertility = Math.max(0, (G.fertility||65) - harm);
                    changeStat('health', -rand(3, 8));
                    addFeedEntry('The fertility tonic does not agree with you.', 'bad');
                    queuePopup(
                      'The tonic disagrees with you considerably. You are unwell for a fortnight. Dr — does not mention it when you next see him, which you find unsatisfactory.',
                      'Health -5  Fertility reduced'
                    );
                  } else if (roll < 0.55) {
                    // No effect — most likely outcome
                    addFeedEntry('The tonic has no discernible effect.', 'event');
                    queuePopup(
                      'You take the tonic faithfully for a month. It tastes of iron and something you cannot identify. Whether it has done anything useful is impossible to say.',
                      'No discernible effect'
                    );
                  } else {
                    // Beneficial
                    var gain = rand(5, 15);
                    G.fertility = Math.min(100, (G.fertility||65) + gain);
                    addFeedEntry('The tonic seems to have helped.', 'good');
                    queuePopup(
                      'Whether it is the tonic or simply time, you feel rather better in yourself. Something has settled.',
                      'Fertility improved'
                    );
                  }
                  renderStats(); saveGame(); return null;
                },
              },
              { text: 'Decline the tonic', fn() { queuePopup('You thank the doctor and take your leave.'); saveGame(); return null; } },
            ]
          );
          renderStats(); saveGame(); return null;
        },
      },
      { text: '← Activities', fn() { switchView('activities'); renderCatView('activities'); return null; } },
    ]
  );
}


// ═══════════════════════════════════════════════════════════
// CARDS
// ═══════════════════════════════════════════════════════════

function openCards() {
  queuePopup(
    'Cards\n\nWhist, loo, and the odd rubber of piquet. Society runs on cards.',
    null,
    [
      {
        text: 'Play a friendly rubber (no stakes)',
        fn() {
          changeStat('wit', rand(1,3));
          changeStat('reputation', rand(1,3));
          var msgs = [
            'A pleasant evening of whist. Nobody wins enough to matter and nobody loses enough to suffer. Perfectly civilised.',
            'You play piquet with two neighbours. The cards are excellent company.',
            'Three rubbers of whist. Your partner is bad but convivial. You win anyway.',
          ];
          addFeedEntry('You play cards.', 'good');
          queuePopup(pick(msgs), 'Wit +2');
          renderStats(); saveGame(); return null;
        },
      },
      {
        text: 'Play for modest stakes (\u00a32)',
        fn() {
          if ((G.wealth||0) < 2) { queuePopup('You cannot afford to stake even a modest sum.'); return null; }
          var roll = rand(1,10);
          var witMod = Math.floor(((G.wit||50) - 50) / 10); // -4 to +4
          if (roll + witMod >= 6) {
            var win = rand(2,8); G.wealth += win;
            changeStat('wit', rand(1,2));
            addFeedEntry('You win at cards.', 'good');
            queuePopup('The cards run well tonight. You play carefully and win \u00a3' + win + '. Nothing to alarm anyone.', 'Wit +1  +\u00a3' + win);
          } else {
            var loss = rand(2,5); G.wealth = Math.max(0, G.wealth - loss);
            addFeedEntry('You lose at cards.', 'event');
            queuePopup('The cards go against you. You lose \u00a3' + loss + '. The polite thing is to smile about it.', '-\u00a3' + loss);
          }
          renderStats(); saveGame(); return null;
        },
      },
      {
        text: 'Play for high stakes (\u00a310) \u2014 dangerous',
        fn() {
          if ((G.wealth||0) < 10) { queuePopup('You cannot afford these stakes.'); return null; }
          var roll = rand(1,10);
          var witMod = Math.floor(((G.wit||50) - 50) / 10);
          if (roll + witMod >= 7) {
            var win = rand(10,30); G.wealth += win;
            changeStat('wit', rand(2,4));
            changeStat('reputation', rand(2,5));
            addFeedEntry('A considerable win at cards.', 'good');
            queuePopup('You win \u00a3' + win + '. The table is silent for a moment. You accept it graciously.', 'Wit +3  +\u00a3' + win);
          } else if (roll + witMod >= 4) {
            var loss = rand(8,15); G.wealth = Math.max(0, G.wealth - loss);
            addFeedEntry('You lose at cards.', 'bad');
            queuePopup('You lose \u00a3' + loss + '. It stings but is not ruinous. You smile through it.', '-\u00a3' + loss);
          } else {
            var ruinLoss = rand(15,35); G.wealth = Math.max(0, G.wealth - ruinLoss);
            G.scandals = (G.scandals||0) + 1;
            changeStat('reputation', -rand(5,10));
            addFeedEntry('A serious loss at cards. People have noticed.', 'bad');
            queuePopup(
              'The evening goes badly wrong. You lose \u00a3' + ruinLoss + '. The amount is talked about. Ladies do not gamble like this. You are aware.',
              'Rep -7  Scandal  -\u00a3' + ruinLoss
            );
          }
          renderStats(); saveGame(); return null;
        },
      },
      {
        text: 'Enquire about a fertility tonic (£10)',
        fn() {
          if (!G.isMarried) {
            queuePopup('Dr — raises an eyebrow. This is not a conversation he expects to have with an unmarried lady.');
            return null;
          }
          if ((G.wealth||0) < 10) { queuePopup('You cannot afford the consultation.'); return null; }
          G.wealth -= 10;
          var fertility = G.fertility !== undefined ? G.fertility : 65;

          // The doctor speaks in careful euphemisms
          var doctorAssessment;
          if (fertility < 20) {
            doctorAssessment = 'Dr — examines you carefully and speaks in the measured tones of a man choosing his words with great care. "There are constitutional difficulties," he says. "I will not pretend otherwise. But I have seen surprising things."';
          } else if (fertility < 45) {
            doctorAssessment = 'Dr — is cautious. "The constitution is somewhat delicate in this regard," he says. "A course of treatment may help. I make no promises."';
          } else {
            doctorAssessment = 'Dr — finds nothing alarming. "You are in generally good health," he says. "Patience is, in my experience, the most effective treatment."';
          }

          queuePopup(
            doctorAssessment + '\n\nHe can prescribe a tonic — iron, herbs, and something imported at considerable expense from a physician in Bath. The results are uncertain.',
            null,
            [
              {
                text: 'Take the tonic (£5 more)',
                fn() {
                  if ((G.wealth||0) < 5) { queuePopup('You cannot afford it.'); return null; }
                  G.wealth -= 5;
                  var roll = Math.random();
                  if (roll < 0.15) {
                    // Harmful — quackery
                    var harm = rand(8, 18);
                    G.fertility = Math.max(0, (G.fertility||65) - harm);
                    changeStat('health', -rand(3, 8));
                    addFeedEntry('The fertility tonic does not agree with you.', 'bad');
                    queuePopup(
                      'The tonic disagrees with you considerably. You are unwell for a fortnight. Dr — does not mention it when you next see him, which you find unsatisfactory.',
                      'Health -5  Fertility reduced'
                    );
                  } else if (roll < 0.55) {
                    // No effect — most likely outcome
                    addFeedEntry('The tonic has no discernible effect.', 'event');
                    queuePopup(
                      'You take the tonic faithfully for a month. It tastes of iron and something you cannot identify. Whether it has done anything useful is impossible to say.',
                      'No discernible effect'
                    );
                  } else {
                    // Beneficial
                    var gain = rand(5, 15);
                    G.fertility = Math.min(100, (G.fertility||65) + gain);
                    addFeedEntry('The tonic seems to have helped.', 'good');
                    queuePopup(
                      'Whether it is the tonic or simply time, you feel rather better in yourself. Something has settled.',
                      'Fertility improved'
                    );
                  }
                  renderStats(); saveGame(); return null;
                },
              },
              { text: 'Decline the tonic', fn() { queuePopup('You thank the doctor and take your leave.'); saveGame(); return null; } },
            ]
          );
          renderStats(); saveGame(); return null;
        },
      },
      { text: '← Activities', fn() { switchView('activities'); renderCatView('activities'); return null; } },
    ]
  );
}


// ═══════════════════════════════════════════════════════════
// CHARITY WORK
// ═══════════════════════════════════════════════════════════

function openCharityWork() {
  queuePopup(
    'Charity Work\n\nGood works, quietly done. Or not so quietly, as occasion demands.',
    null,
    [
      {
        text: 'Teach at the Sunday school',
        fn() {
          changeStat('faith', rand(3,7));
          changeStat('wit', rand(1,3));
          changeStat('reputation', rand(2,4));
          var msgs = [
            'You take the Sunday school class. The children are more attentive than expected, and several questions are genuinely difficult.',
            'Three hours with the village children. They are exhausting and occasionally extraordinary.',
            'Sunday school. You teach reading and receive in return a somewhat chaotic education in local village life.',
          ];
          addFeedEntry('You teach at the Sunday school.', 'good');
          queuePopup(pick(msgs), 'Faith +5  Wit +2  Rep +3');
          renderStats(); saveGame(); return null;
        },
      },
      {
        text: 'Organise relief for a poor family',
        fn() {
          var cost = rand(5,15);
          if ((G.wealth||0) < cost) { queuePopup('You cannot presently afford to help as much as you would wish.'); return null; }
          G.wealth -= cost;
          changeStat('faith', rand(4,8));
          changeStat('reputation', rand(2,5));
          addFeedEntry('You organise relief for a family in need.', 'good');
          queuePopup(
            'You arrange provisions, fuel, and a small sum for a family who needed it and were too proud to ask. You say nothing about it to anyone who does not need to know.',
            'Faith +6  Rep +3  -\u00a3' + cost
          );
          renderStats(); saveGame(); return null;
        },
      },
      {
        text: 'Visit the almshouses',
        fn() {
          changeStat('faith', rand(4,8));
          changeStat('health', -rand(1,3));
          changeStat('reputation', rand(1,3));
          addFeedEntry('You visit the almshouses.', 'good');
          queuePopup(
            'A morning at the almshouses. The residents are glad of company. You read to two of them and listen to a third for a very long time. You leave tired and grateful.',
            'Faith +6'
          );
          renderStats(); saveGame(); return null;
        },
      },
      {
        text: 'Consider making this a vocation \u2014 one day',
        fn() {
          // Seed for future career system
          if (!G.charityInterest) G.charityInterest = 0;
          G.charityInterest++;
          changeStat('faith', rand(2,4));
          var threshold = 3;
          if (G.charityInterest >= threshold) {
            addFeedEntry('You find yourself drawn, increasingly, to this work.', 'event');
            queuePopup(
              'You have been thinking about it. There are societies, in London and in the counties, that do this kind of work properly. Women who have made it their life\u2019s purpose. You are not sure you are ready. But the thought does not go away.',
              'A direction forming'
            );
          } else {
            queuePopup('You think about it on the walk home. You think about it again in the evening. Something is forming.');
          }
          saveGame(); return null;
        },
      },
      {
        text: 'Enquire about a fertility tonic (£10)',
        fn() {
          if (!G.isMarried) {
            queuePopup('Dr — raises an eyebrow. This is not a conversation he expects to have with an unmarried lady.');
            return null;
          }
          if ((G.wealth||0) < 10) { queuePopup('You cannot afford the consultation.'); return null; }
          G.wealth -= 10;
          var fertility = G.fertility !== undefined ? G.fertility : 65;

          // The doctor speaks in careful euphemisms
          var doctorAssessment;
          if (fertility < 20) {
            doctorAssessment = 'Dr — examines you carefully and speaks in the measured tones of a man choosing his words with great care. "There are constitutional difficulties," he says. "I will not pretend otherwise. But I have seen surprising things."';
          } else if (fertility < 45) {
            doctorAssessment = 'Dr — is cautious. "The constitution is somewhat delicate in this regard," he says. "A course of treatment may help. I make no promises."';
          } else {
            doctorAssessment = 'Dr — finds nothing alarming. "You are in generally good health," he says. "Patience is, in my experience, the most effective treatment."';
          }

          queuePopup(
            doctorAssessment + '\n\nHe can prescribe a tonic — iron, herbs, and something imported at considerable expense from a physician in Bath. The results are uncertain.',
            null,
            [
              {
                text: 'Take the tonic (£5 more)',
                fn() {
                  if ((G.wealth||0) < 5) { queuePopup('You cannot afford it.'); return null; }
                  G.wealth -= 5;
                  var roll = Math.random();
                  if (roll < 0.15) {
                    // Harmful — quackery
                    var harm = rand(8, 18);
                    G.fertility = Math.max(0, (G.fertility||65) - harm);
                    changeStat('health', -rand(3, 8));
                    addFeedEntry('The fertility tonic does not agree with you.', 'bad');
                    queuePopup(
                      'The tonic disagrees with you considerably. You are unwell for a fortnight. Dr — does not mention it when you next see him, which you find unsatisfactory.',
                      'Health -5  Fertility reduced'
                    );
                  } else if (roll < 0.55) {
                    // No effect — most likely outcome
                    addFeedEntry('The tonic has no discernible effect.', 'event');
                    queuePopup(
                      'You take the tonic faithfully for a month. It tastes of iron and something you cannot identify. Whether it has done anything useful is impossible to say.',
                      'No discernible effect'
                    );
                  } else {
                    // Beneficial
                    var gain = rand(5, 15);
                    G.fertility = Math.min(100, (G.fertility||65) + gain);
                    addFeedEntry('The tonic seems to have helped.', 'good');
                    queuePopup(
                      'Whether it is the tonic or simply time, you feel rather better in yourself. Something has settled.',
                      'Fertility improved'
                    );
                  }
                  renderStats(); saveGame(); return null;
                },
              },
              { text: 'Decline the tonic', fn() { queuePopup('You thank the doctor and take your leave.'); saveGame(); return null; } },
            ]
          );
          renderStats(); saveGame(); return null;
        },
      },
      { text: '← Activities', fn() { switchView('activities'); renderCatView('activities'); return null; } },
    ]
  );
}


// ═══════════════════════════════════════════════════════════
// PHYSICIAN
// ═══════════════════════════════════════════════════════════

function openPhysician() {
  if ((G.wealth||0) < 5) { queuePopup('A physician\'s visit requires at least \u00a35.'); return; }

  queuePopup(
    'The Physician\n\nDr — attends. He peers at you gravely, as physicians do.',
    null,
    [
      {
        text: 'A general consultation (\u00a35)',
        fn() {
          if ((G.wealth||0) < 5) { queuePopup('You cannot afford it.'); return null; }
          G.wealth -= 5;
          var health = rand(5,12); changeStat('health', health);
          var msgs = [
            'Dr — takes your pulse, examines your tongue, and prescribes rest and a tonic. The tonic is unpleasant. The rest is excellent.',
            'A thorough consultation. The doctor finds nothing alarming and prescribes fresh air and exercise, which you already knew.',
            'Dr — is reassuring in a way that is itself slightly alarming. Everything is, he says, quite satisfactory. You believe him.',
            'The doctor prescribes iron drops and a reduction in social engagements. You will take the iron drops.',
          ];
          addFeedEntry('You visit the physician.', 'good');
          queuePopup(pick(msgs), 'Health +' + health + '  -\u00a35');
          renderStats(); saveGame(); return null;
        },
      },
      {
        text: 'Specific complaint \u2014 nerves (\u00a35)',
        fn() {
          if ((G.wealth||0) < 5) { queuePopup('You cannot afford it.'); return null; }
          G.wealth -= 5;
          changeStat('health', rand(3,8));
          changeStat('wit', rand(1,3)); // rest and reflection
          addFeedEntry('You consult the physician about your nerves.', 'event');
          queuePopup(
            'Dr — listens carefully to your account of the past month. He prescribes sal volatile, fewer calls, and possibly a book. He is not wrong about any of it.',
            'Health +5  Wit +2  -\u00a35'
          );
          renderStats(); saveGame(); return null;
        },
      },
      {
        text: 'A serious consultation (\u00a315) \u2014 thorough examination',
        fn() {
          if ((G.wealth||0) < 15) { queuePopup('You cannot afford a full consultation at present.'); return null; }
          G.wealth -= 15;
          var health = rand(10,20); changeStat('health', health);
          var msgs = [
            'A thorough examination. Dr — is satisfied that everything is in order and prescribes a month of country air. You feel considerably better for having been told so officially.',
            'The doctor examines you fully, asks difficult questions, and ultimately concludes that you are constitutionally sound. The relief is considerable.',
            'A proper consultation. The news is good. You pay \u00a315 to be told you are healthy, which is worth every penny.',
          ];
          addFeedEntry('You have a full consultation with the physician.', 'good');
          queuePopup(pick(msgs), 'Health +' + health + '  -\u00a315');
          renderStats(); saveGame(); return null;
        },
      },
      {
        text: 'Enquire about a fertility tonic (£10)',
        fn() {
          if (!G.isMarried) {
            queuePopup('Dr — raises an eyebrow. This is not a conversation he expects to have with an unmarried lady.');
            return null;
          }
          if ((G.wealth||0) < 10) { queuePopup('You cannot afford the consultation.'); return null; }
          G.wealth -= 10;
          var fertility = G.fertility !== undefined ? G.fertility : 65;

          // The doctor speaks in careful euphemisms
          var doctorAssessment;
          if (fertility < 20) {
            doctorAssessment = 'Dr — examines you carefully and speaks in the measured tones of a man choosing his words with great care. "There are constitutional difficulties," he says. "I will not pretend otherwise. But I have seen surprising things."';
          } else if (fertility < 45) {
            doctorAssessment = 'Dr — is cautious. "The constitution is somewhat delicate in this regard," he says. "A course of treatment may help. I make no promises."';
          } else {
            doctorAssessment = 'Dr — finds nothing alarming. "You are in generally good health," he says. "Patience is, in my experience, the most effective treatment."';
          }

          queuePopup(
            doctorAssessment + '\n\nHe can prescribe a tonic — iron, herbs, and something imported at considerable expense from a physician in Bath. The results are uncertain.',
            null,
            [
              {
                text: 'Take the tonic (£5 more)',
                fn() {
                  if ((G.wealth||0) < 5) { queuePopup('You cannot afford it.'); return null; }
                  G.wealth -= 5;
                  var roll = Math.random();
                  if (roll < 0.15) {
                    // Harmful — quackery
                    var harm = rand(8, 18);
                    G.fertility = Math.max(0, (G.fertility||65) - harm);
                    changeStat('health', -rand(3, 8));
                    addFeedEntry('The fertility tonic does not agree with you.', 'bad');
                    queuePopup(
                      'The tonic disagrees with you considerably. You are unwell for a fortnight. Dr — does not mention it when you next see him, which you find unsatisfactory.',
                      'Health -5  Fertility reduced'
                    );
                  } else if (roll < 0.55) {
                    // No effect — most likely outcome
                    addFeedEntry('The tonic has no discernible effect.', 'event');
                    queuePopup(
                      'You take the tonic faithfully for a month. It tastes of iron and something you cannot identify. Whether it has done anything useful is impossible to say.',
                      'No discernible effect'
                    );
                  } else {
                    // Beneficial
                    var gain = rand(5, 15);
                    G.fertility = Math.min(100, (G.fertility||65) + gain);
                    addFeedEntry('The tonic seems to have helped.', 'good');
                    queuePopup(
                      'Whether it is the tonic or simply time, you feel rather better in yourself. Something has settled.',
                      'Fertility improved'
                    );
                  }
                  renderStats(); saveGame(); return null;
                },
              },
              { text: 'Decline the tonic', fn() { queuePopup('You thank the doctor and take your leave.'); saveGame(); return null; } },
            ]
          );
          renderStats(); saveGame(); return null;
        },
      },
      { text: '← Activities', fn() { switchView('activities'); renderCatView('activities'); return null; } },
    ]
  );
}


// ═══════════════════════════════════════════════════════════
// AUTONOMOUS PROPOSAL
// ═══════════════════════════════════════════════════════════

function fireAutonomousProposal(data) {
  var suitor = data.suitor;

  // If no pool suitor, generate one matched to standing
  if (!suitor) {
    var standScore = data.standScore || 50;
    var wealthFloor = standScore >= 70 ? 3000 : standScore >= 55 ? 1500 : standScore >= 40 ? 600 : 200;
    var wealthCeil  = wealthFloor * 4;
    var w = rand(wealthFloor, wealthCeil);
    var t = w > 5000 ? pick(['Lord','Sir','The Honourable'])
          : w > 2000 ? 'Mr'
          : pick(['Mr','Captain','Reverend']);
    var base = typeof generateNPC === 'function' ? generateNPC('auto_prop_' + Date.now(), true) : { first:'A Gentleman', last:'', trait:'reserved', desc:'of good character' };
    suitor = Object.assign({}, base, {
      wealth: w, title: t,
      fullName: t + ' ' + base.first + ' ' + base.last,
      rankLabel: w > 5000 ? 'Gentleman of fortune' : w > 1500 ? 'Gentleman' : w > 800 ? 'Officer' : 'Clergyman',
      titleRank: w > 5000 ? 3 : w > 2000 ? 1 : 0,
      courtshipStyle: { label:'Conventional', flirtBonus:0, danceBonus:0 },
    });
  }


  // Calculate compatibility for this proposal
  if (suitor.compatibility === undefined && typeof calculateCompatibility === 'function') {
    suitor.compatibility = calculateCompatibility(suitor);
  }
  var propCompatScore = suitor.compatibility || 50;
  var propCompatLine  = typeof compatibilityLine === 'function'
    ? compatibilityLine(propCompatScore, suitor.trait) : '';

  // Proposal speeches matched to suitor trait/style
  var speeches = [
    suitor.first + ' requests a private word after the party. He is formal about it, which means he is serious. "Miss ' + G.name.split(' ')[0] + '. I have admired you for some time. I am asking whether you would consent to be my wife."',
    suitor.first + ' writes a letter. It is three pages long and says, in essence, that he loves you. He asks for your answer at your convenience. The letter is very good.',
    suitor.first + ' corners you in the garden with a transparency that is almost refreshing. "I have spoken to your father. Or your guardian. I should very much like to marry you. What do you say?"',
    suitor.first + ' is awkward about it, which you find rather endearing. He starts three times before getting to the point. The point, once reached, is clear enough.',
    '"I am not a man of many words," ' + suitor.first + ' says. He then proceeds to use quite a lot of them. The conclusion is a proposal. You were not entirely surprised.',
  ];

  addFeedEntry(suitor.fullName + ' proposes.', 'event');

  queuePopup(
    pick(speeches) + '\n\n' + suitor.fullName + ' \u2014 ' + suitor.rankLabel + ', \u00a3' + (suitor.wealth||0).toLocaleString() + '/yr.'
      + (propCompatLine ? '\n\n' + propCompatLine : ''),
    'Proposal',
    [
      {
        text: 'Accept',
        fn() {
          if (typeof startWeddingPlanning === 'function') {
            startWeddingPlanning(suitor);
          } else {
            if (typeof acceptProposal === 'function') acceptProposal(suitor);
            addFeedEntry('You accept ' + suitor.fullName + '.', 'event');
            queuePopup('You are engaged to ' + suitor.fullName + '.', 'Engaged \u2665');
            renderStats(); saveGame();
          }
          return null;
        },
      },
      {
        text: 'Ask for time to consider',
        fn() {
          // Store for follow-up next season
          if (!G._pendingProposal) G._pendingProposal = suitor;
          addFeedEntry('You ask ' + suitor.first + ' for time to consider.', 'event');
          queuePopup(
            suitor.first + ' accepts your hesitation with quiet dignity. He will wait to hear from you.',
            'Proposal pending'
          );
          saveGame(); return null;
        },
      },
      {
        text: 'Decline',
        fn() {
          // Age-based reputation modifier — declining gets harder over 25
          if (G.age >= 26) changeStat('reputation', -rand(3, 7));
          var declinations = [
            suitor.first + ' receives the refusal with more grace than you perhaps expected. He bows and withdraws.',
            'You decline as kindly as you can. ' + suitor.first + ' is stoic about it. You believe he genuinely is.',
            suitor.first + ' nods once. "I understand," he says. He does not say anything else. You respect him for it.',
          ];
          addFeedEntry('You decline ' + suitor.first + '\'s proposal.', 'event');
          queuePopup(pick(declinations), G.age >= 26 ? 'Rep -5' : null);
          // Mark in suitor pool
          if (G.suitorPool) {
            var entry = G.suitorPool.find(function(e){ return e.suitor && e.suitor.first === suitor.first; });
            if (entry) entry.declined = true;
          }
          renderStats(); saveGame(); return null;
        },
      },
    ]
  );
}


// ═══════════════════════════════════════════════════════════
// AUTONOMOUS PREGNANCY
// ═══════════════════════════════════════════════════════════

function fireAutonomousPregnancy() {
  if (!G.isMarried || G.pregnancy) return;

  if (typeof initPregnancy === 'function') initPregnancy();

  var multiples = G.pregnancy && G.pregnancy.triplets ? 'triplets'
                : G.pregnancy && G.pregnancy.twins    ? 'twins'
                : null;

  var openings = [
    'The doctor confirms what you had already begun to suspect. You are with child.',
    'You know before the doctor tells you. Still, it is good to have it confirmed.',
    'The news comes in spring, as it often does. You are with child.',
    'You tell your husband before you tell anyone else. His face is everything.',
  ];

  var multiplesNote = '';
  if (multiples === 'twins') {
    multiplesNote = '\n\nThe doctor pauses. He listens again. "I believe," he says carefully, "there may be two."';
  } else if (multiples === 'triplets') {
    multiplesNote = '\n\nThe doctor listens for a very long time. When he looks up his expression is difficult to read. "Three," he says. "I am almost certain."';
  }

  addFeedEntry('You are with child.', 'event');
  queuePopup(
    pick(openings) + multiplesNote,
    multiples === 'triplets' ? '\u2605 Triplets!' : multiples === 'twins' ? '\u2605 Twins!' : 'With child',
  );
  renderStats(); saveGame();
}


// ═══════════════════════════════════════════════════════════
// DYNASTY SYSTEM
// ═══════════════════════════════════════════════════════════

// ── Dynasty overview ────────────────────────────────────────
function openDynastyView() {
  var dynastyName = G.dynastyName || (G.fatherBg ? G.fatherBg.surname : G.name.split(' ').pop()) || 'Your Family';
  var children    = G.children || [];
  var adopted     = children.filter(function(c){ return c.adopted; });
  var bio         = children.filter(function(c){ return !c.adopted; });

  var lines = ['The ' + dynastyName + ' Family\n'];

  // Player
  lines.push('You: ' + G.name + ', age ' + G.age);
  if (G.isMarried && G.spouse) lines.push('Married to: ' + G.spouse.fullName);

  // Children
  if (children.length) {
    lines.push('\nChildren (' + children.length + '):');
    children.forEach(function(c) {
      var status = c.isMarried ? 'Married' : c.age >= 18 ? 'Of age' : 'Age ' + c.age;
      var adoptNote = c.adopted ? ' (adopted)' : '';
      lines.push('  ' + c.name + ' \u2014 ' + (c.gender === 'son' ? 'Son' : 'Daughter') + adoptNote + ' \u00b7 ' + status);
      if (c.isMarried && c.spouseName) lines.push('    Married to ' + c.spouseName);
      if (c.children && c.children.length) lines.push('    Grandchildren: ' + c.children.map(function(g){ return g.name; }).join(', '));
    });
  } else {
    lines.push('\nNo children.');
  }

  queuePopup(
    lines.join('\n'),
    'The ' + dynastyName + ' Dynasty',
    [
      { text: 'Arrange a child\'s marriage', fn() { openArrangeMarriageMenu(); return null; } },
      { text: 'Adopt a child',               fn() { openAdoptionMenu();        return null; } },
      ...( children.length === 0 && G.age >= 38 ? [{ text: 'Reflect on legacy', fn() { fireChildlessMoment(); return null; } }] : []),
      { text: '\u2190 Back', fn() { return {}; } },
    ]
  );
}

// ── Arrange marriage for a specific child ───────────────────
function openArrangeMarriage(child) {
  if (!child) { openArrangeMarriageMenu(); return; }
  if (child.isMarried) {
    queuePopup(child.name + ' is already married.'); return;
  }
  if (child.age < 16) {
    queuePopup(child.name + ' is far too young. This conversation should not be happening.'); return;
  }

  var isDaughter = child.gender === 'daughter';
  var isSon      = child.gender === 'son';

  // Generate 3 potential matches
  var matches = [];
  for (var i = 0; i < 3; i++) {
    var w = isDaughter
      ? (rand(1,10) >= 7 ? rand(2000,8000) : rand(400,2500))
      : (rand(1,10) >= 7 ? rand(3000,12000) : rand(800,4000));
    var titles = isDaughter
      ? ['Mr','Mr','Mr','Captain','Major','The Honourable','Sir']
      : ['Miss','Miss','Miss','Miss','Miss Honourable'];
    var t = pick(titles);
    var first = isDaughter ? pick(NAMES.male) : pick(NAMES.female);
    var last  = pick(NAMES.surname);
    matches.push({
      name: t + ' ' + first + ' ' + last,
      first: first, last: last,
      wealth: w,
      title: t,
      rankLabel: w > 5000 ? 'Gentleman of fortune' : w > 1500 ? 'Gentleman' : 'Respectable family',
      trait: pick(['kind','witty','reserved','earnest','proud','charming']),
    });
  }

  queuePopup(
    'Arrange a Match for ' + child.name + '\n\nAge ' + child.age + ' \u00b7 ' + (isDaughter ? 'Daughter' : 'Son') + '\n\nYou have ' + (isDaughter ? 'her' : 'his') + ' future to consider carefully.',
    null,
    [
      ...matches.map(function(m) {
        return {
          text: m.name + ' \u2014 ' + m.rankLabel + ', \u00a3' + m.wealth.toLocaleString() + '/yr',
          fn() {
            openMatchNegotiation(child, m);
            return null;
          },
        };
      }),
      { text: 'Leave it to ' + (isDaughter ? 'her' : 'him') + ' for now', fn() { return {}; } },
    ]
  );
}

function openArrangeMarriageMenu() {
  var eligible = (G.children||[]).filter(function(c){ return !c.isMarried && c.age >= 16; });
  if (!eligible.length) {
    queuePopup('None of your children are yet of a marriageable age, or all are already settled.');
    return;
  }
  queuePopup(
    'Which child would you arrange a match for?',
    null,
    eligible.map(function(c) {
      return {
        text: c.name + ' \u2014 ' + (c.gender === 'son' ? 'Son' : 'Daughter') + ', age ' + c.age,
        fn() { openArrangeMarriage(c); return null; },
      };
    }).concat([{ text: '\u2190 Back', fn() { return {}; } }])
  );
}

function openMatchNegotiation(child, match) {
  var isDaughter = child.gender === 'daughter';
  var standScore = typeof standingScore === 'function' ? standingScore() : 50;

  // Success chance based on child's traits, standing, and match quality
  var childLooks  = child.looks  || 55;
  var childWit    = child.wit    || 55;
  var matchChance = 0.5
    + (childLooks  - 50) * 0.004
    + (childWit    - 50) * 0.003
    + (standScore  - 50) * 0.005;
  matchChance = Math.max(0.15, Math.min(0.90, matchChance));

  // Calculate settlement player can offer for this child
  var childSettlementBase = isDaughter
    ? Math.floor((G.wealth||0) * 0.10)
    : Math.floor((G.wealth||0) * 0.05);
  childSettlementBase = Math.max(0, Math.min(childSettlementBase, (G.wealth||0)));
  var settlementOffer = Math.round(childSettlementBase / 25) * 25;

  var negotiationStyles = [
    {
      text: 'Make a formal approach through proper channels',
      successMod: 0, failMod: 0,
      successText: 'The approach is received well. A meeting is arranged. Within a season, matters are settled satisfactorily.',
      failText: 'The family declines, politely but firmly. Their circumstances or expectations did not align with yours.',
    },
    {
      text: settlementOffer > 0 ? 'Offer a settlement of \u00a3' + settlementOffer + ' on ' + child.name : 'Offer a settlement (no funds available)',
      successMod: settlementOffer > 0 ? 0.20 : -0.10, failMod: 0,
      cost: settlementOffer,
      successText: 'The settlement secures the match. ' + child.name + ' enters the marriage with something of their own.',
      failText: 'Even the settlement is insufficient for their expectations.',
    },
    {
      text: 'Push hard \u2014 make it clear this is a dynasty alliance',
      successMod: 0.10, failMod: -0.15,
      successText: 'The forthright approach works in your favour. They respect clarity of purpose.',
      failText: 'The pressure works against you. They find it presumptuous. The match is off.',
    },
    {
      text: 'Negotiate a pin money provision for ' + child.name,
      successMod: 0.12, failMod: -0.05, pinMoney: true,
      successText: child.name + ' will have a guaranteed annual income within the marriage. You insisted on it.',
      failText: 'They will not agree to a pin money provision. You find this tells you something about them.',
    },
  ];

  queuePopup(
    match.name + '\n' + match.rankLabel + ' \u00b7 \u00a3' + match.wealth.toLocaleString() + '/yr\n' + match.trait + '\n\nHow shall you approach this?',
    null,
    negotiationStyles.map(function(style) {
      return {
        text: style.text,
        fn() {
          var chance = matchChance + style.successMod;
          if (style.cost && (G.wealth||0) >= style.cost) { G.wealth -= style.cost; child.settlement = style.cost; }
          var roll = Math.random();
          if (roll < chance) {
            // Success
            child.isMarried = true;
            child.spouseName = match.name;
            child.spouseWealth = match.wealth;
            child.marriageArranged = true;
            if (style.pinMoney) child.pinMoney = Math.max(10, Math.floor((match.wealth||500) * 0.05));
            changeStat('reputation', rand(5,12));
            if (isDaughter) changeStat('reputation', match.wealth > 3000 ? rand(8,15) : rand(3,8));
            addFeedEntry(child.name + ' is to be married to ' + match.name + '.', 'event');
            queuePopup(
              style.successText + '\n\n' + child.name + ' and ' + match.name + ' are to be married. You did this.',
              isDaughter && match.wealth > 4000 ? 'Excellent match!' : 'Match made'
            );
          } else {
            // Failure
            changeStat('reputation', style.failMod < 0 ? rand(3,6) * -1 : 0);
            addFeedEntry('The proposed match for ' + child.name + ' did not succeed.', 'event');
            queuePopup(style.failText, style.failMod < 0 ? 'Rep -4' : null);
          }
          renderStats(); saveGame(); return null;
        },
      };
    }).concat([{ text: 'Reconsider', fn() { openArrangeMarriage(child); return null; } }])
  );
}


// ── Adoption ────────────────────────────────────────────────
function openAdoptionMenu() {
  var hasRoom = !G.children || G.children.length < 6;
  if (!hasRoom) {
    queuePopup('Your household is already full. There is no room for another child at present.');
    return;
  }

  // Generate 3 children to choose from
  var children = [
    generateAdoptionChild(),
    generateAdoptionChild(),
    generateAdoptionChild(),
  ];

  showAdoptionPicker(children);
}

// ── Adoption child generator ────────────────────────────────

var ADOPTION_ORIGINS = [
  { type:"parish",       text:"Found on the parish steps, wrapped in a servant's apron. No note. No name given." },
  { type:"parish",       text:"The youngest of seven children of a labourer who cannot feed them all. He wept when he brought her." },
  { type:"parish",       text:"Pulled from a workhouse by the vicar's intervention. She has not spoken since she arrived." },
  { type:"orphan",       text:"Orphaned when her parents died of fever last winter. Her aunt cannot take her in." },
  { type:"orphan",       text:"His father died at sea. His mother followed three months later. No explanation was ever given." },
  { type:"orphan",       text:"Both parents lost in a house fire. He was carried out by a neighbour. The house was not." },
  { type:"orphan",       text:"Her mother died in childbed. Her father remarried quickly. The new wife has made her situation plain." },
  { type:"relation",     text:"Your distant cousin's child. The father has debts and a new wife and no room for a reminder of the first." },
  { type:"relation",     text:"Your brother's wife's youngest. They have too many children and not enough income. They ask with great dignity." },
  { type:"relation",     text:"A second cousin twice removed. The family connexion is thin but real. The need is not." },
  { type:"baseborn",     text:"Born to a master's young housemaid who has since disappeared. The housekeeper brought the child here." },
  { type:"baseborn",     text:"The natural child of a gentleman who will not acknowledge him. His mother has placed him with the parish." },
  { type:"baseborn",     text:"Born under circumstances nobody will discuss plainly. She is healthy and she is here and she needs a home." },
  { type:"foundling",    text:"Left at the church door during the midnight service. The curate found her at dawn." },
  { type:"foundling",    text:"Discovered in a basket outside the apothecary. A small fortune in the basket with him — and then nothing." },
  { type:"war",          text:"His father died at Waterloo. His mother could not manage alone and has gone into service." },
  { type:"war",          text:"A soldier's daughter whose mother has remarried a man who does not want a reminder of the first husband." },
  { type:"emigrant",     text:"Her family sailed for the colonies and could not take all the children. She was left with a neighbour." },
  { type:"emigrant",     text:"Left behind when his parents emigrated. They sent one letter. Then nothing." },
  { type:"illness",      text:"Her mother died of consumption. Her father followed. The neighbours did what they could." },
  { type:"illness",      text:"Lost both parents to the fever that went through the village last autumn. He is the only survivor." },
  { type:"relation",     text:"Your mother's cousin married badly. He died badly too. She is left with three children and no income." },
  { type:"relation",     text:"Your father's youngest brother had a child before he married. Nobody speaks of it directly. The child exists regardless." },
  { type:"relation",     text:"A niece by marriage — your husband's sister's youngest. The family cannot manage and will not ask, so you are asking on their behalf." },
  { type:"relation",     text:"Your great-aunt's granddaughter. The connexion is distant but the blood is real, and there is nobody else." },
  { type:"relation",     text:"The daughter of your father's old friend, now dead. He asked, years ago, that you look after his family if it came to it. It has come to it." },
  { type:"baseborn",     text:"Rumoured to be the natural child of someone who moves in your circles. Nobody will confirm it. The child is quite unaware of any of this." },
  { type:"war",          text:"His father fell in the Peninsula. His mother has remarried and her new husband has made clear the boy is not welcome." },
  { type:"foundling",    text:"Found in the back pew of the church on a Wednesday, with a note that said only: please." },
];

var ADOPTION_FACE_GIRLS = [
  '\u{1F467}', // girl
  '\u{1F9D2}', // child (neutral)
];
var ADOPTION_FACE_BOYS = [
  '\u{1F466}', // boy
  '\u{1F9D2}', // child (neutral)
];

function generateAdoptionChild() {
  var gender   = Math.random() < 0.5 ? 'daughter' : 'son';
  var age      = rand(2, 12);
  var origin   = pick(ADOPTION_ORIGINS);
  var namePool = gender === 'daughter' ? NAMES.female : NAMES.male;
  var name     = pick(namePool);
  var face     = gender === 'daughter' ? pick(ADOPTION_FACE_GIRLS) : pick(ADOPTION_FACE_BOYS);

  // Stats — generally lower than bio children, reflecting difficult starts
  // But occasionally one is remarkably able
  var health = rand(25, 75);
  var wit    = rand(25, 80);
  var looks  = rand(25, 75);

  // Personality hint — one word, evocative
  var personalities = ['watchful','gentle','fierce','quick','solemn','merry','guarded','curious','bold','quiet','proud','tender'];
  var personality   = pick(personalities);

  return {
    gender:     gender,
    name:       name,
    age:        age,
    health:     health,
    wit:        wit,
    looks:      looks,
    face:       face,
    origin:     origin,
    personality:personality,
    adopted:    true,
    adoptType:  origin.type,
    seeds:      { kind: 1 },
    traits:     [],
    closeness:  rand(15, 35), // built over time
  };
}

// ── Adoption picker — card-based HTML popup ─────────────────

function showAdoptionPicker(children) {
  // Add more distant relative origins to the pool naturally
  // Build card HTML — injected via queuePopup's statsHtml slot (after first <div)
  var cardsHtml = '<div style="margin-top:8px">';
  children.forEach(function(c, idx) {
    var genderLabel = c.gender === 'daughter' ? 'Girl' : 'Boy';
    var bar = function(label, val, col) {
      var pct = Math.min(100, Math.max(0, val));
      return '<div style="display:flex;align-items:center;gap:5px;margin:1px 0">'
        + '<span style="font-size:9px;color:var(--sepia);font-variant:small-caps;width:38px;flex-shrink:0">' + label + '</span>'
        + '<div style="flex:1;height:4px;background:rgba(255,255,255,.1);border-radius:2px">'
        + '<div style="width:' + pct + '%;height:100%;background:' + col + ';border-radius:2px"></div>'
        + '</div>'
        + '<span style="font-size:9px;color:var(--sepia);width:20px;text-align:right">' + val + '</span>'
        + '</div>';
    };
    cardsHtml +=
      '<div class="adopt-card" data-idx="' + idx + '" style="'
      + 'background:rgba(255,255,255,.04);border:1px solid rgba(180,134,11,.3);border-radius:8px;'
      + 'padding:10px 12px;margin:0 0 8px;cursor:pointer;transition:background .15s;-webkit-tap-highlight-color:transparent">'
      + '<div style="display:flex;align-items:flex-start;gap:10px">'
      + '<span style="font-size:34px;line-height:1.1;flex-shrink:0">' + c.face + '</span>'
      + '<div style="flex:1;min-width:0">'
      + '<div style="display:flex;justify-content:space-between;align-items:baseline;gap:4px">'
      + '<span style="color:var(--glt);font-size:15px;font-variant:small-caps">' + c.name + '</span>'
      + '<span style="color:var(--sepia);font-size:10px;white-space:nowrap">' + genderLabel + ' · ' + c.age + '</span>'
      + '</div>'
      + '<div style="color:var(--sepia);font-size:10px;font-style:italic;margin:2px 0 5px">' + c.personality + '</div>'
      + bar('Health', c.health, '#8b2020')
      + bar('Wit',    c.wit,    '#2d5016')
      + bar('Looks',  c.looks,  '#7a4f2d')
      + '</div></div>'
      + '<div style="color:var(--parch);font-size:11px;font-style:italic;margin-top:7px;line-height:1.5;opacity:.85">'
      + c.origin.text
      + '</div>'
      + '</div>';
  });
  cardsHtml += '</div>';

  // Use queuePopup with HTML in text — nextPopup will render the <div> as statsHtml
  var introText = 'Three children are brought to your attention.';
  queuePopup(
    introText + cardsHtml,
    null,
    [
      { text: 'Not at this time', fn() {
        queuePopup('You let the moment pass. The children will be cared for elsewhere. You think about it afterwards, more than you expected.');
        return null;
      }},
    ]
  );

  // After popup opens, wire card click handlers
  setTimeout(function() {
    var cards = document.querySelectorAll('.adopt-card');
    cards.forEach(function(card) {
      var i = parseInt(card.dataset.idx);
      var child = children[i];
      card.addEventListener('click', function() {
        closePopup();
        setTimeout(function() { confirmAdoption(child); }, 250);
      });
      card.addEventListener('mouseenter', function() {
        card.style.background = 'rgba(180,134,11,.12)';
      });
      card.addEventListener('mouseleave', function() {
        card.style.background = 'rgba(255,255,255,.04)';
      });
    });
  }, 80);
}


function confirmAdoption(child) {
  queuePopup(
    child.name + '.\n\n' + child.origin.text + '\n\nYou could change ' + (child.gender === 'daughter' ? 'her' : 'his') + ' life. You could also change yours.',
    null,
    [
      {
        text: 'Bring ' + child.name + ' home',
        fn() {
          if (!G.children) G.children = [];
          G.children.push(child);

          var faithGain = rand(5,10);
          var repEffect = child.adoptType === 'baseborn' || child.adoptType === 'parish' ? rand(-3,3) : rand(2,6);
          changeStat('faith', faithGain);
          changeStat('reputation', repEffect);

          addFeedEntry(child.name + ' joins your household.', 'event');
          queuePopup(
            child.name + ' arrives with almost nothing. '
              + (child.age <= 4 ? 'So young. You hold ' + (child.gender === 'daughter' ? 'her' : 'him') + ' for a long time.'
               : child.age <= 8 ? (child.gender === 'daughter' ? 'She' : 'He') + ' looks at everything very carefully before touching it. You understand that instinct.'
               : (child.gender === 'daughter' ? 'She' : 'He') + ' shakes your hand when you greet ' + (child.gender === 'daughter' ? 'her' : 'him') + '. Very formal. Very brave.')
              + ' This will take time. You have time.',
            'Faith +' + faithGain + (repEffect > 0 ? '  Rep +' + repEffect : repEffect < 0 ? '  Rep ' + repEffect : '')
          );
          renderStats(); saveGame(); return null;
        },
      },
      {
        text: 'Think about it a little longer',
        fn() {
          // Keep same children available for next visit
          G._pendingAdoption = child;
          queuePopup(
            'You ask for a little time. ' + child.name + ' waits with the patience of someone who has learned to wait.',
            null, null,
            function() {
              setTimeout(function() {
                queuePopup(
                  child.name + ' is still waiting. You said you needed time.',
                  null,
                  [
                    { text: 'Bring ' + child.name + ' home', fn() { confirmAdoption(child); return null; } },
                    { text: 'Let it go', fn() {
                      G._pendingAdoption = null;
                      queuePopup('You let it go. You do not entirely stop thinking about it.');
                      return null;
                    }},
                  ]
                );
              }, 400);
            }
          );
          return null;
        },
      },
    ]
  );
}


function fireChildlessMoment() {
  var isOlderNow = G.age >= 45;

  var scenarios = [
    {
      text: 'Your niece visits for a fortnight. She is fourteen and clever and exhausting and wonderful. When she leaves, the house is very quiet.',
      choices: [
        { text: 'Write to her mother about a longer visit', faith: rand(3,6), rep: rand(1,3), hint: 'Make her part of your life' },
        { text: 'Sit with the quiet and let it be what it is', wit: rand(2,4), hint: 'There is dignity in acceptance' },
        { text: 'Consider whether she might come to live with you', adopt: true, hint: 'Open the door' },
      ],
    },
    {
      text: 'You attend the christening of ' + (G.siblings && G.siblings.find(function(s){return s.alive;}) ? G.siblings.find(function(s){return s.alive;}).name + '\'s' : 'your cousin\'s') + ' third child. You hold the baby. The baby does not object.',
      choices: [
        { text: 'Offer to be godmother', faith: rand(4,8), rep: rand(2,5), hint: 'A role that matters' },
        { text: 'Smile and say all the right things', hint: 'Sometimes that is enough' },
        { text: 'Ask quietly about a poor relation who needs a home', adopt: true, hint: 'A different kind of family' },
      ],
    },
    {
      text: isOlderNow
        ? 'You are forty-' + (G.age - 40) + '. The physician has not said anything directly. But his expression, last visit, said something. The door, it seems, is closing.'
        : 'You think, not for the first time, about the nursery at the end of the hall. It has never been used. You do not know why you think about it as often as you do.',
      choices: [
        { text: 'Consider adoption', adopt: true, hint: 'Family is made, not only born' },
        { text: 'Turn your energy toward your work and connexions', rep: rand(3,6), wit: rand(2,4), hint: 'A different kind of legacy' },
        { text: 'Speak to your husband about it honestly', spouseClose: rand(5,12), hint: 'Some things need saying' },
      ],
    },
  ];

  var scenario = pick(scenarios);

  addFeedEntry('You think about family and legacy.', 'event');

  queuePopup(
    scenario.text,
    null,
    scenario.choices.map(function(c) {
      return {
        text: c.hint ? c.text + ' \u2014 ' + c.hint : c.text,
        fn() {
          if (c.faith)       changeStat('faith', c.faith);
          if (c.rep)         changeStat('reputation', c.rep);
          if (c.wit)         changeStat('wit', c.wit);
          if (c.spouseClose && G.spouse) G.spouse.closeness = Math.min(100, (G.spouse.closeness||60) + c.spouseClose);
          if (c.adopt) {
            setTimeout(function(){ openAdoptionMenu(); }, 400);
          } else {
            var responses = [
              'You make your choice and carry it forward.',
              'Some decisions settle something in you even if they change nothing outside.',
              'You do not know if it was the right decision. You made it honestly.',
            ];
            queuePopup(pick(responses));
          }
          renderStats(); saveGame(); return null;
        },
      };
    })
  );
}


// ── Dynasty view entry point (add to People tab or Household) ──
function openDynastyFromPeople() {
  openDynastyView();
}


// ═══════════════════════════════════════════════════════════
// FORTUNE HUNTER
// A man after your settlement rather than yourself.
// Potentially ruinous. Possibly romantic. Definitely chaos.
// ═══════════════════════════════════════════════════════════

function fireFortunehunter(data) {
  var settlement = data.settlement || 0;

  // Fortune hunters are charming, financially desperate, and often genuinely handsome
  var hunterNames = [
    { first:'Captain Ashford',  last:'Ashford',  title:'Captain', desc:'handsome in a reckless sort of way, with excellent posture and no visible income' },
    { first:'Mr Pelham',        last:'Pelham',   title:'Mr',      desc:'charming to a degree that would be suspicious if you were not enjoying it so much' },
    { first:'Lord Carwick',     last:'Carwick',  title:'Lord',    desc:'a lord in name, deeply in debt in practice, impossible to dislike in person' },
    { first:'Major Sterne',     last:'Sterne',   title:'Major',   desc:'a war hero, allegedly. The stories change slightly each time you hear them' },
    { first:'Mr Colville',      last:'Colville', title:'Mr',      desc:'well-dressed beyond his evident means and very attentive to what he is told you will receive' },
    { first:'Sir Jasper Oates',  last:'Oates',   title:'Sir',     desc:'a baronet of three months\' standing, a gaming debt of three years\' standing' },
  ];

  var hunter = pick(hunterNames);

  // How he makes his approach — several flavours
  var approaches = [
    'He appears at three consecutive events and manages to be introduced at all of them. He is persistent in a way that is difficult to object to directly.',
    'He flatters you in a manner so well-calibrated to your exact sensibilities that you wonder, briefly, if he has done research.',
    'He tells you that your intelligence is remarkable. Your eyes are remarkable. Your conversation is remarkable. At some point you realise he has not once mentioned your fortune, which means he has thought about it very carefully.',
    'He is introduced through a mutual friend. He is everything the friend said. The friend, you later realise, was paid.',
    'He contrives to be helpful at precisely the right moments. The umbrella when it rained. The lost glove found. You begin to find the coincidences suspicious.',
  ];

  addFeedEntry(hunter.title + ' ' + hunter.last + ' shows a marked interest in you.', 'event');

  queuePopup(
    hunter.title + ' ' + hunter.last + '.\n\n'
      + hunter.title + ' ' + hunter.last + ' is ' + hunter.desc + '.\n\n'
      + pick(approaches) + '\n\n'
      + 'Your settlement is ' + (settlement >= 500 ? 'known to be substantial' : 'known') + '. There are those who say he knows exactly how much.',
    'A charming stranger',
    [
      {
        text: 'Encourage him — he is very charming',
        fn() {
          // Risky — if you marry him it could go badly
          G._fortuneHunterSuitor = hunter;
          changeStat('reputation', rand(2,5));
          G.fashion = Math.min(100, (G.fashion||0) + rand(2,4)); // being pursued raises your profile
          addFeedEntry('You encourage ' + hunter.title + ' ' + hunter.last + '.', 'event');
          queuePopup(
            'You let him know his attentions are not unwelcome. He is very pleased. His attentions intensify. You are not sure whether this is thrilling or alarming. Possibly both.',
            'Rep +3  Fortune hunter encouraged',
            null,
            function() {
              // Queue a follow-up next season — proposal or exposure
              if (!G._fortuneHunterFollowUp) G._fortuneHunterFollowUp = hunter;
            }
          );
          renderStats(); saveGame(); return null;
        },
      },
      {
        text: 'Investigate quietly before deciding',
        fn() {
          // Wit check — find out the truth
          var witScore = G.wit || 50;
          var discovered = Math.random() < (0.30 + (witScore - 50) * 0.006);
          if (discovered) {
            changeStat('wit', rand(2,4));
            addFeedEntry('You discover ' + hunter.title + ' ' + hunter.last + ' is after your settlement.', 'event');
            queuePopup(
              'You ask a few careful questions of a few careful people. The answer comes back quickly.\n\n'
                + hunter.title + ' ' + hunter.last + ' has debts of approximately \u00a3' + rand(200,800).toLocaleString() + '. '
                + 'He is known in certain circles. The circles overlap, unfortunately, with yours.\n\n'
                + 'He is pursuing your settlement, not yourself. The distinction matters to you.',
              'Wit +3  Fortune hunter exposed',
              [
                { text: 'Dismiss him entirely', fn() {
                  changeStat('reputation', rand(2,5));
                  G._fortuneHunterSuitor = null;
                  queuePopup(
                    'You withdraw your attentions so smoothly that he cannot object to the manner of it, only the fact. He departs. You feel, against all reason, a small pang. He was very charming.',
                    'Rep +3'
                  );
                  renderStats(); saveGame(); return null;
                }},
                { text: 'Encourage him anyway — you are not naive, just willing', fn() {
                  G._fortuneHunterSuitor = hunter;
                  G._fortuneHunterKnown = true; // player knows but proceeds
                  queuePopup(
                    'You know what he is. You let him continue anyway. This is either very sophisticated or very unwise. You are not certain which. He is extremely handsome.',
                    'Eyes open'
                  );
                  saveGame(); return null;
                }},
              ]
            );
          } else {
            changeStat('wit', rand(1,2));
            queuePopup(
              'You ask around discreetly. Nothing definitive emerges. He may be exactly what he appears. Or the information has not reached you yet.',
              'Wit +1  Inconclusive'
            );
          }
          renderStats(); saveGame(); return null;
        },
      },
      {
        text: 'Rebuff him immediately',
        fn() {
          changeStat('reputation', rand(1,3));
          addFeedEntry('You rebuff ' + hunter.title + ' ' + hunter.last + '.', 'event');
          var rebuffs = [
            'You are polite but entirely clear. He withdraws gracefully. You wonder if you were right.',
            'You tell him, in so many words, that you are not interested. He looks surprised. Men like this are usually surprised.',
            'You remove yourself from his vicinity with such elegant finality that he cannot follow without making a scene. He does not make a scene. You almost wish he had.',
          ];
          queuePopup(pick(rebuffs), 'Rep +2');
          renderStats(); saveGame(); return null;
        },
      },
      {
        text: 'Do nothing — watch and see what he does next',
        fn() {
          G._fortuneHunterSuitor = hunter;
          addFeedEntry(hunter.title + ' ' + hunter.last + ' continues his attentions.', 'event');
          queuePopup(
            'You neither encourage nor discourage him. He takes this as encouragement. You are not surprised.',
            null,
            null,
            function() {
              if (!G._fortuneHunterFollowUp) G._fortuneHunterFollowUp = hunter;
            }
          );
          saveGame(); return null;
        },
      },
    ]
  );
}

// Fortune hunter follow-up — fires next season if player encouraged/waited
function checkFortuneHunterFollowUp() {
  if (!G._fortuneHunterFollowUp) return;
  var hunter = G._fortuneHunterFollowUp;
  G._fortuneHunterFollowUp = null;
  var knowingly = G._fortuneHunterKnown;

  // He proposes — player must decide with full awareness
  var debtAmount = rand(300, 1200);

  // Fortune hunter compatibility
  var fhCompat = G._fortuneHunterSuitor && G._fortuneHunterSuitor.compatibility !== undefined
    ? G._fortuneHunterSuitor.compatibility
    : (typeof calculateCompatibility === 'function' ? calculateCompatibility({ trait: 'charming', wit: 60, faith: 45, courtshipStyle: { id:'charming' }, _fortuneHunter: true }) : 35);
  var fhCompatLine = typeof compatibilityLine === 'function' ? compatibilityLine(fhCompat, 'charming') : '';

  queuePopup(
    hunter.title + ' ' + hunter.last + ' proposes.\n\n'
      + (knowingly
        ? 'You know what he is. He knows you know. There is a certain clarity to this conversation that most proposals lack.'
        : 'He is very convincing. The speech is excellent. You find yourself wondering if the feeling is real after all.')
      + '\n\n' + (fhCompatLine ? fhCompatLine + '\n\n' : '') + 'His debts are, by best estimate, \u00a3' + debtAmount.toLocaleString() + '. Your settlement is \u00a3' + (G.expectedSettlement || 0).toLocaleString() + '. The mathematics are straightforward.',
    'Proposal',
    [
      {
        text: 'Accept — you know what this is and choose it anyway',
        fn() {
          // High-risk marriage — he may improve or may be ruinous
          var suitor = {
            first: hunter.first.split(' ').pop(),
            last: hunter.last,
            fullName: hunter.title + ' ' + hunter.last,
            rankLabel: hunter.title === 'Lord' ? 'Peer' : hunter.title === 'Captain' || hunter.title === 'Major' ? 'Officer' : 'Gentleman',
            wealth: rand(200, 800), // deliberately modest
            titleRank: hunter.title === 'Lord' ? 2 : hunter.title === 'Sir' ? 1 : 0,
            trait: pick(['charming','ambitious','sardonic','witty']),
            desc: hunter.desc,
            courtshipStyle: { label:'Charming', flirtBonus: 2, danceBonus: 1 },
            _fortuneHunter: true,
            _debt: debtAmount,
          };
          if (typeof startWeddingPlanning === 'function') {
            startWeddingPlanning(suitor);
          } else if (typeof acceptProposal === 'function') {
            acceptProposal(suitor);
          }
          G._fortuneHunterSuitor = null;
          G._fortuneHunterKnown  = false;
          return null;
        },
      },
      {
        text: 'Refuse — you will not be a solution to someone else\'s debts',
        fn() {
          changeStat('reputation', rand(3,7));
          G._fortuneHunterSuitor = null;
          G._fortuneHunterKnown  = false;
          addFeedEntry('You refuse ' + hunter.title + ' ' + hunter.last + '.', 'event');
          queuePopup(
            'You tell him no. Clearly. He is, to his credit, not ugly about it.\n\n'
              + '"You are too clever," he says as he leaves. You are not entirely sure if this is a compliment.',
            'Rep +4'
          );
          renderStats(); saveGame(); return null;
        },
      },
      {
        text: 'Ask for time — you still are not sure',
        fn() {
          G._fortuneHunterFollowUp = hunter; // keep him waiting one more season
          queuePopup(
            'He says he will wait. He means it, which is either reassuring or alarming depending on how you look at it.',
          );
          saveGame(); return null;
        },
      },
    ]
  );
}
