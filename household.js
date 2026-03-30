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
  const spouse = G.spouse;                        // Fixed: was G.people.spouse
  if (!spouse) return 'humble';

  const wealth    = spouse.wealth    || 0;
  const titleRank = spouse.titleRank || 0;        // Fixed: titleRank is 0-5 int

  // Title overrides wealth in some cases
  if (titleRank >= 4) return 'grand';             // Duke/Earl
  if (titleRank >= 2) return 'wealthy';           // Baron/Baronet
  if (wealth > 10000) return 'wealthy';
  if (wealth > 5000)  return 'comfortable';
  if (wealth > 2000)  return 'modest';
  return 'humble';
}

// ── STAFF AVAILABILITY ─────────────────────────────────────

const STAFF_BY_TIER = {
  humble:      ['cook'],
  modest:      ['cook','housekeeper'],
  comfortable: ['cook','housekeeper','ladysMaid','nursemaid','wetNurse'],
  wealthy:     ['cook','housekeeper','ladysMaid','nursemaid','wetNurse',
                'butler','governess','coachman'],
  grand:       ['cook','housekeeper','ladysMaid','nursemaid','wetNurse',
                'butler','governess','coachman','footmen'],
};

function getAvailableStaff() {
  const tier = G.household ? G.household.tier : 'humble';
  return STAFF_BY_TIER[tier] || [];
}

// ── WAGES ──────────────────────────────────────────────────

const STAFF_WAGES = {
  housekeeper: { humble:0, modest:12, comfortable:16, wealthy:20, grand:30 },
  cook:        { humble:8, modest:10, comfortable:14, wealthy:18, grand:25 },
  ladysMaid:   { humble:0, modest:0,  comfortable:10, wealthy:14, grand:18 },
  butler:      { humble:0, modest:0,  comfortable:0,  wealthy:20, grand:35 },
  wetNurse:    { humble:0, modest:6,  comfortable:8,  wealthy:10, grand:12 },
  governess:   { humble:0, modest:0,  comfortable:15, wealthy:20, grand:30 },
  nursemaid:   { humble:0, modest:6,  comfortable:8,  wealthy:10, grand:12 },
  coachman:    { humble:0, modest:0,  comfortable:12, wealthy:16, grand:20 },
};

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
    return { success:false, message:'Your household cannot support a ' + role + '.' };
  }
  if (role === 'footmen') {
    return hireFootman();
  }
  if (h.staff[role] && h.staff[role].hired) {
    return { success:false, message:'You already have a ' + role + '.' };
  }

  const tier    = h.tier;
  const wage    = STAFF_WAGES[role] ? (STAFF_WAGES[role][tier] || 0) : 0;
  const quality = rand(55, 95);
  const name    = generateStaffName(role);

  h.staff[role] = { hired:true, name, quality, wage, happiness:85 };

  addAccountEntry('wages', 'Engaged ' + role, -wage);
  recalcHouseholdStats();
  saveGame();

  return { success:true, name, wage,
    message: name + ' has entered your service at £' + wage + ' per annum.' };
}

function hireFootman() {
  const h    = G.household;
  const tier = h.tier;
  const wage = FOOTMEN_WAGE[tier] || 0;

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
  const tier = G.household.tier;
  const allowances = {
    humble:      50,
    modest:      150,
    comfortable: 400,
    wealthy:     1000,
    grand:       3000,
  };
  const amount = allowances[tier] || 50;
  G.household.accounts.seasonlyAllowance = amount;
  addAccountEntry('allowance', 'Household allowance', amount);
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
  const events = [];

  // Pay wages
  const wages = recalcStaffWages();
  if (wages > 0) {
    G.wealth = Math.max(0, G.wealth - wages);
    addAccountEntry('wages', 'Seasonal staff wages', -wages);
  }

  // Receive allowance
  calculateHouseholdAllowance();
  G.wealth += G.household.accounts.seasonlyAllowance;

  // Staff happiness drift
  updateStaffHappiness();

  // Check for staff problems
  var unhappy = Object.keys(G.household.staff)
    .filter(function(r) { return r !== 'footmen' && G.household.staff[r].hired
                              && G.household.staff[r].happiness < 30; });

  if (unhappy.length > 0 && Math.random() < 0.4) {
    var role = pick(unhappy);
    var st   = G.household.staff[role];
    events.push({
      text: st.name + ' appears to be unhappy in your service.',
      type: 'bad',
      popup: {
        text: st.name + ' has given notice. The household will feel her absence.',
        choices: [
          { text: 'Raise her wages (+£5/yr)', fn() {
            st.wage      += 5;
            st.happiness  = Math.min(100, st.happiness + 30);
            G.wealth     -= 5;
            return { text: st.name + ' seems gratified. She stays.', badge: 'Staff retained' };
          }},
          { text: 'Accept her notice', fn() {
            dismissStaff(role);
            return { text: st.name + ' departs. You will need to find a replacement.', badge: 'Staff lost' };
          }},
        ],
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
