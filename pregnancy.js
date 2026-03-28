// ═══════════════════════════════════════════════════════════
// pregnancy.js — Conception, pregnancy season, birth resolution
// ═══════════════════════════════════════════════════════════

// ── STATE ──────────────────────────────────────────────────
// G.pregnancy = null | {
//   season:       'Spring'|'Autumn' — season of conception
//   weeksAlong:   0-40 (approx)
//   complications: bool
//   bedRest:      bool — locks social actions this season
//   miscarried:   bool
//   twins:        bool
//   triplets:     bool
//   eventsThisSeason: []  — event ids already fired
// }

function initPregnancy() {
  // Called when conception occurs
  G.pregnancy = {
    season:           G.season,
    weeksAlong:       0,
    complications:    false,
    bedRest:          false,
    miscarried:       false,
    twins:            false,
    triplets:         false,
    eventsThisSeason: [],
  };

  // Determine multiples at conception
  // Twins: ~3% base, slightly higher with family history
  const twinBase = 0.03 + (G.children.filter(c => c.gender !== null).length > 1 ? 0.01 : 0);
  if (Math.random() < twinBase) {
    G.pregnancy.twins = true;
    // Triplets: ~10% of twin pregnancies (~0.3% overall)
    if (Math.random() < 0.10) {
      G.pregnancy.triplets = true;
      G.pregnancy.twins    = false; // triplets supersedes
    }
  }

  saveGame();
}

// ── IS PREGNANT CHECK ──────────────────────────────────────
function isPregnant() {
  return !!G.pregnancy && !G.pregnancy.miscarried;
}

// ── PREGNANCY SEASON EVENTS ───────────────────────────────
// Called from advanceSeason() when G.pregnancy exists
// Returns array of { text, type, popup?, lockActions? }

function pregnancySeasonEvents() {
  if (!G.pregnancy) return [];
  if (G.pregnancy.miscarried) return [];

  const events = [];
  const p = G.pregnancy;
  const alreadySeen = p.eventsThisSeason || [];
  p.weeksAlong += 20; // ~20 weeks per season

  // ── FIRST SEASON (0-20 weeks) ───────────────────────────
  if (p.weeksAlong <= 20) {

    // Morning sickness (almost universal)
    if (!alreadySeen.includes('morning_sickness')) {
      p.eventsThisSeason.push('morning_sickness');
      const dmg = rand(5,15);
      changeStat('health', -dmg);
      events.push({
        text: 'Morning sickness has arrived, predictably and mercilessly.',
        type: 'bad',
        popup: {
          text: pick([
            'Morning sickness. Every morning. And sometimes afternoons. The doctor says it will pass. The doctor is not the one being ill.',
            'The sickness arrives with the dawn and does not consult your social calendar before doing so.',
            'You have declined three invitations this week on account of sickness. Your mother has told absolutely everyone. You are mortified.',
          ]),
          badge: `Health -${dmg}`,
        },
      });
    }

    // Spouse reaction
    if (!alreadySeen.includes('spouse_reaction') && G.isMarried && G.spouse) {
      p.eventsThisSeason.push('spouse_reaction');
      const spouseReactions = [
        `${G.spouse.first} is ${pick(['overjoyed','quietly delighted','visibly moved','somewhat overwhelmed — in the best way'])}. He holds your hand. It helps.`,
        `${G.spouse.first} insists on consulting three doctors, two midwives, and his mother. You find this ${pick(['touching','excessive','rather sweet','more alarming than reassuring'])}.`,
        `${G.spouse.first} has read every pamphlet on the subject and is now an expert. He is not an expert. But you do not say this.`,
      ];
      changeCloseness(G.spouse, rand(8,15));
      events.push({
        text: G.spouse.first + ' learns the news.',
        type: 'good',
        popup: { text: pick(spouseReactions), badge: 'Closeness +10' },
      });
    }

    // Folk remedy from family/servant
    if (!alreadySeen.includes('folk_remedy') && Math.random() > 0.4) {
      p.eventsThisSeason.push('folk_remedy');
      const remedies = [
        { text:'Your cook insists ginger in everything will cure the sickness. You try it. It does not cure it. But it helps slightly.', health:3 },
        { text:'Your mother sends a letter describing twelve remedies, none of which are medically sound and all of which you will try anyway.',  health:0 },
        { text:'A maid tells you to keep a piece of coal under your pillow. You do not do this. The sickness continues regardless.', health:0 },
        { text:'Someone has left a bundle of dried lavender by your bed. You do not know who. It helps, surprisingly.', health:5 },
        { text:'Your housekeeper swears by cold water and fresh air before breakfast. It is miserable. It works.', health:6 },
      ];
      const r = pick(remedies);
      if (r.health > 0) changeStat('health', r.health);
      events.push({
        text: 'A folk remedy is offered.',
        type: r.health > 0 ? 'good' : 'event',
        popup: { text: r.text, badge: r.health > 0 ? `Health +${r.health}` : null },
      });
    }

    // Miscarriage risk (early pregnancy, higher risk)
    if (!alreadySeen.includes('miscarriage_check') && G.health < 40) {
      p.eventsThisSeason.push('miscarriage_check');
      const riskChance = G.health < 20 ? 0.35 : G.health < 30 ? 0.20 : 0.10;
      if (Math.random() < riskChance) {
        p.miscarried = true;
        changeStat('health', -rand(15,25));
        G.scandals++; // grief affects social presence
        events.push({
          text: 'The pregnancy is lost.',
          type: 'bad',
          popup: {
            text: 'The pregnancy is lost. There are no adequate words for this. The house is very quiet. ' +
              (G.spouse ? G.spouse.first + ' does not leave your side.' : 'You grieve privately, in your own way.'),
            badge: 'Health -20',
          },
          miscarriage: true,
        });
        G.pregnancy = null;
        saveGame();
        return events;
      }
    }
  }

  // ── SECOND SEASON (20-40 weeks) ─────────────────────────
  if (p.weeksAlong > 20 && p.weeksAlong <= 40) {

    // Quickening — first movement
    if (!alreadySeen.includes('quickening')) {
      p.eventsThisSeason.push('quickening');
      changeStat('health', rand(3,7));
      events.push({
        text: 'You feel the first movement.',
        type: 'event',
        popup: {
          text: pick([
            'There — a movement. Small, unmistakable, entirely astonishing. Everything becomes more real at once.',
            'The quickening. You are sitting quietly when it happens. You sit very still for a long moment afterwards.',
            'You feel the baby move for the first time. You do not tell anyone immediately. You hold it to yourself for a few hours.',
          ]),
          badge: 'Health +5',
        },
      });
    }

    // Complications — bed rest
    if (!alreadySeen.includes('complications') && Math.random() < complicationChance()) {
      p.eventsThisSeason.push('complications');
      p.complications = true;
      events.push({
        text: 'The doctor advises bed rest.',
        type: 'bad',
        popup: {
          text: 'The doctor visits and says the word "rest" fourteen times. He is not subtle. You are confined to bed for most of the season. It is very dull. You read a great deal.',
          badge: null,
          choices: [
            {
              text: 'Follow his advice completely',
              fn() {
                G.pregnancy.bedRest = true;
                changeStat('health', rand(5,12));
                return { text: 'You submit to bed rest. It is tedious. You are safer for it.', badge: 'Health +8' };
              },
            },
            {
              text: 'Rest partially — you have obligations',
              fn() {
                changeStat('health', rand(2,5));
                changeStat('reputation', rand(2,5));
                return { text: 'You rest more than you would like and less than the doctor would like. A compromise nobody is happy with.', badge: 'Health +3' };
              },
            },
            {
              text: 'Ignore him — you feel fine',
              fn() {
                const roll = rand(1,10);
                if (roll <= 3) {
                  changeStat('health', -rand(10,20));
                  return { text: 'This was unwise. The complications worsen. You spend the rest of the season in bed regardless.', badge: 'Health -15' };
                }
                return { text: 'Against all advice, you are fine. The doctor is annoyed.' };
              },
            },
          ],
        },
        lockActions: true,
      });
    }

    // Late miscarriage risk (lower but still possible)
    if (!alreadySeen.includes('late_risk') && G.health < 30 && !p.complications) {
      p.eventsThisSeason.push('late_risk');
      if (Math.random() < 0.12) {
        p.miscarried = true;
        changeStat('health', -rand(20,35));
        events.push({
          text: 'The pregnancy is lost late.',
          type: 'bad',
          popup: {
            text: 'Late in the pregnancy, the worst happens. The doctor does what he can. You recover slowly, in body if not entirely in spirit.',
            badge: 'Health -25',
          },
          miscarriage: true,
        });
        G.pregnancy = null;
        saveGame();
        return events;
      }
    }

    // Superstition event — second season
    if (!alreadySeen.includes('superstition') && Math.random() > 0.5) {
      p.eventsThisSeason.push('superstition');
      const superstitions = [
        { text:'A village woman tells you that if you crave sweet things, the child is a girl. You have been craving pickles. Nobody knows what this means.', health:0 },
        { text:'Someone has hung a horseshoe above the nursery door. You do not know who did this. You leave it there.', health:2 },
        { text:'Your mother insists on certain prayers said at midnight. You do not do this. You do not tell her you have not done this.', health:0 },
        { text:'A charm from the kitchen maid, made of dried herbs and ribbon. You put it in your pocket and say nothing.', health:3 },
      ];
      const s = pick(superstitions);
      if (s.health > 0) changeStat('health', s.health);
      events.push({
        text: 'A superstition arrives.',
        type: 'event',
        popup: { text: s.text, badge: s.health > 0 ? `Health +${s.health}` : null },
      });
    }

    // Birth — happens at end of second season
    events.push({ birth: true });
  }

  saveGame();
  return events;
}

function complicationChance() {
  let chance = 0.15;
  if (G.health < 40)  chance += 0.15;
  if (G.health < 25)  chance += 0.15;
  if (G.age > 35)     chance += 0.10;
  if (G.age > 40)     chance += 0.15;
  if (G.pregnancy && G.pregnancy.twins)    chance += 0.15;
  if (G.pregnancy && G.pregnancy.triplets) chance += 0.30;
  return Math.min(chance, 0.80);
}

// ── BIRTH RESOLUTION ──────────────────────────────────────
// Returns detailed outcome object — naming happens in ui.js

function resolveBirth() {
  const p = G.pregnancy;
  if (!p || p.miscarried) return null;

  const isTwins    = p.twins;
  const isTriplets = p.triplets;
  const count      = isTriplets ? 3 : isTwins ? 2 : 1;

  // Mother survival
  const safeThreshold = G.health >= 70 ? 0.05
                      : G.health >= 50 ? 0.12
                      : G.health >= 30 ? 0.22
                      : 0.38;
  const motherDied = Math.random() < safeThreshold * (isTriplets ? 2 : isTwins ? 1.5 : 1);

  // Each child's survival
  const babies = [];
  for (let i = 0; i < count; i++) {
    const gender = Math.random() < 0.5 ? 'son' : 'daughter';
    const childSurvived = motherDied ? Math.random() > 0.3
                        : Math.random() > (p.complications ? 0.15 : 0.05);
    babies.push({ gender, survived: childSurvived, name: null }); // name filled in ui.js
  }

  const complications = p.complications;
  G.pregnancy = null; // clear pregnancy state
  saveGame();

  return { babies, motherDied, complications, isTwins, isTriplets, count };
}

// ── PREGNANCY STATUS TEXT ─────────────────────────────────
function pregnancyStatusText() {
  if (!G.pregnancy) return null;
  const p = G.pregnancy;
  if (p.weeksAlong <= 20) return 'With child · Early';
  return 'With child · Late' + (p.bedRest ? ' · Bed rest' : '');
}
