// ═══════════════════════════════════════════════════════════
// assets.js — Property, carriages, horses, jewellery, land
// ═══════════════════════════════════════════════════════════

// ── ASSET CATALOGUE ────────────────────────────────────────
// These are the things you can buy. Each entry is a template;
// actual owned assets live in G.assets as instances.

const ASSET_CATALOGUE = {

  // ── ESTATES ──────────────────────────────────────────────
  estates: [
    {
      id: 'cottage',
      name: 'A Modest Cottage',
      desc: 'Comfortable but small. Two acres of garden. A perfectly respectable address.',
      type: 'estate',
      price: 800,
      baseIncome: 40,
      upkeep: 15,
      repBonus: 2,
      maxCondition: 100,
      improvable: true,
      improvements: ['kitchen_garden','stable_yard'],
    },
    {
      id: 'townhouse',
      name: 'A London Townhouse',
      desc: 'Four storeys in a respectable street. Essential for the Season.',
      type: 'estate',
      price: 2000,
      baseIncome: 80,
      upkeep: 60,
      repBonus: 8,
      maxCondition: 100,
      improvable: true,
      improvements: ['drawing_room','guest_wing'],
      seasonal: 'Spring', // only generates income/rep in Spring
    },
    {
      id: 'manor',
      name: 'A Country Manor',
      desc: 'Thirty rooms, a park, and a village that pays rent. The proper thing.',
      type: 'estate',
      price: 6000,
      baseIncome: 300,
      upkeep: 120,
      repBonus: 15,
      maxCondition: 100,
      improvable: true,
      improvements: ['home_farm','tenant_cottages','walled_garden','stables'],
      entailable: true,
    },
    {
      id: 'grand_estate',
      name: 'A Grand Estate',
      desc: 'One of the great houses of England. Your name will be known for generations.',
      type: 'estate',
      price: 20000,
      baseIncome: 1200,
      upkeep: 400,
      repBonus: 30,
      maxCondition: 100,
      improvable: true,
      improvements: ['home_farm','tenant_cottages','walled_garden','stables','pleasure_grounds','folly'],
      entailable: true,
    },
  ],

  // ── IMPROVEMENTS ─────────────────────────────────────────
  improvements: {
    kitchen_garden:   { name: 'Kitchen Garden',    price: 80,   incomeBonus: 15, upkeepBonus: 5,  desc: 'Vegetables and herbs. Reduces household costs.' },
    stable_yard:      { name: 'Stable Yard',        price: 200,  incomeBonus: 0,  upkeepBonus: 20, desc: 'Room for horses. Required for a carriage.' },
    drawing_room:     { name: 'Improved Drawing Room', price:300, incomeBonus:0,  upkeepBonus:10, repBonus:5, desc:'The room in which one is judged.' },
    guest_wing:       { name: 'Guest Wing',         price: 400,  incomeBonus: 30, upkeepBonus: 15, desc: 'Rent to visitors during the Season.' },
    home_farm:        { name: 'Home Farm',          price: 500,  incomeBonus: 80, upkeepBonus: 30, desc: 'Working farm attached to the estate.' },
    tenant_cottages:  { name: 'Tenant Cottages',    price: 800,  incomeBonus: 120,upkeepBonus: 40, desc: 'Six cottages. A village that pays you.' },
    walled_garden:    { name: 'Walled Garden',      price: 600,  incomeBonus: 20, upkeepBonus: 15, repBonus:5, desc:'Flowers, fruit, and considerable prestige.' },
    stables:          { name: 'Full Stables',       price: 1000, incomeBonus: 0,  upkeepBonus: 60, repBonus:8, desc:'For six horses. Hunting parties possible.' },
    pleasure_grounds: { name: 'Pleasure Grounds',  price: 2000, incomeBonus: 0,  upkeepBonus: 80, repBonus:15, desc:'Formal gardens. People will come to see them.' },
    folly:            { name: 'A Folly',            price: 1500, incomeBonus: 0,  upkeepBonus: 10, repBonus:10, desc:'Purely decorative. Perfectly ridiculous. Very fashionable.' },
  },

  // ── VEHICLES ─────────────────────────────────────────────
  carriages: [
    {
      id: 'gig',
      name: 'A Gig',
      desc: 'Light, fast, slightly improper. Perfect for a young lady with opinions.',
      type: 'carriage',
      price: 150,
      upkeep: 20,
      repBonus: 2,
      requiresHorse: true,
    },
    {
      id: 'barouche',
      name: 'A Barouche',
      desc: 'Open-topped, fashionable, essential for Hyde Park in Spring.',
      type: 'carriage',
      price: 500,
      upkeep: 40,
      repBonus: 8,
      requiresHorse: true,
    },
    {
      id: 'town_coach',
      name: 'A Town Coach',
      desc: 'Enclosed, formal, the correct thing for evening engagements.',
      type: 'carriage',
      price: 800,
      upkeep: 60,
      repBonus: 10,
      requiresHorse: true,
    },
    {
      id: 'travelling_carriage',
      name: 'A Travelling Carriage',
      desc: 'For moving between town and country in comfort. Four horses.',
      type: 'carriage',
      price: 1200,
      upkeep: 80,
      repBonus: 12,
      requiresHorse: true,
    },
  ],

  // ── HORSES ───────────────────────────────────────────────
  horses: [
    {
      id: 'cob',
      name: 'A Sturdy Cob',
      desc: 'Reliable, sensible, not fashionable. Gets you where you need to go.',
      type: 'horse',
      price: 40,
      upkeep: 15,
      repBonus: 0,
    },
    {
      id: 'hack',
      name: 'A Good Hack',
      desc: 'For riding out in the park. Presentable without being ostentatious.',
      type: 'horse',
      price: 80,
      upkeep: 20,
      repBonus: 2,
    },
    {
      id: 'hunter',
      name: 'A Hunter',
      desc: 'Bred for the field. Considerable prestige in the right counties.',
      type: 'horse',
      price: 200,
      upkeep: 35,
      repBonus: 5,
    },
    {
      id: 'thoroughbred',
      name: 'A Thoroughbred',
      desc: 'Bloodstock. Not for riding — for being seen to own.',
      type: 'horse',
      price: 500,
      upkeep: 50,
      repBonus: 10,
      incomeBonus: 30, // stud fees
    },
  ],

  // ── JEWELLERY ─────────────────────────────────────────────
  jewellery: [
    {
      id: 'pearl_necklace',
      name: 'A Pearl Necklace',
      desc: 'Classic, appropriate for any occasion, quietly valuable.',
      type: 'jewellery',
      price: 120,
      baseValue: 120,
      volatility: 0.05, // ±5% value per season
      repBonus: 3,
      giftable: true,
    },
    {
      id: 'diamond_brooch',
      name: 'A Diamond Brooch',
      desc: 'Formal and impressive. Worn at Court or significant dinners.',
      type: 'jewellery',
      price: 400,
      baseValue: 400,
      volatility: 0.08,
      repBonus: 8,
      giftable: true,
    },
    {
      id: 'emerald_ring',
      name: 'An Emerald Ring',
      desc: 'Striking. Not for everyday wear. You will be remembered when you wear it.',
      type: 'jewellery',
      price: 350,
      baseValue: 350,
      volatility: 0.10,
      repBonus: 6,
      giftable: true,
    },
    {
      id: 'family_heirloom',
      name: 'The Family Jewels',
      desc: 'Whatever your family managed to hold onto. History made portable.',
      type: 'jewellery',
      price: 0,       // inherited, not bought
      baseValue: 600,
      volatility: 0.03,
      repBonus: 12,
      giftable: true,
      inherited: true,
    },
    {
      id: 'sapphire_set',
      name: 'A Sapphire Parure',
      desc: 'Necklace, earrings, and brooch. A complete set. Very fine indeed.',
      type: 'jewellery',
      price: 800,
      baseValue: 800,
      volatility: 0.07,
      repBonus: 12,
      giftable: true,
    },
  ],

  // ── FARMLAND ─────────────────────────────────────────────
  farmland: [
    {
      id: 'small_field',
      name: 'A Small Field',
      desc: 'Twenty acres. Tenant pays rent. Modest but solid.',
      type: 'farmland',
      price: 400,
      baseIncome: 40,
      upkeep: 10,
      repBonus: 1,
      harvestVariance: 0.3,
    },
    {
      id: 'working_farm',
      name: 'A Working Farm',
      desc: 'A hundred acres with a farmhouse and sitting tenant.',
      type: 'farmland',
      price: 1200,
      baseIncome: 120,
      upkeep: 30,
      repBonus: 3,
      harvestVariance: 0.4,
    },
    {
      id: 'dairy_farm',
      name: 'A Dairy Farm',
      desc: 'Twenty cows and reliable income year-round.',
      type: 'farmland',
      price: 900,
      baseIncome: 90,
      upkeep: 35,
      repBonus: 2,
      harvestVariance: 0.2,
    },
  ],
};

// ── INSTANCE CREATION ──────────────────────────────────────
// Creates an owned asset instance from a catalogue template

function createAssetInstance(template, overrides = {}) {
  return {
    instanceId:   'asset_' + Date.now() + '_' + rand(1000, 9999),
    catalogueId:  template.id,
    type:         template.type,
    name:         template.name,
    desc:         template.desc,
    purchasePrice:template.price,
    currentValue: overrides.value || template.price || template.baseValue || 0,
    baseValue:    template.baseValue || template.price || 0,
    income:       template.baseIncome || template.incomeBonus || 0,
    upkeep:       template.upkeep || 0,
    repBonus:     template.repBonus || 0,
    condition:    100,  // 0-100, decays over time
    rentedOut:    false,
    rentalIncome: 0,
    improvements: [],   // installed improvement ids
    entailed:     false,
    inheritedBy:  null, // child name if designated
    volatility:   template.volatility || 0,
    harvestVariance: template.harvestVariance || 0,
    seasonal:     template.seasonal || null,
    ...overrides,
  };
}

// ── INCOME CALCULATION ─────────────────────────────────────
// Called to get total asset income per season

function calculateAssetIncome() {
  if (!G.assets || !G.assets.length) return 0;
  let total = 0;
  for (const asset of G.assets) {
    if (asset.rentedOut) {
      total += asset.rentalIncome || 0;
      continue;
    }
    // Seasonal assets only pay in their season
    if (asset.seasonal && asset.seasonal !== G.season) continue;

    let income = asset.income || 0;

    // Condition modifier: poor condition reduces income
    const conditionMod = asset.condition >= 80 ? 1.0
                       : asset.condition >= 50 ? 0.75
                       : asset.condition >= 25 ? 0.5 : 0.25;
    income *= conditionMod;

    // Harvest variance for farmland
    if (asset.harvestVariance > 0) {
      const variance = 1 + (Math.random() * 2 - 1) * asset.harvestVariance;
      income *= variance;
    }

    total += Math.floor(income);
  }
  return total;
}

function calculateAssetUpkeep() {
  if (!G.assets || !G.assets.length) return 0;
  return G.assets.reduce((s, a) => s + (a.rentedOut ? 0 : (a.upkeep || 0)), 0);
}

function calculateAssetRepBonus() {
  if (!G.assets || !G.assets.length) return 0;
  return G.assets.reduce((s, a) => s + (a.repBonus || 0), 0);
}

function netAssetIncome() {
  return calculateAssetIncome() - calculateAssetUpkeep();
}

// ── CONDITION DECAY ────────────────────────────────────────
// Called each season — assets deteriorate without upkeep

function decayAssets() {
  if (!G.assets) return;
  const events = [];
  for (const asset of G.assets) {
    if (asset.rentedOut) {
      // Tenants cause more wear
      asset.condition = Math.max(0, asset.condition - rand(3, 7));
    } else {
      // Natural decay
      const decay = asset.type === 'estate' ? rand(1, 3)
                  : asset.type === 'jewellery' ? 0
                  : rand(2, 5);
      asset.condition = Math.max(0, asset.condition - decay);
    }

    // Trigger warning events
    if (asset.condition === 20 && !asset._warned20) {
      asset._warned20 = true;
      events.push({ text: `${asset.name} is falling into disrepair.`, type: 'bad', asset });
    }
    if (asset.condition <= 5 && !asset._warned5) {
      asset._warned5 = true;
      events.push({ text: `${asset.name} is in a terrible state. It must be repaired urgently.`, type: 'bad', asset });
    }
  }

  // Jewellery value fluctuation
  for (const asset of G.assets.filter(a => a.type === 'jewellery' && a.volatility > 0)) {
    const change = 1 + (Math.random() * 2 - 1) * asset.volatility;
    asset.currentValue = Math.max(10, Math.floor(asset.currentValue * change));
  }

  return events;
}

// ── REPAIR ─────────────────────────────────────────────────
function repairAsset(asset) {
  const cost = Math.floor((100 - asset.condition) * (asset.upkeep || 20) * 0.5);
  if (G.wealth < cost) return { success: false, cost };
  G.wealth -= cost;
  asset.condition = 100;
  asset._warned20 = false;
  asset._warned5 = false;
  return { success: true, cost };
}

// ── BUY ────────────────────────────────────────────────────
function buyAsset(template) {
  if (G.wealth < template.price) return { success: false, reason: 'insufficient_funds' };
  G.wealth -= template.price;
  if (!G.assets) G.assets = [];
  const instance = createAssetInstance(template);
  G.assets.push(instance);
  saveGame();
  return { success: true, asset: instance };
}

// ── SELL ───────────────────────────────────────────────────
function sellAsset(asset) {
  // Sell at current value minus condition penalty
  const salePrice = Math.floor(asset.currentValue * (asset.condition / 100) * 0.8);
  G.wealth += salePrice;
  G.assets = G.assets.filter(a => a.instanceId !== asset.instanceId);
  saveGame();
  return { salePrice };
}

// ── RENT OUT ───────────────────────────────────────────────
function rentOutAsset(asset) {
  // Rental income: 6-10% of value per year, split over two seasons
  const annual = Math.floor(asset.currentValue * (0.06 + Math.random() * 0.04));
  asset.rentedOut = true;
  asset.rentalIncome = Math.floor(annual / 2); // per season
  saveGame();
  return { rentalIncome: asset.rentalIncome };
}

function stopRenting(asset) {
  asset.rentedOut = false;
  asset.rentalIncome = 0;
  saveGame();
}

// ── IMPROVE ────────────────────────────────────────────────
function addImprovement(asset, improvementId) {
  const imp = ASSET_CATALOGUE.improvements[improvementId];
  if (!imp) return { success: false };
  if (G.wealth < imp.price) return { success: false, reason: 'insufficient_funds' };
  if (asset.improvements.includes(improvementId)) return { success: false, reason: 'already_built' };

  G.wealth -= imp.price;
  asset.improvements.push(improvementId);
  asset.income = (asset.income || 0) + (imp.incomeBonus || 0);
  asset.upkeep = (asset.upkeep || 0) + (imp.upkeepBonus || 0);
  if (imp.repBonus) asset.repBonus = (asset.repBonus || 0) + imp.repBonus;
  asset.currentValue = Math.floor(asset.currentValue * 1.15); // improvements increase value
  saveGame();
  return { success: true };
}

// ── GIFT JEWELLERY ─────────────────────────────────────────
function giftJewellery(asset, recipientName) {
  const value = asset.currentValue;
  G.assets = G.assets.filter(a => a.instanceId !== asset.instanceId);
  saveGame();
  return { value, recipientName };
}

// ── ASSET SUMMARY ──────────────────────────────────────────
function getAssetSummary() {
  if (!G.assets || !G.assets.length) return { count: 0, totalValue: 0, netIncome: 0 };
  return {
    count:      G.assets.length,
    totalValue: G.assets.reduce((s,a) => s + (a.currentValue||0), 0),
    netIncome:  netAssetIncome(),
    upkeep:     calculateAssetUpkeep(),
    repBonus:   calculateAssetRepBonus(),
  };
}

// ── INHERIT ASSETS ─────────────────────────────────────────
// Called from will.js when processing death
function inheritAssetsFrom(deceasedName, assetsToInherit) {
  if (!G.assets) G.assets = [];
  for (const asset of assetsToInherit) {
    const inherited = { ...asset, inheritedFrom: deceasedName };
    G.assets.push(inherited);
  }
  saveGame();
}
