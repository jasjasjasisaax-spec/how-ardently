// ═══════════════════════════════════════════════════════════
// debut.js — Debut planning, ceremony, and Diamond of the Season
// ═══════════════════════════════════════════════════════════

// ── DEBUT STATE ────────────────────────────────────────────
// G.debutPlan = {
//   age, season, type, outfit, chaperone, guestList, result
// }
// G.debutDone = bool

// ── DEBUT AGE NEGOTIATION ─────────────────────────────────
// Fires when player reaches 16 (or earlier if parents decide)

function triggerDebutNegotiation() {
  const parentApproval = typeof parentApprovalBonus === 'function' ? parentApprovalBonus() : 55;
  const rank = G.rankId;

  // Parents suggest an age based on rank and approval
  const suggestedAge = rank === 'nobility'  ? 17
                     : rank === 'gentry'    ? 17
                     : rank === 'clergy'    ? 18
                     : 18; // trade

  // High approval → parents want to debut sooner (more eager)
  const adjustedAge = parentApproval >= 70 ? Math.max(16, suggestedAge - 1) : suggestedAge;

  const parentName = G.mother && G.mother.alive ? 'Your mother'
                   : G.father && G.father.alive ? 'Your father'
                   : 'Your guardian';

  const urgency = parentApproval >= 70
    ? `${parentName} is eager. "The sooner the better," she says, already consulting the Season's calendar.`
    : parentApproval >= 45
    ? `${parentName} suggests it is time to think about your debut.`
    : `${parentName} mentions, rather distantly, that you ought to be thinking about society.`;

  queuePopup(
    `${urgency}\n\nThey suggest you debut at ${adjustedAge}.`,
    null,
    [
      {
        text: `Agree — debut at ${adjustedAge}`,
        fn() {
          G.debutAge = adjustedAge;
          addFeedEntry(`Your debut is set for age ${adjustedAge}.`, 'event');
          queuePopup(
            `Your debut is arranged for age ${adjustedAge}. The preparations begin.`,
            'Debut planned'
          );
          saveGame(); return null;
        },
      },
      {
        text: `Suggest ${adjustedAge + 1} — you are not ready`,
        fn() {
          const closenessLoss = rand(5, 12);
          if (G.mother && G.mother.alive) changeCloseness(G.mother, -closenessLoss);
          if (G.father && G.father.alive) changeCloseness(G.father, -closenessLoss);
          G.debutAge = adjustedAge + 1;
          addFeedEntry(`You negotiated: debut at ${adjustedAge + 1}.`, 'event');
          queuePopup(
            `${parentName} is not pleased but accepts the delay. You have another year of preparation.`,
            `Closeness -${closenessLoss}`
          );
          saveGame(); return null;
        },
      },
      ...(adjustedAge > 16 ? [{
        text: `Insist on 16 — you are ready now`,
        fn() {
          const closenessLoss = rand(8, 15);
          if (G.mother && G.mother.alive) changeCloseness(G.mother, -closenessLoss);
          if (G.father && G.father.alive) changeCloseness(G.father, -closenessLoss);
          G.debutAge = 16;
          addFeedEntry('You insisted: debut at 16.', 'event');
          queuePopup(
            `${parentName} thinks you are rushing things. You are certain you are not.`,
            `Closeness -${closenessLoss}`
          );
          saveGame(); return null;
        },
      }] : []),
      {
        text: `Ask to wait until 21`,
        fn() {
          const closenessLoss = rand(15, 25);
          if (G.mother && G.mother.alive) changeCloseness(G.mother, -closenessLoss);
          if (G.father && G.father.alive) changeCloseness(G.father, -closenessLoss);
          G.debutAge = 21;
          addFeedEntry('Your debut is delayed until 21.', 'event');
          queuePopup(
            `${parentName} is rather alarmed. "Twenty-one? You will be considered quite on the shelf." You hold your ground.`,
            `Closeness -${closenessLoss}`
          );
          saveGame(); return null;
        },
      },
    ]
  );
}

// ── PRE-DEBUT SUMMARY ─────────────────────────────────────
// Shown just before the debut planning begins

function showPreDebutSummary() {
  if (!G.eduStats) { startDebutPlanning(); return; }
  const e = G.eduStats;
  const elig = calculateEligibility();
  const eligLbl = eligibilityLabel(elig);

  // Build summary HTML using pbar
  let html = `<strong style="font-family:'Cormorant SC',serif;font-size:13px;letter-spacing:2px;color:var(--glt)">YOUR EDUCATION</strong>`;
  html += pbar('Literacy', e.literacy.total, '#7a4f2d');
  html += pbar('Reason',   e.reason.total,   '#2d5016');
  html += pbar('Faith',    e.faith.total,    '#4a3080');
  html += pbar('Decorum',  e.decorum.total,  '#b8860b');
  html += `<div class="pbar-divider"></div>`;
  html += pbar('Eligibility', elig, '#b8860b', eligLbl, true);

  // Narrative assessment
  const assessment = buildDebutAssessment(e, elig);

  queuePopup(
    `You are ${G.debutAge || G.age} years old. Your education is complete.\n\n${assessment}${html}`,
    null,
    [
      { text: 'Begin debut planning →', fn() { startDebutPlanning(); return null; } },
    ]
  );
}

function buildDebutAssessment(e, elig) {
  const parts = [];
  if (e.decorum.total >= 70) parts.push('Your accomplishments are exceptional — your music and dancing will be widely admired.');
  else if (e.decorum.total >= 45) parts.push('Your accomplishments are respectable.');
  else parts.push('Your accomplishments are modest. This will be noted.');

  if (e.literacy.total >= 60) parts.push('You are well-read and able to converse on almost any subject.');
  if (e.reason.total >= 55) parts.push('Your education in history and philosophy sets you apart from most young ladies.');
  if (e.faith.total >= 70) parts.push('Your piety is genuine and widely known.');

  if (G.schooling.type === 'boarding' && G.schooling.boarding) {
    parts.push(`Your time at ${G.schooling.boarding.name} has opened doors.`);
  }

  return parts.slice(0,2).join(' ') + '\n\n';
}

// ── DEBUT PLANNING ─────────────────────────────────────────

function startDebutPlanning() {
  G.debutPlan = {
    season:    null,
    type:      null,
    outfit:    null,
    chaperone: null,
    guestList: null,
    cost:      0,
    repEffect: 0,
    eligEffect:0,
    looksEffect:0,
  };
  openDebutStep_Season();
}

// STEP 1: Season
function openDebutStep_Season() {
  queuePopup(
    'When shall you make your debut?',
    null,
    [
      {
        text: 'Spring — the full London Season (best opportunity)',
        fn() {
          G.debutPlan.season    = 'Spring';
          G.debutPlan.repEffect += 5;
          openDebutStep_Type(); return null;
        },
      },
      {
        text: 'Autumn — a country assembly (modest, less remarked upon)',
        fn() {
          G.debutPlan.season     = 'Autumn';
          G.debutPlan.repEffect  += 1;
          G.debutPlan.eligEffect -= 5; // less noticed
          openDebutStep_Type(); return null;
        },
      },
    ]
  );
}

// STEP 2: Type of debut
function openDebutStep_Type() {
  const canCourt = G.reputation >= 60 && (G.rankId === 'nobility' || G.rankId === 'gentry');
  const season = G.debutPlan.season;

  queuePopup(
    `How shall you be presented to society?`,
    null,
    [
      {
        text: `The first ball of the ${season} — simple, traditional, free`,
        fn() {
          G.debutPlan.type       = 'first_ball';
          G.debutPlan.repEffect  += 8;
          openDebutStep_Outfit(); return null;
        },
      },
      {
        text: 'A dedicated debutante ball — planned by you (customisable)',
        fn() {
          G.debutPlan.type = 'own_ball';
          openDebutStep_Outfit(); return null;
        },
      },
      ...(canCourt ? [{
        text: `Presented at Court — before the Queen herself (£50+, exclusive)`,
        fn() {
          G.debutPlan.type        = 'court';
          G.debutPlan.cost       += 50;
          G.debutPlan.repEffect  += 20;
          G.debutPlan.eligEffect += 15;
          openDebutStep_Outfit(); return null;
        },
      }] : []),
    ]
  );
}

// STEP 3: Outfit
function openDebutStep_Outfit() {
  queuePopup(
    'Your debut gown. White is expected. What quality?',
    null,
    [
      {
        text: 'Extravagant — white silk, Brussels lace, trimmed with silver (£120)',
        fn() {
          G.debutPlan.outfit      = 'an extravagant white silk gown';
          G.debutPlan.cost       += 120;
          G.debutPlan.looksEffect += 12;
          G.debutPlan.eligEffect  += 8;
          G.debutPlan.repEffect   += 5;
          openDebutStep_Chaperone(); return null;
        },
      },
      {
        text: 'Elegant — white muslin with fine trim (£45)',
        fn() {
          G.debutPlan.outfit      = 'an elegant white muslin gown';
          G.debutPlan.cost       += 45;
          G.debutPlan.looksEffect += 7;
          G.debutPlan.eligEffect  += 4;
          openDebutStep_Chaperone(); return null;
        },
      },
      {
        text: 'Simple — white muslin, modest and proper (£15)',
        fn() {
          G.debutPlan.outfit      = 'a simple white muslin gown';
          G.debutPlan.cost       += 15;
          G.debutPlan.looksEffect += 3;
          openDebutStep_Chaperone(); return null;
        },
      },
      {
        text: 'Your best dress altered for the occasion (free)',
        fn() {
          G.debutPlan.outfit       = 'your altered best dress';
          G.debutPlan.looksEffect  += 1;
          G.debutPlan.eligEffect   -= 3;
          openDebutStep_Chaperone(); return null;
        },
      },
    ]
  );
}

// STEP 4: Chaperone
function openDebutStep_Chaperone() {
  const motherAlive = G.mother && G.mother.alive;
  const fatherAlive = G.father && G.father.alive;
  const hasGuardian = !!G.guardian;
  const motherClose = motherAlive ? (G.mother.closeness || 50) : 0;

  const options = [];

  if (motherAlive) {
    options.push({
      text: `Your mother — ${familyClosenessLabel(motherClose)} (free, ${motherClose >= 60 ? 'warm support' : 'present but distant'})`,
      fn() {
        G.debutPlan.chaperone  = 'mother';
        G.debutPlan.repEffect += motherClose >= 60 ? 6 : 2;
        openDebutStep_Guests(); return null;
      },
    });
  }
  if (fatherAlive) {
    options.push({
      text: 'Your father — unusual but dignified (free)',
      fn() {
        G.debutPlan.chaperone  = 'father';
        G.debutPlan.repEffect += 4;
        openDebutStep_Guests(); return null;
      },
    });
  }
  if (hasGuardian) {
    options.push({
      text: `Your guardian, ${G.guardian.name} (free)`,
      fn() {
        G.debutPlan.chaperone  = 'guardian';
        G.debutPlan.repEffect += 3;
        openDebutStep_Guests(); return null;
      },
    });
  }
  options.push({
    text: 'A hired companion — professional and presentable (£20)',
    fn() {
      G.debutPlan.chaperone   = 'hired';
      G.debutPlan.cost       += 20;
      G.debutPlan.repEffect  += 5;
      openDebutStep_Guests(); return null;
    },
  });
  options.push({
    text: 'A titled aunt or family connection (£10 gift)',
    fn() {
      G.debutPlan.chaperone   = 'connection';
      G.debutPlan.cost       += 10;
      G.debutPlan.repEffect  += 8;
      openDebutStep_Guests(); return null;
    },
  });

  queuePopup('Who shall chaperone you?', null, options);
}

// STEP 5: Guest list / who attends
function openDebutStep_Guests() {
  const isOwnBall = G.debutPlan.type === 'own_ball';

  if (!isOwnBall) {
    // First ball or Court — no guest list to plan
    G.debutPlan.guestList = 'the assembled company';
    resolveDebut();
    return;
  }

  // Own ball — choose scale
  queuePopup(
    'For your own ball — how grand a gathering?',
    null,
    [
      {
        text: 'Grand — one hundred and fifty guests, full orchestra (£200)',
        fn() {
          G.debutPlan.guestList   = 'one hundred and fifty guests';
          G.debutPlan.cost       += 200;
          G.debutPlan.repEffect  += 18;
          G.debutPlan.eligEffect += 10;
          resolveDebut(); return null;
        },
      },
      {
        text: 'Comfortable — sixty guests, quartet, supper (£80)',
        fn() {
          G.debutPlan.guestList   = 'sixty guests';
          G.debutPlan.cost       += 80;
          G.debutPlan.repEffect  += 10;
          G.debutPlan.eligEffect += 5;
          resolveDebut(); return null;
        },
      },
      {
        text: 'Intimate — thirty guests, piano, light refreshments (£30)',
        fn() {
          G.debutPlan.guestList   = 'thirty guests';
          G.debutPlan.cost       += 30;
          G.debutPlan.repEffect  += 5;
          resolveDebut(); return null;
        },
      },
    ]
  );
}

// ── DEBUT RESOLUTION ──────────────────────────────────────

function resolveDebut() {
  const plan = G.debutPlan;
  if (!plan) return;

  // Cost
  if (G.wealth < plan.cost) {
    const shortfall = plan.cost - G.wealth;
    G.wealth = 0;
    if (typeof initFinance === 'function') {
      G.debts = G.debts || [];
      G.debts.push({
        id: 'debut_debt_' + Date.now(), amount: shortfall, originalAmount: shortfall,
        creditor: 'debut expenses', interestRate: 0.08, seasons: 0, risky: false,
      });
    }
  } else {
    G.wealth -= plan.cost;
  }

  // Apply stat effects
  changeStat('looks',      plan.looksEffect || 0);
  changeStat('reputation', plan.repEffect   || 0);
  if (plan.eligEffect) {
    G.eligibility = clamp((G.eligibility || 0) + plan.eligEffect, 0, 100);
  }

  // Recalculate eligibility with all education stats
  calculateEligibility();

  // Court presentation — chance of Diamond of the Season
  let isDiamond = false;
  if (plan.type === 'court') {
    const eligibility = G.eligibility || 0;
    const roll = rand(1, 10);
    // Diamond chance: high eligibility + high roll + reputation
    const diamondThreshold = eligibility >= 75 ? 7
                           : eligibility >= 60 ? 8
                           : 9;
    if (roll >= diamondThreshold && G.reputation >= 65) {
      isDiamond = true;
    }
  }

  // Suitors introduced at debut based on eligibility modifiers
  const numSuitors = plan.type === 'court' ? rand(3,5)
                   : plan.type === 'own_ball' ? rand(2,4)
                   : rand(1,3);

  const mods = getEligibilityModifiers();
  for (let i = 0; i < numSuitors; i++) {
    const suitor = generateDebutSuitor(mods);
    if (suitor && typeof addToSuitorPool === 'function') {
      addToSuitorPool(suitor, 'debut');
    }
  }

  // Build narrative
  const narrative = buildDebutNarrative(plan, isDiamond);

  addFeedEntry(`Your debut — ${plan.type === 'court' ? 'presented at Court' : plan.type === 'own_ball' ? 'your own ball' : 'the Season\'s first ball'}.`, 'event');

  if (isDiamond) {
    changeStat('reputation', 25);
    G.eligibility = clamp(G.eligibility + 20, 0, 100);
    addFeedEntry('You are proclaimed Diamond of the Season!', 'event');
  }

  // Finalise
  G.phase     = 'adult';
  G.debutDone = true;
  // Convert schoolmates to adult NPCs
  if (typeof convertSchoolmatesToAdultNPCs === 'function') {
    const converted = convertSchoolmatesToAdultNPCs();
    if (converted > 0) {
      setTimeout(() => queuePopup(
        `Some of your schoolmates will be in London this Season. You will not be entirely among strangers.`,
        `${converted} schoolmate${converted>1?'s':''} joining society`
      ), 1000);
    }
  }
  G.debutPlan = null;

  saveGame();

  queuePopup(narrative, isDiamond ? '★ Diamond of the Season' : `Eligibility: ${eligibilityLabel(G.eligibility)}`, null,
    () => {
      buildNav();
      renderStats();
      if (typeof renderPeopleView === 'function') renderPeopleView();
      switchView('home');
    }
  );
}

function buildDebutNarrative(plan, isDiamond) {
  const chaperoneDesc = {
    mother:     'your mother on your arm',
    father:     'your father beside you',
    guardian:   'your guardian at your side',
    hired:      'a professional companion at your elbow',
    connection: 'a titled connection lending her consequence',
  };
  const chap = chaperoneDesc[plan.chaperone] || 'your chaperone';

  let narrative = '';

  if (plan.type === 'court') {
    narrative = `You enter the Queen's drawing room in ${plan.outfit}, ${chap}. The room is very quiet. You curtsey perfectly. `;
    if (isDiamond) {
      narrative += `Her Majesty pauses. She says something to the lady beside her. Within the hour, every person present knows: you have been called the Diamond of the Season. Your life changes in that moment.`;
    } else {
      narrative += `Her Majesty receives you graciously. You are presented, noted, and approved of. You have been introduced to society in the very best way.`;
    }
  } else if (plan.type === 'own_ball') {
    narrative = `Your debut ball. ${plan.guestList.charAt(0).toUpperCase() + plan.guestList.slice(1)}, ${plan.outfit}, ${chap}. You stand at the top of the stairs and look out at the room. Then you walk down into it.`;
  } else {
    narrative = `The first ball of the ${plan.season}. You arrive in ${plan.outfit}, ${chap}. The room takes notice. You have entered society.`;
  }

  return narrative;
}

function generateDebutSuitor(mods) {
  if (typeof generateSuitors !== 'function') return null;
  const suitors = generateSuitors(1);
  if (!suitors.length) return null;
  const s = suitors[0];

  // Apply eligibility modifiers
  if (mods.wealthBoost) s.wealth = Math.max(s.wealth, mods.wealthBoost);
  if (mods.clergyBoost && Math.random() < 0.4) {
    s.title = 'Reverend';
    s.rankLabel = 'Clergyman';
    s.fullName = 'Reverend ' + s.first + ' ' + s.last;
  }

  return s;
}
