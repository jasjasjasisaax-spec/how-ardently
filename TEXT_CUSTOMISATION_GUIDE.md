# How Ardently — Text Customisation Guide
Everything you can change without touching any game logic.
Each entry shows: **what it is · which file · how to find it**

---

## 1. TITLE SCREEN & UI CHROME
*File: `index.html`*

| What | Current text | How to find |
|------|-------------|-------------|
| Game title (large) | `HOW ARDENTLY` | Search `HOW ARDENTLY` in index.html |
| Subtitle | `A Regency Life Simulator` | Search `Regency Life` |
| Begin button | `Begin Your Story` | Search `Begin Your Story` |
| Continue button | `Continue Your Story` | Search `Continue Your` |
| Season advance button | `⏭  GROW UP A SEASON` | Search `GROW UP A SEASON` in ui.js |
| Season advance (adult) | `⏭  ADVANCE TO SPRING/AUTUMN` | Same block, line below |
| Popup continue button | `Continue →` | Search `cont-btn` in ui.js |
| Season sub-label (childhood) | `age ${G.age}` | Search `au-sub` in ui.js |

---

## 2. REPUTATION TIER LABELS
*File: `game.js` — search `REP_TIERS`*

```
'Toast of the Ton'   (80+)
'Fashionable'        (65–79)
'Well Regarded'      (50–64)
'Respectable'        (35–49)
'Nobody'             (0–34)
```
Change any label and it flows through everywhere — stat header, life summary, decay messages.

---

## 3. RELATIONSHIP & STATUS LABELS
*File: `ui.js` — search `Confidante`*

**NPC relationships (society):**
```
Confidante  (80+)
Dear Friend (60–79)
Friend      (40–59)
Acquaintance (20–39)
Stranger    (0–19)
```

**Family relationships:**
```
Devoted   (80+)
Close     (60–79)
Cordial   (40–59)
Distant   (20–39)
Estranged (0–19)
```

**Approval labels** *(search `Approves warmly`)*:
```
Approves warmly  (75+)
Approves         (55–74)
Neutral          (40–54)
Disapproves      (25–39)
Strongly disapproves (0–24)
```

**Eligibility labels** *(file: `education.js`, search `eligibilityLabel`)*:
```
Diamond        (85+)
Accomplished   (70–84)
Eligible       (55–69)
Modest         (40–54)
Limited        (25–39)
Unremarkable   (0–24)
```

---

## 4. NPC PERSONALITY DESCRIPTIONS
*File: `game.js` — search `NPC_TRAIT_DESC`*

These appear in NPC profiles and event text. All 12 are yours to rewrite:
```javascript
witty:     'possessed of a quick tongue and quicker mind'
charming:  'all easy smiles and practiced grace'
reserved:  'measured in speech, difficult to read'
haughty:   'accustomed to being the most important person in any room'
kind:      'genuinely, sometimes inconveniently, good'
ambitious: 'with an eye always on the better situation'
melancholy:'prone to sighing dramatically at windows'
lively:    'impossible to ignore and aware of it'
proud:     'sensitive to slight and slow to forgive'
gentle:    'the sort of person animals trust immediately'
sardonic:  'finds the absurdity in everything, including you'
earnest:   'means every single word, which is disarming'
```

---

## 5. SCHOOLMATE PERSONALITY DESCRIPTIONS
*File: `schoolmates.js` — search `SCHOOLMATE_TRAITS`*

```javascript
clever:      'Quick and sharp, always first with the answer'
artistic:    'Paints and plays and seems to live inside her own head'
kind:        'The sort of girl who notices when you are having a bad day'
mischievous: 'Always on the edge of trouble, always laughing'
pious:       'Genuinely devout, not performatively so'
proud:       'Conscious of her own consequence at all times'
anxious:     'Worries about everything but tries not to show it'
sociable:    "Knows everyone's name within a fortnight"
melancholy:  'Thoughtful and somewhat sad — interesting company'
bold:        'Says exactly what she thinks, which is frequently uncomfortable'
```

---

## 6. ACTION NAMES & HINTS
*File: `ui.js` — search `getCatConfig`*

**Society tab:**
```
'Attend a Ball'           hint: 'Dancing, intrigue, opportunity'
'Hyde Park'               hint: 'See and be seen'
"Almack's Assembly"       hint: 'The ultimate social test'
'Write Letters'           hint: 'Maintain your correspondences'
'Country Life'            hint: 'Autumn retreat'
'Visit Neighbours'        hint: 'Local calls and morning visits'
'Pay a Social Call'       hint: 'Visit your acquaintances'
'Host a Ball'             hint: 'At your estate' / 'Hire assembly rooms'
'The Marriage Mart'       hint: 'The Season — prime time'
```

**Self tab:**
```
'Read Books'              hint: 'Expand your mind considerably'
'Write Letters'           hint: 'Wit exercised by correspondence'
'Pianoforte' / 'Fencing'  hint: 'Practise your instrument' / 'With the fencing master'
'Sketching'               hint: 'Watercolours and composition'
'Visit the Parish'        hint: 'Be charitable and be seen to be'
```

**Schooling tab (childhood):**
```
'Choose Schooling'
'Boarding School'
'Hire a Tutor'            hint: 'One-time boost to a subject'
'Self-Study'              hint: 'Free, slower progress'
'View Education Stats'    hint: 'Literacy, Reason, Faith, Decorum'
```

**Life tab (childhood):**
```
'Play Outside'            hint: 'Fresh air and mischief'
'Horse Riding'            hint: 'In the grounds'
'Sunday Church'           hint: 'Be seen being good'
'Spend Time with Family'  hint: 'Your nearest and dearest'
'Acquire a Pet'           hint: 'A companion for life'
```

---

## 7. ALL NAMES
### Player name suggestions
*File: `ui.js` — search `NAMES.female` / `NAMES.male`*
These are the suggested names shown at character creation.

### NPC names
*File: `game.js` — search `const NAMES`*
```javascript
NAMES = {
  female:  [...],   // First names for female NPCs
  male:    [...],   // First names for male NPCs
  surname: [...],   // Family names used for all NPCs
}
```

### Schoolmate names
*File: `schoolmates.js` — search `SCHOOLMATE_NAMES`*
```javascript
female:  ['Arabella','Cecily','Harriet','Lydia','Charlotte','Frances','Kitty','Maria'...]
surname: ['Thornton','Bates','Ferrars','Wickham','Crawford','Price','Brandon','Grey'...]
```

### Pet names (by species)
*File: `ui.js` — search `PET_CATALOGUE`*
```javascript
dog:     ['Biscuit','Wellington','Admiral','Nelson','Pepper','Bramble']
cat:     ['Minerva','Shadow','Duchess','Pounce','Smoky','Biscuit']
rabbit:  ['Clover','Snowdrop','Button','Pip','Fern','Cotton']
spaniel: ['Hero','Captain','Regent','Prince','Dash']
parrot:  ['Polly','Admiral','Cicero','Caesar','Juno']
pony:    ['Nutmeg','Hazel','Flint','Arrow','Clover']
```

### Child names
*File: `game.js` — search `CHILD_NAMES`*
```javascript
son:      [...],
daughter: [...]
```

### Teacher names
*File: `schooling_ui.js` — search `TEACHER_POOL`*
All teacher names (Mrs Clarke, Miss Webb, Mme Fontaine, etc.) are in the pool arrays.

### School names
*File: `education.js` — search `BOARDING_SCHOOLS`*
```
"Mrs Goddard's School"
"Miss Pinkerton's Academy"
"The Ladies' Seminary at Bath"
```

### Governess names
*File: `education.js` — search `GOVERNESS_OPTIONS`*
```
Mrs Pratt, Miss Brown, Mrs Gentle, Miss Sharp, Mrs Drummond,
Miss Hartley, Mlle Beaumont, Miss Pemberton, Mrs Cavendish
```

### Place names referenced in events
*Scattered through `events.js` and `actions.js`:*
```
Hyde Park, Almack's, St George's Hanover Square,
Bath, The Lake District, The Continent, Gretna Green
```

---

## 8. EVENT NARRATIVES
### Random events
*File: `events.js` — each event has a `popup.text` field*

Key events you'll want to personalise:
- **gossip** — the scandal narrative and three response choices
- **unexpected_compliment** — who says it and what they say
- **illness** — the illness description and treatment choices (rest/laudanum/Bath)
- **financial_windfall** — what the money is from
- **rival_sabotage** — what the rival did and three response choices
- **inheritance** — the letter from a distant relation
- **sibling_elopes** — your reaction and three resolution choices
- **spring_queen_charlotte** — the presentation narrative
- **spring_theatre** — the theatre description

### Seasonal events
*File: `events.js` — search `SPRING_EVENTS`, `AUTUMN_EVENTS`*

**Autumn events include:**
- Harvest (good/poor/failed outcomes)
- Hunting party
- Preserves and preparations
- Unexpected visitors
- Quiet autumn reflection

**Spring events include:**
- First ball of the season
- Queen Charlotte's drawing room
- Picnic
- Rumours of suitors

---

## 9. LESSON EVENT NARRATIVES
*File: `lessons.js` — every event has `text` (the setup) and choice `fn()` returns with `text` (the outcome)*

**Music lessons (3 events):**
- The difficult passage
- Performance for a gathering
- Ear training with the music master

**Dancing lessons (2 events):**
- New figure introduced
- Partnered with a better dancer

**Scripture lessons (2 events):**
- Hard question from the teacher (4 choices)
- Passage to memorise

**History lessons (2 events):**
- Wars of the Roses (4 choices including finding the women)
- Unscheduled discovery in the library

**Languages lessons (2 events):**
- French lesson (4 choices: drill/novel/letter/conversation)
- French song

**Needlework lessons (2 events):**
- The letter R sampler (3 choices including helping a classmate)
- Making a gift

**Art lessons (1 event):**
- Copy a landscape or draw from imagination

---

## 10. WEDDING PLANNING TEXT
*File: `wedding.js`*

**Step prompts (search each):**
```
'Before the wedding itself, there are arrangements to be made.'
'The guest list. How large a gathering?'
'The dress. This is not a small matter.'
'The wedding breakfast. A great deal rides on the table.'
'After the ceremony — where shall you go?'
```

**Venue options:**
```
"St George's, Hanover Square — the fashionable choice"
'The village church — quietly respectable'
"The private chapel of his estate — exclusive"
'Gretna Green — scandalous, romantic, immediate'
```

**Outcome narratives** *(search `buildDebutNarrative` in debut.js, `resolveWedding` in wedding.js)*

---

## 11. DEBUT PLANNING TEXT
*File: `debut.js`*

**Negotiation prompts:**
```
'Your mother is eager. "The sooner the better..."'
'suggests it is time to think about your debut'
'mentions, rather distantly, that you ought to be thinking'
```

**Pre-debut summary assessment** *(search `buildDebutAssessment`)*:
```
'Your accomplishments are exceptional...'
'Your accomplishments are respectable.'
'Your accomplishments are modest. This will be noted.'
```

**Court presentation outcome** *(search `isDiamond`)*:
```
Diamond: 'Her Majesty pauses. She says something to the lady beside her...'
Non-diamond: 'Her Majesty receives you graciously...'
```

**Debut narrative outcomes** *(search `buildDebutNarrative`)*

---

## 12. PREGNANCY & BIRTH TEXT
*File: `pregnancy.js`*

**Morning sickness (3 variants):**
```
'Morning sickness. Every morning. And sometimes afternoons...'
'The sickness arrives with the dawn and does not consult your social calendar...'
'You have declined three invitations this week...'
```

**Quickening (3 variants):**
```
'There — a movement. Small, unmistakable, entirely astonishing...'
'The quickening. You are sitting quietly when it happens...'
'You feel the baby move for the first time...'
```

**Miscarriage:** *(search `The pregnancy is lost`)*
**Complications/bed rest:** *(search `The doctor visits and says the word "rest"`)*
**Folk remedies (5 variants):** *(search `folk_remedy`)*

**Birth naming prompt** *(file: `ui.js`, search `nameNextBaby`)*:
```
'Here is your little boy/girl...'
'The birth was difficult. But you are both here.'
'The doctor smiles. Everyone breathes.'
```

**Mother's death:** *(search `did not survive the birth`)*

---

## 13. FAMILY INTERACTION TEXT
*File: `ui.js` — each family member profile function*

**Mother letter response:**
```
'Your letter is returned with four pages of questions and one of genuine warmth.'
```
**Mother visit:**
```
'You spend several days at home. Your mother has opinions about everything...'
```
**Father letter:**
```
'Your father writes back briefly but warmly. He is proud of you, in his way.'
```
**Father visit:**
```
'You spend time with your father. He shows you the estate...'
```
**Sibling letter:**
```
'writes back at once. The letter smells faintly of home.'
```
**Sibling visit:**
```
'You argue about something old and laugh about something new. It is exactly right.'
```

---

## 14. DEATH & LIFE SUMMARY
*File: `ui.js` — search `showLifeSummary`*

**Three narrative voices:**

*Obituary voice (warm):*
```
'${G.name} was born in ${birthSeason}...'
'She was known throughout [location] as...'
```

*Morning Post voice (catty):*
Varies by reputation tier — search `Morning Post` in ui.js

*Personal reflection voice:*
Search `A life, then.` in ui.js

**Death messages** *(search `buildDeathMessage`)*:
```
'The cold takes her this winter.'
'A fever. Quick, at the end.'
'She simply does not wake one morning.'
'Her heart, says the doctor.'
```

**Game over button:** `Begin a New Life` *(search `New Life`)*

---

## 15. CAREER DESCRIPTIONS
*File: `education.js` — search `CAREER_DEFINITIONS`*

Each career has a `desc`, a `flavour` line that appears when you take the job, and `name`:
```
Lady's Maid:    'Personal attendant to a lady of quality...'
Missionary:     'Service abroad or in the parishes...'
Schoolmistress: 'Runs a small dame school...'
Governess:      'Teaches the children of the wealthy...'
Companion:      'Lives with a wealthy lady...'
Authoress:      'Writes novels, anonymously or otherwise...'
```

---

## 16. ASSET & INVESTMENT DESCRIPTIONS
*File: `assets.js` — each asset in `ASSET_CATALOGUE` has a `desc`*
*File: `finance.js` — each option in `INVESTMENT_OPTIONS` has a `desc`*

**Estates:**
```
'Comfortable but small. Two acres of garden. A perfectly respectable address.'
'Four storeys in a respectable street. Essential for the Season.'
'Thirty rooms, a park, and a village that pays rent. The proper thing.'
'One of the great houses of England...'
```

**Investments:**
```
'The Funds — safe, reliable, the bedrock of respectable income.'
'The canals are the future of commerce. Or they were, before the railways.'
'Buy land before the enclosures. Not always legal. Almost always profitable.'
'The great commercial empire. Extraordinary returns. Extraordinary risks.'
```

---

## 17. SCHOOL & GOVERNESS DESCRIPTIONS
*File: `education.js`*

**Boarding schools** *(search `BOARDING_SCHOOLS`)*:
```
"A respectable country school. Reading, writing, plain needlework."
"For young ladies of the middling sort. Accomplishments and some learning."
"Exclusive, expensive, and fashionable. Every accomplishment, every connection."
```

**School focus descriptions** *(file: `schooling_ui.js`, search `SCHOOL_FOCUS`)*:
```
Sunday School:     'Faith and letters. Simple but earnest.'
Mrs Goddard's:     'Plain learning, good needlework, solid faith.'
Miss Pinkerton's:  'Accomplishments and deportment above all.'
Ladies' Seminary:  'Every subject, taught excellently.'
```

**Governess descriptions** *(search `GOVERNESS_OPTIONS`)*:
```
'Free, loving, and limited to her own knowledge.' (Mother)
'Literacy only. Reliable if unambitious.' (Village dame)
'Solid literacy and basic decorum. Adequate.'
'Kind and arts-focused. Music and drawing are her gifts.'
... etc
```

**Teacher descriptions** *(file: `schooling_ui.js`, search `TEACHER_POOL`)*:
```
'Exacting and precise. Every comma matters.'
'Encouraging and patient. Slower but kinder.'
'The best teacher here. Nobody likes him.'
'French. Effortlessly superior. But fair.'
'The dancing master. Very charming. Knows it.'
... etc
```

---

## 18. PET DESCRIPTIONS
*File: `ui.js` — search `PET_CATALOGUE`*

```javascript
dog:     'A loyal companion. Always pleased to see you.'
cat:     'Agreeable on their own terms, which is most of the time.'
rabbit:  'Soft and surprisingly opinionated.'
spaniel: 'A fashionable breed. You will be envied.'
parrot:  'Repeats things at inopportune moments. Endlessly entertaining.'
pony:    'For riding out. Also for showing off.'
```

Pet interaction responses *(search `openPetProfile` in people.js)*:
```
'${pet.name} is delighted to see you. The feeling is mutual.'
'${pet.name} is well-fed and content...'
```

---

## 19. PARENT REACTIONS TO MARRIAGE
*File: `game.js` — search `parentReactionToMarriage`*

Four outcomes based on suitor wealth and parent approval:
```
Wealthy + approved:   'They are overjoyed. Your mother weeps...'
Poor + approved:      'They are... less than thrilled...'
Wealthy + disapproved: 'They are quietly satisfied...'
Poor + disapproved:   'They are quite displeased...'
```

---

## 20. SOCIAL INTERACTION RESPONSES
*File: `ui.js` — search `doSocialVisit`, `doSocialLetter`, `doSocialGift`, `doSocialFavour`*

**Visit responses (multiple variants each):**
```
'A most agreeable visit. ${npc.nick} tells you something...'
'You spend two hours with ${npc.nick}...'
```

**Letter responses, gift responses, favour outcomes** — all in pick() arrays, all replaceable.

---

## 21. SEASON TRANSITION MESSAGES
*File: `ui.js` — search `addSeasonBanner`*
```
'Spring ${G.year}'  /  'Autumn ${G.year}'
```

**Age milestone messages** *(search `age === 21`, `age === 30`, etc.)*

---

## QUICK REFERENCE: How to edit
1. Open the file in any text editor (Notepad, VS Code, etc.)
2. Use Ctrl+F to search for the text shown above
3. Change the string between the quote marks
4. Save — refresh the browser
5. Do **not** change anything outside quote marks (the code logic)

**Safe characters to use inside strings:** any letter, number, punctuation, spaces, `£`, `é`, `à`, etc.

**Avoid inside strings:** backticks `` ` `` (unless you're replacing a backtick string), unmatched quotes, backslashes `\` unless paired.
