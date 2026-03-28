// ═══════════════════════════════════════════════════════════
// will.js — Inheritance, heirs, and death resolution
// ═══════════════════════════════════════════════════════════

// ── WILL STRUCTURE ─────────────────────────────────────────
// G.will = {
//   heir: null | { name, relation, type }
//   bequests: [ { assetInstanceId, recipientName, recipientRelation } ]
//   wealthSplit: [ { recipientName, fraction } ]
//   entailedTo: null | recipientName   (male heir for entailed estates)
//   written: bool
// }

function initWill() {
  G.will = {
    heir:        null,
    bequests:    [],
    wealthSplit: [],
    entailedTo:  null,
    written:     false,
  };
}

// ── HEIR DESIGNATION ───────────────────────────────────────

function getEligibleHeirs() {
  const heirs = [];

  // Spouse
  if (G.isMarried && G.spouse) {
    heirs.push({ name: G.spouse.fullName, relation: 'spouse', type: 'spouse' });
  }

  // Sons first (primogeniture for entailed property)
  const sons = G.children.filter(c => c.gender === 'son' && c.age >= 0);
  for (const s of sons) {
    heirs.push({ name: s.name, relation: 'son', type: 'child', child: s });
  }

  // Daughters
  const daughters = G.children.filter(c => c.gender === 'daughter');
  for (const d of daughters) {
    heirs.push({ name: d.name, relation: 'daughter', type: 'child', child: d });
  }

  // Siblings
  for (const sib of G.siblings.filter(s => s.alive)) {
    heirs.push({ name: sib.name, relation: sib.gender, type: 'sibling', sib });
  }

  // Guardian (if orphaned)
  if (G.guardian) {
    heirs.push({ name: G.guardian.name, relation: 'guardian', type: 'guardian' });
  }

  return heirs;
}

function setHeir(heir) {
  G.will.heir = heir;
  G.will.written = true;
  saveGame();
}

function addBequest(assetInstanceId, recipientName, recipientRelation) {
  // Remove existing bequest for this asset if any
  G.will.bequests = G.will.bequests.filter(b => b.assetInstanceId !== assetInstanceId);
  G.will.bequests.push({ assetInstanceId, recipientName, recipientRelation });
  G.will.written = true;
  saveGame();
}

function setWealthSplit(splits) {
  // splits: [ { recipientName, fraction } ] — fractions must sum to 1
  G.will.wealthSplit = splits;
  G.will.written = true;
  saveGame();
}

// ── PARENTAL INHERITANCE ───────────────────────────────────
// Called when a parent dies — player may inherit assets, wealth, title

function processParentDeath(parentKey) {
  const parent = parentKey === 'mother' ? G.mother : G.father;
  if (!parent || parent.inheritanceProcessed) return null;
  parent.inheritanceProcessed = true;

  const result = {
    wealthInherited: 0,
    assetsInherited: [],
    titleInherited: null,
    text: '',
  };

  // Father's estate (main inheritance)
  if (parentKey === 'father') {
    // Wealth inheritance — depends on rank, siblings, will
    const sibCount = G.siblings.filter(s => s.alive).length;
    const share = sibCount > 0
      ? (G.gender === 'male' ? 0.6 : 0.2)  // sons get more in Regency
      : 1.0;
    const fatherWealth = parent.wealth || G.income * 2;
    result.wealthInherited = Math.floor(fatherWealth * share * (0.7 + Math.random() * 0.3));
    G.wealth += result.wealthInherited;

    // Title inheritance
    if (G.title && G.title.rank >= 1 && G.gender === 'male') {
      result.titleInherited = { rank: G.title.rank, label: G.title.label };
    }

    // Generate some assets if father was wealthy
    if (fatherWealth >= 1000 && Math.random() > 0.3) {
      const farmTemplate = ASSET_CATALOGUE.farmland[0];
      const farm = createAssetInstance(farmTemplate, { inheritedFrom: parent.name });
      if (!G.assets) G.assets = [];
      G.assets.push(farm);
      result.assetsInherited.push(farm.name);
    }

    result.text = `Your father's estate is settled. You inherit £${result.wealthInherited.toLocaleString()}` +
      (result.assetsInherited.length ? ` and ${result.assetsInherited.join(', ')}` : '') + '.';
  }

  // Mother's personal effects (jewellery, modest bequests)
  if (parentKey === 'mother') {
    const motherGift = Math.floor((parent.wealth || 200) * (0.3 + Math.random() * 0.3));
    result.wealthInherited = motherGift;
    G.wealth += motherGift;

    // Heirloom jewellery
    if (Math.random() > 0.4) {
      const heirloom = ASSET_CATALOGUE.jewellery.find(j => j.id === 'family_heirloom');
      if (heirloom) {
        const instance = createAssetInstance(heirloom, { inheritedFrom: parent.name, purchasePrice: 0 });
        if (!G.assets) G.assets = [];
        G.assets.push(instance);
        result.assetsInherited.push('the family jewels');
      }
    }

    result.text = `Your mother leaves you £${result.wealthInherited.toLocaleString()}` +
      (result.assetsInherited.length ? ` and ${result.assetsInherited.join(', ')}` : '') + '.';
  }

  saveGame();
  return result;
}

// ── DEATH RESOLUTION ───────────────────────────────────────
// Called when player dies — processes the will and returns
// a narrative summary for the life summary screen

function resolveWill() {
  if (!G.will || !G.will.written) {
    return resolveIntestate();
  }

  const resolution = [];
  const heir = G.will.heir;

  // Entailed estates go to male heir automatically
  const entailed = (G.assets || []).filter(a => a.entailed);
  if (entailed.length > 0) {
    const maleHeir = G.children.find(c => c.gender === 'son') ||
                     G.siblings.find(s => s.gender === 'brother' && s.alive);
    if (maleHeir) {
      resolution.push(`${entailed.map(a=>a.name).join(' and ')} pass${entailed.length===1?'es':''} by entail to ${maleHeir.name}.`);
    }
  }

  // Specific bequests
  for (const bequest of G.will.bequests) {
    const asset = (G.assets || []).find(a => a.instanceId === bequest.assetInstanceId);
    if (asset) {
      resolution.push(`${asset.name} left to ${bequest.recipientName}.`);
    }
  }

  // Remaining wealth to heir
  if (heir) {
    const bequeathedAssets = new Set(G.will.bequests.map(b => b.assetInstanceId));
    const remaining = (G.assets || []).filter(a => !bequeathedAssets.has(a.instanceId) && !a.entailed);
    if (remaining.length) {
      resolution.push(`The remainder of the estate — ${remaining.map(a=>a.name).join(', ')} — to ${heir.name}.`);
    }
    if (G.wealth > 0 && !G.will.wealthSplit.length) {
      resolution.push(`£${G.wealth.toLocaleString()} to ${heir.name}.`);
    }
  }

  // Wealth splits
  if (G.will.wealthSplit.length) {
    for (const split of G.will.wealthSplit) {
      const amount = Math.floor(G.wealth * split.fraction);
      resolution.push(`£${amount.toLocaleString()} to ${split.recipientName}.`);
    }
  }

  return resolution;
}

function resolveIntestate() {
  // No will — law decides (Regency law: male primogeniture)
  const resolution = ['No will was found. The estate is settled by law.'];

  const maleChild = G.children.find(c => c.gender === 'son');
  const femaleChild = G.children.find(c => c.gender === 'daughter');
  const spouse = G.isMarried && G.spouse;
  const maleSib = G.siblings.find(s => s.gender === 'brother' && s.alive);

  if (spouse && !maleChild) {
    resolution.push(`The estate passes to ${G.spouse.fullName}.`);
  } else if (maleChild) {
    resolution.push(`The estate passes to ${maleChild.name}, the eldest son.`);
  } else if (femaleChild) {
    resolution.push(`In the absence of a male heir, the estate passes to ${femaleChild.name}.`);
  } else if (maleSib) {
    resolution.push(`In the absence of direct heirs, the estate passes to ${maleSib.name}.`);
  } else {
    resolution.push('No heir can be found. The estate reverts to the Crown.');
  }

  return resolution;
}

// ── WILL SUMMARY ───────────────────────────────────────────

function willSummaryText() {
  if (!G.will || !G.will.written) {
    return 'No will has been written. Your estate will be settled by law.';
  }
  const lines = ['Your will:'];
  if (G.will.heir) lines.push(`Principal heir: ${G.will.heir.name} (${G.will.heir.relation})`);
  for (const b of G.will.bequests) {
    const asset = (G.assets || []).find(a => a.instanceId === b.assetInstanceId);
    if (asset) lines.push(`${asset.name} → ${b.recipientName}`);
  }
  if (!lines.length) lines.push('Nothing has been decided yet.');
  return lines.join('\n');
}
