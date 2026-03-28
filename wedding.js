// ═══════════════════════════════════════════════════════════
// wedding.js — Multi-step wedding planning flow
// Called from ui.js after proposal accepted
// ═══════════════════════════════════════════════════════════

// ── WEDDING STATE ──────────────────────────────────────────
// Stored temporarily in G.weddingPlan during planning
// Resolved on completion

function startWeddingPlanning(suitor) {
  // Store suitor reference — planning takes one popup chain
  G.weddingPlan = {
    suitor,
    venue:         null,
    guestList:     null,
    outfit:        null,
    breakfast:     null,
    honeymoon:     null,
    totalCost:     0,
    repEffect:     0,
    looksEffect:   0,
    healthEffect:  0,
    closenessEffect: 0,
  };
  openWeddingStep_Venue();
}

// ── STEP 1: VENUE ──────────────────────────────────────────
function openWeddingStep_Venue() {
  const suitor = G.weddingPlan.suitor;
  queuePopup(
    `${suitor.fullName} has asked for your hand. Before the wedding itself, there are arrangements to be made.\n\nFirst — the venue.`,
    null,
    [
      {
        text: 'St George\'s, Hanover Square — the fashionable choice (£80)',
        fn() {
          G.weddingPlan.venue     = 'St George\'s, Hanover Square';
          G.weddingPlan.totalCost += 80;
          G.weddingPlan.repEffect += 12;
          openWeddingStep_GuestList(); return null;
        },
      },
      {
        text: 'The village church — quietly respectable (£20)',
        fn() {
          G.weddingPlan.venue      = 'the village church';
          G.weddingPlan.totalCost += 20;
          G.weddingPlan.repEffect += 4;
          G.weddingPlan.closenessEffect += 5; // more intimate
          openWeddingStep_GuestList(); return null;
        },
      },
      {
        text: 'The private chapel of his estate — exclusive (£50)',
        fn() {
          G.weddingPlan.venue      = G.weddingPlan.suitor.first + '\'s private chapel';
          G.weddingPlan.totalCost += 50;
          G.weddingPlan.repEffect += 8;
          G.weddingPlan.closenessEffect += 3;
          openWeddingStep_GuestList(); return null;
        },
      },
      {
        text: 'Gretna Green — scandalous, romantic, immediate (£30 travel)',
        fn() {
          G.weddingPlan.venue      = 'Gretna Green';
          G.weddingPlan.totalCost += 30;
          G.weddingPlan.repEffect += -15; // scandal
          G.weddingPlan.closenessEffect += 20; // enormously romantic
          G.weddingPlan.looksEffect += 5; // the adventure suits you
          // Skip to resolution — no time for planning
          G.weddingPlan.guestList  = 'just the two of us';
          G.weddingPlan.breakfast  = 'a simple meal at the inn';
          G.weddingPlan.outfit     = 'travelling clothes';
          G.weddingPlan.honeymoon  = 'the journey home';
          resolveWedding(); return null;
        },
      },
    ]
  );
}

// ── STEP 2: GUEST LIST ─────────────────────────────────────
function openWeddingStep_GuestList() {
  queuePopup(
    'The guest list. How large a gathering?',
    null,
    [
      {
        text: 'Grand affair — two hundred guests (£200)',
        fn() {
          G.weddingPlan.guestList  = 'two hundred guests';
          G.weddingPlan.totalCost += 200;
          G.weddingPlan.repEffect += 15;
          // Risk: something goes wrong at large events
          if (rand(1,10) <= 3) {
            G.weddingPlan.repEffect -= 8;
            G.weddingPlan._guestDisaster = true;
          }
          openWeddingStep_Outfit(); return null;
        },
      },
      {
        text: 'Respectable company — fifty guests (£80)',
        fn() {
          G.weddingPlan.guestList  = 'fifty guests';
          G.weddingPlan.totalCost += 80;
          G.weddingPlan.repEffect += 8;
          openWeddingStep_Outfit(); return null;
        },
      },
      {
        text: 'Family and close friends only — twenty guests (£30)',
        fn() {
          G.weddingPlan.guestList  = 'family and close friends';
          G.weddingPlan.totalCost += 30;
          G.weddingPlan.repEffect += 3;
          G.weddingPlan.closenessEffect += 10;
          openWeddingStep_Outfit(); return null;
        },
      },
      {
        text: 'Entirely private — immediate family only (£10)',
        fn() {
          G.weddingPlan.guestList  = 'immediate family only';
          G.weddingPlan.totalCost += 10;
          G.weddingPlan.repEffect += -3; // raised eyebrows
          G.weddingPlan.closenessEffect += 15;
          openWeddingStep_Outfit(); return null;
        },
      },
    ]
  );
}

// ── STEP 3: OUTFIT ─────────────────────────────────────────
function openWeddingStep_Outfit() {
  queuePopup(
    'The dress. This is not a small matter.',
    null,
    [
      {
        text: 'Extravagant — Brussels lace, silk, the works (£150)',
        fn() {
          G.weddingPlan.outfit     = 'an extravagant gown of Brussels lace';
          G.weddingPlan.totalCost += 150;
          G.weddingPlan.repEffect += 8;
          G.weddingPlan.looksEffect += 12;
          openWeddingStep_Breakfast(); return null;
        },
      },
      {
        text: 'Elegant — silk with modest trimming (£60)',
        fn() {
          G.weddingPlan.outfit     = 'an elegant silk gown';
          G.weddingPlan.totalCost += 60;
          G.weddingPlan.repEffect += 5;
          G.weddingPlan.looksEffect += 7;
          openWeddingStep_Breakfast(); return null;
        },
      },
      {
        text: 'Simple and beautiful — white muslin (£25)',
        fn() {
          G.weddingPlan.outfit     = 'a simple white muslin gown';
          G.weddingPlan.totalCost += 25;
          G.weddingPlan.looksEffect += 4;
          openWeddingStep_Breakfast(); return null;
        },
      },
      {
        text: 'Your best existing dress — altered for the occasion (free)',
        fn() {
          G.weddingPlan.outfit     = 'your best altered dress';
          G.weddingPlan.repEffect += -2;
          G.weddingPlan.looksEffect += 2;
          openWeddingStep_Breakfast(); return null;
        },
      },
    ]
  );
}

// ── STEP 4: WEDDING BREAKFAST ─────────────────────────────
function openWeddingStep_Breakfast() {
  queuePopup(
    'The wedding breakfast. A great deal rides on the table.',
    null,
    [
      {
        text: 'Lavish — imported wines, twelve courses, a centrepiece (£120)',
        fn() {
          G.weddingPlan.breakfast  = 'a lavish breakfast of twelve courses';
          G.weddingPlan.totalCost += 120;
          G.weddingPlan.repEffect += 10;
          G.weddingPlan.closenessEffect += 8;
          openWeddingStep_Honeymoon(); return null;
        },
      },
      {
        text: 'Generous — good food, good wine, enough for everyone (£50)',
        fn() {
          G.weddingPlan.breakfast  = 'a generous breakfast';
          G.weddingPlan.totalCost += 50;
          G.weddingPlan.repEffect += 5;
          G.weddingPlan.closenessEffect += 5;
          openWeddingStep_Honeymoon(); return null;
        },
      },
      {
        text: 'Simple — cold meats, cake, and good company (£20)',
        fn() {
          G.weddingPlan.breakfast  = 'a simple but warm breakfast';
          G.weddingPlan.totalCost += 20;
          G.weddingPlan.closenessEffect += 10; // intimacy over grandeur
          openWeddingStep_Honeymoon(); return null;
        },
      },
    ]
  );
}

// ── STEP 5: HONEYMOON ──────────────────────────────────────
function openWeddingStep_Honeymoon() {
  queuePopup(
    'After the ceremony — where shall you go?',
    null,
    [
      {
        text: 'Tour the Continent — France, Italy, the Alps (£300)',
        fn() {
          G.weddingPlan.honeymoon  = 'a continental tour';
          G.weddingPlan.totalCost += 300;
          G.weddingPlan.repEffect += 12;
          G.weddingPlan.healthEffect += 8;
          G.weddingPlan.closenessEffect += 15;
          resolveWedding(); return null;
        },
      },
      {
        text: 'Bath — fashionable, restorative, close (£80)',
        fn() {
          G.weddingPlan.honeymoon  = 'a stay in Bath';
          G.weddingPlan.totalCost += 80;
          G.weddingPlan.repEffect += 6;
          G.weddingPlan.healthEffect += 12;
          resolveWedding(); return null;
        },
      },
      {
        text: 'The Lake District — romantic, wild (£60)',
        fn() {
          G.weddingPlan.honeymoon  = 'a tour of the Lakes';
          G.weddingPlan.totalCost += 60;
          G.weddingPlan.healthEffect += 10;
          G.weddingPlan.closenessEffect += 10;
          resolveWedding(); return null;
        },
      },
      {
        text: 'His estate — quiet, together (£10)',
        fn() {
          G.weddingPlan.honeymoon  = 'a quiet retreat to the estate';
          G.weddingPlan.totalCost += 10;
          G.weddingPlan.healthEffect += 5;
          G.weddingPlan.closenessEffect += 20; // very intimate
          resolveWedding(); return null;
        },
      },
      {
        text: 'Stay in London — the Season is not over (free)',
        fn() {
          G.weddingPlan.honeymoon  = 'remaining in London';
          G.weddingPlan.repEffect += 5;
          resolveWedding(); return null;
        },
      },
    ]
  );
}

// ── RESOLUTION ─────────────────────────────────────────────
function resolveWedding() {
  const plan    = G.weddingPlan;
  const suitor  = plan.suitor;
  const cost    = plan.totalCost;

  // Check affordability — if can't afford, reduce effects
  const canAfford = G.wealth >= cost;
  if (!canAfford) {
    // Take debt to cover shortfall
    const shortfall = cost - G.wealth;
    G.wealth = 0;
    initFinance();
    G.debts.push({
      id: 'wedding_debt_' + Date.now(),
      amount: shortfall,
      originalAmount: shortfall,
      creditor: 'wedding expenses',
      interestRate: 0.08,
      seasons: 0,
      risky: false,
    });
  } else {
    G.wealth -= cost;
  }

  // Apply all effects
  acceptProposal(suitor);
  changeStat('looks',      plan.looksEffect);
  changeStat('health',     plan.healthEffect);
  changeStat('reputation', plan.repEffect);

  if (G.spouse) changeCloseness(G.spouse, plan.closenessEffect);
  if (G.mother && G.mother.alive) changeCloseness(G.mother, rand(5,12));
  if (G.father && G.father.alive) changeCloseness(G.father, rand(3,8));

  // Parent reaction
  const parentReact = typeof parentReactionToMarriage === 'function'
    ? parentReactionToMarriage(suitor.wealth) : null;

  // Build narrative
  const isGretna = plan.venue === 'Gretna Green';
  const disasterNote = plan._guestDisaster
    ? ' Something goes slightly wrong with the seating arrangements. It will be talked about.'
    : '';

  const narrative = isGretna
    ? `You and ${suitor.first} elope to Gretna Green. Your mother does not speak to you for a month. ${suitor.first} is entirely worth it.`
    : `The wedding takes place at ${plan.venue}. You wear ${plan.outfit}. ${plan.guestList.charAt(0).toUpperCase()+plan.guestList.slice(1)} attend — ${plan.breakfast}. Afterwards, you set off for ${plan.honeymoon}.${disasterNote}`;

  const badgeText = canAfford
    ? `£${cost.toLocaleString()} · Married ✓`
    : `Married ✓ · Debt: £${(cost - Math.max(0, G.wealth + cost - cost)).toLocaleString()}`;

  // Add feed entry
  addFeedEntry('You are married to ' + suitor.fullName + '.', 'event');

  // Queue wedding popup, then parent reaction if any
  queuePopup(narrative, badgeText, null, () => {
    if (parentReact) queuePopup(parentReact.text, parentReact.badge || null);
    buildNav();
    renderStats();
    renderPeopleView && renderPeopleView();
    saveGame();
  });

  G.weddingPlan = null;
  renderStats();
  saveGame();
}

// ── BALL PLANNING ──────────────────────────────────────────
// A recurring event — plan a ball at your estate (Spring only, requires estate)

function openBallPlanning() {
  if (!G.assets || !G.assets.some(a => a.type === 'estate')) {
    queuePopup('You would need an estate to host a ball. A hired room is possible, however.',
      null, [
        { text: 'Hire Assembly Rooms (£40)', fn() { hostHiredBall(); return null; } },
        { text: 'Perhaps another time', fn() { return {}; } },
      ]
    );
    return;
  }
  if (G.season !== 'Spring') {
    queuePopup('A ball in Autumn is unusual but not unheard of. Proceed?', null, [
      { text: 'Yes — host an Autumn ball', fn() { openBallScale(); return null; } },
      { text: 'Wait for Spring', fn() { return {}; } },
    ]);
    return;
  }
  openBallScale();
}

function openBallScale() {
  queuePopup('What kind of ball shall you host?', null, [
    {
      text: 'Grand ball — full orchestra, supper, two hundred guests (£180)',
      fn() { hostBall(180, 200, 20, 15); return null; },
    },
    {
      text: 'Evening party with dancing — fifty guests (£60)',
      fn() { hostBall(60, 50, 12, 8); return null; },
    },
    {
      text: 'Intimate dance — family and close friends (£25)',
      fn() { hostBall(25, 20, 6, 3); return null; },
    },
  ]);
}

function hostBall(cost, guestCount, repGain, closenessGain) {
  if (G.wealth < cost) {
    queuePopup(`A ball of this scale costs £${cost}. You have £${G.wealth.toLocaleString()}.`);
    return;
  }
  G.wealth -= cost;
  const roll = rand(1,10);
  let repActual = repGain;
  let narrative;

  if (roll >= 8) {
    repActual += rand(5,10);
    narrative = `The ball is a triumph. People will talk about it for the rest of the Season. You move through your own rooms with perfect ease.`;
  } else if (roll >= 4) {
    narrative = `The ball goes well. Your guests are pleased. You are a creditable host. Several introductions are made.`;
  } else {
    repActual -= rand(3,8);
    narrative = `The ball is not quite the success you hoped. The musicians are late, the supper runs short, and it rains. Your guests are gracious about it. You are mortified.`;
  }

  // Introduce NPCs at the ball
  if (G.npcPool && G.npcs.filter(n=>n.introduced).length < 10) {
    const intro = introduceRandomNPC();
    if (intro) {
      narrative += ` You are introduced to ${intro.npc.fullName}.`;
    }
  }

  changeStat('reputation', repActual);
  G.npcs.filter(n=>n.introduced).forEach(n => changeCloseness(n, rand(2,closenessGain)));
  if (G.spouse) changeCloseness(G.spouse, rand(3,8));

  addFeedEntry('You host a ball.', 'event');
  queuePopup(narrative, `Reputation ${repActual >= 0 ? '+' : ''}${repActual}`);
  renderStats(); saveGame();
}

function hostHiredBall() {
  const cost = 40;
  if (G.wealth < cost) { queuePopup('You cannot presently afford the hire fees.'); return; }
  G.wealth -= cost;
  const rep = rand(4,10);
  changeStat('reputation', rep);
  addFeedEntry('You hire rooms for an evening party.', 'event');
  queuePopup('You hire the Assembly Rooms for the evening. It is modest but cheerful. A success of its kind.', `Reputation +${rep}`);
  renderStats(); saveGame();
}
