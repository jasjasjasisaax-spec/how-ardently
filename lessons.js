// ═══════════════════════════════════════════════════════════
// lessons.js — Interactive subject lesson events
// Each subject has a pool of events with choices.
// Clicking a subject fires one; seasons fire random ones.
// ═══════════════════════════════════════════════════════════

// ── LESSON EVENT REGISTRY ─────────────────────────────────
// Each lesson: { id, subject, group, text, choices[] }
// choices: { text, fn() → { statChanges[], log, followup? } }

const LESSON_EVENTS = {

  // ── MUSIC ───────────────────────────────────────────────
  music: [
    {
      id: 'music_practise',
      text: 'Your music lesson. The piece is difficult — your fingers keep slipping on the same passage.',
      choices: [
        {
          text: 'Practise it fifty times until it is right',
          fn() {
            const g = rand(5,10);
            changeEduStat('decorum','music', g);
            return { log:'You master the difficult passage.', badge:`Music +${g}`,
              text:'You play it through, again and again, until your fingers find the notes without thinking. When it finally comes right, the satisfaction is considerable.' };
          },
        },
        {
          text: 'Play something you already know instead',
          fn() {
            const g = rand(2,4);
            changeEduStat('decorum','music', g);
            changeStat('health', rand(2,4));
            return { log:'You play your favourite piece.', badge:`Music +${g}`,
              text:'You set aside the difficult piece and play the one you love. It is not what you were supposed to do. It sounds beautiful.' };
          },
        },
        {
          text: 'Stop and ask the teacher to demonstrate',
          fn() {
            const g = rand(4,8);
            changeEduStat('decorum','music', g);
            changeEduStat('literacy','reading', rand(1,3));
            return { log:'The teacher demonstrates.', badge:`Music +${g}`,
              text:'You ask the teacher to play it first. Watching their hands is more instructive than any explanation. You understand the passage entirely differently now.' };
          },
        },
      ],
    },
    {
      id: 'music_performance',
      text: 'Your governess announces you will play for a small gathering this afternoon. Your stomach drops.',
      choices: [
        {
          text: 'Prepare thoroughly and play with care',
          fn() {
            const g = rand(6,12);
            changeEduStat('decorum','music', g);
            changeStat('reputation', rand(2,5));
            return { log:'A successful small performance.', badge:`Music +${g}`,
              text:'You play well. Not brilliantly — but well. Several people say kind things. Your governess looks almost proud.' };
          },
        },
        {
          text: 'Play something bold and difficult',
          fn() {
            const roll = rand(1,10);
            if (roll >= 6) {
              changeEduStat('decorum','music', rand(8,14));
              changeStat('reputation', rand(5,10));
              return { log:'A bold performance — it works.', badge:'Music +10',
                text:'You choose the hardest piece and play it with everything you have. It is not perfect. But it is alive. The room is entirely quiet when you finish.' };
            } else {
              changeEduStat('decorum','music', rand(2,5));
              changeStat('reputation', -rand(3,6));
              return { log:'The bold piece goes wrong.', badge:'Reputation -4',
                text:'You misjudge your own ability. The piece falls apart in the second movement. You finish in mortified silence. Your governess says nothing, which is worse.' };
            }
          },
        },
        {
          text: 'Plead a headache and withdraw',
          fn() {
            changeStat('health', rand(1,3));
            return { log:'You avoided the performance.', badge:'',
              text:'You plead a headache. Your governess knows perfectly well you do not have one. Nothing is said. Nothing needs to be.' };
          },
        },
      ],
    },
    {
      id: 'music_ear',
      text: 'The music master asks if you can hear the difference between two notes. You listen carefully.',
      choices: [
        {
          text: 'Listen with complete attention',
          fn() {
            const g = rand(4,8);
            changeEduStat('decorum','music', g);
            return { log:'You develop your ear for music.', badge:`Music +${g}`,
              text:'You listen until the notes feel different in your chest, not just your ears. The music master nods. "You have a musician\'s ear," he says. This is the best thing anyone has said to you this week.' };
          },
        },
        {
          text: 'Guess — they sound the same to you',
          fn() {
            changeEduStat('decorum','music', rand(1,3));
            return { log:'You are still developing your ear.', badge:'Music +2',
              text:'You guess wrong. The music master sighs. "Again." You try again. Still wrong. You begin to understand this will take time.' };
          },
        },
      ],
    },
  ],

  // ── DANCING ─────────────────────────────────────────────
  dancing: [
    {
      id: 'dancing_steps',
      text: 'The dancing master introduces a new figure. It is more complex than last week\'s.',
      choices: [
        {
          text: 'Follow the steps exactly as taught',
          fn() {
            const g = rand(5,10);
            changeEduStat('decorum','dancing', g);
            return { log:'You master the new figure.', badge:`Dancing +${g}`,
              text:'You follow precisely, counting under your breath. By the third repetition your feet know what your mind is still working out. A solid lesson.' };
          },
        },
        {
          text: 'Add your own style to it',
          fn() {
            const roll = rand(1,10);
            if (roll >= 6) {
              changeEduStat('decorum','dancing', rand(6,12));
              changeStat('looks', rand(2,4));
              return { log:'Your style impresses the dancing master.', badge:'Dancing +8',
                text:'You add something of your own — a turn, a small flourish. The dancing master stops the class. "Watch her," he says. You are embarrassed and delighted in equal measure.' };
            } else {
              changeEduStat('decorum','dancing', rand(2,5));
              return { log:'You lose your place in the figure.', badge:'Dancing +3',
                text:'Your flourish goes wrong. You lose your place and must stop. "The steps first," the dancing master says, not unkindly, "then the art."' };
            }
          },
        },
        {
          text: 'Watch the others before attempting it yourself',
          fn() {
            const g = rand(3,7);
            changeEduStat('decorum','dancing', g);
            changeEduStat('reason','philosophy', rand(1,2));
            return { log:'You observe before joining in.', badge:`Dancing +${g}`,
              text:'You stand to the side and watch. The pattern becomes clear. When you join in you make fewer mistakes than those who began immediately. Observation is its own kind of learning.' };
          },
        },
      ],
    },
    {
      id: 'dancing_partner',
      text: 'You are partnered with a girl who dances considerably better than you.',
      choices: [
        {
          text: 'Try to match her standard',
          fn() {
            const g = rand(6,12);
            changeEduStat('decorum','dancing', g);
            return { log:'A challenging partner pushes you forward.', badge:`Dancing +${g}`,
              text:'You push yourself to keep up. She is patient with you, or at least not impatient. By the end you are dancing better than you have ever danced.' };
          },
        },
        {
          text: 'Ask her to teach you what she knows',
          fn() {
            const g = rand(5,10);
            changeEduStat('decorum','dancing', g);
            changeEduStat('decorum','manners', rand(2,4));
            // Potential schoolmate friendship
            return { log:'You learn from a more accomplished partner.', badge:`Dancing +${g}`, schoolmateMoment: 'teaches_dancing',
              text:'She shows you the turn properly. She is surprisingly generous about it. You begin to feel you might learn something from her that has nothing to do with dancing.' };
          },
        },
        {
          text: 'Do your best and do not let the difference bother you',
          fn() {
            changeEduStat('decorum','dancing', rand(3,6));
            changeStat('health', rand(2,4));
            return { log:'A solid lesson without anxiety.', badge:'Dancing +4',
              text:'You dance at your own level and do not compare yourself. This is harder than it sounds. You succeed fairly well.' };
          },
        },
      ],
    },
  ],

  // ── SCRIPTURE ───────────────────────────────────────────
  scripture: [
    {
      id: 'scripture_question',
      text: 'The vicar (or your governess) poses a question from scripture that you are not certain of.',
      choices: [
        {
          text: 'Answer honestly — even if you are not sure',
          fn() {
            const g = rand(4,9);
            changeEduStat('faith','scripture', g);
            changeEduStat('faith','theology', rand(2,4));
            return { log:'You answer honestly.', badge:`Scripture +${g}`,
              text:'You give your answer, uncertain but direct. The teacher considers it. "Not wrong," they say. "But incomplete." They explain. You understand now, and you will not forget it.' };
          },
        },
        {
          text: 'Stay quiet and hope not to be called upon',
          fn() {
            changeEduStat('faith','scripture', rand(1,3));
            return { log:'You stayed quiet in the lesson.', badge:'Scripture +2',
              text:'You are not called upon. Relief. But later you look up the passage yourself, because the question has lodged in your mind and you find you actually want to know.' };
          },
        },
        {
          text: 'Ask the teacher to explain what the passage means',
          fn() {
            const g = rand(5,10);
            changeEduStat('faith','theology', g);
            changeEduStat('faith','scripture', rand(2,5));
            const faithChange = rand(2,5);
            G.faith = clamp((G.faith||50) + faithChange, 10, 95);
            return { log:'You ask a genuine question.', badge:`Theology +${g}`,
              text:'You ask what it actually means — not just what it says. The teacher is pleased. The answer is more interesting than you expected. You find yourself thinking about it for days.' };
          },
        },
        {
          text: 'Challenge the interpretation politely',
          fn() {
            changeEduStat('reason','philosophy', rand(4,8));
            changeEduStat('faith','theology', rand(2,5));
            const repChange = rand(1,10) >= 6 ? rand(2,5) : -rand(2,4);
            changeStat('reputation', repChange);
            return { log:'You challenged the teacher\'s interpretation.', badge:`Philosophy +6 · Rep ${repChange>=0?'+':''}${repChange}`,
              text:'You say, carefully, that you read the passage differently. There is a pause. The teacher looks at you. Then they say something surprising: "Tell me why." It is the most interesting lesson you have had.' };
          },
        },
      ],
    },
    {
      id: 'scripture_memorise',
      text: 'You are set a passage to memorise for next week. It is long.',
      choices: [
        {
          text: 'Learn it word-perfectly',
          fn() {
            const g = rand(5,9);
            changeEduStat('faith','scripture', g);
            changeEduStat('literacy','reading', rand(2,4));
            return { log:'You memorise the passage exactly.', badge:`Scripture +${g}`,
              text:'You learn every word. Saying it perfectly next lesson feels like placing a stone in a wall — solid, specific, yours.' };
          },
        },
        {
          text: 'Learn the meaning rather than the exact words',
          fn() {
            changeEduStat('faith','theology', rand(5,9));
            changeEduStat('reason','philosophy', rand(2,4));
            return { log:'You understand the passage rather than recite it.', badge:'Theology +6',
              text:'You understand every line but cannot recite it exactly when asked. The teacher sighs. Then admits your understanding is better than most who recite it perfectly. You call this a draw.' };
          },
        },
      ],
    },
  ],

  // ── HISTORY ─────────────────────────────────────────────
  history: [
    {
      id: 'history_notes',
      text: 'Your history lesson covers the Wars of the Roses. There is a great deal to remember.',
      choices: [
        {
          text: 'Take careful notes',
          fn() {
            const g = rand(4,9);
            changeEduStat('reason','history', g);
            changeEduStat('literacy','writing', rand(2,4));
            return { log:'You take thorough notes.', badge:`History +${g}`,
              text:'You write down everything. Your hand aches. But when you review your notes that evening the whole thing is clear and ordered, which is more than the actual history was.' };
          },
        },
        {
          text: 'Daydream about what it would have been like to be there',
          fn() {
            changeEduStat('reason','history', rand(2,5));
            changeStat('health', rand(2,4));
            changeEduStat('literacy','reading', rand(1,3));
            return { log:'You daydreamed through the lesson.', badge:'History +3',
              text:'You take almost no notes. But you spend the lesson imagining it — the torches, the mud, the impossible decisions. Some of it sticks, just not the dates.' };
          },
        },
        {
          text: 'Debate the causes with the teacher',
          fn() {
            const g = rand(6,12);
            changeEduStat('reason','philosophy', g);
            changeEduStat('reason','history', rand(3,7));
            return { log:'You argue the causes of the war.', badge:`Reason +${g}`,
              text:'You ask whether the war was really about the crown or about something older and more complicated. The teacher looks startled. Then engaged. You have your best lesson yet.' };
          },
        },
        {
          text: 'Focus on the women in the history — there must be some',
          fn() {
            changeEduStat('reason','history', rand(5,10));
            changeStat('wit', rand(2,5));
            return { log:'You find the women in the historical record.', badge:'History +7',
              text:'You ask about the women — Margaret of Anjou, Elizabeth Woodville. The teacher is briefly at a loss. Then finds the answers. You leave knowing something most people your age do not.' };
          },
        },
      ],
    },
    {
      id: 'history_book',
      text: 'You discover a history book in the library that was not on your lesson plan.',
      choices: [
        {
          text: 'Read it thoroughly — it looks fascinating',
          fn() {
            const g = rand(6,12);
            changeEduStat('reason','history', g);
            changeEduStat('reason','philosophy', rand(2,5));
            changeStat('wit', rand(2,4));
            return { log:'An unscheduled history book.', badge:`History +${g}`,
              text:'You read for three hours and lose track of time entirely. Your governess finds you at half past nine still reading by candlelight. She is annoyed. You do not regret it.' };
          },
        },
        {
          text: 'Note it for later — you have other work today',
          fn() {
            changeEduStat('reason','history', rand(2,4));
            return { log:'You noted the book for later.', badge:'History +3',
              text:'You put it aside. But you know where it is. This is a different kind of knowledge — the knowledge of where to look — and it is not nothing.' };
          },
        },
      ],
    },
  ],

  // ── LANGUAGES ───────────────────────────────────────────
  languages: [
    {
      id: 'languages_drill',
      text: 'Your French lesson. The governess speaks only in French for the entire hour.',
      choices: [
        {
          text: 'Drill vocabulary until it is memorised',
          fn() {
            const g = rand(5,10);
            changeEduStat('decorum','languages', g);
            return { log:'You drill your French vocabulary.', badge:`Languages +${g}`,
              text:'Vous pratiquez. Encore. Et encore. It is tedious. It works. By the end of the hour you know thirty words you did not know this morning.' };
          },
        },
        {
          text: 'Read a French novel instead of drilling',
          fn() {
            const g = rand(4,9);
            changeEduStat('decorum','languages', g);
            changeEduStat('literacy','reading', rand(2,5));
            changeStat('wit', rand(2,4));
            return { log:'You read a French novel.', badge:`Languages +${g}`,
              text:'The governess raises an eyebrow at the novel but allows it. You read slowly, looking up words. When you finish the chapter you understand rather more French than you did — and you have read something actually interesting.' };
          },
        },
        {
          text: 'Write a letter in French to practise',
          fn() {
            const g = rand(5,11);
            changeEduStat('decorum','languages', g);
            changeEduStat('literacy','writing', rand(3,6));
            return { log:'You write a letter in French.', badge:`Languages +${g}`,
              text:'You write to an imaginary French correspondent. It is full of errors. The governess corrects every single one in red ink. This is, you begin to understand, the point.' };
          },
        },
        {
          text: 'Try to have an actual conversation in French',
          fn() {
            const roll = rand(1,10);
            if (roll >= 5) {
              const g = rand(7,14);
              changeEduStat('decorum','languages', g);
              changeEduStat('decorum','manners', rand(2,4));
              return { log:'You hold a conversation in French.', badge:`Languages +${g}`,
                text:'You manage a whole conversation. Imperfect, halting, but real. The governess switches to English only to say: "Bien. Très bien."' };
            } else {
              changeEduStat('decorum','languages', rand(2,5));
              return { log:'The French conversation goes badly.', badge:'Languages +3',
                text:'Your French is not yet equal to actual conversation. You manage perhaps four sentences before running out of vocabulary. The governess is kind about it. This is almost worse.' };
            }
          },
        },
      ],
    },
    {
      id: 'languages_song',
      text: 'Your governess teaches you a French song. It is very pretty.',
      choices: [
        {
          text: 'Learn the words and the meaning',
          fn() {
            changeEduStat('decorum','languages', rand(4,8));
            changeEduStat('decorum','music', rand(2,5));
            return { log:'You learn a French song properly.', badge:'Languages +6',
              text:'You learn the words, the tune, and what they mean. It is a song about departure. You understand it rather better than you expected to.' };
          },
        },
        {
          text: 'Learn just the tune — the words can wait',
          fn() {
            changeEduStat('decorum','music', rand(3,7));
            changeEduStat('decorum','languages', rand(1,3));
            return { log:'You learn the tune of the French song.', badge:'Music +5',
              text:'The tune is lovely. The words remain somewhat mysterious. This is, you feel, a reasonable compromise.' };
          },
        },
      ],
    },
  ],

  // ── NEEDLEWORK ──────────────────────────────────────────
  needlework: [
    {
      id: 'needlework_careful',
      text: 'A needlework lesson. You are making a sampler. You are on your fourth attempt at the letter R.',
      choices: [
        {
          text: 'Work carefully and unpick every mistake',
          fn() {
            const g = rand(5,10);
            changeEduStat('decorum','needlework', g);
            return { log:'Patient, careful needlework.', badge:`Needlework +${g}`,
              text:'You unpick the R three times. The fourth attempt is nearly right. You leave it. Next week you will do the S, which cannot possibly be this difficult.' };
          },
        },
        {
          text: 'Rush through and hope nobody looks closely',
          fn() {
            changeEduStat('decorum','needlework', rand(1,3));
            const caught = rand(1,10) <= 4;
            if (caught) {
              changeStat('reputation', -rand(1,3));
              return { log:'Your rushed work was noticed.', badge:'Reputation -2',
                text:'Your governess holds the sampler up to the light. Every crooked stitch is visible. She says nothing but hands it back. You unpick it all and start again.' };
            }
            return { log:'You rush through the needlework.', badge:'Needlework +2',
              text:'You rush it. It is not good. But it is done. You move on. You will regret this at the end-of-year display.' };
          },
        },
        {
          text: 'Help a struggling classmate instead',
          fn() {
            changeEduStat('decorum','needlework', rand(3,6));
            changeEduStat('decorum','manners', rand(2,5));
            return { log:'You helped a classmate with her needlework.', badge:'Needlework +4', schoolmateMoment: 'helped_needlework',
              text:'You put down your own work and help her thread the needle, show her the stitch. Your R remains undone but she finishes her section. She thanks you quietly. Something begins.' };
          },
        },
      ],
    },
    {
      id: 'needlework_gift',
      text: 'Your governess suggests you might make something as a gift for a family member.',
      choices: [
        {
          text: 'Make something beautiful, whatever it takes',
          fn() {
            const g = rand(6,12);
            changeEduStat('decorum','needlework', g);
            const target = G.mother && G.mother.alive ? 'mother' : G.siblings.length ? 'sibling' : null;
            if (target === 'mother' && G.mother) changeCloseness(G.mother, rand(5,10));
            return { log:'You make a needlework gift.', badge:`Needlework +${g}`,
              text:'You spend three weeks on it. It is not perfect but it is made with care. When you give it to her, her face does something that makes the three weeks worth it entirely.' };
          },
        },
        {
          text: 'Adapt a simple pattern — you are being realistic',
          fn() {
            changeEduStat('decorum','needlework', rand(3,7));
            return { log:'A practical needlework gift.', badge:'Needlework +5',
              text:'You make something modest but finished. It will be used. That is enough.' };
          },
        },
      ],
    },
  ],

  // ── ART (bonus — not in top picks but included) ─────────
  art: [
    {
      id: 'art_copy',
      text: 'Your drawing lesson: copy a print of a landscape. It should be straightforward.',
      choices: [
        {
          text: 'Copy it as accurately as possible',
          fn() {
            const g = rand(4,9);
            changeEduStat('decorum','art', g);
            return { log:'A careful copy.', badge:`Art +${g}`,
              text:'You copy it line by line. The result is recognisably the same landscape. This is both the point and, somehow, not quite enough.' };
          },
        },
        {
          text: 'Draw it from imagination instead',
          fn() {
            const roll = rand(1,10);
            const g = roll >= 6 ? rand(7,14) : rand(2,5);
            changeEduStat('decorum','art', g);
            changeStat('wit', rand(1,3));
            return { log: roll >= 6 ? 'Your imagined landscape is striking.' : 'You drew from imagination — to mixed results.', badge:`Art +${g}`,
              text: roll >= 6 ? 'Your invented landscape is strange and vivid. The drawing master looks at it for a long moment. "Unconventional," he says. You take this as praise.'
                             : 'Your imagined landscape is less successful than you hoped. You put the two drawings side by side. The copy is better. You do not tell anyone this.' };
          },
        },
      ],
    },
  ],

  // ── READING (basic, for younger ages) ───────────────────
  reading: [
    {
      id: 'reading_aloud',
      text: 'Your governess asks you to read aloud from a book. The book is dull.',
      choices: [
        {
          text: 'Read carefully and clearly',
          fn() {
            const g = rand(3,7);
            changeEduStat('literacy','reading', g);
            return { log:'You read aloud well.', badge:`Reading +${g}`,
              text:'You read slowly and clearly. The book is dull but your diction improves. Your governess nods. This is, apparently, the goal.' };
          },
        },
        {
          text: 'Read quickly to get it over with',
          fn() {
            changeEduStat('literacy','reading', rand(1,3));
            return { log:'You rushed through the reading aloud.', badge:'Reading +2',
              text:'You read too fast and stumble twice. Your governess makes you go back. You are not, she implies, in a hurry.' };
          },
        },
        {
          text: 'Ask to read something more interesting',
          fn() {
            const g = rand(4,8);
            changeEduStat('literacy','reading', g);
            changeStat('wit', rand(2,4));
            return { log:'You negotiated a better book.', badge:`Reading +${g}`,
              text:'Your governess considers your request. Then she produces a different book entirely — older, stranger, much better. "This was mine," she says. You read it in one sitting.' };
          },
        },
      ],
    },
  ],

  // ── WRITING ─────────────────────────────────────────────
  writing: [
    {
      id: 'writing_letter',
      text: 'You are set a composition exercise: write a letter to an imaginary aunt.',
      choices: [
        {
          text: 'Write something careful and correct',
          fn() {
            const g = rand(3,7);
            changeEduStat('literacy','writing', g);
            changeEduStat('literacy','calligraphy', rand(2,4));
            return { log:'A careful composition.', badge:`Writing +${g}`,
              text:'Your letter is proper, polished, a little stiff. Your governess reads it and says "Correct." You are beginning to understand this is not quite the same as good.' };
          },
        },
        {
          text: 'Write what you actually think — make it interesting',
          fn() {
            const g = rand(5,11);
            changeEduStat('literacy','writing', g);
            changeStat('wit', rand(3,5));
            return { log:'You wrote an honest, interesting letter.', badge:`Writing +${g}`,
              text:'You write what you actually think about the imaginary aunt\'s imaginary house and imaginary opinions. Your governess reads it twice. "Vivid," she says. You will take that.' };
          },
        },
      ],
    },
  ],
};

// ── LESSON FIRE FUNCTION ───────────────────────────────────
// Called when player clicks a subject in the Schooling tab
// Returns a random un-seen lesson event for that subject

function fireLessonEvent(subjectKey) {
  if (!G.eduStats || G.gender !== 'female') return null;
  if (!LESSON_EVENTS[subjectKey]) return null;

  const pool = LESSON_EVENTS[subjectKey];
  if (!pool.length) return null;

  // Track seen events to avoid repeats
  if (!G._seenLessons) G._seenLessons = {};
  const seen = G._seenLessons[subjectKey] || [];
  const unseen = pool.filter(e => !seen.includes(e.id));
  const event = unseen.length ? pick(unseen) : pick(pool); // wrap around

  // Mark as seen
  G._seenLessons[subjectKey] = [...seen, event.id].slice(-pool.length);

  return event;
}

// ── RANDOM SEASONAL LESSON ─────────────────────────────────
// Called from processEducationSeason — fires one random lesson event

function fireRandomLessonEvent() {
  if (!G.eduStats || G.gender !== 'female') return null;
  if (!G.schooling || G.schooling.type === 'none') return null;

  // Weight subject selection by what's being taught
  const subjectsBySchooling = G.schooling.type === 'sunday'
    ? ['reading','scripture','writing']
    : G.age < 10
    ? ['reading','writing','scripture']
    : ['music','dancing','languages','history','needlework','art','scripture','reading'];

  const subject = pick(subjectsBySchooling);
  if (!LESSON_EVENTS[subject]) return null;

  const event = pick(LESSON_EVENTS[subject]);
  return { event, subject };
}
