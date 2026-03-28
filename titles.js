// ═══════════════════════════════════════════════════════════
// titles.js — Titles, ranks, and social dynamics
// ═══════════════════════════════════════════════════════════

// ── TITLE HIERARCHY ────────────────────────────────────────
// rank 0 = untitled (Mr/Miss/Mrs)
// rank 1 = Esquire / Honourable (gentry distinction, minor)
// rank 2 = Baronet (Sir/Lady — purchased or inherited)
// rank 3 = Baron/Baroness (Lord/Lady — hereditary peerage)
// rank 4 = Earl/Countess or Viscount/Viscountess
// rank 5 = Duke/Duchess (rarest, almost always inherited)

const TITLE_RANKS = [
  { rank:0, male:'Mr',       female:'Miss/Mrs', prefix:false, peerage:false, label:'Untitled'   },
  { rank:1, male:'Esquire',  female:'Miss/Mrs', prefix:false, peerage:false, label:'Esquire'     },
  { rank:2, male:'Sir',      female:'Lady',     prefix:true,  peerage:false, label:'Baronet'     },
  { rank:3, male:'Lord',     female:'Lady',     prefix:true,  peerage:true,  label:'Baron'       },
  { rank:4, male:'Lord',     female:'Lady',     prefix:true,  peerage:true,  label:'Earl'        },
  { rank:5, male:'Duke',     female:'Duchess',  prefix:true,  peerage:true,  label:'Duke'        },
];

// Social effects of title vs wealth combinations
const TITLE_EFFECTS = {
  // [titleRank]: { almacksBonus, marriageOptions, repModifier, description }
  0: { almacksBonus:0,   repMod:0,  desc:'No title. Wealth and character must speak for you.' },
  1: { almacksBonus:0,   repMod:2,  desc:'Esquire — respectable family, minor distinction.'    },
  2: { almacksBonus:10,  repMod:8,  desc:'Baronet — titled, but the peerage may look down.'    },
  3: { almacksBonus:20,  repMod:15, desc:'Baron — proper peerage. Many doors open.'            },
  4: { almacksBonus:30,  repMod:25, desc:'Earl — high nobility. Society takes you seriously.'  },
  5: { almacksBonus:50,  repMod:40, desc:'Duke — the summit of the peerage.'                   },
};

// ── TITLE STATE ────────────────────────────────────────────
// G.title = { rank, label, source, estateTitle, oldFamily, familyName }
// source: 'birth' | 'marriage' | 'purchased' | 'granted'
// oldFamily: bool — ancient name even if no current title (affects dynamics)

function initTitle(rankId) {
  // Set starting title based on family rank
  const rankMap = { nobility:3, gentry:1, clergy:0, trade:0 };
  const startRank = rankMap[rankId] || 0;
  G.title = {
    rank:        startRank,
    label:       TITLE_RANKS[startRank].label,
    source:      'birth',
    estateTitle: null,     // e.g. 'of Pemberton Park'
    oldFamily:   rankId === 'nobility' || rankId === 'gentry',
    familyName:  pick(NAMES.surname),
  };
}

function getTitlePrefix() {
  if (!G.title) return G.gender === 'female' ? 'Miss' : 'Mr';
  const t = TITLE_RANKS[G.title.rank];
  if (!t.prefix) return G.gender === 'female' ? 'Miss' : 'Mr';
  return G.gender === 'female' ? t.female : t.male;
}

function getTitleLabel() {
  if (!G.title || G.title.rank === 0) return '';
  return TITLE_RANKS[G.title.rank].label;
}

function getFullStyledName() {
  const prefix = getTitlePrefix();
  const estate = G.title && G.title.estateTitle ? ' of ' + G.title.estateTitle : '';
  return `${prefix} ${G.name}${estate}`;
}

// ── SOCIAL DYNAMICS ────────────────────────────────────────
// The interesting tension: old name / no money vs new money / no title

function titleWealthDynamic() {
  const rank  = G.title ? G.title.rank : 0;
  const old   = G.title ? G.title.oldFamily : false;
  const w     = G.wealth;

  if (rank >= 3 && w < 500) {
    return {
      label: 'Titled but impoverished',
      desc:  'The name is excellent. The estate is mortgaged. Society knows both.',
      repMod: -5,
      marriageBonus: 10, // wealthy suitors want the title
    };
  }
  if (rank === 0 && w >= 5000) {
    return {
      label: 'New money',
      desc:  'Wealth without pedigree. Some doors remain closed regardless.',
      repMod: -3,
      almacksPenalty: -15,
    };
  }
  if (rank >= 3 && w >= 3000) {
    return {
      label: 'Title and fortune both',
      desc:  'The ideal. Society smiles on you entirely.',
      repMod: 10,
      marriageBonus: 20,
    };
  }
  if (old && rank < 2 && w < 1000) {
    return {
      label: 'Old family, fallen circumstances',
      desc:  'The name has history. The purse does not. A respectable sort of poverty.',
      repMod: 0,
    };
  }
  return { label: '', desc: '', repMod: 0 };
}

// ── ACQUISITION ROUTES ─────────────────────────────────────

// 1. Inherit a title (called when parent/relative with title dies)
function inheritTitle(newRank, source, estateTitle) {
  if (!G.title || newRank > G.title.rank) {
    const old = G.title ? G.title.rank : 0;
    G.title = {
      rank: newRank,
      label: TITLE_RANKS[newRank].label,
      source: source || 'inheritance',
      estateTitle: estateTitle || (G.title ? G.title.estateTitle : null),
      oldFamily: true,
      familyName: G.title ? G.title.familyName : pick(NAMES.surname),
    };
    const effect = TITLE_EFFECTS[newRank];
    changeStat('reputation', effect.repMod);
    saveGame();
    return { gained: true, from: old, to: newRank };
  }
  return { gained: false };
}

// 2. Acquire title through marriage
function acquireTitleThroughMarriage(spouse) {
  if (!spouse) return;
  // Spouse's title rank
  const spouseRank = spouse.titleRank || 0;
  if (spouseRank > (G.title ? G.title.rank : 0)) {
    const result = inheritTitle(spouseRank, 'marriage', spouse.estateTitle);
    if (result.gained) {
      return {
        newTitle: TITLE_RANKS[spouseRank].label,
        prefix: G.gender === 'female' ? TITLE_RANKS[spouseRank].female : TITLE_RANKS[spouseRank].male,
      };
    }
  }
  return null;
}

// 3. Purchase a baronetcy (rank 2)
function purchaseBaronetcy() {
  const BARONETCY_COST = 3000;
  if (G.wealth < BARONETCY_COST) {
    return { success: false, reason: 'insufficient_funds', cost: BARONETCY_COST };
  }
  if (G.title && G.title.rank >= 2) {
    return { success: false, reason: 'already_titled' };
  }
  G.wealth -= BARONETCY_COST;
  const result = inheritTitle(2, 'purchased', null);
  return { success: true, cost: BARONETCY_COST };
}

// 4. Royal grant (rare event — requires reputation >= 80 or extraordinary service)
function receiveRoyalGrant(grantedRank) {
  const result = inheritTitle(grantedRank || 3, 'granted', null);
  if (result.gained) {
    changeStat('reputation', 20); // extra rep for royal favour
  }
  return result;
}

// ── TITLE EFFECTS ON GAMEPLAY ──────────────────────────────

// Called when checking Almack's eligibility
function almacksModifier() {
  const rank = G.title ? G.title.rank : 0;
  const base = TITLE_EFFECTS[rank] ? TITLE_EFFECTS[rank].almacksBonus : 0;
  const dyn  = titleWealthDynamic();
  return base - (dyn.almacksPenalty || 0);
}

// Called when generating suitors — higher title attracts wealthier suitors
function suitorWealthModifier() {
  const rank = G.title ? G.title.rank : 0;
  const dyn  = titleWealthDynamic();
  return (TITLE_EFFECTS[rank] ? TITLE_EFFECTS[rank].repMod : 0) + (dyn.marriageBonus || 0);
}

// ── DISPLAY ────────────────────────────────────────────────

function titleSummaryText() {
  if (!G.title) return 'Untitled';
  const t     = TITLE_RANKS[G.title.rank];
  const dyn   = titleWealthDynamic();
  const lines = [
    `${t.label} · Acquired by ${G.title.source}`,
    TITLE_EFFECTS[G.title.rank].desc,
  ];
  if (dyn.label) lines.push(`Social standing: ${dyn.label}`);
  if (G.title.oldFamily) lines.push('An old family name — history counts for something.');
  return lines.join('\n');
}
