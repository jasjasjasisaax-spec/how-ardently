// ═══════════════════════════════════════════════════════════
// actions.js — All player-initiated actions
// Each action returns { log?, popup? } for the UI layer
// ═══════════════════════════════════════════════════════════

// ── ACTION REGISTRY ────────────────────────────────────────
// Each entry: { id, execute() → { log, popup } }

const ACTIONS = {

  // ══ CHILDHOOD ══════════════════════════════════════════

  study() {
    const g = rand(3, 8);
    changeStat('wit', g);
    const m = pick([
      'You bent over your books with admirable diligence.',
      'Greek verbs are not your friend. You persevere regardless.',
      'Your governess looks almost pleased. Almost.',
      'Three hours of geography. Your mind improves if not your mood.',
      'History, mathematics, and a great deal of Latin. You emerge wiser.',
    ]);
    return {
      log:   { text: m + ' Wit +' + g, type: 'good' },
      popup: { text: m, badge: 'Wit +' + g },
    };
  },

  french() {
    if (rand(1, 10) > 4) {
      const g = rand(4, 9);
      changeStat('wit', g);
      return {
        log:   { text: 'Très bien! Your French improves.', type: 'good' },
        popup: { text: 'Très bien! Your accent causes your tutor considerably less pain today.', badge: 'Wit +' + g },
      };
    } else {
      changeStat('wit', 2);
      return {
        log:   { text: 'Your French causes your tutor visible distress.' },
        popup: { text: 'Mon Dieu. Your accent causes your tutor visible suffering. But you improve a little regardless.', badge: 'Wit +2' },
      };
    }
  },

  music() {
    const g = rand(2, 6);
    changeStat('wit',   g);
    changeStat('looks', rand(1, 3));
    const m = pick([
      'An hour at the pianoforte. Progress is slow but audible.',
      'Your fingers begin to find their way. Slowly but surely.',
      'An excellent lesson — or at least not a terrible one.',
    ]);
    return {
      log:   { text: m, type: 'good' },
      popup: { text: m, badge: 'Wit +' + g },
    };
  },

  drawing() {
    const g = rand(2, 5);
    changeStat('looks', g);
    const m = pick([
      'Watercolours today. Your tree looks almost like a tree.',
      'A portrait of the family dog. He looks sceptical.',
      'Sketching from the window. The light is beautiful today.',
    ]);
    return {
      log:   { text: m, type: 'good' },
      popup: { text: m, badge: 'Looks +' + g },
    };
  },

  play() {
    const g = rand(4, 9);
    changeStat('health', g);
    const m = pick([
      'A glorious afternoon in the grounds.',
      'You fell out of a tree. Not badly. The adventure was worth it.',
      'Racing with the dogs across the south lawn. Pure joy.',
      'A long walk in the woods. You feel entirely yourself.',
      'Climbing the old garden wall. Your governess would be horrified.',
    ]);
    return {
      log:   { text: m, type: 'good' },
      popup: { text: m, badge: 'Health +' + g },
    };
  },

  church() {
    const g = rand(1, 3);
    changeStat('reputation', g);
    const m = pick([
      'A perfectly ordinary Sunday service. You were seen being virtuous.',
      'The vicar gives a surprisingly interesting sermon today.',
      'Two hours of sitting very still. Your piety improves.',
      'You manage to stay awake for the entire sermon. A personal achievement.',
    ]);
    return {
      log:   { text: m },
      popup: { text: m, badge: 'Reputation +' + g },
    };
  },

  riding() {
    const r = rand(1, 10);
    const g = rand(3, 7);
    changeStat('health', g);
    changeStat('looks', rand(1, 3));
    if (r >= 7) {
      return {
        log:   { text: 'An excellent ride. You are a natural.', type: 'good' },
        popup: { text: 'An excellent ride. The groom looks genuinely impressed.', badge: 'Health +' + g },
      };
    } else if (r >= 3) {
      return {
        log:   { text: 'A solid ride. Growing more confident.', type: 'good' },
        popup: { text: 'A solid lesson. You are growing more confident in the saddle.', badge: 'Health +' + g },
      };
    } else {
      changeStat('health', -5);
      return {
        log:   { text: 'You fell off. Twice.', type: 'bad' },
        popup: { text: 'You fell off. Twice. The horse seemed personally offended by the arrangement.', badge: 'Health -2' },
      };
    }
  },

  governess() {
    if (G.governess) {
      return {
        popup: {
          text: `${G.governess} is currently in your employ. She is ${pick(['strict and effective','kind and encouraging','thorough if somewhat alarming'])}.`,
          badge: null,
          choices: [
            {
              text: 'Dismiss her',
              fn() {
                const name = G.governess;
                G.governess = null;
                return { text: `${name} has departed. The schoolroom is oddly quiet.`, log: 'Governess dismissed.' };
              },
            },
            { text: 'Keep her on', fn() { return {}; } },
          ],
        },
      };
    }
    return {
      popup: {
        text: 'Several governesses present themselves for your consideration.',
        badge: null,
        choices: [
          {
            text: 'Miss Sharp — £50/yr (strict, excellent)',
            fn() {
              if (G.wealth < 100) return { text: 'Your family cannot presently afford this arrangement.' };
              G.governess = 'Miss Sharp'; G.wealth -= 50;
              return { text: 'Miss Sharp arrives with seventeen textbooks and no smile. "We begin immediately." You believe her.', badge: 'Wit +3/yr', log: 'Miss Sharp arrives.' };
            },
          },
          {
            text: 'Mrs Gentle — £40/yr (kind, arts-focused)',
            fn() {
              if (G.wealth < 80) return { text: 'Your family cannot presently afford this arrangement.' };
              G.governess = 'Mrs Gentle'; G.wealth -= 40;
              return { text: 'Mrs Gentle arrives with watercolours and sheet music. "We shall have such fun!" You like her immediately.', badge: 'Looks +2/yr', log: 'Mrs Gentle arrives.' };
            },
          },
          {
            text: 'Mlle Beaumont — £80/yr (exacting, French)',
            fn() {
              if (G.wealth < 160) return { text: 'Your family cannot presently afford Mlle Beaumont. She looks unsurprised.' };
              G.governess = 'Mlle Beaumont'; G.wealth -= 80;
              return { text: 'Mlle Beaumont sweeps in speaking only French. "Bonjour, mon enfant." You will be fluent within the year. Whether you like it or not.', badge: 'Wit +5/yr', log: 'Mlle Beaumont arrives.' };
            },
          },
          { text: 'Perhaps another time', fn() { return {}; } },
        ],
      },
    };
  },

  boarding() {
    if (G.schooling) {
      return {
        popup: { text: `You are already enrolled at ${G.schooling}.` },
      };
    }
    const schools = G.gender === 'female'
      ? [
          { n: "Miss Pinkerton's Academy", c: 200, wit: 10, looks: 5,  rep: 10 },
          { n: "Mrs Goddard's School",     c: 100, wit: 5,  rep: 8,   health: 5 },
        ]
      : [
          { n: 'Eton College',  c: 300, wit: 15, rep: 20, health: -5 },
          { n: 'Rugby School',  c: 250, wit: 12, rep: 10, health: 8  },
        ];
    return {
      popup: {
        text: 'Your parents discuss the question of schooling.',
        badge: null,
        choices: [
          ...schools.map(s => ({
            text: `${s.n} — £${s.c}/yr`,
            fn() {
              if (G.wealth < s.c) return { text: 'Your family cannot presently afford this.' };
              G.schooling = s.n; G.wealth -= s.c;
              if (s.wit)    changeStat('wit',        s.wit);
              if (s.looks)  changeStat('looks',      s.looks);
              if (s.rep)    changeStat('reputation', s.rep);
              if (s.health) changeStat('health',     s.health);
              return {
                text:  `You arrive at ${s.n}. You cry the first week. Then you make three excellent friends.`,
                badge: 'Wit +' + (s.wit || 0),
                log:   'You are sent to ' + s.n + '.',
              };
            },
          })),
          { text: 'Stay at home', fn() { return {}; } },
        ],
      },
    };
  },

  // ══ ADULT — SOCIETY ════════════════════════════════════

  ball() {
    // Coachman check — no carriage makes arriving awkward
    var hasCoachman = G.household && G.household.staff && G.household.staff.coachman && G.household.staff.coachman.hired;
    var hasCarriage = G.assets && G.assets.some(function(a){ return a.type === 'carriage'; });
    var arrivalPenalty = G.isMarried && !hasCoachman && !hasCarriage;

    // Lady's maid affects presentation at the ball
    var hasLadysMaid = G.household && G.household.staff && G.household.staff.ladysMaid && G.household.staff.ladysMaid.hired;
    var lmQuality = hasLadysMaid ? (G.household.staff.ladysMaid.quality || 60) : 0;

    // Chance to meet eligible suitor (auto-intro, handled after result)
    if (!G.isMarried && G.age >= 16 && Math.random() < 0.25) {
      setTimeout(() => {
        if (typeof generateSuitors !== 'function') return;
        const newSuitor = generateSuitors(1)[0];
        if (!newSuitor) return;
        addFeedEntry('You are introduced to ' + newSuitor.fullName + '.', 'event');
        queuePopup(
          `At the ball, you find yourself introduced to ${newSuitor.fullName} — ${newSuitor.rankLabel}, £${newSuitor.wealth.toLocaleString()} per annum. ${(newSuitor.desc||'').charAt(0).toUpperCase()+(newSuitor.desc||'').slice(1)}.`,
          null,
          [
            { text:'Show interest',     fn(){if(typeof addToSuitorPool==='function')addToSuitorPool(newSuitor,'ball');beginCourtship(newSuitor);return null;} },
            { text:'Note him for later', fn(){if(typeof addToSuitorPool==='function')addToSuitorPool(newSuitor,'ball');saveGame();renderPeopleView&&renderPeopleView();return{};} },
            { text:'Move on',            fn(){return{};} },
          ]
        );
      }, 800);
    }
    // Lady's maid gives a presentation bonus
    var presentationBonus = hasLadysMaid && lmQuality >= 70 ? rand(2,4) : hasLadysMaid ? 1 : 0;
    if (presentationBonus > 0) changeStat('looks', presentationBonus);
    // Attending a ball in Season builds fashion awareness
    if (G.fashion !== undefined) {
      var fashionGain = rand(2, 5);
      G.fashion = Math.min(100, (G.fashion||0) + fashionGain);
    }

    var r = rand(1, 10);
    // Arrival penalty nudges toward bad outcome
    if (arrivalPenalty && Math.random() < 0.4) r = Math.max(1, r - 2);

    if (r >= 8) {
      var g = rand(4, 8) + presentationBonus; changeStat('reputation', g);
      var arrivalNote = arrivalPenalty ? ' Arriving without a carriage was noticed, but you recovered.' : '';
      return {
        log:   { text: 'The ball is a triumph.', type: 'good' },
        popup: { text: 'The ball is a triumph. You move through the room like you were born to it.' + arrivalNote, badge: 'Reputation +' + g },
      };
    } else if (r >= 4) {
      var g2 = rand(1, 3); changeStat('reputation', g2);
      var arrivalNote2 = arrivalPenalty ? ' Your arrival on foot was remarked upon.' : '';
      return {
        log:   { text: 'A pleasant evening at the ball.', type: 'good' },
        popup: { text: 'A pleasant enough evening. You dance twice and have one genuinely interesting conversation.' + arrivalNote2, badge: 'Reputation +' + g2 },
      };
    } else {
      var d = rand(3, 8); changeStat('reputation', -d); G.scandals++;
      var mishap = pick([
        'You address a Duke as Mister. The silence is enormous.',
        'Your hem tears at the worst possible moment.',
        'The punch is considerably stronger than expected. The next morning is catastrophic.',
      ]);
      if (arrivalPenalty) mishap += ' And arriving without a carriage set entirely the wrong tone.';
      return {
        log:   { text: mishap, type: 'bad' },
        popup: { text: mishap, badge: 'Reputation -' + d },
      };
    }
  },
  park() {
    // Having a carriage or horse for Hyde Park improves visibility
    var hasCarriage = G.assets && G.assets.some(function(a){ return a.type === 'carriage'; });
    var hasHorse    = G.assets && G.assets.some(function(a){ return a.type === 'horse'; });
    var parkBonus   = hasCarriage ? rand(2,4) : hasHorse ? rand(1,2) : 0;
    if (parkBonus > 0) changeStat('reputation', parkBonus);
    // Hyde Park in spring — seeing and being seen builds fashion
    if (G.fashion !== undefined) {
      var parkFashion = hasCarriage ? rand(2,4) : rand(1,2);
      G.fashion = Math.min(100, (G.fashion||0) + parkFashion);
    }
    // Chance to encounter eligible person in Hyde Park (Spring only)
    if (!G.isMarried && G.age >= 16 && G.season === 'Spring' && Math.random() < 0.20) {
      setTimeout(() => {
        if (typeof generateSuitors !== 'function') return;
        const parkSuitor = generateSuitors(1)[0];
        if (!parkSuitor) return;
        addFeedEntry('You encounter ' + parkSuitor.fullName + ' in the park.', 'event');
        queuePopup(
          `On your promenade you encounter ${parkSuitor.fullName}. ${parkSuitor.rankLabel}, with a ${parkSuitor.courtshipStyle ? parkSuitor.courtshipStyle.label.toLowerCase() : 'agreeable'} manner.`,
          null,
          [
            { text:'Walk with him',           fn(){if(typeof addToSuitorPool==='function')addToSuitorPool(parkSuitor,'park');beginCourtship(parkSuitor);return null;} },
            { text:'Acknowledge and continue', fn(){if(typeof addToSuitorPool==='function')addToSuitorPool(parkSuitor,'park');saveGame();renderPeopleView&&renderPeopleView();return{};} },
          ]
        );
      }, 800);
    }
    const r = rand(1, 10);
    if (r >= 7) {
      const g = rand(2, 5); changeStat('reputation', g);
      const friends = G.npcs.filter(n => n.introduced && !n.isRival);
      const npc = friends.length ? pick(friends) : null;
      const txt = npc
        ? `You encounter ${npc.fullName} in the park. ${npc.desc.charAt(0).toUpperCase() + npc.desc.slice(1)}.`
        : 'The fashionable world is out in force. You are seen to considerable advantage.';
      if (npc) changeCloseness(npc, rand(3, 7));
      return {
        log:   { text: npc ? 'You encounter ' + npc.nick + ' in the park.' : 'A fine promenade.', type: 'good' },
        popup: { text: txt, badge: 'Reputation +' + g },
      };
    } else if (r >= 4) {
      const g = rand(2, 4); changeStat('health', g);
      return {
        log:   { text: 'A pleasant walk in the park.', type: 'good' },
        popup: { text: 'A pleasant walk. The fresh air does you genuine good.', badge: 'Health +' + g },
      };
    } else {
      changeStat('health', -3);
      return {
        log:   { text: 'It begins to rain. Suddenly.', type: 'bad' },
        popup: { text: 'It begins to rain without warning. You arrive home entirely soaked and undignified.', badge: 'Health -3' },
      };
    }
  },

  almacks() {
    if (G.reputation < 50) {
      return {
        popup: { text: 'Your reputation is not yet sufficient for Almack\'s. The patronesses have standards, and you have not yet met them.', badge: 'Need: Reputation 50' },
      };
    }
    const r = rand(1, 10);
    if (r >= 8) {
      const g = rand(6, 10); changeStat('reputation', g);
      return {
        log:   { text: "Almack's — a triumphant evening.", type: 'event' },
        popup: { text: "Almack's. You pass inspection. You dance. You are approved of. Your mother will dine on this story for a month.", badge: 'Reputation +' + g },
      };
    } else if (r >= 4) {
      const g = rand(3, 6); changeStat('reputation', g);
      return {
        log:   { text: "A successful evening at Almack's.", type: 'good' },
        popup: { text: "You attend Almack's without disgrace. This is higher praise than it sounds.", badge: 'Reputation +' + g },
      };
    } else {
      const d = rand(5, 10); changeStat('reputation', -d);
      return {
        log:   { text: "A difficult evening at Almack's.", type: 'bad' },
        popup: { text: "The patronesses notice something they do not approve of. You are not immediately sure what.", badge: 'Reputation -' + d },
      };
    }
  },

  country() {
    // Legacy — redirect to country_walk
    return ACTIONS.country_walk();
  },

  country_walk() {
    var g = rand(5, 12); changeStat('health', g);
    var hasHorse = G.assets && G.assets.some(function(a){ return a.type === 'horse'; });
    // Darcy reference — fine eyes improved by walking
    var looksBonus = rand(1, 3);
    changeStat('looks', looksBonus);
    // Chance encounter while walking (Autumn)
    if (!G.isMarried && G.age >= 16 && Math.random() < 0.15) {
      setTimeout(function() {
        if (typeof generateSuitors !== 'function') return;
        var walker = generateSuitors(1)[0];
        if (!walker) return;
        addFeedEntry('You encounter someone on your walk.', 'event');
        queuePopup(
          'On your walk you encounter ' + walker.fullName + '. He appears to have been riding. You are both slightly windswept. The conversation that follows is unexpectedly good.',
          null,
          [
            { text: 'Encourage the acquaintance', fn() { if(typeof addToSuitorPool==='function') addToSuitorPool(walker,'walk'); beginCourtship && beginCourtship(walker); return null; } },
            { text: 'A pleasant coincidence only', fn() { if(typeof addToSuitorPool==='function') addToSuitorPool(walker,'walk'); saveGame(); return {}; } },
          ]
        );
      }, 600);
    }
    var msgs = [
      'The countryside is golden and your mind is quieter than it has been for months.',
      'A long walk across the fields. The cold air is invigorating. You feel entirely yourself.',
      'Three miles before breakfast. Your cheeks are pink and your eyes are bright. A neighbour remarks on it.',
      'The harvest fields are extraordinary this year. You walk until your legs ache and your mind is clear.',
      'An unexpectedly pleasant morning. The exercise does what no medicine could.',
    ];
    var m = pick(msgs) + (hasHorse ? ' You ride part of the way and the countryside opens up beautifully.' : '');

    // Random walk event (25% chance)
    var walkEvents = [
      { chance: 0.25, fn() {
        // Stumble on something interesting
        var discoveries = [
          { text: 'You find a gap in the hedgerow that opens onto a view you have never seen before. You stand there for twenty minutes.', health: rand(2,4), wit: rand(1,3) },
          { text: 'You discover a ruined folly at the edge of the estate you never knew existed. It is overgrown and somewhat gothic. You are delighted.', wit: rand(2,5) },
          { text: 'You encounter a shepherd who has been working this land for forty years. He tells you the names of every field. You write them down when you get home.', wit: rand(2,4), faith: rand(1,2) },
          { text: 'It rains suddenly and thoroughly. You shelter under an oak that turns out to be inadequate. You arrive home soaked. You feel wonderful.', health: rand(3,6) },
          { text: 'You find a family of foxes sunning themselves in a clearing. They regard you with great calm. You stand very still for several minutes.', health: rand(2,4) },
        ];
        var d = pick(discoveries);
        if (d.wit) changeStat('wit', d.wit);
        if (d.faith) changeStat('faith', d.faith);
        return d;
      }},
    ];
    var chosenEvent = null;
    for (var i = 0; i < walkEvents.length; i++) {
      if (Math.random() < walkEvents[i].chance) { chosenEvent = walkEvents[i].fn(); break; }
    }
    var finalText = m;
    var finalBadge = 'Health +' + g + (looksBonus ? '  Looks +' + looksBonus : '');
    if (chosenEvent) {
      finalText += '\n\n' + chosenEvent.text;
      if (chosenEvent.wit) finalBadge += '  Wit +' + chosenEvent.wit;
    }
    return {
      log:   { text: 'A walk in the countryside.', type: 'good' },
      popup: { text: finalText, badge: finalBadge },
    };
  },

  visit() {
    // Visit neighbours — proper version is openVisitNeighbours() in ui.js
    // This handles the simple case (no known NPCs)
    var g = rand(1, 4); changeStat('reputation', g);
    var m = pick([
      'You pay a morning call on the neighbours. Tea is taken. Opinions are exchanged.',
      'An afternoon of local calls. The gossip is considerable and the cake is excellent.',
      'You call on three households and leave a good impression at all of them.',
      'A pleasant round of morning visits. You are better liked than you perhaps realised.',
    ]);
    return {
      log:   { text: m, type: 'good' },
      popup: { text: m, badge: 'Reputation +' + g },
    };
  },

  tend_sick() {
    // Visit sick villagers — faith, health effect, possible reputation
    var faithBonus = rand(2, 6);
    var healCost   = rand(0, 3); // exertion costs
    changeStat('faith', faithBonus);
    changeStat('health', -healCost);
    changeStat('reputation', rand(1, 3));
    var msgs = [
      'You spend the morning at several cottages. The sick are grateful. The smell is considerable. You leave feeling morally excellent.',
      'Old Mrs — in the village has been ill for a fortnight. You bring broth and sit with her. She tells you about 1798. It is quite a story.',
      'Three children with the fever. You send for the apothecary and sit with the family until evening. The father thanks you twice.',
      'The cottages near the farm need visiting. You go. The people are proud and poor. You are careful to be neither pitying nor distant.',
      'You visit the bedridden. It is sobering and necessary and you feel better for having done it.',
    ];
    // Random notable event (35% chance)
    var sickEvents = [
      { text: 'One of the children recovers faster than expected. The mother credits your visits. You suspect it was the broth more than anything, but you are glad either way.', faith: rand(2,4) },
      { text: 'An elderly man asks if you can write a letter for him to his son in London. You sit with him for an hour and write it carefully. He thanks you in a way that stays with you.', wit: rand(1,3), faith: rand(2,5) },
      { text: 'You find a young woman who is ill and also clearly frightened of something. She will not say what. You leave your card and tell her to send if she needs you. She does, three days later.', faith: rand(3,6) },
      { text: 'The apothecary is away. You do what you can with the knowledge you have, which is more than you expected.', wit: rand(2,4) },
      { text: 'A cottage you had not visited before. The poverty inside is more severe than you knew. You go home and send a basket the same afternoon.', faith: rand(4,7), text2: 'You resolve to send provisions.' },
    ];
    var sickEvent = null;
    if (Math.random() < 0.35) sickEvent = pick(sickEvents);
    if (sickEvent) {
      if (sickEvent.faith) changeStat('faith', sickEvent.faith);
      if (sickEvent.wit)   changeStat('wit', sickEvent.wit);
    }
    var sickText = pick(msgs) + (sickEvent ? '\n\n' + sickEvent.text : '');
    var sickBadge = 'Faith +' + faithBonus + (sickEvent && sickEvent.faith ? '+' + sickEvent.faith : '');
    return {
      log:   { text: 'You visit the sick in the village.', type: 'good' },
      popup: { text: sickText, badge: sickBadge },
    };
  },

  village_fete() {
    // Opens the full fete experience in ui.js
    if (typeof openVillageFete === 'function') { openVillageFete(); return null; }
    return { log: { text: 'You attend the village fete.', type: 'good' }, popup: { text: 'The fete is lively.' } };
  },

  letters() {
    const g = rand(2, 5); changeStat('wit', g);
    return {
      log:   { text: 'You compose your correspondence with care.', type: 'good' },
      popup: { text: 'Several letters — witty, warm, precisely calibrated. An excellent morning\'s work.', badge: 'Wit +' + g },
    };
  },

  social() {
    const known = G.npcs.filter(n => n.introduced && !n.isRival);
    if (!known.length) {
      return {
        popup: { text: 'You have not yet been introduced to anyone of particular note. Attend some social events first.' },
      };
    }
    return {
      popup: {
        text: 'Who shall you call upon today?',
        badge: null,
        choices: [
          ...known.map(npc => ({
            text: `${npc.fullName} — ${closenessLabel(npc.closeness)}`,
            fn() {
              const g = rand(5, 12);
              changeCloseness(npc, g);
              const msgs = [
                `A most agreeable afternoon with ${npc.nick}. They are ${npc.desc}.`,
                `${npc.nick} receives you warmly. You stay two hours longer than intended.`,
                `${npc.nick} tells you something VERY interesting about the Countess of Pemberton.`,
                `You and ${npc.nick} walk in the garden and solve the problems of society between you.`,
              ];
              return { text: pick(msgs), badge: 'Closeness +' + g, log: 'You visit ' + npc.nick + '.' };
            },
          })),
          { text: 'Perhaps another time', fn() { return {}; } },
        ],
      },
    };
  },

  // ══ ADULT — SELF ═══════════════════════════════════════

  read() {
    const g = rand(3, 7); changeStat('wit', g);
    const book = pick([
      'three volumes of improving poetry',
      'a history of Rome (very long)',
      'a novel discovered behind the encyclopedias',
      'a French comedy, for educational purposes',
      'a treatise on the management of estates',
    ]);
    return {
      log:   { text: 'You read ' + book + '.', type: 'good' },
      popup: { text: 'You make your way through ' + book + '. Your mind improves. Your posture suffers.', badge: 'Wit +' + g },
    };
  },

  piano() {
    const g = rand(2, 5);
    changeStat('wit',   g);
    changeStat('looks', rand(1, 3));
    return {
      log:   { text: 'An hour at the pianoforte.', type: 'good' },
      popup: { text: 'Two hours at the pianoforte. You are almost good. Almost.', badge: 'Wit +' + g },
    };
  },

  fencing() {
    const g = rand(3, 6);
    changeStat('health', g);
    changeStat('looks',  rand(1, 3));
    return {
      log:   { text: 'An hour with the fencing master.', type: 'good' },
      popup: { text: 'An hour with the fencing master. You are considerably more dangerous than yesterday.', badge: 'Health +' + g },
    };
  },

  sketch() {
    const g = rand(2, 5); changeStat('looks', g);
    return {
      log:   { text: 'You spend the morning sketching.', type: 'good' },
      popup: { text: 'A morning of sketching from the window. Your eye for composition improves considerably.', badge: 'Looks +' + g },
    };
  },

  parish() {
    const g = rand(2, 4); changeStat('reputation', g);
    return {
      log:   { text: 'You visit the parish.', type: 'good' },
      popup: { text: 'Your charitable nature is noted approvingly by several people who matter.', badge: 'Reputation +' + g },
    };
  },

  // ══ PERSONAL ═══════════════════════════════════════════

  family() {
    const people = [
      G.mother && G.mother.alive ? { label: 'Mother', obj: G.mother } : null,
      G.father && G.father.alive ? { label: 'Father', obj: G.father } : null,
      ...G.siblings.filter(s => s.alive).map(s => ({ label: s.name + ' (' + s.gender + ')', obj: s })),
    ].filter(Boolean);

    if (!people.length) {
      return { popup: { text: 'Your immediate family is not presently available.' } };
    }

    return {
      popup: {
        text: 'Write a letter home. Who shall you write to?',
        badge: null,
        choices: [
          ...people.map(p => ({
            text: `${p.label} — ${familyClosenessLabel(p.obj.closeness || 50)}`,
            fn() {
              const g = rand(4, 10);
              changeCloseness(p.obj, g);
              const replies = [
                'Your letter is returned with four pages of news and four more of questions.',
                'A warm reply arrives by next post. You feel considerably better for it.',
                'The reply is brief but genuinely affectionate.',
                'They write back at once. The letter smells faintly of home.',
              ];
              return { text: pick(replies), badge: 'Closeness +' + g, log: 'You write to ' + p.label + '.' };
            },
          })),
          { text: 'Perhaps another time', fn() { return {}; } },
        ],
      },
    };
  },

  circle() {
    const known = G.npcs.filter(n => n.introduced);
    if (!known.length) {
      return { popup: { text: 'Your social circle is not yet formed. Attend social events to meet people.' } };
    }
    const lines = known.map(n =>
      `${n.nick} — ${n.isRival ? '⚔ Rival' : closenessLabel(n.closeness)} (${n.closeness})`
    ).join('\n');
    return {
      popup: { text: 'Your acquaintances:\n\n' + lines },
    };
  },

  // mart and children are handled separately in ui.js
  // because they require multi-step flows

  needlework() {
    // Quiet domestic virtue — decorum, faith, occasional gift opportunity
    var decorumGain = rand(1,3);
    var faithGain   = rand(0,2);
    if (typeof G.eduStats !== 'undefined' && G.eduStats && G.eduStats.decorum) {
      G.eduStats.decorum.needlework = Math.min(100, (G.eduStats.decorum.needlework||0) + decorumGain);
      if (typeof recalcEduTotals === 'function') recalcEduTotals();
    }
    changeStat('faith', faithGain);
    // 20% chance to complete something giftable
    var completed = Math.random() < 0.2;
    var msgs = [
      'Two hours at your embroidery frame. The work is finer than you expected. You feel pleasantly industrious.',
      'A morning of needlework. The stitches are small and regular and the mind wanders productively.',
      'You finish the border on a handkerchief you have been working since February. Small victories.',
      'Needlework is underrated as a thinking activity. You solve three problems you did not know you had.',
      'Your Berlin wool-work is coming along well. The parrot looks almost like a parrot.',
    ];
    var popupText = pick(msgs);
    var badge = 'Decorum +' + decorumGain;
    if (completed) {
      popupText += '\n\nYou complete a small piece. It would make a pleasing gift.';
      badge += ' \u00b7 Piece completed';
      // Give option to gift later — for now just flag it
      if (!G.completedNeedlework) G.completedNeedlework = 0;
      G.completedNeedlework++;
    }
    return {
      log:   { text: 'A morning of needlework.', type: 'good' },
      popup: { text: popupText, badge: badge },
    };
  },

  lawn_games() {
    var healthGain = rand(3,8);
    var looksGain  = rand(1,3);
    changeStat('health', healthGain);
    changeStat('looks',  looksGain);
    // If it's Spring and there are guests/NPCs, chance of social encounter
    var hasCompany = G.npcs && G.npcs.filter(function(n){ return n.introduced; }).length > 0;
    var socialBonus = 0;
    var socialNote = '';
    if (hasCompany && Math.random() < 0.35) {
      var friend = pick(G.npcs.filter(function(n){ return n.introduced && !n.isRival; }));
      if (friend) {
        socialBonus = rand(3,8);
        if (typeof changeCloseness === 'function') changeCloseness(friend, socialBonus);
        socialNote = ' ' + friend.nick + ' joins you for a round of pall-mall. She is surprisingly competitive.';
      }
    }
    var msgs = [
      'A vigorous game of pall-mall. The croquet mallet is heavier than it looks. You win.',
      'Archery on the lawn. Your aim improves considerably when nobody is watching.',
      'Battledore and shuttlecock. Undignified, vigorous, and excellent for the constitution.',
      'A morning of lawn games. The fresh air is exactly what was needed.',
    ];
    return {
      log:   { text: 'Lawn games.', type: 'good' },
      popup: { text: pick(msgs) + socialNote, badge: 'Health +' + healthGain + '  Looks +' + looksGain },
    };
  },

  riding() {
    var hasHorse = G.assets && G.assets.some(function(a){ return a.type === 'horse'; });
    if (!hasHorse) {
      return { popup: { text: 'You do not have a horse. Perhaps visit the modiste’s catalogue, or a horse dealer.' } };
    }
    var horse = G.assets.find(function(a){ return a.type === 'horse'; });
    var healthGain = rand(4,10);
    var looksGain  = rand(2,4);
    changeStat('health', healthGain);
    changeStat('looks', looksGain);
    // Fashion gains from being seen on horseback in spring
    if (G.fashion !== undefined && G.season === 'Spring') {
      G.fashion = Math.min(100, (G.fashion||0) + rand(1,3));
    }
    // Small chance of accident — rises with horse quality (thoroughbreds are skittish)
    var accidentChance = horse.id === 'thoroughbred' ? 0.12 : horse.id === 'hunter' ? 0.06 : 0.03;
    if (Math.random() < accidentChance) {
      var injuryDmg = rand(5,15);
      changeStat('health', -injuryDmg);
      return {
        log:   { text: horse.name + ' throws you. You are unhurt enough to be embarrassed.', type: 'bad' },
        popup: { text: horse.name + ' shies at something entirely invisible and deposits you on the grass. You are not seriously hurt, mostly in your dignity. A groom witnesses everything.', badge: 'Health -' + injuryDmg },
      };
    }
    var msgs = [
      'An excellent ride. ' + horse.name + ' is in fine form and so are you.',
      'You ride out before anyone else is awake. The countryside is yours entirely.',
      'Two hours on horseback. You return with pink cheeks and considerably improved spirits.',
      'A fine morning’s ride. The exercise does exactly what it is supposed to do.',
    ];
    return {
      log:   { text: 'You ride out on ' + horse.name + '.', type: 'good' },
      popup: { text: pick(msgs), badge: 'Health +' + healthGain + '  Looks +' + looksGain },
    };
  },

  stillroom() {
    // Domestic science — soap, preserves, medicines, cordials
    var decorumGain = rand(1,3);
    var faithGain   = rand(0,2);
    if (typeof G.eduStats !== 'undefined' && G.eduStats && G.eduStats.decorum) {
      G.eduStats.decorum.stillroom = Math.min(100, (G.eduStats.decorum.stillroom||0) + decorumGain);
      if (typeof recalcEduTotals === 'function') recalcEduTotals();
    }
    changeStat('faith', faithGain);
    // Small wealth gain from useful products
    var produce = rand(1,4);
    G.wealth = (G.wealth||0) + produce;
    var activities = [
      { text: 'You spend the morning making lavender soap. The stillroom smells extraordinary. You produce more than expected.', badge: 'Decorum +' + decorumGain + '  +£' + produce },
      { text: 'A batch of rose water and a pot of elderflower cordial. The cordial is excellent. The rose water is better.', badge: 'Decorum +' + decorumGain + '  +£' + produce },
      { text: 'You put up six jars of preserve from the kitchen garden. The colour is beautiful. You label them in your best hand.', badge: 'Decorum +' + decorumGain + '  +£' + produce },
      { text: 'Tinctures and simples. The stillroom recipe book is three generations old. You add a note of your own.', badge: 'Decorum +' + decorumGain + '  Wit +1' },
    ];
    // Rare chance of preparing a fertility or health herb (married female)
    if (G.isMarried && G.fertility !== undefined && Math.random() < 0.15) {
      var herbGain = rand(2, 5);
      G.fertility = Math.min(100, G.fertility + herbGain);
      return {
        log:   { text: 'A morning in the stillroom, including some preparations your mother recommended.', type: 'good' },
        popup: {
          text: 'You follow a recipe from your grandmother\'s stillroom book. Raspberry leaf, lady\'s mantle, and something she described only as "useful for wives." You are not entirely sure what it does. But it is an old recipe and old recipes are usually old for a reason.',
          badge: 'Decorum +' + decorumGain + '  +£' + produce,
        },
      };
    }
    var chosen = pick(activities);
    return {
      log:   { text: 'A morning in the stillroom.', type: 'good' },
      popup: { text: chosen.text, badge: chosen.badge },
    };
  },


};

// ── DISPATCH ───────────────────────────────────────────────
// Called by UI when a player taps an action

function doAction(key) {
  if (!ACTIONS[key]) {
    console.warn('Unknown action:', key);
    return null;
  }
  const result = ACTIONS[key]();
  saveGame();
  return result;
}
