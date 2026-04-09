// ═══════════════════════════════════════════════════════════
// household.js — Household Management System
// For married female players
// ═══════════════════════════════════════════════════════════

// ── HOUSEHOLD INIT ─────────────────────────────────────────

function initHousehold() {
  if (G.gender !== 'female') return;
  if (!G.isMarried) return;
  if (G.household) return; // already initialised

  G.household = {
    tier: calculateHouseholdTier(),

    staff: {
      housekeeper: { hired:false, name:null, quality:0, wage:0, happiness:100 },
      cook:        { hired:false, name:null, quality:0, wage:0, happiness:100 },
      ladysMaid:   { hired:false, name:null, quality:0, wage:0, happiness:100 },
      butler:      { hired:false, name:null, quality:0, wage:0, happiness:100 },
      wetNurse:    { hired:false, name:null, quality:0, wage:0, happiness:100 },
      governess:   { hired:false, name:null, quality:0, wage:0, happiness:100 },
      nursemaid:   { hired:false, name:null, quality:0, wage:0, happiness:100 },
      footmen:     { count:0, wage:0 },
      coachman:    { hired:false, name:null, quality:0, wage:0, happiness:100 },
    },

    accounts: {
      seasonlyAllowance: 0,
      staffWages:        0,
      balance:           0,
      history:           [],
    },

    management: {
      housekeeping:   0,
      catering:       0,
      entertaining:   0,
      budgeting:      0,
      staffRelations: 50,
      total:          0,
      collapsed:      false,
    },

    entertaining: {
      morningCalls:  { hosted:0, received:0 },
      dinnerParties: { hosted:0, history:[]  },
      cardEvenings:  { hosted:0 },
      balls:         { hosted:0 },
    },

    nursery: {
      hasWetNurse:   false,
      governessName: null,
    },
  };

  calculateHouseholdAllowance();
  recalcHouseholdStats();
  saveGame();
}

// ── TIER ───────────────────────────────────────────────────

function calculateHouseholdTier() {
  var spouse = G.spouse;
  if (!spouse) return 'humble';

  // Combined annual income: husband's wealth + player's own income/assets
  var husbandIncome = spouse.wealth    || 0;
  var playerIncome  = G.income         || 0;
  var titleRank     = spouse.titleRank || 0;
  var combined      = husbandIncome + playerIncome;

  // Assets can lift the tier — owning a grand estate or manor matters
  var ownsGrandEstate = G.assets && G.assets.some(function(a) { return a.id === 'grand_estate'; });
  var ownsManor       = G.assets && G.assets.some(function(a) { return a.id === 'manor'; });
  var assetIncome     = 0;
  if (G.assets) {
    G.assets.forEach(function(a) { assetIncome += (a.baseIncome || 0); });
  }
  combined += assetIncome;

  // Title always lifts tier
  if (titleRank >= 4 || ownsGrandEstate || combined > 3000) return 'grand';
  if (titleRank >= 2 || ownsManor       || combined > 1500) return 'wealthy';
  if (combined > 600)                                        return 'comfortable';
  if (combined > 250)                                        return 'modest';
  return 'humble';
}

// ── STAFF AVAILABILITY ─────────────────────────────────────

// ── HOUSEHOLD TIERS ───────────────────────────────────────
// humble:      Curate's wife, small farmer. One servant if lucky.
// modest:      Respectable but not comfortable. A small establishment.
// comfortable: Gentleman's family. The expected minimum for a lady.
// wealthy:     Well-off gentry. A proper household.
// grand:       Nobility or very wealthy. A full establishment.

const STAFF_BY_TIER = {
  humble:      ['cook'],
  modest:      ['cook','housekeeper','nursemaid'],
  comfortable: ['cook','housekeeper','ladysMaid','nursemaid','wetNurse','coachman'],
  wealthy:     ['cook','housekeeper','ladysMaid','nursemaid','wetNurse',
                'butler','governess','coachman'],
  grand:       ['cook','housekeeper','ladysMaid','nursemaid','wetNurse',
                'butler','governess','coachman','footmen'],
};

// How many of each staff are standard at each tier
const STAFF_COUNT_BY_TIER = {
  humble:      { cook:1 },
  modest:      { cook:1, housekeeper:1 },
  comfortable: { cook:1, housekeeper:1, ladysMaid:1, coachman:1 },
  wealthy:     { cook:1, housekeeper:1, ladysMaid:1, butler:1, coachman:1 },
  grand:       { cook:1, housekeeper:1, ladysMaid:1, butler:1, coachman:1, footmen:4 },
};

function getAvailableStaff() {
  // All roles available — no tier gating
  // Footmen can be hired multiple times (up to 8)
  return ['housekeeper','cook','ladysMaid','butler','nursemaid',
          'wetNurse','governess','coachman','footmen'];
}

// ── WAGES ──────────────────────────────────────────────────

// Flat annual wages — no tier requirement
const STAFF_WAGES = {
  housekeeper: 20,
  cook:        16,
  ladysMaid:   14,
  butler:      30,
  wetNurse:    10,
  governess:   25,
  nursemaid:   10,
  coachman:    18,
};
const FOOTMAN_WAGE = 12; // per footman

const FOOTMEN_WAGE = { humble:0, modest:0, comfortable:0, wealthy:10, grand:12 };

// ── STAFF NAMES ────────────────────────────────────────────
// Regency convention: female upper servants = Mrs [Surname]
// Male servants addressed by first name

const STAFF_SURNAMES = ['Brown','Smith','Jones','Taylor','White',
                        'Harris','Martin','Clarke','Cooper','Ward'];
const STAFF_MALE_NAMES = ['John','William','Thomas','James','Robert','George',
                           'Henry','Charles','Edward','Samuel'];
const FEMALE_ROLES = ['housekeeper','cook','ladysMaid','wetNurse','governess','nursemaid'];

function generateStaffName(role) {
  if (FEMALE_ROLES.includes(role)) {
    return 'Mrs ' + pick(STAFF_SURNAMES);
  }
  return pick(STAFF_MALE_NAMES);
}

// ── HIRE ───────────────────────────────────────────────────

function hireStaff(role) {
  if (!G.household) return { success:false, message:'No household yet.' };
  const h   = G.household;
  const avail = getAvailableStaff();

  if (!avail.includes(role)) {
    return { success:false, message:'That is not a recognised household role.' };
  }
  if (role === 'footmen') {
    return hireFootman();
  }
  if (h.staff[role] && h.staff[role].hired) {
    return { success:false, message:'You already have a ' + role + '.' };
  }

  var wage    = STAFF_WAGES[role] || 0;
  var quality = rand(55, 95);
  var name    = generateStaffName(role);

  h.staff[role] = { hired:true, name:name, quality:quality, wage:wage, happiness:85 };

  addAccountEntry('wages', 'Engaged ' + role, -wage);
  recalcHouseholdStats();
  saveGame();

  return { success:true, name, wage,
    message: name + ' has entered your service at £' + wage + ' per annum.' };
}

function hireFootman() {
  var h    = G.household;
  var wage = FOOTMAN_WAGE || 12;

  h.staff.footmen.count = Math.min(h.staff.footmen.count + 1, 6);
  h.staff.footmen.wage  = wage;

  addAccountEntry('wages', 'New footman engaged', -wage);
  recalcHouseholdStats();
  saveGame();

  return { success:true,
    message: 'A footman has been engaged at £' + wage + ' per annum.' };
}

// ── DISMISS ────────────────────────────────────────────────

function dismissStaff(role) {
  if (!G.household) return { success:false, message:'No household.' };
  const h = G.household;

  if (role === 'footmen') {
    if (h.staff.footmen.count <= 0) return { success:false, message:'No footmen to dismiss.' };
    h.staff.footmen.count--;
    recalcHouseholdStats(); saveGame();
    return { success:true, message:'A footman has been dismissed.' };
  }
  if (!h.staff[role] || !h.staff[role].hired) {
    return { success:false, message:'You have no ' + role + ' to dismiss.' };
  }

  const name = h.staff[role].name;
  h.staff[role] = { hired:false, name:null, quality:0, wage:0, happiness:100 };

  recalcStaffWages();
  recalcHouseholdStats();
  saveGame();

  return { success:true, message: name + ' has been dismissed from your service.' };
}

// ── ACCOUNT BOOK ───────────────────────────────────────────

function addAccountEntry(category, description, amount) {
  if (!G.household) return;
  // Use age + season as time reference (G.year doesn't exist)
  G.household.accounts.history.push({
    ref:         'Age ' + G.age + ' · ' + G.season,
    category,    // 'wages'|'provisions'|'entertaining'|'allowance'
    description,
    amount,      // negative = expense, positive = income
  });
  // Keep history to last 20 entries to avoid bloating saves
  if (G.household.accounts.history.length > 20) {
    G.household.accounts.history = G.household.accounts.history.slice(-20);
  }
  recalcHouseholdBalance();
}

function recalcHouseholdBalance() {
  if (!G.household) return;
  const a = G.household.accounts;
  a.balance = a.history.reduce(function(sum, e) { return sum + e.amount; }, 0);
}

function calculateHouseholdAllowance() {
  if (!G.household) return;

  // Husband's allowance is based on his wealth, not the tier
  // This is the amount he chooses to give — she may supplement it
  var husbandWealth  = G.spouse ? (G.spouse.wealth || 0) : 0;
  var spouseApproval = G.spouse ? (G.spouse.approval || 60) : 60;

  // Base allowance: roughly 10% of husband's annual income per season
  var baseAllowance = Math.floor(husbandWealth / 10);

  // Spouse approval affects willingness to give
  if (spouseApproval < 20) {
    baseAllowance = Math.floor(baseAllowance * 0.4); // very unhappy — barely anything
  } else if (spouseApproval < 35) {
    baseAllowance = Math.floor(baseAllowance * 0.65);
  } else if (spouseApproval >= 80) {
    baseAllowance = Math.floor(baseAllowance * 1.2); // very happy — extra generosity
  }

  // Minimum of 20, maximum of 5000 per season
  baseAllowance = Math.max(20, Math.min(5000, baseAllowance));

  G.household.accounts.seasonlyAllowance = baseAllowance;
  G.household.accounts.husbandAllowance  = baseAllowance; // store separately
  addAccountEntry('allowance',
    'Allowance from ' + (G.spouse ? G.spouse.first : 'your husband'),
    baseAllowance);
}

// Player adds their own funds to the household budget
function topUpHouseholdBudget(amount) {
  if (!G.household) return false;
  if (!amount || amount <= 0) return false;
  if (G.wealth < amount) return false;
  G.wealth -= amount;
  addAccountEntry('top_up', 'Your personal contribution', amount);
  saveGame();
  return true;
}

// ── RECALCULATION ──────────────────────────────────────────

function recalcStaffWages() {
  if (!G.household) return 0;
  const staff = G.household.staff;
  var total = 0;
  Object.keys(staff).forEach(function(role) {
    if (role === 'footmen') {
      total += staff.footmen.count * (staff.footmen.wage || 0);
    } else if (staff[role].hired) {
      total += staff[role].wage || 0;
    }
  });
  G.household.accounts.staffWages = total;
  return total;
}

function recalcHouseholdStats() {
  if (!G.household) return;
  const h = G.household;
  const e = G.eduStats;

  h.management.housekeeping = h.staff.housekeeper && h.staff.housekeeper.hired
    ? h.staff.housekeeper.quality : 20;

  h.management.catering = h.staff.cook && h.staff.cook.hired
    ? h.staff.cook.quality : 20;

  // Education feeds into household management
  if (e) {
    // Fixed: no optional chaining for Android compat
    h.management.budgeting    = Math.min(100, 20 + (e.reason  ? e.reason.total  : 0));
    h.management.entertaining = Math.min(100, 20 + (e.decorum ? e.decorum.total : 0));
  }

  // Average staff happiness → relations score
  var hired = Object.keys(h.staff)
    .filter(function(r) { return r !== 'footmen' && h.staff[r].hired; })
    .map(function(r) { return h.staff[r]; });

  h.management.staffRelations = hired.length > 0
    ? Math.round(hired.reduce(function(s, st) { return s + st.happiness; }, 0) / hired.length)
    : 50;

  h.management.total = Math.round(
    (h.management.housekeeping +
     h.management.catering     +
     h.management.entertaining +
     h.management.budgeting    +
     h.management.staffRelations) / 5
  );
}

// ── TIER REFRESH ───────────────────────────────────────────
// Call when spouse wealth changes (inheritance, investment)

function refreshHouseholdTier() {
  if (!G.household) return;
  const newTier = calculateHouseholdTier();
  if (newTier !== G.household.tier) {
    G.household.tier = newTier;
    recalcHouseholdStats();
    saveGame();
  }
}

// ── SEASONAL UPDATE ────────────────────────────────────────
// Called from advanceSeason() when married

function householdSeasonalUpdate() {
  if (!G.household || !G.isMarried) return [];
  var events  = [];
  var h       = G.household;
  var staff   = h.staff;
  var notable = []; // lines that warrant a popup summary
  var feedLines = []; // lines that go quietly to the feed

  // ── 1. WAGES ─────────────────────────────────────────────
  var wages = recalcStaffWages();
  if (wages > 0) {
    addAccountEntry('wages', 'Seasonal staff wages', -wages);
  }

  // Receive allowance
  calculateHouseholdAllowance();

  // ── 2. DEFICIT CHECK ─────────────────────────────────────
  if (h.accounts.balance < 0) {
    var shortfall = Math.abs(h.accounts.balance);
    events.push({
      text: 'The household accounts are in deficit.',
      type: 'bad',
      popup: {
        text: 'The household accounts do not balance this season. You are £'
          + shortfall + ' short. Your husband will notice.',
        choices: [
          { text: 'Cover it from your own funds', fn() {
            if (G.wealth >= shortfall) {
              G.wealth -= shortfall;
              h.accounts.balance = 0;
              if (G.spouse) G.spouse.approval = clamp((G.spouse.approval||60)+5, 0, 100);
              return { text: 'You cover the deficit quietly. Your husband is none the wiser.', badge:'-£'+shortfall };
            }
            return { text: 'You do not have enough. The shortfall remains.' };
          }},
          { text: 'Dismiss a member of staff', fn() {
            return { text: 'You will need to review the household arrangements.' };
          }},
          { text: 'Say nothing', fn() {
            if (G.spouse) G.spouse.approval = clamp((G.spouse.approval||60)-rand(5,12), 0, 100);
            return { text: 'Your husband notices. He says little. His expression says more.', badge:'Approval -8' };
          }},
        ],
      },
    });
  }

  // ── 3. STAFF STAT EFFECTS ─────────────────────────────────
  // Cook → health
  if (staff.cook && staff.cook.hired) {
    var cookBonus = staff.cook.quality >= 75 ? 4 : staff.cook.quality >= 50 ? 2 : 1;
    changeStat('health', cookBonus);
    if (cookBonus >= 4) feedLines.push('The cooking has been excellent this season.');
  } else {
    // No cook — meals are poor
    changeStat('health', -rand(2,5));
    notable.push('Without a cook, meals have been inconsistent. Your health has suffered.');
  }

  // Housekeeper → reputation (house runs smoothly, social standing maintained)
  if (staff.housekeeper && staff.housekeeper.hired) {
    var hkBonus = staff.housekeeper.quality >= 75 ? 3 : staff.housekeeper.quality >= 50 ? 1 : 0;
    if (hkBonus > 0) changeStat('reputation', hkBonus);
  } else {
    // No housekeeper — house shows signs of disorder
    if (G.assets && G.assets.some(function(a){ return a.type === 'estate'; })) {
      changeStat('reputation', -rand(2,4));
      notable.push('The house has been somewhat disordered this season. People have noticed.');
    }
  }

  // Lady's maid → looks (presentation, grooming, dress)
  if (staff.ladysMaid && staff.ladysMaid.hired) {
    var lmBonus = staff.ladysMaid.quality >= 75 ? 3 : staff.ladysMaid.quality >= 50 ? 1 : 0;
    if (lmBonus > 0) {
      changeStat('looks', lmBonus);
      if (lmBonus >= 3) feedLines.push('Your lady\u2019s maid keeps you looking your best.');
    }
  } else if (G.isMarried) {
    // No lady's maid — presentation suffers slightly
    changeStat('looks', -1);
  }

  // Butler → husband approval (house runs with proper formality)
  if (staff.butler && staff.butler.hired) {
    if (staff.butler.happiness < 40) {
      // Unhappy butler — gossip risk
      if (Math.random() < 0.3) {
        changeStat('reputation', -rand(3,7));
        notable.push(staff.butler.name + ' has been indiscreet. Something said below-stairs has reached the wrong ears.');
      }
    } else {
      if (G.spouse) G.spouse.approval = clamp((G.spouse.approval||60)+rand(1,3), 0, 100);
    }
  }

  // ── 4. CHILDREN'S WELLBEING ──────────────────────────────
  var youngChildren = (G.children||[]).filter(function(c){ return (c.age||0) < 12; });
  if (youngChildren.length) {
    if (staff.governess && staff.governess.hired) {
      var govBonus = staff.governess.quality >= 70 ? 2 : 1;
      youngChildren.forEach(function(c) {
        if (typeof changeCloseness === 'function') changeCloseness(c, govBonus);
      });
      if (govBonus >= 2) feedLines.push('The governess is doing well with the children.');
    } else if (youngChildren.some(function(c){ return (c.age||0) >= 5; })) {
      notable.push('The children have had no governess this season. Their education is suffering.');
    }

    var infants = youngChildren.filter(function(c){ return (c.age||0) < 2; });
    if (infants.length) {
      if (!(staff.wetNurse && staff.wetNurse.hired) && !(h.nursery && h.nursery.hasWetNurse)) {
        changeStat('health', -rand(2,4));
        notable.push('The demands of a nursing infant are considerable without help.');
      }
    }

    if (staff.nursemaid && staff.nursemaid.hired) {
      // Children well-looked-after → closeness bonus
      youngChildren.forEach(function(c) {
        if (typeof changeCloseness === 'function') changeCloseness(c, 1);
      });
    }
  }

  // ── 5. UNDERSTAFFING FOR GRAND PROPERTIES ────────────────
  var grandAssets = (G.assets||[]).filter(function(a){
    return a.type === 'estate' && (a.id === 'grand_estate' || a.id === 'manor');
  });
  if (grandAssets.length && !staff.housekeeper.hired && !staff.butler.hired) {
    if (Math.random() < 0.4) {
      var complaints = [
        'The grand estate runs itself poorly without proper staff. The tenants have begun to talk.',
        'Visitors to the manor have remarked — not unkindly, but pointedly — on the thin staff.',
        'An estate of this size requires more hands. The gaps are beginning to show.',
      ];
      changeStat('reputation', -rand(3,6));
      notable.push(pick(complaints));
    }
  }

  // ── 6. HUSBAND APPROVAL — MANAGEMENT + COMPATIBILITY ──────
  var mgmt = h.management ? h.management.total : 50;
  var compat = G.spouse ? (G.spouse.compatibility || 50) : 50;
  if (G.spouse) {
    // High compatibility means approval drifts up more easily, down less harshly
    var compatMod = compat >= 70 ? 1 : compat >= 50 ? 0 : -1;
    if (mgmt >= 70) {
      G.spouse.approval = clamp((G.spouse.approval||60) + rand(1,3) + (compat >= 65 ? 1 : 0), 0, 100);
    } else if (mgmt < 35) {
      G.spouse.approval = clamp((G.spouse.approval||60) - rand(1,3) + (compat >= 65 ? 1 : 0), 0, 100);
    } else {
      // Neutral management — compatibility slowly shifts approval
      if (compat >= 75 && Math.random() < 0.3) {
        G.spouse.approval = clamp((G.spouse.approval||60) + 1, 0, 100);
      } else if (compat < 30 && Math.random() < 0.2) {
        G.spouse.approval = clamp((G.spouse.approval||60) - 1, 0, 100);
      }
    }
  }

  // ── 7. STAFF HAPPINESS DRIFT ─────────────────────────────
  updateStaffHappiness();

  // Staff giving notice
  var unhappy = Object.keys(staff).filter(function(r) {
    return r !== 'footmen' && staff[r].hired && staff[r].happiness < 25;
  });
  if (unhappy.length && Math.random() < 0.5) {
    var role = pick(unhappy);
    var st   = staff[role];
    events.push({
      text: st.name + ' has given notice.',
      type: 'bad',
      popup: {
        text: st.name + ' has given notice. She will leave at the end of the month unless matters improve.',
        choices: [
          { text: 'Raise her wages (+£5/yr)', fn() {
            st.wage      += 5;
            st.happiness  = Math.min(100, st.happiness+35);
            h.accounts.balance -= 5;
            return { text: st.name + ' seems gratified. She stays.', badge:'Staff retained' };
          }},
          { text: 'Accept her notice', fn() {
            if (typeof dismissStaff==='function') dismissStaff(role);
            return { text: st.name + ' departs. The household will feel her absence.', badge:'Staff lost' };
          }},
        ],
      },
    });
  }

  // ── 8. FEED + NOTABLE POPUP ──────────────────────────────
  // Quiet feed entries
  feedLines.forEach(function(line) {
    if (typeof addFeedEntry === 'function') addFeedEntry(line, 'good');
  });

  // Notable popup — only if something worth flagging happened
  if (notable.length) {
    events.push({
      text: 'Household: ' + notable[0],
      type: notable.some(function(n){ return n.indexOf('suffer') > -1 || n.indexOf('noticed') > -1; }) ? 'bad' : 'event',
      popup: {
        text: 'This season in the household:\n\n' + notable.join('\n\n'),
        choices: null,
      },
    });
  }

  recalcHouseholdStats();
  saveGame();
  return events;
}


function updateStaffHappiness() {
  if (!G.household) return;
  Object.keys(G.household.staff).forEach(function(role) {
    var st = G.household.staff[role];
    if (role !== 'footmen' && st.hired) {
      // Drift toward 70 each season
      st.happiness = Math.round(st.happiness + (70 - st.happiness) * 0.1);
    }
  });
}

// ── STAFF INTERACTION ──────────────────────────────────────
// Called from household UI

function interactWithStaff(role, action) {
  if (!G.household || !G.household.staff[role]) return null;
  var st = G.household.staff[role];
  if (!st.hired) return null;

  switch (action) {
    case 'praise':
      st.happiness = Math.min(100, st.happiness + rand(8, 15));
      return { text: st.name + ' looks pleased. Quiet satisfaction from both sides.', badge: 'Happiness +10' };

    case 'reprimand':
      st.happiness = Math.max(0, st.happiness - rand(10, 20));
      // But sometimes improves performance
      st.quality   = Math.min(100, st.quality + rand(0, 5));
      return { text: 'You speak to ' + st.name + ' about the matter. She receives it in silence.', badge: 'Happiness -15' };

    case 'bonus':
      if (G.wealth < 5) return { text: 'You cannot presently afford a bonus.' };
      G.wealth    -= 5;
      st.happiness = Math.min(100, st.happiness + rand(15, 25));
      addAccountEntry('wages', 'Bonus for ' + st.name, -5);
      return { text: 'A small gift of money. ' + st.name + ' thanks you with quiet sincerity.', badge: 'Happiness +20' };
  }
}

// ── HOUSEHOLD SUMMARY ──────────────────────────────────────

function getHouseholdSummary() {
  if (!G.household) return null;
  const h = G.household;
  const hiredCount = Object.keys(h.staff)
    .filter(function(r) { return r === 'footmen'
      ? h.staff.footmen.count > 0 : h.staff[r].hired; }).length;

  return {
    tier:       h.tier,
    staffCount: hiredCount + (h.staff.footmen.count > 0 ? h.staff.footmen.count - 1 : 0),
    wages:      recalcStaffWages(),
    allowance:  h.accounts.seasonlyAllowance,
    management: h.management.total,
    balance:    h.accounts.balance,
  };
}
