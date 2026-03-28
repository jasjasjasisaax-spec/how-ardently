// ═══════════════════════════════════════════════════════════
// finance.js — Investments, debt, unexpected expenses
// ═══════════════════════════════════════════════════════════

// ── INVESTMENTS ────────────────────────────────────────────

const INVESTMENT_OPTIONS = [
  {
    id:        'consols',
    name:      'Government Consols',
    desc:      'The Funds — safe, reliable, the bedrock of respectable income.',
    minAmount:  200,
    riskLevel:  'low',
    baseReturn: 0.035,   // 3.5% annual return, reliable
    variance:   0.005,   // ±0.5% variation
    canLose:    false,
    repEffect:  2,       // seen as prudent
  },
  {
    id:        'canal_shares',
    name:      'Canal Company Shares',
    desc:      'The canals are the future of commerce. Or they were, before the railways.',
    minAmount:  500,
    riskLevel:  'medium',
    baseReturn: 0.07,
    variance:   0.04,
    canLose:    true,
    lossProbability: 0.15,
    lossAmount: 0.25,    // lose up to 25% of investment
    repEffect:  0,
  },
  {
    id:        'land_speculation',
    name:      'Land Speculation',
    desc:      'Buy land before the enclosures. Not always legal. Almost always profitable.',
    minAmount:  1000,
    riskLevel:  'high',
    baseReturn: 0.12,
    variance:   0.08,
    canLose:    true,
    lossProbability: 0.25,
    lossAmount: 0.40,
    repEffect:  -3,      // slightly disreputable
  },
  {
    id:        'east_india',
    name:      'East India Company',
    desc:      'The great commercial empire. Extraordinary returns. Extraordinary risks.',
    minAmount:  800,
    riskLevel:  'high',
    baseReturn: 0.15,
    variance:   0.10,
    canLose:    true,
    lossProbability: 0.30,
    lossAmount: 0.60,
    repEffect:  5,       // fashionable
  },
  {
    id:        'local_business',
    name:      'Local Business Investment',
    desc:      'Back the miller, the draper, or the inn. Modest returns. You know the man.',
    minAmount:  100,
    riskLevel:  'low',
    baseReturn: 0.05,
    variance:   0.02,
    canLose:    true,
    lossProbability: 0.10,
    lossAmount: 0.20,
    repEffect:  -2,      // tradespeople connections noted
  },
];

// G.investments = [ { optionId, amount, purchasedSeason, returns, active } ]

function initFinance() {
  if (!G.investments) G.investments = [];
  if (!G.debts)       G.debts       = [];
}

// ── INVEST ─────────────────────────────────────────────────
function makeInvestment(optionId, amount) {
  const option = INVESTMENT_OPTIONS.find(o => o.id === optionId);
  if (!option) return { success: false, reason: 'unknown_option' };
  if (amount < option.minAmount) return { success: false, reason: 'below_minimum', min: option.minAmount };
  if (G.wealth < amount) return { success: false, reason: 'insufficient_funds' };

  G.wealth -= amount;
  initFinance();
  G.investments.push({
    optionId,
    name:    option.name,
    amount,
    active:  true,
    returns: [],   // track seasonal returns
  });

  if (option.repEffect) changeStat('reputation', option.repEffect);
  saveGame();
  return { success: true, option, amount };
}

// ── PROCESS INVESTMENTS ────────────────────────────────────
// Called each season — returns list of events for UI
function processInvestments() {
  initFinance();
  if (!G.investments.length) return [];

  const events = [];
  for (const inv of G.investments.filter(i => i.active)) {
    const option = INVESTMENT_OPTIONS.find(o => o.id === inv.optionId);
    if (!option) continue;

    // Check for loss event
    if (option.canLose && Math.random() < option.lossProbability / 2) { // per-season prob
      const loss = Math.floor(inv.amount * option.lossAmount * (0.5 + Math.random() * 0.5));
      inv.amount = Math.max(0, inv.amount - loss);
      G.wealth -= loss;

      if (inv.amount <= 0) {
        inv.active = false;
        events.push({
          text: `Your investment in ${option.name} has collapsed entirely.`,
          type: 'bad',
          popup: {
            text: `Your investment in ${option.name} has failed entirely. The money is gone. Your solicitor says "these things happen" with an expression that suggests he saw it coming.`,
            badge: `-£${loss.toLocaleString()}`,
          },
        });
        continue;
      }

      events.push({
        text: `${option.name}: a difficult quarter.`,
        type: 'bad',
        popup: {
          text: `${option.name} has had a difficult quarter. You lose £${loss.toLocaleString()} on the investment.`,
          badge: `-£${loss.toLocaleString()}`,
        },
      });
      continue;
    }

    // Normal return
    const annualRate = option.baseReturn + (Math.random() * 2 - 1) * option.variance;
    const seasonalReturn = Math.floor(inv.amount * annualRate / 2); // half-year
    G.wealth += seasonalReturn;
    inv.returns.push(seasonalReturn);

    // Only notify on notable returns
    if (seasonalReturn > inv.amount * 0.05) {
      events.push({
        text: `${option.name} pays £${seasonalReturn} this season.`,
        type: 'good',
      });
    }
  }

  saveGame();
  return events;
}

// ── DIVEST ─────────────────────────────────────────────────
function sellInvestment(inv) {
  // Can sell for current value (amount remaining)
  const proceeds = inv.amount;
  G.wealth += proceeds;
  inv.active = false;
  G.investments = G.investments.filter(i => i !== inv || i.active);
  saveGame();
  return { proceeds };
}

function getActiveInvestments() {
  initFinance();
  return G.investments.filter(i => i.active);
}

function totalInvested() {
  return getActiveInvestments().reduce((s, i) => s + i.amount, 0);
}

// ── DEBT SYSTEM ────────────────────────────────────────────
// G.debts = [ { id, amount, creditor, interestRate, seasons, risky } ]

const DEBT_CREDITORS = [
  { name: 'a discreet moneylender',   interest: 0.15, risky: true  },
  { name: 'your solicitor',           interest: 0.08, risky: false },
  { name: 'a family connection',      interest: 0.05, risky: false },
  { name: 'a gaming house creditor',  interest: 0.25, risky: true  },
  { name: 'the bank',                 interest: 0.06, risky: false },
];

function borrowMoney(amount, creditorIdx) {
  initFinance();
  const creditor = DEBT_CREDITORS[creditorIdx] || DEBT_CREDITORS[1];

  // Reputation affects who will lend
  if (creditor.risky === false && G.reputation < 35) {
    return { success: false, reason: 'reputation_too_low' };
  }

  G.wealth += amount;
  G.debts.push({
    id:           'debt_' + Date.now(),
    amount,
    originalAmount: amount,
    creditor:     creditor.name,
    interestRate: creditor.interest,
    seasons:      0,
    risky:        creditor.risky,
  });

  if (creditor.risky) changeStat('reputation', -rand(3,7));
  saveGame();
  return { success: true, creditor, amount };
}

// ── PROCESS DEBTS ──────────────────────────────────────────
// Called each season — adds interest, checks for consequences
function processDebts() {
  initFinance();
  if (!G.debts.length) return [];

  const events = [];
  for (const debt of G.debts) {
    debt.seasons++;
    const interest = Math.floor(debt.amount * debt.interestRate / 2); // seasonal
    debt.amount += interest;

    // Warning at 3 seasons
    if (debt.seasons === 3) {
      events.push({
        text: `Your debt to ${debt.creditor} is growing.`,
        type: 'bad',
        popup: {
          text: `Your debt to ${debt.creditor} has reached £${debt.amount.toLocaleString()} with interest. They are beginning to send rather pointed letters.`,
          badge: `Debt: £${debt.amount.toLocaleString()}`,
        },
      });
    }

    // Crisis at 6 seasons unpaid and risky creditor
    if (debt.seasons >= 6 && debt.risky) {
      changeStat('reputation', -rand(8,15));
      events.push({
        text: 'A debt crisis.',
        type: 'bad',
        popup: {
          text: `${debt.creditor} has made your debt to them a matter of public knowledge. The amount — £${debt.amount.toLocaleString()} — is known in three drawing rooms by Thursday.`,
          badge: `Reputation -10`,
          choices: [
            {
              text: `Pay immediately (£${debt.amount.toLocaleString()})`,
              fn() {
                if (G.wealth >= debt.amount) {
                  G.wealth -= debt.amount;
                  G.debts = G.debts.filter(d => d.id !== debt.id);
                  changeStat('reputation', rand(5,10));
                  return { text: 'Paid. The relief is extraordinary.', badge: 'Debt cleared' };
                }
                return { text: 'You do not have the funds. The crisis deepens.' };
              },
            },
            {
              text: 'Sell an asset to cover it',
              fn() {
                const asset = (G.assets||[]).find(a => a.currentValue >= debt.amount);
                if (asset) {
                  const r = sellAsset(asset);
                  if (r.salePrice >= debt.amount) {
                    G.debts = G.debts.filter(d => d.id !== debt.id);
                    return { text: `${asset.name} sold. The debt is covered. You are free of it.`, badge: 'Debt cleared' };
                  }
                }
                return { text: 'No single asset covers the debt. You must find another way.' };
              },
            },
          ],
        },
      });
    }

    // Debtors' prison threat at 10 seasons unpaid and risky
    if (debt.seasons >= 10 && debt.risky && debt.amount > 500) {
      changeStat('reputation', -rand(15,25));
      changeStat('health', -rand(10,20));
      events.push({
        text: "The bailiffs arrive.",
        type: 'bad',
        popup: {
          text: `The bailiffs arrive. The debt to ${debt.creditor} — now £${debt.amount.toLocaleString()} — has brought them to your door. This is the worst possible outcome and it is happening.`,
          badge: 'Reputation -20',
        },
      });
      G.debts = G.debts.filter(d => d.id !== debt.id);
    }
  }

  saveGame();
  return events;
}

function repayDebt(debt) {
  if (G.wealth < debt.amount) return { success: false };
  G.wealth -= debt.amount;
  G.debts = G.debts.filter(d => d.id !== debt.id);
  changeStat('reputation', rand(3,8));
  saveGame();
  return { success: true, amount: debt.amount };
}

function totalDebt() {
  initFinance();
  return G.debts.reduce((s,d) => s + d.amount, 0);
}

// ── UNEXPECTED EXPENSES ────────────────────────────────────
// These fire as random events — defined here for reference,
// added to events.js registry

const UNEXPECTED_EXPENSES = [
  {
    id:   'roof_repair',
    condition() { return (G.assets||[]).some(a => a.type === 'estate' && a.condition < 60); },
    execute() {
      const estate = (G.assets||[]).find(a => a.type === 'estate' && a.condition < 60);
      const cost   = rand(200,600);
      const desc   = estate ? estate.name : 'the house';
      if (G.wealth >= cost) {
        G.wealth -= cost;
        if (estate) estate.condition = Math.min(100, estate.condition + 20);
        return {
          log:   { text: `Roof repairs at ${desc}.`, type:'bad' },
          popup: { text: `The roof at ${desc} has given way. The repairs cost £${cost} and take the better part of the season.`, badge: `-£${cost}` },
        };
      }
      if (estate) estate.condition = Math.max(0, estate.condition - 15);
      return {
        log:   { text: `The roof is leaking and you cannot afford repairs.`, type:'bad' },
        popup: { text: `The roof at ${desc} is in a terrible state and the repair estimate is £${cost}. You cannot presently afford it. The buckets are doing their best.`, badge: 'Condition -15' },
      };
    },
  },
  {
    id:   'legal_fees',
    execute() {
      const cost = rand(100,400);
      changeStat('wealth', -cost);
      const cases = [
        `A boundary dispute with a neighbour has dragged on and the solicitors require £${cost}.`,
        `A matter of inheritance — not yours — requires your testimony and a great deal of legal time. £${cost}.`,
        `A contract misunderstanding with a merchant requires resolution through counsel. £${cost} and several tedious afternoons.`,
      ];
      return {
        log:   { text: 'Legal fees arrive unexpectedly.', type:'bad' },
        popup: { text: pick(cases), badge: `-£${cost}` },
      };
    },
  },
  {
    id:   'horse_illness',
    condition() { return (G.assets||[]).some(a => a.type === 'horse'); },
    execute() {
      const horse = pick((G.assets||[]).filter(a => a.type === 'horse'));
      const cost  = rand(30,120);
      changeStat('wealth', -cost);
      horse.condition = Math.max(0, horse.condition - rand(15,30));
      const outcomes = [
        `${horse.name} has gone lame. The farrier and the vet between them cost £${cost} and several weeks of worry.`,
        `${horse.name} has caught a chill. The vet is cautiously optimistic. You are cautiously anxious. £${cost}.`,
        `${horse.name} cast a shoe at the worst possible moment and has been off work for a fortnight. £${cost} in fees.`,
      ];
      return {
        log:   { text: horse.name + ' is unwell.', type:'bad' },
        popup: { text: pick(outcomes), badge: `-£${cost}` },
      };
    },
  },
  {
    id:   'servants_wages',
    execute() {
      const cost = rand(40,120);
      changeStat('wealth', -cost);
      return {
        log:   { text: "Servants' wages — an unexpected arrears.", type:'bad' },
        popup: { text: `An error in the household accounts has resulted in a shortfall of £${cost} in servants' wages. You pay it. The cook looks at you differently after.`, badge: `-£${cost}` },
      };
    },
  },
  {
    id:   'carriage_repair',
    condition() { return (G.assets||[]).some(a => a.type === 'carriage'); },
    execute() {
      const carriage = pick((G.assets||[]).filter(a => a.type === 'carriage'));
      const cost = rand(50,200);
      changeStat('wealth', -cost);
      carriage.condition = Math.max(0, carriage.condition - 20);
      return {
        log:   { text: carriage.name + ' requires repairs.', type:'bad' },
        popup: { text: `${carriage.name} has shed a wheel at a most inconvenient moment. The coachmaker's bill comes to £${cost}.`, badge: `-£${cost}` },
      };
    },
  },
];

// Finance summary for Assets tab
function financeSummary() {
  initFinance();
  return {
    invested:       totalInvested(),
    totalDebt:      totalDebt(),
    activeDebts:    G.debts.length,
    investments:    getActiveInvestments(),
    netWorth:       G.wealth + totalInvested() - totalDebt() + ((G.assets||[]).reduce((s,a)=>s+a.currentValue,0)),
  };
}
