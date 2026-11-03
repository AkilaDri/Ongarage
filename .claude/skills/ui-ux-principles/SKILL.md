---
name: ui-ux-principles
description: Use when designing, reviewing or refining any screen, panel, dialog, chip row, list, form, navigation or flow in the OnGarage apps. Applies "Universal Principles of UX" (Irene Pereyra, 100 principles, numbered 01-100) and "Universal Principles of Design" (Lidwell, Holden, Butler, numbered 001-200), including the profession lens for UI, UX, graphic, instructional and systems designers, to UI decisions: user focus, feedback, choice, learnability, forms, errors, navigation, legibility, accessibility and interruption.
---

# UI/UX principles for OnGarage

Sources:
- **UX** = *Universal Principles of UX*, Irene Pereyra. Principles are numbered 01–100, and this file quotes those numbers. The whole book has been read.
- **UPD** = *Universal Principles of Design*, Lidwell, Holden, Butler (3rd ed.). Numbers 001–200. Only the entries below were read in full; treat the rest as unread.

Use the principles to check a screen. Do not add elements to satisfy a principle; remove or reorder until it holds. Where a principle conflicts with a user's stated wish, say so and ask.


## L. Profession lens (Universal Principles of Design, categorised contents)

The design book's contents page groups principles by profession. For this project the five that matter are UI, UX, graphic, instructional and systems designers. All 50 principles in these five lists have been read in full, and their notes are below.

### Full notes per principle

033 Confirmation: only for critical/irreversible actions (slips). Dialog: one Yes/No question or verb action; sparingly; disable option for reminders. Two-step arm/fire for safety-critical. Overuse = ignored. Written text: "Delete?" + outcome + button restating action.
035 Consistency: four kinds - aesthetic (identity), functional (same meaning/action), internal (within product), external (across products/platforms). Default consistent; break only with compelling reason. "Don't be foolishly consistent". Mixed systems confuse everyone (Norman).
069 Fitts: MT = a + b log2(d/s+1). Big, near targets; constrain movement (scrollbars); screen edges and corners are effectively infinite targets; important targets near, large; dangerous/rare actions small and far.
074 Forgiveness: affordances, reversibility (undo), safety nets (autosave), confirmation, warnings, help. Prefer affordances, reversal, safety nets; fewer confirmations/warnings. Messages must state risk and the action to take; too many are ignored. Help needed is inversely proportional to design quality.
094 Iconic representation: four types - similar (simple actions), example (complex: airplane for airport), symbolic (established, e.g. padlock), arbitrary (must be learned; use only for standards). Icons should be labelled and share a visual style/colour. See Miller, Recognition over Recall, Rosetta Stone.
113 Mapping: control-effect correspondence (window switch up = window up). Good mapping from similarity of layout (stove knobs match burners), behaviour, meaning (red = stop). Culture matters (UK vs US light switch) - test with target audience. One control for many functions is bad; if unavoidable use visually distinct modes. Space shuttle fuel-cell switch order error.
127 Number-space: sequences mapped spatially; direction follows reading direction (English L->R, Arabic R->L). Vertical: floors up, lists down. Present serial info and controls in sequential order, not mixed; match the layout users expect (shuttle FC1/FC3/FC2 error).
155 Recognition over recall: options visible (menus, lists) beat remembered commands; recognised options get chosen even when worse (brand study). Dial: recall digits < recognise number in list < recognise name, number auto-dialled. Use menus, decision aids, visible options; favour recognition in training and support.
186 Top-down lighting bias: people read light-from-above-left as natural, bottom light as scary. Single top-left light source for natural depth (icons, controls, raised buttons); contrast controls the apparent depth. Use top-left shading consistently for icons and buttons.
199 WYSIWYG: what is seen in the design context is what is delivered (Xerox PARC/Bravo). Real-time reflection for simple visual artefacts; point-in-time previews for complex ones; for many output combinations (devices, browsers) preview the most common ones.
004 Aesthetic-usability: aesthetics raise perceived usability, create emotional bonds, forgiveness, perceived value and price tolerance. Effect is mixed in research. Aesthetics is an investment in acceptance and loyalty, not decoration. Juicy Salif: people buy the emotion.
048 Desire line: traces of use (paths, worn keys) = unbiased evidence of real use; treat as feedback, not misbehaviour ("voting through behaviour"). Detect early (heat maps, recordings); if cost is nominal live with it; if significant, change the design to follow it. Barriers and "keep off" signs just make new paths.
087 Habituation: frequent alerts stop being read; stimulus generalisation (all similar alerts ignored). Medical overrides case: nurse habituated to alerts, fatal error. Where everything is an alert, nothing is. Minimise exposure to triggering alerts for productive behaviour; reduce alert frequency; reserve interruptions for real danger.
090 Hierarchy of needs (Maslow-based): functionality -> reliability -> usability -> proficiency -> creativity. Lower levels first; perceived value rises up the levels. Evaluate a screen by where it sits on the ladder; don't add delight before it works reliably.
116 Mental models: system model (how it works, engineers) vs interaction model (how users operate it). Get system models from engineers early; get interaction models by observing representative users and testing. Don't impose designer models ("know thy user, for they are not you"). Fiat Chrysler monostable shifter: standards exist for a reason; 41 injuries.
134 Peak-end rule (Kahneman 1993): judged by the strongest moment and the end. Invest in beginning, peak and end (success message, the moment of value); negative moments weigh 2-3x more, so don't end on a negative (don't end on errors or questions). Repair bad experiences with repeated positive recall.
135 Performance load = cognitive + kinematic load. Reduce both: remove unnecessary info, chunk memory items, automate; fewer steps. Raise load only on purpose (games, exercise, confirmation on critical actions). People choose the path that feels least effort; make the desired action the path of least resistance.
176 Storytelling: setting, characters, plot, invisibility of the storyteller, mood, movement; suspension of disbelief. Use to engage, evoke emotion or give context for learning. Tell the story of the user's goal (onboarding, progress, outcome), not decorative stories.
190 User-centred vs user-driven: understand needs, do not implement requests literally. Users give feedback on the familiar, not on possibilities or trade-offs. Decode proposed solutions into problems ("listen to everyone, trust no one; record what people say, observe what they do"). Integrate users early, don't let them drive. Aspire to service, not servility.
194 von Restorff: distinct items are remembered (difference in context or experience). Make the key element different (bold, colour); if everything is highlighted nothing is. Can boost recall of middle items in a list.
006 Alignment: every element aligns with another (edges, centres, or visual weight for asymmetric shapes). Software aligns bounding boxes, so irregular elements need manual optical alignment. Left/right-aligned text gives better cues than centred. Diagonals need 30+ degrees to be perceived. Butterfly ballot misalignment case.
029 Colour effects (Berlin & Kay order): black (power/dominance when dark), white (safety), red (arousal: helps simple physical tasks, hurts complex collaborative ones; good for urgent cues), yellow (very visible; yellow clothing less attractive), green (nature, security, go, calm), blue (calm, trust, but blue food = spoilage). Use evolved associations in threat, food, safety contexts; otherwise aesthetics and cultural convention.
030 Colour theory: about five distinct colours max; never colour as the only signal (colour blindness); analogous/complementary/triadic combinations; warm foreground, cool background; light grey groups; saturated colours for accents (attention, but eye fatigue if combined), desaturated for efficient work; bright desaturated = friendly, dark desaturated = serious; high contrast; test colour with the audience; be sceptical of big colour-mood claims.
067 Figure-ground: figure = definite shape, continuous behind, closer, upper/lower region cues (lower region tends to be figure). Stable figure-ground = key items get attention and recall. Put the key element as figure (cut-out, high contrast, lower placement); reversible only for deliberate dynamic designs.
083 Golden ratio (0.618): small real preference for rectangles, not complex shapes. Approximation is fine. Use in linear/rectangular layouts where it costs nothing; do not force it into complex compositions.
092 Horror vacui: fill of empty space. Dense style suits price-driven goods; minimal with negative space suits quality/luxury. Safety-critical and information-rich screens need white space and alignment/chunking. Insufficient white space prevents grouping and steals attention from the task.
107 Legibility (detailed): 9-12 pt for print; larger on low-resolution screens, for children and older readers, and in poor light. Clear typefaces (no serif advantage). Sentence case for text; caps for labels and acronyms. Contrast over 70%; dark text on light better than light on dark; avoid patterned backgrounds. Flush-left ragged-right (not justified). 50-75 characters per line for body text, 25-35 for captions. One space after sentences. Leading = type size + 1-4 pt. Proportional fonts. Small sans serif without anti-aliasing on low-resolution screens under 12 pt.
130 Orientation sensitivity: oblique effect (horizontal/vertical judged best, diagonal worst) and pop-out (a line 30+ degrees off stands out). Use 30-degree increments for angle indicators; horizontal and vertical lines as anchors; Harry Beck's London Tube map (only 0/45/90 degrees) = readability over realism.
148 Progressive subtraction: remove perceptible elements over the product life (pruning). Creeping featurism: easy to add, hard to subtract. Version 10 should have fewer elements and be more capable in essential areas. Apply in mid-to-late life; not to early versions that still lack essentials.
160 Rule of thirds: a rough scaffold, little evidence for beauty, real value for focusing attention. Two strong elements at opposing intersections; strong vertical/horizontal aligned to a grid line; a single dominant element with supporting space: centre it; many equal elements: ignore.
046 Depth of processing: elaborative (meaningful) rehearsal gives 2-3x recall vs repetition. Depth depends on distinctiveness, relevance, and elaboration effort. For learning: "make me think hard about the right things" (John Snow's cholera map). Build in rest periods; deep processing takes effort.
070 Five hat racks (Wurman, Information Anxiety, LATCH): five organising schemes - category (similar things), time (sequence), location (space, wayfinding), alphabet (referential, quick lookup), continuum (magnitude, comparison). Choose the one that matches how learners look for the information; the scheme changes the story the data tell.
073 Flow (Csikszentmihalyi): challenge matched just above skill (not bored, not anxious). Nine components: clear goals, concentration, loss of self, time distortion, immediate clear feedback, challenge-skill balance, sense of control, intrinsic reward, immersion. For learning and tasks: clear achievable goals, difficulty matched to skill, immediate feedback.
091 Highlighting (complete): bold best (titles, labels), italics subtle, underline noisy (avoid), no font swapping, uppercase for short labels, colour sparingly (desaturated, high contrast), inversing noisy, blinking only for critical status and must be stoppable once acknowledged. Not more than 10% of a display.
099 Inverted pyramid (Lincoln assassination report; Stanton): lede first (what, where, when, who, why, how), then detail by importance. Benefits: quick, context, early items remembered, scannable, cuts from the end. Cost: dry. Use when efficiency or unreliable channels matter; add summary where it can't be used.
105 Learnability (four pillars): consistency (conventions observed, not reinvented), discoverability (basic functions obvious, key controls actionable, wizards for complex processes, errors not irreversible), responsiveness (feedback when needed, subtle prompts, confirm impactful operations), simplicity (minimal visible essentials, complexity revealed progressively). Test with real users minimising help. Learnable = no tutorial needed. Pac-Man example.
117 Miller's law (complete): chunk to 4-5 units for memory tasks (phone numbers, codes in groups of 3-4). Do NOT chunk information meant to be searched or scanned (dictionary). In high-stress environments chunk critical controls. Chunks grow with practice.
120 Mnemonic devices: first letter/acronym, keyword with bridging image (AFLAC duck), rhyme (red touches yellow), feature name (VW Beetle). Use for names, rote information, sequences, identities, slogans and logos. Vivid, concrete, familiar images.
140 Picture superiority: pictures + words recall best together; the effect appears after about 30 s (equal immediately); strongest for concrete, distinct pictures; helpful for casual exposure (ads); weakens with complex information. Pictures and words must agree; conflicting ones interfere.
153 Readability: word length/commonality, sentence length, clauses, syllables; omit needless words; avoid acronyms and jargon; active voice; complex content in simplest presentation. Use formulas (Fry) as a check after writing, not a template. Target the audience's reading level (Fry: sample passages, grade level).
013 Archetypes, system (Senge): seven archetypes - eroding goals (lowering the goal), escalation (arms race), fixes that fail (quick fix, new problem), limits to growth, addiction (quick fix returns), success to the successful, tragedy of the commons. Use them to diagnose unwanted side effects and to find high-leverage fixes; reuse interventions that worked in other instances.
039 Convergence: stable environments converge on known forms (receptive to refinements only); unstable ones allow radical innovation. Before designing, judge the environment; in stable areas refine convergent designs; in new areas look at analogies from other systems. Others are likely working on similar ideas now.
040 Conway's law (mirroring): products mirror the team's communication structure. Small end-to-end teams give coherent design; big distributed teams cost integration (ISS). Enforce interface standards and design guidelines when teams are distributed; watch for not-invented-here.
044 Death spiral: groups rigidly repeat failing strategies (Crecy charges, Kodak film). Way out: follow a leader who sees it; culture of experimentation; compliance-heavy, hierarchical, rigid cultures are most vulnerable; organisations unwilling to test and cannibalise their own products are in one.
065 Feedback loops: positive loops amplify (helmet padding -> riskier tackles -> harder helmets); negative loops stabilise (Segway, 100 adjustments/s). Pair them: positive to change, negative to stop runaway; too much negative stagnates. Tacoma Narrows: wind-deflection positive loop. Design the loop, including user behaviour, not only the part.
078 Gall's law: complex systems that work evolve from simple working systems; design from scratch rarely works. Copy or reverse-engineer working designs (Buran from shuttle). Start simple and iterate. Summative vs constitutive complexity (emergent effects).
109 Leverage point (Meadows): ordered from highest leverage: mindsets, goals, strategy, structure, information (feedback, visibility), then parameters. Systems fight back against big levers; experiment small, expect counterintuitive results. Opioid example: change prescribers' mindsets (fifth vital sign); "triplicate" rule states had lower rates.
138 Perverse incentive: boomerang (daycare fine doubled late pickups), cheating (cobra bounty breeding), collateral damage (habitat destruction before endangered species found). Check incentives against the real goal; beware proxy measures (quotas, test scores, bounties).
158 Root cause: most problems have several causes; use the five whys (Sakichi Toyoda) to find the first actionable cause; fix the root, then the proximal causes. Avoid infinite regress; focus on actionable causes that create most effects.
173 Social trap: short-term gain, long-term shared loss (tragedy of the commons). Break it by making long-term costs immediate (tolls), setting quotas and penalising freeloaders, creating substitute behaviours (CFC replacement). Long delays and severe consequences are hardest.

Principles appearing in more than one list (for example 133 Pareto, 155 Recognition over Recall, 089 Hick's law) should be applied from both lists.

## A. Start from the user (UX 01–05, 38–41)

- **UX 01 The user comes first:** ask who it is for, why they use it, and in what context. Listen more than you talk.
- **UX 02 UX and UI together:** UX is the blueprint (needs, behaviour, context, accessibility); UI is layout, type, hierarchy and density. Design both from the start.
- **UX 03 UI makes or breaks usability:** the Florida ballot case: misaligned rows, order bias, hierarchy and legibility were all UI failures.
- **UX 04 Surpass expectations:** the product must work first; then add a little surprise and a sense of flow.
- **UX 05 Design is not neutral:** do not hide costs, pre-tick consent boxes, or disguise adverts as content.
- **UX 38–41:** pick clients that respect the process; define one problem statement and treat it as the north star for every decision.

## B. Feedback and response time (UX 13, 22, 64 in UPD)

- **UX 13 Feedback quickly:** under 0.1 s the system feels instant; under 1 s the user's flow stays intact (they notice the delay); around 10 s is the limit for keeping attention. After about 2 s show that the app is working; after about 5 s show how long it will take. Speed is the ultimate usability metric.
- **UX 37-rule 1 / Nielsen heuristic 1:** keep users informed about what is going on, within a reasonable time.
- **UPD 064 Feedback:** minimum useful feedback, delivered fast. Feedback that repeats too often stops working (habituation, UPD 087).
- **UPD 005 Affordance:** a control must look like what it does. Instructions do not fix a bad affordance.
- **UX 22 Learnability:** consistency, discoverability, responsiveness and recovery. The system gives just enough feedback, when it is needed.

## C. Choice and cognitive load (UX 11, 12, 24, 45, 49, 50, 89; UPD 089, 069, 168)

- **UX 11 Less is more:** strip anything that does not help the task. Complicated tasks need a bare interface; decoration belongs to inspiring parts.
- **UX 12 Less is a bore:** minimalism everywhere makes every app look the same. Use personality where it does not slow the task. A hard-to-use design is simply bad.
- **UX 24 Make the choice easy / Hick's law:** decision time grows with options when the choice is frivolous. Show only the choices that matter, and let the system do the heavy lifting.
- **UX 45 Complexity only when necessary (Occam's razor):** start simple; add only what the user needs.
- **UX 46 Some complexity cannot be reduced (Tesler):** if you remove it on one side it reappears on the other. Keep the real control, and make it feel simpler.
- **UX 49 Remove barriers:** one goal per path; the happy path reads left to right; every step is short and labelled plainly.
- **UX 50 What isn't there matters:** hiding things is good when the user does not need them, but only if the trigger is clear and the hidden thing is easy to recall. Filters hidden by default, opened by a visible control.
- **UX 89 Don't ask for unnecessary things:** users have a limited budget of decisions. Use sensible defaults (the 95% answer, and information the user has already given). Never pre-fill sensitive data (gender, citizenship).
- **UPD 089 Hick, UPD 069 Fitts:** large, close targets are hit faster and with fewer errors. Put the primary action near the thumb or a corner.
- **UPD 168 Serial position:** the first and last items are remembered best (UX 10). Put the item to remember, or the action to take, first or last.
- **UX 09 / UPD 'Von Restorff':** the item that stands out is remembered. Use difference to highlight what matters, not everywhere.
- **UPD 091 Highlighting:** no more than about 10% of a screen should be highlighted; bold over italic and underline; avoid switching typeface; colour sparingly.
- **UPD 152 Proximity, 171 Similarity, 067 Figure-ground:** group related things, separate unrelated ones, and keep the main action in front.

## D. Learnability and first use (UX 15, 16, 22, 23, 28, 66, 84)

- **UX 15 First impressions:** users leave within about ten seconds if the page's value is not clear. Lead every screen with one clear purpose and one main action.
- **UX 23 Don't just design for novices:** power users need shortcuts, batch actions and advanced panels. These are alternatives to the main path, tucked away but easy to find.
- **UX 28 Match the real world:** start from how people already handle the same thing offline; use familiar metaphors.
- **UX 29 Know when to break convention:** Nielsen's rule is to follow conventions. Break one only deliberately, for the audience, and keep it intuitive.
- **UX 66 Learn from real-world navigation:** clear landmarks and consistent signage beat clever layouts.
- **UX 84 Target the right devices:** design for the devices the users actually use, and for each one's context.
- **UX 26 Context matters more than screen size:** when, where and why a device is used decides the layout (stop-and-go on mobile, large type for reading, thumb reach at the bottom).

## E. Words and copy (UX 06, 07, 82; UPD 'Readability', 'Legibility')

- **UX 06 Words matter:** write for the web: short, scannable, task-focused. Address the user as "you". Cut words ruthlessly. Read it aloud: if it sounds robotic, rewrite it. Avoid jargon.
- **UX 07 Visual metaphors communicate fastest:** pick a familiar symbol that carries the meaning.
- **UX 82 Icons:** very few icons are universal (home, search, settings, heart, trash, cart, profile, chat bubble, bell). Hamburger and star vary by app. Always pair an icon with a text label, or keep it where users expect it.
- **UPD 107 Legibility:** sans-serif for small text and screens; avoid high-contrast inverse text for long passages; 50–75 characters per line.
- **UPD 153 Readability:** short words, short sentences, active voice, no acronyms or untranslated phrases.
- **UX 75 Typography:** type must be usable first; be conservative with type choices on screens; text not below 16 point is the book's rule, and 60–80 characters per line.
- **Mixed Sinhala and English:** Latin words beside Sinhala text are set a step larger so they read at the same weight (the app's existing rule).

## F. Forms and input (UX 35, 91, 90, 92)

- **UX 35 Minimise form input:** every mandatory field lowers completion. Ask only what is needed; use defaults, pickers and autocomplete; group related fields; label every field clearly.
- **UX 91 Accept many inputs:** be liberal with what you accept (upper or lower case, different formats) and clear about the limits.
- **UX 92 Confirm user actions:** confirm important or irreversible actions. Phrase it as a question, state the result, and repeat the action on the button ("Delete this post?" / "You will not be able to recover it." / "Yes, delete post" / "No, cancel"). For reversible actions, use an undo message that goes away. Too many confirmations get ignored.

## G. Errors and recovery (UX 90, 93, 14)

- **UX 90 Manage errors:** errors are never the user's fault. Prevent them first (disable impossible dates, autocomplete). When one happens, say it exactly where it happened: what went wrong, why, and how to fix it. If the system is down, say why and when it will be back.
- **UX 93 Broken pages shouldn't feel broken:** a 404 should help: show the navigation and search, offer a comparable page. Do not silently send people to the home page.
- **UX 14 Friction isn't always bad:** keep deliberate friction (a confirmation, typing a value to confirm) for serious or costly actions. Remove it everywhere else.

## H. Interruptions and notifications (UX 33, 34)

- **UX 33 Interrupt only when necessary:** before you notify, ask whether the message is worth interrupting for. "Your house is on fire" and "you received an email" are not equal.
- **UX 34 Notifications valuable:** a good notification comes at a moment of confusion or need, knows the user's goal and urgency, and is never a sales tool. Use the lightest form that works: a badge, then a toast, then a modal. Too many and users ignore them all.

## I. Accessibility (UX 18, 19, 20, 21; UPD 002)

- **UX 18 Accessibility first:** designs for people with disabilities help everyone (captions for noise, contrast in sunlight, plain language for second-language readers, keyboard for a broken mouse).
- **UX 19 Digital literacy:** design for the least digitally literate user first; use memory aids (colour coding), help text, and let people go at their own pace.
- **UX 20 Seniors:** bigger elements, clear labels rather than icons, no forced account creation, and nothing that feels rushed.
- **UX 21 Children are not small adults:** adapt to the developmental stage, not just the size of the type.
- **Targets:** at least 44 × 44 px for anything tappable, including the hit area of small chips.
- **Contrast:** normal text needs 4.5:1, large text 3:1. Check translucent backgrounds.
- **Labels:** each interactive element has an accessibility label and role; selected states are exposed.

## J. Process and quality (UX 42–44, 81, 85–86, 96–100)

- **UX 42 Shortcuts:** use the requirements to find roadblocks, then take shortcuts that keep quality.
- **UX 43 Done is better than perfect (MVP):** release the core features first; judge each feature on business value, user value and complexity.
- **UX 44 Underpromise, overdeliver:** add a few unexpected features that will surprise users positively.
- **UX 81 Personalisation:** use data the user knowingly gave; never infer sensitive things from behaviour; offer an easy opt-out.
- **UX 85–86 Systems and modularity:** design systems and reusable blocks make consistency possible; plan them up front.
- **UX 96 Most issues can be spotted early:** test with users when the device, medium or audience is new (children, a new medium). For familiar patterns, an experienced designer should catch most problems.
- **UX 97 Don't grade your own homework:** designers test their own work with confirmation bias; separate testers from designers where you can.
- **UX 98 Bang for your buck:** start with the top 20% of pages and features by traffic (Pareto), but do not neglect the rest.
- **UX 99 Stay involved after launch:** products decay without care; review the product regularly after launch.
- **UX 100 Lower expectations:** imagine what could go wrong before starting; correct the moment things drift; review after launch.

## K. Universal Principles of Design (general principles read in full in this skill)

- **UPD 004 Aesthetic-usability:** attractive designs are judged easier to use. Polish matters, but never replaces clarity.
- **UPD 002 Accessibility, 005 Affordance, 064 Feedback, 067 Figure-ground, 089 Hick's law, 069 Fitts' law, 091 Highlighting, 107 Legibility, 152 Proximity, 168 Serial position, 171 Similarity:** see sections above.
- **UPD 035 Consistency:** the same role looks and behaves the same everywhere.

## Checklist for a screen review

1. Who is it for, what is their goal, and where are they when they use it? (UX 01, 26)
2. What does the eye see first, and is it the main action? (UPD 067, 091)
3. How many choices are visible at once? Are the rest behind a visible control? (UX 24, 50)
4. Does every tap give immediate feedback, and does any wait longer than 2 s say what is happening? (UX 13)
5. Do the controls look like what they do, and does the same role look the same everywhere? (UPD 005, 035)
6. Is the copy short, plain and one vocabulary? (UX 06)
7. Are the form fields only the ones needed, with defaults? (UX 35, 89)
8. Do errors say what happened, why, and how to fix it, at the place they occur? (UX 90)
9. Does any irreversible action confirm itself clearly? Is any reversible one undoable? (UX 92)
10. Does each interruption deserve to interrupt? (UX 33, 34)
11. Are targets at least 44 px and contrast at least 4.5:1? (UX 18)
12. Can a first-time user reach the goal without instructions? (UX 22, 15)

## Applying this to the apps

- Use the shared components (`Colors`, `themedStyles`, `ActionButton`, `ModalCard`) so the principles apply the same way in all four apps.
- The apps are in Sinhala. Keep Sinhala wording plain; use English only for proper nouns and category names.
- These principles guide decisions; they are not laws. Name the trade-off when you break one.
