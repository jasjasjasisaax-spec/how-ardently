// ═══════════════════════════════════════════════════════════
// people.js — The People tab: all relationships in one place
// Replaces Personal tab. Renders categorised profiles with
// full interactable actions.
// ═══════════════════════════════════════════════════════════

// ── MAIN PEOPLE VIEW ───────────────────────────────────────
// Renders into #view-people — categorised list of everyone

function renderPeopleView() {
  const el = document.getElementById('view-people');
  if (!el) return;

  // Build flat HTML — BitLife style, sections with inline rows, no popup for the list itself
  let html = `<div class="cat-hdr">
    <div class="cat-hdr-title">People</div>
    <div class="cat-hdr-sub">${buildPeopleSubtitle()}</div>
  </div>`;

  // ── Pregnancy status ─────────────────────────────────────
  if (typeof isPregnant === 'function' && isPregnant()) {
    html += peopleSection('Expecting');
    const pregStatus = typeof pregnancyStatusText === 'function' ? pregnancyStatusText() : 'With child';
    html += peopleRow('🤰', pregStatus, G.pregnancy && G.pregnancy.twins ? 'Twins expected' : G.pregnancy && G.pregnancy.triplets ? 'Triplets expected' : 'Due next season', null, null);
  }

  // ── Spouse ──────────────────────────────────────────────
  if (G.isMarried && G.spouse) {
    html += peopleSection('Spouse');
    html += peopleRow(G.spouse.gender==='female'?'👩':'👨', G.spouse.fullName, `${G.spouse.gender==='female'?'Wife':'Husband'} · £${(G.spouse.wealth||0).toLocaleString()}/yr`, 'spouse', 'spouse', G.spouse.age||null, G.spouse.closeness||65, true);
  }

  // ── Children ────────────────────────────────────────────
  if (G.children.length) {
    html += peopleSection(`Children (${G.children.length})`);
    for (const c of G.children) {
      const traitNote = c.traits && c.traits.length ? c.traits[0] : c.age >= 5 ? 'growing up' : 'infant';
      html += peopleRow(
        c.gender === 'son' ? '👦' : '👧',
        c.name,
        `${c.gender === 'son' ? 'Son' : 'Daughter'} · ${traitNote}`,
        'child', c.name, c.age||0, c.closeness||50, true
      );
    }
  }

  // ── Eligibility (post-debut, unmarried ladies) ──────────
  if (!G.isMarried && G.debutDone && G.gender === 'female' && G.eligibility > 0) {
    const eligLbl = typeof eligibilityLabel === 'function' ? eligibilityLabel(G.eligibility) : '';
    const pct = G.eligibility;
    const color = pct >= 70 ? '#2d5016' : pct >= 45 ? '#b8860b' : '#8b2020';
    html += peopleSection('Eligibility');
    html += `<div class="act-item" onclick="openEligibilityDetail()">
      <span class="act-icon">✨</span>
      <div class="act-body">
        <span class="act-name">${eligLbl}</span>
        <span class="act-relation">Season eligibility</span>
      </div>
    </div>
    <div class="people-rel-wrap" style="padding-left:14px;margin-top:-4px">
      <div class="people-rel-track"><div class="people-rel-fill" style="width:${pct}%;background:${color}"></div></div>
      <span class="people-rel-label">${pct}/100</span>
    </div>`;
  }

  // ── Marriage Mart (if unmarried adult) ──────────────────
  if (!G.isMarried && G.phase !== 'childhood' && G.age >= 16) {
    html += peopleSection('Marriage');
    html += peopleRow('💒', 'The Marriage Mart', G.season === 'Spring' ? 'The Season is the moment' : 'Available year-round', 'action', 'mart');
  }

  // ── Try for a child (if married) ──────────────────────
  if (G.isMarried && G.children.length < 8) {
    html += peopleSection('Family Planning');
    html += peopleRow('👶', G.children.length ? 'Try for another child' : 'Try for a child', 'Start or grow your family', 'action', 'children');
  }

  // ── Childhood friends (village/neighbourhood, shown during childhood) ──
  const childhoodFriends = G.phase === 'childhood'
    ? (G.npcs || []).filter(n => n.introduced && n.isChildhoodFriend)
    : [];
  if (childhoodFriends.length) {
    html += peopleSection('Friends');
    for (const n of childhoodFriends) {
      html += peopleRow('★', n.fullName, `Village friend · Age ${n.age||'?'}`, 'npc', n.id||n.nick, n.age||null, n.closeness, false);
    }
  }

  // ── Pets ────────────────────────────────────────────────
  const livePets = (G.pets || []).filter(p => p.alive);
  if (livePets.length) {
    html += peopleSection(`Pets (${livePets.length})`);
    for (const pet of livePets) {
      html += peopleRow(
        pet.emoji || '🐾',
        pet.name,
        `${pet.animal} · Age ${pet.age||0}`,
        'pet', pet.name,
        pet.age||0, pet.health, false
      );
    }
  }

  // ── Family ──────────────────────────────────────────────
  const hasFamily = (G.mother || G.father || G.siblings.length || G.guardian);
  if (hasFamily) {
    html += peopleSection('Family');
    if (G.mother) {
      html += peopleRow('👩', G.mother.name||'Mother', G.mother.alive ? 'Mother' : 'Mother · Deceased', G.mother.alive ? 'mother' : null, 'mother', G.mother.age||null, G.mother.alive?(G.mother.closeness||50):null, true);
    }
    if (G.father) {
      html += peopleRow('👨', G.father.name||'Father', G.father.alive ? 'Father' : 'Father · Deceased', G.father.alive ? 'father' : null, 'father', G.father.age||null, G.father.alive?(G.father.closeness||50):null, true);
    }
    for (let i = 0; i < G.siblings.length; i++) {
      const s = G.siblings[i];
      const extra = s.spouse ? ` · married` : s.eloped ? ' · eloped' : '';
      html += peopleRow(
        s.gender === 'sister' ? '👩' : '👦',
        s.name,
        s.alive ? (s.gender === 'sister' ? 'Sister' : 'Brother') + extra : (s.gender === 'sister' ? 'Sister' : 'Brother') + ' · Deceased',
        s.alive ? 'sibling' : null, String(i), s.age||null, s.alive?(s.closeness||50):null, true
      );
    }
    if (G.guardian) {
      html += peopleRow('🏠', G.guardian.name, 'Guardian', 'guardian', 'guardian', null);
    }
  }

  // ── Suitors of interest ──────────────────────────────────
  const availSuitors = typeof getAvailableSuitors === 'function' ? getAvailableSuitors() : [];
  if (!G.isMarried && availSuitors.length) {
    html += peopleSection('Gentlemen of Interest');
    for (const entry of availSuitors) {
      const s = entry.suitor;
      const sub = `${s.rankLabel} · £${s.wealth.toLocaleString()}/yr · met at ${entry.metHow}`;
      html += peopleRow('💙', s.fullName, sub, 'suitor', s.first + '_' + s.last, s.age||null, entry.interest||30, false);
    }
  }

  // ── Friends ─────────────────────────────────────────────
  const friends = G.npcs.filter(n => n.introduced && !n.isRival && n.closeness >= 40);
  if (friends.length) {
    html += peopleSection('Friends');
    for (const n of friends) {
      const icon = n.closeness >= 70 ? '★' : '♦';
      html += peopleRow(icon, n.fullName, npcStatus(n), 'npc', n.id||n.nick, n.age||null, n.closeness||0, false);
    }
  }

  // ── Acquaintances ───────────────────────────────────────
  const acquaintances = G.npcs.filter(n => n.introduced && !n.isRival && n.closeness < 40);
  if (acquaintances.length) {
    html += peopleSection('Acquaintances');
    for (const n of acquaintances) {
      html += peopleRow('○', n.fullName, 'Acquaintance', 'npc', n.id||n.nick, n.age||null, n.closeness||0, false);
    }
  }

  // ── Extended family ──────────────────────────────────────
  // In-laws (spouse's parents)
  const inLaws = G.isMarried && G.spouse && G.spouse.parents ? G.spouse.parents : [];
  // Siblings-in-law (spouse's siblings)
  const sibsInLaw = G.isMarried && G.spouse && G.spouse.siblings ? G.spouse.siblings : [];
  // Nieces and nephews (siblings' children)
  const niecesNephews = G.siblings.reduce(function(acc,s){return acc.concat((s.children||[]).map(function(c){return Object.assign({},c,{parentName:s.name,parentGender:s.gender});}));}, []);
  // Grandchildren
  const grandchildren = G.children.reduce(function(acc,c){return acc.concat((c.children||[]).map(function(gc){return Object.assign({},gc,{parentName:c.name});}));}, []);
  // Deceased family
  const deceased = [
    G.mother && !G.mother.alive ? { name: G.mother.name, relation:'Mother', icon:'👩' } : null,
    G.father && !G.father.alive ? { name: G.father.name, relation:'Father', icon:'👨' } : null,
    ...G.siblings.filter(s=>!s.alive).map(s=>({ name:s.name, relation:s.gender==='sister'?'Sister':'Brother', icon:s.gender==='sister'?'👩':'👦' })),
  ].filter(Boolean);

  const hasExtended = inLaws.length || sibsInLaw.length || niecesNephews.length || grandchildren.length;
  if (hasExtended) {
    html += peopleSection('Extended Family');
    for (const il of inLaws) {
      html += peopleRow('👴', il.name || 'Mother-in-law', il.role || 'In-law', null, null, il.age||null, null, true);
    }
    for (const sil of sibsInLaw) {
      html += peopleRow('👤', sil.name, sil.gender==='sister'?'Sister-in-law':'Brother-in-law', null, null, sil.age||null, sil.closeness||null, true);
    }
    for (const nn of niecesNephews) {
      const rel = nn.gender==='son' ? 'Nephew' : 'Niece';
      html += peopleRow(nn.gender==='son'?'👦':'👧', nn.name, `${rel} · child of ${nn.parentName}`, null, null, nn.age||0, null, true);
    }
    for (const gc of grandchildren) {
      html += peopleRow(gc.gender==='son'?'👦':'👧', gc.name, `Grandchild · child of ${gc.parentName}`, null, null, gc.age||0, null, true);
    }
  }

  if (deceased.length) {
    html += peopleSection('Departed');
    for (const d of deceased) {
      html += peopleRow('✝', d.name, `${d.relation} · Deceased`, null, null, null, null, true);
    }
  }

  // ── Rivals ──────────────────────────────────────────────
  const rivals = G.npcs.filter(n => n.isRival);
  if (rivals.length) {
    html += peopleSection('Rivals');
    for (const n of rivals) {
      html += peopleRow('⚔', n.fullName, 'Rival', 'npc', n.id||n.nick, n.age||null, n.closeness||0, false);
    }
  }

  // ── Empty state ─────────────────────────────────────────
  const totalPeople = (G.isMarried?1:0) + G.children.length + (G.mother?1:0) + (G.father?1:0) + G.siblings.length + G.npcs.filter(n=>n.introduced).length;
  if (totalPeople === 0) {
    html += `<div class="act-item"><div class="act-body"><span class="act-name">No one yet</span><span class="act-hint">Attend events and advance seasons to meet people</span></div></div>`;
  }

  el.innerHTML = html;

  // Bind all row clicks
  el.querySelectorAll('.people-row[data-type]').forEach(row => {
    row.addEventListener('click', () => {
      dispatchPeopleClick(row.dataset.type, row.dataset.id);
    });
  });
}

function buildPeopleSubtitle() {
  const parts = [];
  if (G.isMarried && G.spouse) parts.push('Married');
  if (G.children.length) parts.push(G.children.length + ' child' + (G.children.length!==1?'ren':''));
  const friends = G.npcs.filter(n=>n.introduced&&!n.isRival&&n.closeness>=40).length;
  if (friends) parts.push(friends + ' friend' + (friends!==1?'s':''));
  const acq = G.npcs.filter(n=>n.introduced&&!n.isRival&&n.closeness<40).length;
  if (acq) parts.push(acq + ' acquaintance' + (acq!==1?'s':''));
  return parts.length ? parts.join(' · ') : 'Your connections';
}

function peopleSection(label) {
  return `<div class="people-section-label">${label}</div>`;
}

function peopleRow(icon, name, sub, type, id, age, closeness, isFamily) {
  const clickable = type !== null;
  const ageStr    = age != null ? ` (${age})` : '';

  // Relationship bar — shown whenever closeness is a real value
  let relBar = '';
  if (closeness != null && closeness >= 0) {
    const pct   = Math.min(100, Math.max(0, closeness));
    const color = pct >= 70 ? '#2d5016' : pct >= 40 ? '#b8860b' : '#8b2020';
    const label = isFamily
      ? (pct>=80?'Devoted':pct>=60?'Close':pct>=40?'Cordial':pct>=20?'Distant':'Estranged')
      : (pct>=80?'Confidante':pct>=60?'Dear Friend':pct>=40?'Friend':pct>=20?'Acquaintance':'Stranger');
    relBar = `<div class="people-rel-wrap">
      <div class="people-rel-track">
        <div class="people-rel-fill" style="width:${pct}%;background:${color}"></div>
      </div>
      <span class="people-rel-label">${label}</span>
    </div>`;
  }

  // Use people-row class which is display:block so bar sits below
  return `<div class="act-item people-row${clickable?'':' locked'}" data-type="${type||''}" data-id="${id||''}">
    <div class="people-row-inner">
      <span class="act-icon">${icon}</span>
      <div class="act-body">
        <span class="act-name">${name}${ageStr}</span>
        <span class="act-relation">${sub}</span>
      </div>
      <span class="act-arr">${clickable ? '›' : ''}</span>
    </div>
    ${relBar}
  </div>`;
}

function getPeopleSub(item) {
  const p = item.person;
  if (!p.alive) return 'Deceased';
  switch (item.type) {
    case 'spouse':
      return `${p.fullName} · £${(p.wealth||0).toLocaleString()}/yr`;
    case 'child': {
      const traits = p.traits && p.traits.length ? p.traits.join(', ') : 'young';
      return `Age ${p.age||0} · ${traits}`;
    }
    case 'mother':
    case 'father':
      return `${familyClosenessLabel(p.closeness||50)} · ${p.trait || ''}`;
    case 'sibling': {
      const extra = p.spouse ? ` · Married to ${p.spouse}` : '';
      return `${p.gender} · closeness ${p.closeness}${extra}`;
    }
    case 'guardian':
      return `Guardian · ${p.type || ''}`;
    case 'npc':
      return `${npcStatus(p)} · closeness ${p.closeness} · Age ${p.age||'?'}`;
    default:
      return '';
  }
}

function dispatchPeopleClick(type, id) {
  switch (type) {
    case 'spouse':   openSpouseProfile();               break;
    case 'child':    openChildByName(id);               break;
    case 'mother':   openFamilyMemberProfile('mother'); break;
    case 'father':   openFamilyMemberProfile('father'); break;
    case 'sibling':  openSiblingProfile(parseInt(id));  break;
    case 'guardian': openGuardianProfile();             break;
    case 'action':
      if (id === 'mart')     openMarriageMart();
      if (id === 'children') openChildrenMenu();
      break;
    case 'pet': {
      const pet = (G.pets||[]).find(p => p.name === id);
      if (pet) openPetProfile(pet);
      break;
    }
    case 'suitor': {
      const [first, ...lastParts] = id.split('_');
      const last = lastParts.join('_');
      const entry = (G.suitorPool||[]).find(e => e.suitor.first === first && e.suitor.last === last);
      if (entry) openSuitorProfile(entry);
      break;
    }
    case 'npc': {
      const npc = G.npcs.find(n => (n.id||n.nick||n.name) === id);
      if (npc) openNPCProfileFromPeople(npc);
      break;
    }
  }
}

function openChildByName(name) {
  const child = G.children.find(c => c.name === name);
  if (child) openChildProfile(child);
}

// ── SUITOR PROFILE ────────────────────────────────────────

function openSuitorProfile(entry) {
  const s = entry.suitor;
  const style = s.courtshipStyle ? s.courtshipStyle.label : 'Unknown';
  const statsLine = s.health ? `Health ${s.health} · Wit ${s.wit} · Looks ${s.looks}` : '';
  queuePopup(
    `${s.fullName}
${s.rankLabel} · £${s.wealth.toLocaleString()}/yr · Age ${s.age||'?'}
${statsLine}

${(s.desc||'').charAt(0).toUpperCase()+(s.desc||'').slice(1)}.
Courtship style: ${style}

Met: ${entry.metSeason} at ${entry.metHow}`,
    null,
    [
      { text: '💌 Write to him',       fn() { doSuitorLetter(entry);  return null; } },
      { text: '💃 Arrange a meeting',  fn() { doSuitorMeeting(entry); return null; } },
      { text: '💒 Begin courting',     fn() { beginCourtship(s);      return null; } },
      { text: '✗ Decline his interest', fn() {
        entry.declined = true;
        addFeedEntry(s.firstName + ' is no longer in your orbit.', 'event');
        queuePopup(`You make it clear, gently, that you do not intend to encourage ${s.first}'s attentions. He withdraws gracefully.`);
        saveGame(); renderPeopleView(); return null;
      }},
      { text: '← Back', fn() { renderPeopleView(); return null; } },
    ]
  );
}

function doSuitorLetter(entry) {
  const s = entry.suitor;
  const g = rand(5,12);
  entry.interest = Math.min(100, (entry.interest||50) + g);
  addFeedEntry('You write to ' + s.first + '.', 'good');
  queuePopup(
    pick([
      `You compose a carefully worded letter to ${s.first}. His reply is prompt and warm.`,
      `You write to ${s.first} with a light question about his estate. He answers at length. This is encouraging.`,
      `A brief letter to ${s.first}. The correspondence is beginning to establish itself.`,
    ]),
    `Interest +${g}`,
    null,
    () => openSuitorProfile(entry)
  );
  saveGame();
}

function doSuitorMeeting(entry) {
  const s = entry.suitor;
  const roll = rand(1,10);
  if (roll >= 7) {
    const g = rand(8,15);
    entry.interest = Math.min(100, (entry.interest||50) + g);
    changeStat('reputation', rand(2,4));
    addFeedEntry('A successful meeting with ' + s.first + '.', 'good');
    queuePopup(
      `The meeting goes very well. ${s.first} is ${(s.desc||'charming')} and makes no secret of finding your company agreeable.`,
      `Interest +${g}`,
      null, () => openSuitorProfile(entry)
    );
  } else {
    entry.interest = Math.max(0, (entry.interest||50) - rand(5,10));
    addFeedEntry('An awkward meeting with ' + s.first + '.', 'bad');
    queuePopup(
      `The meeting is ${pick(['somewhat stilted','rather awkward','not as promising as hoped'])}. ${s.first} is polite but distant.`,
      null, null, () => openSuitorProfile(entry)
    );
  }
  saveGame();
}

// ── PET PROFILE ───────────────────────────────────────────

function openPetProfile(pet) {
  const healthColor = pet.health >= 70 ? '#2d5016' : pet.health >= 40 ? '#b8860b' : '#8b2020';
  const healthBar = pbar('Health', pet.health, healthColor);
  queuePopup(
    `${pet.name}\nYour ${pet.animal} · Age ${pet.age||0}${healthBar}`,
    null,
    [
      { text: '🤗 Spend time together', fn() {
        pet.health = Math.min(100, (pet.health||100) + rand(3,8));
        changeStat('health', rand(2,5));
        const msgs = [
          `${pet.name} is delighted to see you. The feeling is mutual.`,
          `You spend an hour with ${pet.name}. It is the best hour of the week.`,
          `${pet.name} does something ridiculous. You laugh until your sides hurt.`,
        ];
        addFeedEntry('You spend time with ' + pet.name + '.', 'good');
        queuePopup(pick(msgs), 'Health +4');
        renderStats(); saveGame();
        setTimeout(() => openPetProfile(pet), 400); return null;
      }},
      { text: '🍖 Feed and care for them', fn() {
        pet.health = Math.min(100, (pet.health||100) + rand(5,10));
        addFeedEntry(pet.name + ' is well cared for.', 'good');
        queuePopup(`${pet.name} is well-fed and content. ${pet.name} regards you with what you choose to interpret as gratitude.`, `${pet.name} health +8`);
        saveGame(); setTimeout(() => openPetProfile(pet), 400); return null;
      }},
      ...(pet.animal !== 'rabbit' && pet.animal !== 'cat' ? [{ text: '🌳 Take them out', fn() {
        changeStat('health', rand(3,7));
        pet.health = Math.min(100, (pet.health||100) + rand(2,5));
        addFeedEntry('You take ' + pet.name + ' out.', 'good');
        queuePopup(`You take ${pet.name} out for an airing. You are both considerably improved by it.`, 'Health +5');
        renderStats(); saveGame(); return null;
      }}] : []),
      { text: '← People', fn() { switchView('people'); renderPeopleView(); return null; } },
    ]
  );
}

// ── GUARDIAN PROFILE ───────────────────────────────────────
function openGuardianProfile() {
  if (!G.guardian) return;
  const g = G.guardian;
  const typeDesc = {
    wealthy_family: 'A relation of some standing who took you in.',
    kind_family:    'A family friend who cared for you.',
    orphanage:      'The parish orphanage where you were raised.',
    sibling:        'Your sibling, who stepped in when no one else did.',
  };
  queuePopup(
    `Guardian — ${g.name}\n\n${typeDesc[g.type] || 'Your guardian.'}\nCloseness: ${g.closeness}`,
    null,
    g.type !== 'orphanage' ? [
      { text: '💌 Write to them', fn() {
        g.closeness = Math.min(100, (g.closeness||0) + rand(5,10));
        addFeedEntry('You write to ' + g.name + '.', 'good');
        queuePopup('A warm reply arrives. The connection endures.', 'Closeness +7');
        saveGame(); return null;
      }},
      { text: '← Back', fn() { switchView('people'); return null; } },
    ] : [
      { text: 'Reflect on those years', fn() {
        changeStat('wit', rand(2,5));
        queuePopup('You think of those years. They were hard. You are who you are because of them.', 'Wit +3');
        return null;
      }},
      { text: '← Back', fn() { switchView('people'); return null; } },
    ]
  );
}

// ── ENHANCED NPC PROFILE ───────────────────────────────────
// (extends the one in ui.js — back button returns to People view)
function openNPCProfileFromPeople(npc) {
  const status   = npcStatus(npc);
  const canCourt = !G.isMarried
    && npc.gender === 'male'
    && G.gender === 'female'
    && npc.closeness >= 30
    && G.age >= 16;
  const statsLine = npc.health
    ? `Health ${npc.health} · Wit ${npc.wit} · Looks ${npc.looks}`
    : '';
  const wealthLine = `£${(npc.wealth||0).toLocaleString()}/yr · Age ${npc.age || '?'}`;
  const maritalLine = npc.isMarried ? 'Married' : 'Unmarried';

  queuePopup(
    `${npc.fullName}\n${wealthLine} · ${maritalLine}\n${statsLine}\n\n${npc.desc.charAt(0).toUpperCase() + npc.desc.slice(1)}.\n\nStatus: ${status} · Closeness: ${npc.closeness}`,
    null,
    [
      { text: '🏠 Visit in person',        fn() { doSocialVisit(npc);        return null; } },
      { text: '💌 Write a letter',         fn() { doSocialLetter(npc);       return null; } },
      { text: '🎁 Send a gift',            fn() { doSocialGift(npc);         return null; } },
      ...(G.season === 'Spring' && npc.closeness >= 25
        ? [{ text: '🎵 Invite to an event', fn() { doSocialInvite(npc);      return null; } }]
        : []),
      ...(canCourt
        ? [{ text: '💒 Begin courting',     fn() { beginCourtship(npc);      return null; } }]
        : []),
      ...(npc.closeness >= 40
        ? [{ text: '🤝 Ask a favour',       fn() { doSocialFavour(npc);      return null; } }]
        : []),
      { text: '💢 Have a falling out',     fn() { doSocialFallout(npc);      return null; } },
      { text: '← People',                  fn() { switchView('people'); renderPeopleView(); return null; } },
    ]
  );
}

// ── ASSETS VIEW ────────────────────────────────────────────
// Rendered in #view-assets

function renderAssetsView() {
  const el = document.getElementById('view-assets');
  if (!el) return;

  const summary = getAssetSummary();
  const titleText = G.title ? getFullStyledName() : G.name;
  const dynamic = titleWealthDynamic();

  let html = `<div class="cat-hdr">
    <div class="cat-hdr-title">Assets & Estate</div>
    <div class="cat-hdr-sub">Net income: £${summary.netIncome}/season · Total value: £${summary.totalValue.toLocaleString()}</div>
  </div>`;

  // Title & standing section
  html += `<div class="act-section">Title & Standing</div>`;
  html += `<div class="act-item" data-key="title_view">
    <span class="act-icon">👑</span>
    <div class="act-body">
      <span class="act-name">${titleText}</span>
      <span class="act-hint">${dynamic.label || getTitleLabel() || 'Untitled'}</span>
    </div>
    <span class="act-arr">›</span>
  </div>`;

  // Owned assets
  if (G.assets && G.assets.length) {
    html += `<div class="act-section">Your Property</div>`;
    for (const asset of G.assets) {
      const condIcon = asset.condition >= 70 ? '🟢' : asset.condition >= 35 ? '🟡' : '🔴';
      const rentNote = asset.rentedOut ? ` · Rented £${asset.rentalIncome}/season` : '';
      html += `<div class="act-item" data-key="asset_${asset.instanceId}">
        <span class="act-icon">${assetIcon(asset.type)}</span>
        <div class="act-body">
          <span class="act-name">${asset.name}</span>
          <span class="act-hint">${condIcon} Condition ${asset.condition} · £${asset.currentValue.toLocaleString()} value${rentNote}</span>
        </div>
        <span class="act-arr">›</span>
      </div>`;
    }
  }

  // Buy section
  html += `<div class="act-section">Acquire</div>`;
  html += `<div class="act-item" data-key="buy_estate"><span class="act-icon">🏡</span><div class="act-body"><span class="act-name">Buy Property</span><span class="act-hint">Estates, townhouses</span></div><span class="act-arr">›</span></div>`;
  html += `<div class="act-item" data-key="buy_carriage"><span class="act-icon">🚗</span><div class="act-body"><span class="act-name">Buy a Carriage</span><span class="act-hint">Gig to travelling coach</span></div><span class="act-arr">›</span></div>`;
  html += `<div class="act-item" data-key="buy_horse"><span class="act-icon">🐎</span><div class="act-body"><span class="act-name">Buy Horses</span><span class="act-hint">From cob to thoroughbred</span></div><span class="act-arr">›</span></div>`;
  html += `<div class="act-item" data-key="buy_jewellery"><span class="act-icon">💎</span><div class="act-body"><span class="act-name">Buy Jewellery</span><span class="act-hint">Investment and adornment</span></div><span class="act-arr">›</span></div>`;
  html += `<div class="act-item" data-key="buy_farmland"><span class="act-icon">🌾</span><div class="act-body"><span class="act-name">Buy Farmland</span><span class="act-hint">Productive land</span></div><span class="act-arr">›</span></div>`;

  // Title acquisition
  html += `<div class="act-section">Titles</div>`;
  if (!G.title || G.title.rank < 2) {
    html += `<div class="act-item" data-key="buy_baronetcy"><span class="act-icon">📜</span><div class="act-body"><span class="act-name">Purchase a Baronetcy</span><span class="act-hint">£3,000 · Sir/Lady prefix</span></div><span class="act-arr">›</span></div>`;
  }
  html += `<div class="act-item" data-key="title_view"><span class="act-icon">👑</span><div class="act-body"><span class="act-name">View Title & Standing</span><span class="act-hint">${titleSummaryText().split('\n')[0]}</span></div><span class="act-arr">›</span></div>`;

  // Will
  html += `<div class="act-section">Your Will</div>`;
  html += `<div class="act-item" data-key="will_view"><span class="act-icon">📋</span><div class="act-body"><span class="act-name">${G.will && G.will.written ? 'Review Your Will' : 'Write Your Will'}</span><span class="act-hint">${G.will && G.will.written ? willSummaryText().split('\n')[1] || 'Will written' : 'No will yet — law decides'}</span></div><span class="act-arr">›</span></div>`;

  el.innerHTML = html;

  el.querySelectorAll('.act-item').forEach(item => {
    item.addEventListener('click', () => dispatchAssetsClick(item.dataset.key));
  });
}

function assetIcon(type) {
  return { estate:'🏡', carriage:'🚗', horse:'🐎', jewellery:'💎', farmland:'🌾' }[type] || '📦';
}

// ── ASSET DISPATCH ─────────────────────────────────────────
function dispatchAssetsClick(key) {
  if (key.startsWith('asset_')) {
    const id = key.replace('asset_', '');
    const asset = (G.assets||[]).find(a => a.instanceId === id);
    if (asset) openAssetProfile(asset);
    return;
  }
  switch (key) {
    case 'buy_estate':    openBuyMenu('estates');    break;
    case 'buy_carriage':  openBuyMenu('carriages');  break;
    case 'buy_horse':     openBuyMenu('horses');     break;
    case 'buy_jewellery': openBuyMenu('jewellery');  break;
    case 'buy_farmland':  openBuyMenu('farmland');   break;
    case 'buy_baronetcy': openBuyBaronetcy();        break;
    case 'title_view':    openTitleView();            break;
    case 'will_view':     openWillView();             break;
  }
}

// ── ASSET PROFILE ──────────────────────────────────────────
function openAssetProfile(asset) {
  const repairResult = repairAsset; // just reference
  const incomeText = asset.rentedOut
    ? `Rented out · £${asset.rentalIncome}/season`
    : `Income £${asset.income || 0}/season · Upkeep £${asset.upkeep || 0}/season`;

  const availableImprovements = (ASSET_CATALOGUE.improvements && !asset.rentedOut)
    ? Object.entries(ASSET_CATALOGUE.improvements)
        .filter(([id]) => !asset.improvements.includes(id))
        .slice(0, 4)
    : [];

  queuePopup(
    `${asset.name}\n\nCondition: ${asset.condition}/100\nValue: £${asset.currentValue.toLocaleString()}\n${incomeText}${asset.improvements.length ? '\nImprovements: ' + asset.improvements.join(', ') : ''}`,
    null,
    [
      ...(!asset.rentedOut ? [{
        text: `🔧 Repair (£${Math.floor((100-asset.condition) * (asset.upkeep||20) * 0.5)})`,
        fn() {
          const r = repairAsset(asset);
          if (r.success) {
            addFeedEntry(asset.name + ' repaired.', 'good');
            queuePopup(`${asset.name} is fully restored. Cost: £${r.cost}.`, `Condition 100`);
          } else {
            queuePopup(`You cannot afford the repairs. £${r.cost} required.`);
          }
          renderStats(); saveGame();
          setTimeout(() => renderAssetsView(), 200);
          return null;
        },
      }] : []),
      ...(!asset.rentedOut ? [{
        text: '💰 Rent it out',
        fn() {
          const r = rentOutAsset(asset);
          addFeedEntry(asset.name + ' rented out.', 'good');
          queuePopup(`${asset.name} is rented out at £${r.rentalIncome}/season. You will not be able to use it yourself.`, `Income +£${r.rentalIncome}`);
          renderStats(); saveGame();
          setTimeout(() => renderAssetsView(), 200);
          return null;
        },
      }] : [{
        text: '🏠 Stop renting out',
        fn() {
          stopRenting(asset);
          addFeedEntry(asset.name + ' — tenants departed.', 'event');
          queuePopup(`${asset.name} is yours again.`);
          setTimeout(() => renderAssetsView(), 200);
          return null;
        },
      }]),
      ...(availableImprovements.length ? [{
        text: '🏗 Add an improvement',
        fn() { openImprovementMenu(asset); return null; },
      }] : []),
      ...(asset.type === 'jewellery' ? [{
        text: '🎁 Gift to someone',
        fn() { openGiftJewelleryMenu(asset); return null; },
      }] : []),
      {
        text: `💷 Sell (£${Math.floor(asset.currentValue * (asset.condition/100) * 0.8).toLocaleString()})`,
        fn() {
          queuePopup(
            `Sell ${asset.name} for £${Math.floor(asset.currentValue * (asset.condition/100) * 0.8).toLocaleString()}? This cannot be undone.`,
            null,
            [
              { text: 'Yes — sell', fn() {
                const r = sellAsset(asset);
                addFeedEntry(asset.name + ' sold for £' + r.salePrice.toLocaleString() + '.', 'good');
                queuePopup(`${asset.name} sold for £${r.salePrice.toLocaleString()}.`, `+£${r.salePrice.toLocaleString()}`);
                renderStats(); saveGame();
                setTimeout(() => renderAssetsView(), 200);
                return null;
              }},
              { text: 'No — keep it', fn() { openAssetProfile(asset); return null; } },
            ]
          );
          return null;
        },
      },
      {
        text: '📋 Add to will',
        fn() { openBequestMenu(asset); return null; },
      },
      { text: '← Assets', fn() { renderAssetsView(); return null; } },
    ]
  );
}

// ── IMPROVEMENT MENU ───────────────────────────────────────
function openImprovementMenu(asset) {
  const available = Object.entries(ASSET_CATALOGUE.improvements)
    .filter(([id]) => !asset.improvements.includes(id));

  queuePopup(
    `Add an improvement to ${asset.name}:`,
    null,
    [
      ...available.map(([id, imp]) => ({
        text: `${imp.name} — £${imp.price} (income +£${imp.incomeBonus||0}, upkeep +£${imp.upkeepBonus||0})`,
        fn() {
          const r = addImprovement(asset, id);
          if (r.success) {
            addFeedEntry(imp.name + ' added to ' + asset.name + '.', 'good');
            queuePopup(`${imp.name} is complete. ${imp.desc}`, `Value +15%`);
            renderStats(); saveGame();
            setTimeout(() => renderAssetsView(), 200);
          } else if (r.reason === 'insufficient_funds') {
            queuePopup('You cannot presently afford this improvement.');
          }
          return null;
        },
      })),
      { text: '← Back', fn() { openAssetProfile(asset); return null; } },
    ]
  );
}

// ── BUY MENU ───────────────────────────────────────────────
function openBuyMenu(category) {
  const items = ASSET_CATALOGUE[category] || [];
  const canAfford = items.filter(t => G.wealth >= t.price);

  queuePopup(
    `You have £${G.wealth.toLocaleString()} available.`,
    null,
    [
      ...items.map(t => ({
        text: `${t.name} — £${t.price.toLocaleString()}${G.wealth < t.price ? ' (cannot afford)' : ''}`,
        fn() {
          if (G.wealth < t.price) {
            queuePopup('You cannot presently afford this.');
            return null;
          }
          queuePopup(
            `${t.name}\n\n${t.desc}\n\nPrice: £${t.price.toLocaleString()}\nIncome: £${t.baseIncome||t.incomeBonus||0}/season\nUpkeep: £${t.upkeep||0}/season`,
            null,
            [
              { text: `Purchase for £${t.price.toLocaleString()}`, fn() {
                const r = buyAsset(t);
                if (r.success) {
                  addFeedEntry(t.name + ' acquired.', 'event');
                  queuePopup(`${t.name} is yours. ${t.desc}`, `£${t.price.toLocaleString()} spent`);
                  renderStats(); saveGame();
                  setTimeout(() => renderAssetsView(), 200);
                }
                return null;
              }},
              { text: '← Back', fn() { openBuyMenu(category); return null; } },
            ]
          );
          return null;
        },
      })),
      { text: '← Assets', fn() { renderAssetsView(); return null; } },
    ]
  );
}

// ── GIFT JEWELLERY ─────────────────────────────────────────
function openGiftJewelleryMenu(asset) {
  const people = [
    G.mother && G.mother.alive ? { name: 'Mother', obj: G.mother }   : null,
    G.isMarried && G.spouse    ? { name: G.spouse.fullName, obj: G.spouse } : null,
    ...G.npcs.filter(n => n.introduced && n.closeness >= 40).map(n => ({ name: n.nick, obj: n })),
    ...G.siblings.filter(s => s.alive).map(s => ({ name: s.name, obj: s })),
    ...G.children.map(c => ({ name: c.name, obj: c })),
  ].filter(Boolean);

  queuePopup(
    `Gift ${asset.name} (worth £${asset.currentValue.toLocaleString()}) to whom?`,
    null,
    [
      ...people.map(p => ({
        text: p.name,
        fn() {
          const r = giftJewellery(asset, p.name);
          if (p.obj && p.obj.closeness !== undefined) {
            changeCloseness(p.obj, rand(15,25));
          }
          addFeedEntry(asset.name + ' gifted to ' + p.name + '.', 'good');
          queuePopup(
            `You give ${asset.name} to ${p.name}. The gesture is received with evident emotion.`,
            `Closeness +18`
          );
          renderStats(); saveGame();
          setTimeout(() => renderAssetsView(), 200);
          return null;
        },
      })),
      { text: '← Back', fn() { openAssetProfile(asset); return null; } },
    ]
  );
}

// ── WILL VIEW ──────────────────────────────────────────────
function openWillView() {
  const heirs = getEligibleHeirs();
  queuePopup(
    willSummaryText(),
    null,
    [
      { text: '👤 Set principal heir', fn() { openHeirMenu(heirs); return null; } },
      { text: '🏡 Assign specific bequests', fn() { openBequestListMenu(); return null; } },
      { text: '💷 Divide wealth between heirs', fn() { openWealthSplitMenu(heirs); return null; } },
      { text: '← Assets', fn() { renderAssetsView(); return null; } },
    ]
  );
}

function openHeirMenu(heirs) {
  queuePopup(
    'Who shall be your principal heir?',
    null,
    [
      ...heirs.map(h => ({
        text: `${h.name} (${h.relation})`,
        fn() {
          setHeir(h);
          addFeedEntry('Your will names ' + h.name + ' as principal heir.', 'event');
          queuePopup(`${h.name} is named as your principal heir.`, 'Will updated');
          saveGame(); return null;
        },
      })),
      { text: '← Back', fn() { openWillView(); return null; } },
    ]
  );
}

function openBequestListMenu() {
  const assets = G.assets || [];
  if (!assets.length) {
    queuePopup('You have no assets to bequeath.', null, null, () => openWillView());
    return;
  }
  queuePopup(
    'Which asset shall you assign?',
    null,
    [
      ...assets.map(asset => ({
        text: `${asset.name} (£${asset.currentValue.toLocaleString()})`,
        fn() { openBequestMenu(asset); return null; },
      })),
      { text: '← Back', fn() { openWillView(); return null; } },
    ]
  );
}

function openBequestMenu(asset) {
  const heirs = getEligibleHeirs();
  queuePopup(
    `Leave ${asset.name} to whom?`,
    null,
    [
      ...heirs.map(h => ({
        text: h.name + ' (' + h.relation + ')',
        fn() {
          addBequest(asset.instanceId, h.name, h.relation);
          queuePopup(`${asset.name} will pass to ${h.name}.`, 'Bequest recorded');
          saveGame(); return null;
        },
      })),
      { text: '← Back', fn() { openBequestListMenu(); return null; } },
    ]
  );
}

function openWealthSplitMenu(heirs) {
  // Simple: equal split, or weighted options
  const count = heirs.length;
  if (!count) { queuePopup('No heirs to divide between.'); return; }
  const equal = heirs.map(h => ({ recipientName: h.name, fraction: 1/count }));
  queuePopup(
    `Divide your wealth between ${count} heir${count>1?'s':''}?`,
    null,
    [
      { text: `Equal share (${Math.round(100/count)}% each)`, fn() {
        setWealthSplit(equal);
        queuePopup('Wealth will be divided equally between ' + heirs.map(h=>h.name).join(', ') + '.', 'Will updated');
        saveGame(); return null;
      }},
      { text: 'All to principal heir', fn() {
        setWealthSplit([]);
        queuePopup('All wealth passes to your principal heir.', 'Will updated');
        saveGame(); return null;
      }},
      { text: '← Back', fn() { openWillView(); return null; } },
    ]
  );
}

// ── TITLE VIEW ─────────────────────────────────────────────
function openTitleView() {
  const dyn = titleWealthDynamic();
  queuePopup(
    titleSummaryText(),
    null,
    [
      ...(!G.title || G.title.rank < 2 ? [{
        text: `Purchase a Baronetcy (£3,000)`,
        fn() { openBuyBaronetcy(); return null; },
      }] : []),
      { text: '← Back', fn() { renderAssetsView(); return null; } },
    ]
  );
}

function openBuyBaronetcy() {
  const r = purchaseBaronetcy();
  if (r.success) {
    addFeedEntry('You are now Sir/Lady ' + G.name + '.', 'event');
    queuePopup(
      `The paperwork is completed. You are now ${getFullStyledName()}. Your mother would have been very pleased.`,
      'Title: Baronet'
    );
    renderStats(); saveGame();
    setTimeout(() => renderAssetsView(), 200);
  } else if (r.reason === 'insufficient_funds') {
    queuePopup(`A baronetcy costs £${r.cost.toLocaleString()}. You have £${G.wealth.toLocaleString()}.`);
  } else if (r.reason === 'already_titled') {
    queuePopup('You are already titled. This would be redundant.');
  }
}


// ═══════════════════════════════════════════════════════════
// FINANCE MENUS (in Assets tab)
// ═══════════════════════════════════════════════════════════

function openInvestmentMenu() {
  const active = typeof getActiveInvestments === 'function' ? getActiveInvestments() : [];
  queuePopup(
    `Your investments:\n${active.length ? active.map(i=>`${i.name}: £${i.amount.toLocaleString()}`).join('\n') : 'None currently.'}\n\nInvest in what?`,
    null,
    [
      ...INVESTMENT_OPTIONS.map(opt => ({
        text: `${opt.name} — min £${opt.minAmount} (${opt.riskLevel} risk, ~${Math.round(opt.baseReturn*100)}%/yr)`,
        fn() {
          gamePrompt(`Invest how much in ${opt.name}? (min £${opt.minAmount})`, String(opt.minAmount), (amtStr) => {
            const amt = parseInt(amtStr);
            if (!amt || isNaN(amt)) return;
            const r = makeInvestment(opt.id, amt);
          if (r.success) {
            addFeedEntry('Investment: ' + opt.name + ' £' + amt + '.', 'good');
            queuePopup(`£${amt.toLocaleString()} invested in ${opt.name}. ${opt.desc}`, `Invested £${amt.toLocaleString()}`);
            renderStats(); saveGame();
          } else if (r.reason === 'insufficient_funds') {
            queuePopup(`You cannot afford £${amt.toLocaleString()} at present.`);
          } else if (r.reason === 'below_minimum') {
            queuePopup(`The minimum investment in ${opt.name} is £${r.min.toLocaleString()}.`);
          }
          return null;
          }); return null;
        },
      })),
      ...(active.length ? [{
        text: '💷 Sell an investment',
        fn() {
          queuePopup('Which investment to sell?', null,
            active.map(inv => ({
              text: `${inv.name} — £${inv.amount.toLocaleString()}`,
              fn() {
                const r = sellInvestment(inv);
                addFeedEntry(inv.name + ' sold for £' + r.proceeds + '.', 'good');
                queuePopup(`${inv.name} sold. You receive £${r.proceeds.toLocaleString()}.`, `+£${r.proceeds.toLocaleString()}`);
                renderStats(); saveGame(); return null;
              },
            })).concat([{ text:'← Back', fn(){openInvestmentMenu();return null;} }])
          );
          return null;
        },
      }] : []),
      { text: '← Assets', fn() { renderAssetsView(); return null; } },
    ]
  );
}

function openDebtMenu() {
  const debts = G.debts || [];
  if (!debts.length) {
    queuePopup('You have no outstanding debts. A most enviable position.', null, null, ()=>renderAssetsView());
    return;
  }
  queuePopup(
    `Outstanding debts:\n${debts.map(d=>`${d.creditor}: £${d.amount.toLocaleString()} (${d.seasons} seasons)`).join('\n')}`,
    null,
    [
      ...debts.map(d => ({
        text: `Repay ${d.creditor} — £${d.amount.toLocaleString()}`,
        fn() {
          const r = repayDebt(d);
          if (r.success) {
            addFeedEntry('Debt to ' + d.creditor + ' repaid.', 'good');
            queuePopup(`Debt to ${d.creditor} repaid. £${r.amount.toLocaleString()} paid. The relief is considerable.`, 'Debt cleared');
            renderStats(); saveGame();
          } else {
            queuePopup(`You cannot presently afford £${d.amount.toLocaleString()}.`);
          }
          return null;
        },
      })),
      { text: '← Assets', fn() { renderAssetsView(); return null; } },
    ]
  );
}

function openBorrowMenu() {
  queuePopup(
    `You have £${G.wealth.toLocaleString()} available. From whom shall you borrow?`,
    null,
    [
      ...DEBT_CREDITORS.map((c, i) => ({
        text: `${c.name} — ${Math.round(c.interest*100)}%/yr interest${c.risky ? ' ⚠ risky' : ''}`,
        fn() {
          gamePrompt(`Borrow how much from ${c.name}?`, '200', (amtStr) => {
            const amt = parseInt(amtStr);
            if (!amt || isNaN(amt) || amt <= 0) return;
            const r = borrowMoney(amt, i);
          if (r.success) {
            addFeedEntry('You borrow £' + amt + ' from ' + c.name + '.', 'event');
            queuePopup(`£${amt.toLocaleString()} borrowed from ${c.name} at ${Math.round(c.interest*100)}% per annum. The money is useful. The obligation is not.`, `+£${amt.toLocaleString()}`);
            renderStats(); saveGame();
          } else if (r.reason === 'reputation_too_low') {
            queuePopup(`Your reputation is not sufficient for ${c.name} to extend credit.`);
          }
          return null;
          }); return null;
        },
      })),
      { text: '← Assets', fn() { renderAssetsView(); return null; } },
    ]
  );
}
