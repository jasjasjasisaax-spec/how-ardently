// ═══════════════════════════════════════════════════════════
// events.js — All random events as data
// Each event is { id, weight, condition, execute }
// execute() returns { log, popup } for the UI layer
// ═══════════════════════════════════════════════════════════

// ── EVENT REGISTRY ─────────────────────────────────────────
// Add new events here — they're automatically included in the pool
// weight: higher = more common (relative frequency)
// condition(G): optional function, return false to skip this event

const EVENT_REGISTRY = [

  // ── GOSSIP ───────────────────────────────────────────────
  {
    id: 'gossip',
    weight: 8,
    execute() {
      const victim  = pick(NAMES.surname.map(s => pick(['Lady','Lord','Miss','Mr']) + ' ' + s));
      const scandal = pick([
        'seen leaving a very improper establishment',
        'found in compromising correspondence',
        'observed weeping at the opera for no apparent reason',
        'rumoured to be deeply in debt',
        'said to have made a scene at Almack\'s',
        'known to have refused the most eligible offer of the Season',
        'spotted riding unaccompanied at dawn',
      ]);
      return {
        log:   { text: `${victim} has been ${scandal}.`, type: 'event' },
        popup: {
          text: `${victim} has been ${scandal}. This information arrives with your morning letters.`,
          badge: null,
          choices: [
            {
              text: 'Tell absolutely everyone',
              fn() {
                if (rand(1,10) >= 5) {
                  changeStat('reputation', rand(5,12));
                  return { text: 'You are the most interesting person in three drawing rooms.', badge: 'Reputation +8' };
                } else {
                  changeStat('reputation', -rand(5,10));
                  G.scandals++;
                  return { text: `${victim} claims you invented the entire story. People are not certain who to believe.`, badge: 'Reputation -8' };
                }
              },
            },
            {
              text: 'Tell only one trusted friend',
              fn() {
                changeStat('wit', rand(3,6));
                return { text: 'You show admirable restraint. It is everywhere by Thursday regardless.', badge: 'Wit +4' };
              },
            },
            {
              text: 'Keep it entirely to yourself',
              fn() {
                changeStat('reputation', rand(3,6));
                return { text: 'You say nothing. This is agony. You are however extremely virtuous.', badge: 'Reputation +4' };
              },
            },
          ],
        },
      };
    },
  },

  // ── LETTER ───────────────────────────────────────────────
  {
    id: 'letter_inheritance',
    weight: 4,
    execute() {
      const amt = pick([100, 200, 500, 1000]);
      changeStat('wealth', amt);
      return {
        log:   { text: `An unexpected inheritance. £${amt}.`, type: 'good' },
        popup: {
          text:  `A solicitor writes. A distant relation has left you £${amt}. You feel simultaneously grateful and guilty.`,
          badge: `Wealth +£${amt}`,
        },
      };
    },
  },

  {
    id: 'letter_anonymous',
    weight: 4,
    execute() {
      return {
        log:   { text: 'An anonymous letter arrives.', type: 'bad' },
        popup: {
          text:   '"I know what you did at the Pembridge ball." You are uncertain which incident they mean. There were several possibilities.',
          badge:  null,
          choices: [
            {
              text: 'Ignore it entirely',
              fn() {
                changeStat('reputation', -rand(2,5));
                return { text: 'Nothing comes of it. Probably.', badge: '' };
              },
            },
            {
              text: 'Investigate discreetly',
              fn() {
                changeStat('wit', rand(4,8));
                return { text: 'You cannot find the sender. But you learn a great deal in the attempt.', badge: 'Wit +5' };
              },
            },
          ],
        },
      };
    },
  },

  {
    id: 'letter_bills',
    weight: 5,
    execute() {
      const amt = rand(50, 200);
      changeStat('wealth', -amt);
      return {
        log:   { text: 'Bills. Several bills.', type: 'bad' },
        popup: {
          text:  'The modiste, the milliner, the bookshop — everyone requires payment at once. Such is life.',
          badge: `Wealth -£${amt}`,
        },
      };
    },
  },

  {
    id: 'letter_love',
    weight: 3,
    execute() {
      changeStat('looks',      rand(3,7));
      changeStat('reputation', rand(2,5));
      return {
        log:   { text: 'An anonymous love letter arrives.', type: 'good' },
        popup: {
          text:  'A love letter! Anonymous! Written with great passion and very poor spelling! Someone admires you enormously.',
          badge: 'Looks +5',
        },
      };
    },
  },

  // ── ILLNESS ──────────────────────────────────────────────
  {
    id: 'illness',
    weight: 5,
    execute() {
      const ill = pick([
        { n:'a severe chill',      d:15 },
        { n:'a nervous complaint', d:8  },
        { n:'a stomach upset',     d:10 },
        { n:'scarlet fever',       d:28 },
        { n:'a putrid throat',     d:12 },
      ]);
      changeStat('health', -ill.d);
      G.timesIll++;
      return {
        log:   { text: `You have contracted ${ill.n}.`, type: 'bad' },
        popup: {
          text:  `You have contracted ${ill.n}. The doctor is summoned and peers at you gravely over his spectacles.`,
          badge: `Health -${ill.d}`,
          choices: [
            {
              text: 'Take to your bed and rest',
              fn() {
                const g = rand(5,10); changeStat('health', g);
                return { text: 'Rest proves more effective than expected. You recover slowly.', badge: 'Health +' + g };
              },
            },
            {
              text: 'Take laudanum and hope',
              fn() {
                if (rand(1,10) >= 6) {
                  const g = rand(8,15); changeStat('health', g);
                  return { text: 'The laudanum helps enormously. You feel wonderfully floaty for a week.', badge: 'Health +' + g };
                } else {
                  const d = rand(3,8); changeStat('health', -d);
                  return { text: 'The laudanum does not agree with you. Three terrible days follow.', badge: 'Health -' + d };
                }
              },
            },
            {
              text: 'Travel to Bath for the waters',
              fn() {
                changeStat('wealth',    -100);
                changeStat('health',     rand(10,20));
                changeStat('reputation', rand(3,7));
                return { text: 'The waters are revolting. The society, however, is excellent.', badge: 'Reputation +5' };
              },
            },
          ],
        },
      };
    },
  },

  // ── FINANCIAL ────────────────────────────────────────────
  {
    id: 'financial_loss',
    weight: 4,
    execute() {
      const amt = rand(200, 800);
      changeStat('wealth', -amt);
      return {
        log:   { text: 'Your investments have underperformed.', type: 'bad' },
        popup: {
          text:  'Your investments have underperformed considerably. Certain economies must be made.',
          badge: `Wealth -£${amt}`,
        },
      };
    },
  },

  {
    id: 'financial_gain',
    weight: 3,
    execute() {
      const amt = rand(100, 500);
      changeStat('wealth', amt);
      return {
        log:   { text: 'A favourable outcome with the solicitors.', type: 'good' },
        popup: {
          text:  'A long-disputed matter has been resolved in your favour. Your solicitor looks almost cheerful.',
          badge: `Wealth +£${amt}`,
        },
      };
    },
  },

  {
    id: 'reputation_exposed',
    weight: 3,
    execute() {
      const d = rand(5,10);
      changeStat('reputation', -d);
      return {
        log:   { text: 'Word of certain financial difficulties gets around.', type: 'bad' },
        popup: {
          text:  'Word has got around regarding certain financial difficulties. This is not helpful.',
          badge: `Reputation -${d}`,
        },
      };
    },
  },

  // ── SOCIAL DISASTERS ─────────────────────────────────────
  {
    id: 'social_disaster',
    weight: 5,
    execute() {
      const disaster = pick([
        { t: 'You address a Duke as Mister. The silence is enormous.',                        r: -8  },
        { t: 'Your hem tears at the worst possible moment.',                                   r: -4  },
        { t: 'You are caught yawning during a recital. The performer sees.',                   r: -6  },
        { t: 'You accidentally knock lemonade onto Lady Hartley\'s gown.',                     r: -10 },
        { t: 'You are overheard making a cutting remark about precisely the wrong person.',    r: -12 },
        { t: 'You arrive at a dinner party on entirely the wrong evening.',                    r: -5  },
        { t: 'You call someone by the wrong name three times in succession.',                  r: -4  },
      ]);
      changeStat('reputation', disaster.r);
      G.scandals++;
      return {
        log:   { text: disaster.t, type: 'bad' },
        popup: {
          text:  disaster.t,
          badge: `Reputation ${disaster.r}`,
          choices: [
            {
              text: 'Apologise immediately',
              fn() {
                changeStat('reputation', rand(3,6));
                return { text: 'Your apology is gracious. The damage is partially contained.', badge: 'Reputation +4' };
              },
            },
            {
              text: 'Pretend it was intentional',
              fn() {
                if (rand(1,10) >= 7) {
                  changeStat('reputation', rand(5,10));
                  return { text: 'Somehow this works. Your nerve is extraordinary.', badge: 'Reputation +7' };
                } else {
                  changeStat('reputation', -rand(3,6));
                  return { text: 'It does not work. Nothing is more conspicuous than false confidence.', badge: 'Reputation -5' };
                }
              },
            },
            {
              text: 'Leave immediately',
              fn() {
                return { text: 'You depart with dignity. Or near enough.' };
              },
            },
          ],
        },
      };
    },
  },

  // ── INHERITANCE ──────────────────────────────────────────
  {
    id: 'inheritance_money',
    weight: 3,
    execute() {
      const amt = rand(500, 3000);
      changeStat('wealth',     amt);
      changeStat('reputation', rand(5,10));
      return {
        log:   { text: `A distant relation leaves you something.`, type: 'good' },
        popup: {
          text:  `A distant cousin has died childless and left you £${amt}. You feel grateful and slightly ashamed of the gratitude.`,
          badge: `Wealth +£${amt}`,
        },
      };
    },
  },

  {
    id: 'inheritance_library',
    weight: 2,
    execute() {
      changeStat('wit', rand(4,8));
      return {
        log:   { text: 'You inherit a library.', type: 'good' },
        popup: {
          text:  'A great-aunt leaves you her entire library. Seven hundred volumes. Your wit and your shelving problem both increase dramatically.',
          badge: 'Wit +6',
        },
      };
    },
  },

  {
    id: 'inheritance_contested',
    weight: 2,
    execute() {
      return {
        log:   { text: 'An expected inheritance fails to materialise.', type: 'bad' },
        popup: {
          text:  'The will is contested. The lawyers are optimistic. The lawyers are always optimistic.',
          badge: 'Wealth: uncertain',
        },
      };
    },
  },

  // ── RIVAL ────────────────────────────────────────────────
  {
    id: 'rival_sabotage',
    weight: 4,
    condition() { return !!G.rival; },
    execute() {
      const rival = G.rival;
      const d = rand(5,12);
      changeStat('reputation', -d);
      return {
        log:   { text: `${rival.nick} has been spreading stories.`, type: 'bad' },
        popup: {
          text:  `Someone has been spreading a story about you. The details are wrong in all the right ways to be maximally damaging. ${rival.nick} looks very innocent at dinner.`,
          badge: `Reputation -${d}`,
          choices: [
            {
              text: 'Investigate and expose her',
              fn() {
                if (rand(1,10) >= 5) {
                  changeStat('reputation', rand(10,18));
                  rival.closeness = clamp(rival.closeness - 20, 0, 100);
                  return { text: 'You find the proof you need. The story evaporates. Miss ' + rival.last + ' is much less popular by Thursday.', badge: 'Reputation +14' };
                } else {
                  return { text: 'You cannot find solid proof. The story continues to circulate.', badge: '' };
                }
              },
            },
            {
              text: 'Rise above it with dignity',
              fn() {
                changeStat('reputation', rand(3,7));
                return { text: 'You are serene and gracious. People admire your composure. The story fades slowly.', badge: 'Reputation +4' };
              },
            },
          ],
        },
      };
    },
  },

  // ── GOOD FORTUNE ─────────────────────────────────────────
  {
    id: 'unexpected_compliment',
    weight: 3,
    execute() {
      const npc = pick(G.npcs.filter(n => n.introduced && !n.isRival)) || null;
      const g = rand(3,8);
      changeStat('reputation', g);
      const who = npc ? npc.fullName : 'a person of considerable standing';
      return {
        log:   { text: `${who} says something very flattering about you.`, type: 'good' },
        popup: {
          text:  `${who} says something very flattering about you in public. Several people overhear. Your reputation improves considerably.`,
          badge: `Reputation +${g}`,
        },
      };
    },
  },

  {
    id: 'runaway_sibling',
    weight: 2,
    condition() {
      return G.siblings.some(s => s.alive && !s.eloped);
    },
    execute() {
      const sib = pick(G.siblings.filter(s => s.alive && !s.eloped));
      sib.eloped = true;
      G.scandals++;
      changeStat('reputation', -15);
      const officer = pick(NAMES.male) + ' ' + pick(NAMES.surname);
      return {
        log:   { text: `${sib.name} has eloped!`, type: 'bad' },
        popup: {
          text:  `${sib.name} has eloped with a ${pick(['militia officer','naval lieutenant','riding instructor'])} named ${officer} — without being married first! Your mother has fainted!`,
          badge: 'Reputation -15',
          choices: [
            {
              text: 'Chase after them',
              fn() {
                changeStat('wealth', -200);
                if (rand(1,10) >= 5) {
                  changeStat('reputation', 5);
                  return { text: 'You catch them at the next inn. The officer is persuaded to do the right thing. With money.', badge: 'Reputation +5' };
                } else {
                  changeStat('reputation', -5);
                  return { text: 'They are already in Scotland. It is done.', badge: 'Reputation -5' };
                }
              },
            },
            {
              text: 'Bribe the officer to marry her properly',
              fn() {
                changeStat('wealth',     -300);
                changeStat('reputation',  3);
                return { text: 'It costs you £300. The scoundrel takes it immediately. The marriage happens. It is not ideal.', badge: 'Reputation +3' };
              },
            },
            {
              text: 'Disown her entirely',
              fn() {
                changeStat('reputation', -10);
                if (G.siblings) {
                  const s = G.siblings.find(x => x.name === sib.name);
                  if (s) s.closeness = 0;
                }
                return { text: 'You have no sister. You have never had a sister. Nobody believes you.', badge: 'Reputation -10' };
              },
            },
          ],
        },
      };
    },
  },

];

// ── EVENT ENGINE ───────────────────────────────────────────

function getWeightedEvent() {
  // Filter eligible events
  const eligible = EVENT_REGISTRY.filter(e => {
    if (typeof e.condition === 'function' && !e.condition()) return false;
    return true;
  });
  if (!eligible.length) return null;

  // Weighted random selection
  const totalWeight = eligible.reduce((s, e) => s + (e.weight || 1), 0);
  let roll = Math.random() * totalWeight;
  for (const event of eligible) {
    roll -= (event.weight || 1);
    if (roll <= 0) return event;
  }
  return eligible[eligible.length - 1];
}

function fireRandomEvent() {
  const event = getWeightedEvent();
  if (!event) return null;
  return event.execute();
}


// ═══════════════════════════════════════════════════════════
// EXPANDED EVENT REGISTRY — appended below existing events
// ═══════════════════════════════════════════════════════════

// ── CHILDHOOD EVENTS ─────────────────────────────────────
// These are only added to the pool via fireChildhoodEvent()
// called from advanceSeason() when phase === 'childhood'

const CHILDHOOD_EVENTS = [

  {
    id: 'childhood_illness',
    weight: 4,
    execute() {
      const ill = pick([
        { n:'measles',          d:20 },
        { n:'a bad winter cold',d:10 },
        { n:'a fever',          d:15 },
        { n:'chickenpox',       d:8  },
      ]);
      changeStat('health', -ill.d);
      G.timesIll++;
      return {
        log:   { text: `You catch ${ill.n}.`, type:'bad' },
        popup: {
          text:  `You catch ${ill.n}. You spend two weeks in bed. Your mother reads to you, which is the only good part.`,
          badge: `Health -${ill.d}`,
          choices: [
            { text:'Rest and recover', fn() { changeStat('health', rand(5,10)); return { text:'You recover slowly. Spring feels wonderful after so long indoors.', badge:'Health +8' }; } },
            { text:'Soldier on regardless', fn() { changeStat('wit', rand(2,5)); return { text:'You refuse to stay in bed. You are ill for twice as long but you read an enormous number of books.', badge:'Wit +3' }; } },
          ],
        },
      };
    },
  },

  {
    id: 'childhood_friend',
    weight: 5,
    execute() {
      const fname = pick(NAMES.female);
      const lname = pick(NAMES.surname);
      const trait = pick(NPC_TRAITS);
      changeStat('health', 5);
      // Save as a childhood NPC friend
      if (!G.npcs) G.npcs = [];
      const existing = G.npcs.find(n => n.first === fname && n.last === lname);
      if (!existing) {
        G.npcs.push({
          id:         'childhood_' + fname + '_' + lname,
          first:      fname,
          last:       lname,
          fullName:   fname + ' ' + lname,
          nick:       fname,
          title:      'Miss',
          trait,
          desc:       getTDESC(trait) || 'a good sort',
          wealth:     rand(50, 300),
          gender:     'female',
          age:        G.age + rand(-2, 2),
          closeness:  rand(35, 55),
          approval:   50,
          faith:      rand(30, 70),
          introduced: true,
          isRival:    false,
          alive:      true,
          metHow:     'village',
          isChildhoodFriend: true,
        });
        saveGame();
      }
      return {
        log:   { text:`You make friends with ${fname} from the village.`, type:'good' },
        popup: {
          text:  `You make friends with ${fname} from the village. ${getTDESC(trait) ? getTDESC(trait).charAt(0).toUpperCase() + getTDESC(trait).slice(1) : 'A good sort'}. You spend the summer entirely in each other's company.`,
          badge: 'Health +5',
        },
      };
    },
  },

  {
    id: 'childhood_lost',
    weight: 3,
    execute() {
      changeStat('wit', rand(2,5));
      const adventures = [
        'You get lost in the woods for an entire afternoon. You are not frightened. Not very.',
        'You follow a stream to see where it goes. It goes very far. Your mother is not pleased.',
        'You climb to the roof of the east wing. The view is magnificent. Coming down is harder.',
        'You sneak into the library after dark and read by candlelight until three in the morning.',
      ];
      const m = pick(adventures);
      return {
        log:   { text: m, type:'event' },
        popup: { text: m, badge:'Wit +3' },
      };
    },
  },

  {
    id: 'childhood_pet',
    weight: 3,
    execute() {
      changeStat('health', rand(3,8));
      const petOptions = [
        { animal:'dog',    emoji:'🐕', name:pick(['Biscuit','Wellington','Admiral','Nelson','Pepper']) },
        { animal:'cat',    emoji:'🐈', name:pick(['Minerva','Shadow','Duchess','Pounce','Smoky'])     },
        { animal:'pony',   emoji:'🐎', name:pick(['Nutmeg','Bramble','Hazel','Flint','Arrow'])        },
        { animal:'rabbit', emoji:'🐇', name:pick(['Clover','Snowdrop','Button','Pip','Fern'])         },
      ];
      const pet = pick(petOptions);
      // Save to G.pets
      if (!G.pets) G.pets = [];
      G.pets.push({ name:pet.name, animal:pet.animal, emoji:pet.emoji, age:0, health:100, alive:true });
      return {
        log:   { text:`You acquire a ${pet.animal}. You name it ${pet.name}.`, type:'good' },
        popup: { text:`You acquire a ${pet.animal}. You name it ${pet.name}. ${pet.name} is the best creature in the world and you will not hear otherwise.`, badge:'Health +5' },
      };
    },
  },

  {
    id: 'childhood_sibling_fight',
    weight: 4,
    condition() { return G.siblings.length > 0; },
    execute() {
      const sib = pick(G.siblings.filter(s => s.alive));
      if (!sib) return null;
      changeCloseness(sib, -rand(5,10));
      const fights = [
        `You and ${sib.name} have a tremendous argument about something neither of you can quite remember afterwards.`,
        `${sib.name} breaks your favourite possession. You do not speak for three days.`,
        `You and ${sib.name} disagree so violently at dinner that your father sends you both to your rooms.`,
      ];
      const m = pick(fights);
      return {
        log:   { text: m, type:'bad' },
        popup: {
          text: m,
          badge: null,
          choices: [
            {
              text: 'Make it up quickly',
              fn() {
                changeCloseness(sib, rand(8,15));
                return { text: `You make it up before bedtime. Some fights make you closer in the end.`, badge:`Closeness +10` };
              },
            },
            {
              text: 'Hold the grudge',
              fn() {
                return { text:`You remain frosty for a week. ${sib.name} pretends not to notice. You both know perfectly well.` };
              },
            },
          ],
        },
      };
    },
  },

  {
    id: 'childhood_sibling_kind',
    weight: 4,
    condition() { return G.siblings.length > 0; },
    execute() {
      const sib = pick(G.siblings.filter(s => s.alive));
      if (!sib) return null;
      changeCloseness(sib, rand(5,12));
      const moments = [
        `${sib.name} covers for you when you break something valuable. You owe them enormously.`,
        `${sib.name} teaches you something no governess ever would. You are not sure it is entirely legal.`,
        `You and ${sib.name} stay up talking all night. You have never felt so understood.`,
        `${sib.name} stands up for you when it matters. You will not forget it.`,
      ];
      const m = pick(moments);
      changeStat('health', rand(3,6));
      return {
        log:   { text: m, type:'good' },
        popup: { text: m, badge:`Closeness +8` },
      };
    },
  },

  {
    id: 'childhood_discovery',
    weight: 3,
    execute() {
      changeStat('wit', rand(3,7));
      const discoveries = [
        'You find a box of old letters in the attic. They are love letters, and absolutely scandalous.',
        'You discover a hidden door in the library. It leads to a very small, very dusty room full of old maps.',
        'You find your father\'s old journals. You only read three pages before guilt stops you. But what three pages.',
        'You find a book that answers several questions you did not know you had. You are not the same afterwards.',
      ];
      return {
        log:   { text:'You make a discovery.', type:'event' },
        popup: { text: pick(discoveries), badge:'Wit +5' },
      };
    },
  },

  {
    id: 'childhood_birthday',
    weight: 2,
    execute() {
      changeStat('health', rand(5,10));
      const g = pick([rand(50,200), 'a very fine book', 'a new riding habit', 'a small piece of jewellery', 'a painting set', 'a fencing lesson with the best master in the county']);
      const gift = typeof g === 'number' ? `£${g}` : g;
      return {
        log:   { text:`Your birthday. A good one.`, type:'good' },
        popup: { text:`Your birthday. Your family gives you ${gift}. Your mother cries slightly. A good day.`, badge:'Health +8' },
      };
    },
  },

];

// ── SPRING-SPECIFIC EVENTS ────────────────────────────────

const SPRING_EVENTS = [

  {
    id: 'spring_suitor_rumour',
    weight: 4,
    condition() { return !G.isMarried && G.phase !== 'childhood'; },
    execute() {
      const name = pick(NAMES.male) + ' ' + pick(NAMES.surname);
      const wealth = pick([800, 1500, 3000, 6000]);
      return {
        log:   { text:`A new eligible gentleman arrives in Town.`, type:'event' },
        popup: {
          text:  `Word reaches you: a Mr ${name} has arrived in Town with £${wealth.toLocaleString()} per annum and no wife. Your mother has already heard. She is already planning.`,
          badge: null,
          choices: [
            {
              text: 'Express cautious interest',
              fn() { changeStat('reputation', rand(2,5)); return { text:`Your interest is noted. People begin engineering introductions.`, badge:'Reputation +3' }; },
            },
            {
              text: 'Wait and observe',
              fn() { changeStat('wit', rand(2,4)); return { text:`Wise. Half the Season will have assessed him before you need to.`, badge:'Wit +3' }; },
            },
          ],
        },
      };
    },
  },

  {
    id: 'spring_picnic',
    weight: 4,
    execute() {
      const g = rand(3,8);
      changeStat('health', g);
      const npc = G.npcs.find(n => n.introduced && !n.isRival);
      const companion = npc ? npc.nick : 'a pleasant party';
      return {
        log:   { text:`A picnic in the park. Beautiful weather.`, type:'good' },
        popup: { text:`A picnic in the park with ${companion}. The weather is perfect. The sandwiches are excellent. The conversation is better.`, badge:`Health +${g}` },
      };
    },
  },

  {
    id: 'spring_theatre',
    weight: 4,
    execute() {
      const r = rand(1,10);
      if (r >= 6) {
        const g = rand(2,5); changeStat('reputation', g);
        return {
          log:   { text:'A night at the theatre. You are seen.', type:'good' },
          popup: { text:'A night at the theatre. You are seen in an excellent box by several important people. The play itself is tolerable.', badge:`Reputation +${g}` },
        };
      } else {
        changeStat('wit', rand(3,6));
        return {
          log:   { text:'A night at the theatre. The play is extraordinary.', type:'good' },
          popup: { text:'A night at the theatre. You forget entirely to be seen because the play is extraordinary. Your mind is full of it for days.', badge:'Wit +4' },
        };
      }
    },
  },

  {
    id: 'spring_queen_charlotte',
    weight: 2,
    condition() { return G.reputation >= 60 && !G.isMarried && G.phase !== 'childhood'; },
    execute() {
      changeStat('reputation', rand(8,14));
      return {
        log:   { text:'You are presented at Court.', type:'event' },
        popup: { text:'You are presented at the Queen\'s drawing room. The gown alone costs an extraordinary sum. Your curtsey is perfect. Your mother nearly faints with pride.', badge:`Reputation +15` },
      };
    },
  },

];

// ── AUTUMN-SPECIFIC EVENTS ────────────────────────────────

const AUTUMN_EVENTS = [

  {
    id: 'autumn_harvest',
    weight: 5,
    execute() {
      const good = rand(1,10) >= 4;
      if (good) {
        const g = rand(100,400); changeStat('wealth', g);
        return {
          log:   { text:'A good harvest this year.', type:'good' },
          popup: { text:'A good harvest. The estate is in excellent health. Your father looks ten years younger.', badge:`Wealth +£${g}` },
        };
      } else {
        const d = rand(100,300); changeStat('wealth', -d);
        return {
          log:   { text:'A poor harvest this year.', type:'bad' },
          popup: { text:'A poor harvest. Economies must be made. Your new gown will have to wait until Spring.', badge:`Wealth -£${d}` },
        };
      }
    },
  },

  {
    id: 'autumn_hunting',
    weight: 4,
    condition() { return G.gender === 'male'; },
    execute() {
      const g = rand(3,8); changeStat('health', g);
      changeStat('reputation', rand(2,5));
      return {
        log:   { text:'The autumn hunt.', type:'good' },
        popup: { text:'The autumn hunt. You ride well. You are seen to ride well. Both of these things matter, in their different ways.', badge:`Health +${g}` },
      };
    },
  },

  {
    id: 'autumn_preserves',
    weight: 3,
    condition() { return G.gender === 'female'; },
    execute() {
      changeStat('reputation', rand(3,7));
      return {
        log:   { text:'You oversee the household preserves.', type:'good' },
        popup: { text:'You oversee the making of preserves and pickles for the winter. It is deeply satisfying in a way you cannot explain to anyone who has not done it.', badge:'Reputation +4' },
      };
    },
  },

  {
    id: 'autumn_visitor',
    weight: 5,
    execute() {
      const relation = pick(['your aunt','a cousin','an old family friend','your godmother','a distant uncle']);
      const r = rand(1,10);
      if (r >= 6) {
        const g = rand(4,9); changeStat('wit', g);
        changeStat('reputation', rand(2,5));
        return {
          log:   { text:`${relation.charAt(0).toUpperCase()+relation.slice(1)} comes to stay.`, type:'event' },
          popup: { text:`${relation.charAt(0).toUpperCase()+relation.slice(1)} comes to stay for several weeks. The stories they tell. You had no idea your family was so interesting.`, badge:`Wit +${g}` },
        };
      } else {
        changeStat('health', -rand(3,7));
        return {
          log:   { text:`${relation.charAt(0).toUpperCase()+relation.slice(1)} comes to stay for rather too long.`, type:'bad' },
          popup: { text:`${relation.charAt(0).toUpperCase()+relation.slice(1)} comes to stay. And stays. And stays. The house is full of their opinions. You are exhausted.`, badge:'Health -5' },
        };
      }
    },
  },

  {
    id: 'autumn_reflection',
    weight: 3,
    execute() {
      const g = rand(3,7); changeStat('wit', g);
      const thoughts = [
        'The long autumn evenings give you time to think. You reach some conclusions you have been avoiding.',
        'A long walk alone in the fallen leaves. You feel more yourself than you have in months.',
        'You write in your journal for the first time in years. It is more honest than you expected.',
        'The quiet of the country after the Season feels like setting down a heavy weight.',
      ];
      return {
        log:   { text:'A quiet autumn evening.', type:'good' },
        popup: { text: pick(thoughts), badge:`Wit +${g}` },
      };
    },
  },

];

// ── POST-MARRIAGE & FAMILY EVENTS ─────────────────────────

const MARRIAGE_EVENTS = [

  {
    id: 'marriage_content',
    weight: 5,
    condition() { return G.isMarried; },
    execute() {
      const g = rand(3,8); changeStat('health', g);
      const spouse = G.spouse;
      const moments = [
        `You and ${spouse.first} spend a quiet evening at home. It is, you realise, exactly what you wanted.`,
        `${spouse.first} says something that makes you laugh until you cannot breathe. You had forgotten they could do that.`,
        `You and ${spouse.first} disagree about something trivial and resolve it in ten minutes. This, you think, is what a good marriage looks like.`,
        `${spouse.first} brings you flowers for no reason. You are more moved than you expected to be.`,
      ];
      return {
        log:   { text: `A good day with ${spouse.first}.`, type:'good' },
        popup: { text: pick(moments), badge:`Health +${g}` },
      };
    },
  },

  {
    id: 'marriage_disagreement',
    weight: 4,
    condition() { return G.isMarried; },
    execute() {
      const spouse = G.spouse;
      const d = rand(3,8); changeStat('health', -d);
      const disputes = [
        `You and ${spouse.first} disagree about money. You are both right, which is the worst kind of argument.`,
        `${spouse.first} does something that annoys you considerably. You say nothing. This is also annoying.`,
        `You and ${spouse.first} have words about the management of the household. Neither of you backs down.`,
      ];
      return {
        log:   { text:`A difficult day.`, type:'bad' },
        popup: {
          text:  pick(disputes),
          badge: `Health -${d}`,
          choices: [
            { text:'Address it directly',   fn() { changeStat('health', rand(5,10)); return { text:'You talk it through. It is uncomfortable. It helps.', badge:'Health +7' }; } },
            { text:'Let it pass', fn() { changeStat('wit',  rand(2,5)); return { text:'You let it pass. You have learned something about patience, at least.', badge:'Wit +3' }; } },
          ],
        },
      };
    },
  },

  {
    id: 'marriage_mother_in_law',
    weight: 4,
    condition() { return G.isMarried && G.gender === 'female'; },
    execute() {
      const r = rand(1,10);
      if (r >= 6) {
        changeStat('reputation', rand(3,7));
        return {
          log:   { text:'Your mother-in-law visits.', type:'event' },
          popup: { text:'Your mother-in-law visits and is, against all expectation, pleasant. She compliments the house. You are cautiously delighted.', badge:'Reputation +4' },
        };
      } else {
        const d = rand(4,9); changeStat('health', -d);
        return {
          log:   { text:'Your mother-in-law visits.', type:'bad' },
          popup: { text:'Your mother-in-law visits. She has opinions about everything. The carpets, the meals, the children, your posture. She stays for two weeks.', badge:`Health -${d}` },
        };
      }
    },
  },

  {
    id: 'marriage_old_friend',
    weight: 3,
    condition() { return G.isMarried; },
    execute() {
      const fname = pick(NAMES.female);
      changeStat('health', rand(4,8));
      return {
        log:   { text:`An old friend visits.`, type:'good' },
        popup: { text:`${fname} — an old friend from before your marriage — comes to stay for a fortnight. You talk for hours. It is like breathing out after holding your breath.`, badge:'Health +6' },
      };
    },
  },

  {
    id: 'child_milestone',
    weight: 4,
    condition() { return G.children.length > 0; },
    execute() {
      const child = pick(G.children);
      const milestones = [
        `${child.name} says their first word. It is not what you expected. It is wonderful.`,
        `${child.name} takes their first steps. You watch from across the room, holding your breath.`,
        `${child.name} asks you a question you cannot answer. You say "I do not know" and they accept this completely.`,
        `${child.name} makes you laugh so hard you spill your tea. Worth it.`,
        `${child.name} is unwell for a week. You do not leave their side. They recover completely.`,
      ];
      changeStat('health', rand(3,7));
      return {
        log:   { text: `${child.name}: a moment.`, type:'good' },
        popup: { text: pick(milestones), badge:'Health +5' },
      };
    },
  },

];

// ── NPC RELATIONSHIP EVENTS ───────────────────────────────

const NPC_EVENTS = [

  {
    id: 'friend_favour',
    weight: 4,
    condition() { return getFriendlyNPCs().some(n => n.closeness >= 50); },
    execute() {
      const friend = pick(getFriendlyNPCs().filter(n => n.closeness >= 50));
      const g = rand(3,8); changeStat('reputation', g);
      changeCloseness(friend, rand(3,7));
      const favours = [
        `${friend.fullName} speaks very well of you to exactly the right person at exactly the right moment.`,
        `${friend.nick} secures you an invitation you had no right to expect. You attend. It changes things.`,
        `${friend.nick} quietly corrects a false impression someone had formed about you. You only hear about it later.`,
        `${friend.fullName} includes you in something that opens three doors at once.`,
      ];
      return {
        log:   { text:`${friend.nick} does you a good turn.`, type:'good' },
        popup: { text: pick(favours), badge:`Reputation +${g}` },
      };
    },
  },

  {
    id: 'friend_confidence',
    weight: 3,
    condition() { return getFriendlyNPCs().some(n => n.closeness >= 65); },
    execute() {
      const friend = pick(getFriendlyNPCs().filter(n => n.closeness >= 65));
      changeStat('wit', rand(4,8));
      changeCloseness(friend, rand(5,10));
      const confidences = [
        `${friend.nick} tells you something in confidence. You tell them something in return. The friendship deepens considerably.`,
        `${friend.fullName} confides a difficulty to you. You help. The gratitude is genuine and lasting.`,
        `You and ${friend.nick} have the sort of conversation you will remember for years.`,
      ];
      return {
        log:   { text:`A meaningful conversation with ${friend.nick}.`, type:'good' },
        popup: { text: pick(confidences), badge:'Wit +5' },
      };
    },
  },

  {
    id: 'rival_gossip_attempt',
    weight: 4,
    condition() { return !!G.rival && G.rival.closeness >= 20; },
    execute() {
      const rival = G.rival;
      return {
        log:   { text:`${rival.nick} attempts something unpleasant.`, type:'bad' },
        popup: {
          text:  `${rival.fullName} is overheard telling a story about you. The story is embellished. The embellishments are calculated.`,
          badge: null,
          choices: [
            {
              text: 'Laugh it off publicly',
              fn() {
                changeStat('reputation', rand(3,8));
                return { text:'You laugh it off with such good grace that the story reflects worse on them than on you.', badge:'Reputation +5' };
              },
            },
            {
              text: 'Retaliate in kind',
              fn() {
                if (rand(1,10) >= 5) {
                  changeStat('reputation', rand(4,9));
                  return { text:'Your counter-story is better. More witnesses. Better timing. The room is yours.', badge:'Reputation +6' };
                } else {
                  changeStat('reputation', -rand(3,7));
                  return { text:'The retaliation backfires. You both look petty. You slightly more so.', badge:'Reputation -5' };
                }
              },
            },
            {
              text: 'Do nothing — rise above',
              fn() {
                changeStat('reputation', rand(2,5));
                return { text:'You say nothing. Your composure is noted as a kind of magnificence.', badge:'Reputation +3' };
              },
            },
          ],
        },
      };
    },
  },

  {
    id: 'npc_needs_help',
    weight: 3,
    condition() { return getFriendlyNPCs().some(n => n.closeness >= 40); },
    execute() {
      const friend = pick(getFriendlyNPCs().filter(n => n.closeness >= 40));
      return {
        log:   { text:`${friend.nick} needs your help.`, type:'event' },
        popup: {
          text:  `${friend.fullName} comes to you with a difficulty. It is not small. They have come to you because they trust you.`,
          badge: null,
          choices: [
            {
              text: 'Help them fully',
              fn() {
                changeStat('wealth', -rand(50,150));
                changeCloseness(friend, rand(15,25));
                return { text:`You help without hesitation. ${friend.nick} will not forget it.`, badge:`Closeness +20` };
              },
            },
            {
              text: 'Help what you can',
              fn() {
                changeCloseness(friend, rand(8,15));
                return { text:`You do what you can. It is not everything, but ${friend.nick} is grateful for what it is.`, badge:`Closeness +10` };
              },
            },
            {
              text: 'Apologise — you cannot help',
              fn() {
                changeCloseness(friend, -rand(5,10));
                return { text:`You cannot help, and say so. ${friend.nick} understands. But something shifts between you.`, badge:`Closeness -8` };
              },
            },
          ],
        },
      };
    },
  },

];

// ── UNEXPECTED EXPENSES ──────────────────────────────────────
// These pull from finance.js UNEXPECTED_EXPENSES array

const EXPENSE_EVENTS = typeof UNEXPECTED_EXPENSES !== 'undefined' ? UNEXPECTED_EXPENSES : [];

// ── SEASON-AWARE FIRE FUNCTION ─────────────────────────────
// Replaces the old fireRandomEvent() with season awareness

function fireRandomEvent() {
  // Build weighted pool from base registry + season pool
  const seasonPool = G.season === 'Spring' ? SPRING_EVENTS : AUTUMN_EVENTS;
  const marriagePool = G.isMarried ? MARRIAGE_EVENTS : [];
  const npcPool = G.npcs.length ? NPC_EVENTS : [];

  const expensePool = (typeof UNEXPECTED_EXPENSES !== 'undefined' && Math.random() < 0.3) ? UNEXPECTED_EXPENSES : [];
  const pool = [
    ...EVENT_REGISTRY,
    ...seasonPool,
    ...marriagePool,
    ...npcPool,
    ...expensePool,
  ].filter(e => {
    if (typeof e.condition === 'function' && !e.condition()) return false;
    return true;
  });

  if (!pool.length) return null;

  const totalWeight = pool.reduce((s, e) => s + (e.weight || 1), 0);
  let roll = Math.random() * totalWeight;
  for (const event of pool) {
    roll -= (event.weight || 1);
    if (roll <= 0) return event.execute();
  }
  return pool[pool.length - 1].execute();
}

// ── CHILDHOOD EVENT FIRE FUNCTION ─────────────────────────
// Called from advanceSeason() when phase === 'childhood'

function fireChildhoodEvent() {
  const eligible = CHILDHOOD_EVENTS.filter(e => {
    if (typeof e.condition === 'function' && !e.condition()) return false;
    return true;
  });
  if (!eligible.length) return null;

  const total = eligible.reduce((s,e) => s + (e.weight||1), 0);
  let roll = Math.random() * total;
  for (const ev of eligible) {
    roll -= (ev.weight || 1);
    if (roll <= 0) {
      const result = ev.execute();
      return result;
    }
  }
  return eligible[eligible.length-1].execute();
}

// TDESC: lazy alias — NPC_TRAIT_DESC is defined in game.js (loaded first in browser)
// Use a function to avoid const declaration order issues
function getTDESC(trait) { return (typeof NPC_TRAIT_DESC !== "undefined" ? NPC_TRAIT_DESC : {})[trait] || trait; }
