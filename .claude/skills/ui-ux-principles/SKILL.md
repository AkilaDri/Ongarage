---
name: ui-ux-principles
description: Use when designing, reviewing or refining any screen, panel, dialog, chip row, list, form, navigation or flow in the OnGarage apps. Applies "Universal Principles of UX" (Irene Pereyra, 100 principles, numbered 01-100) and "Universal Principles of Design" (Lidwell, Holden, Butler, numbered 001-200), including the profession lens for UI, UX, graphic, instructional and systems designers, to UI decisions: user focus, feedback, choice, learnability, forms, errors, navigation, legibility, accessibility and interruption.
---

# UI/UX principles for OnGarage

Sources:
- **UX** = *Universal Principles of UX*, Irene Pereyra. Principles are numbered 01–100, and this file quotes those numbers. The whole book has been read.
- **UPD** = *Universal Principles of Design*, Lidwell, Holden, Butler (3rd ed.). Numbers 001–200. Only the entries below were read in full; treat the rest as unread.
- **Typography** = *Universal Principles of Typography*, Rockport. All 100 principles are read and summarised in section M (principles 10–14 need a re-read for detail).

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

## M. Typography (Universal Principles of Typography, Rockport, principles 1–100)

Source: *Universal Principles of Typography* (Rockport, Elliot Jay Stocks). Numbers are the book's. The book is written for Latin type on print and web; the Sinhala rules below are inferences from it, and say so when they are used. Principles 10–14 were not kept in notes and need a re-read if a rule from them is needed.

**Letterforms and fonts (1–9, 16)**
- **1–2 Typography matters; no excuse:** every font and size choice is typography, whether or not the designer chose the typeface.
- **3 Font vs typeface, 4 characters vs glyphs:** a typeface is the design family; a font is one file of it. Check the font file contains the glyphs you need (see 38, 95).
- **5–8 Anatomy, metrics, em square, x-height:** the x-height drives how big text looks. A face with a large x-height looks larger at the same size. Do not compare sizes across families without looking.
- **9 Classification:** a classification says little about use. Judge a face by its details.
- **16 Legible characters:** "1", "l", "I" and "0", "O" must look different. Confusable characters are a legibility failure.

**Legibility and readability (17–19)**
- **17 Readability:** "It's perfectly possible to make legible type unreadable with bad typography." Fix readability with spacing and measure before changing the face.
- **18 Optical size:** "The design of letterforms can and should adjust according to the size they're set at." Use a size-specific cut when available. Small text wants more open spacing, display text wants more contrast.
- **19 Two-lines test:** set a two-word name on two lines (same face, centred) to check weight, leading, width and justification together. Use it on two-line headings and card titles.

**Spacing (20–22, 35, 54–55)**
- **20 Line height:** "Avoid those clashes, but don't get too generously with your leading." About 110–150% for body text. Wider measures need more leading; uppercase can be tighter. Inference for Sinhala: vowel signs sit above and below the line, so give Sinhala body text the upper half of that range.
- **21 Measure:** "Unruly lines make reading so much harder than it needs to be, so keep them in check." Bringhurst: 45–75 characters for single-column text. Material guidance: 40–60. The book's test: asterisks at the 45th and 75th characters show whether a measure is too short or too long.
- **22 Tracking:** "Optimize the spacing between letters based on their size and context." Open small text and small caps slightly. Keep large display type tight. Never set tracking as a fixed pixel value; express it relative to the type size.
- **35 Well-spaced font:** "Beautiful letterforms mean nothing if the font's not spaced properly." Prefer professionally spaced fonts; sidebearings and kerning come from the designer.
- **54 Line height headache:** the white space inside a text box comes from the font's metrics and line height, and it is the usual cause of alignment problems. The box height is not the visible text height.
- **55 Manual changes:** a font's vertical metrics sit at different positions in its em box. Recheck spacing whenever a typeface changes, especially inside buttons.

**Emphasis, weight and style (23–27)**
- **23 Emphasis:** "Be intentional with your use of bolds and italics." An underline means a link, so never underline plain text. Caps are for short labels and acronyms only. Each emphasis style should mean one thing across the app.
- **24 Italics:** "An italic style is required for almost all typesetting, and not just for emphasis." Sinhala text has no true italic in the app's font, so do not apply `fontStyle: 'italic'` to Sinhala.
- **25 Weight is a range:** "Look for as many weights as possible. You never know when they might come in handy." Bold is one step on a scale; a semibold is often the better label weight.
- **26 Styles:** one family with its styles (upright, italic, small caps, widths) removes the need for a second typeface.
- **27 Faux styles:** "They're mistakes, and you don't want them in your designs. Ever." A synthetic bold looks bloated, a synthetic italic is only a slant, synthetic small caps look too thin. Use a real weight or a different font.

**Obliques, widths, masters (28–31)**
- **28 True obliques:** "Unlike italics, obliques are slanted versions of the upright forms — but that slant is still optically adjusted by the type designer." Use an oblique where a slant suggests movement.
- **29 Widths:** "The freedom to occupy more horizontal space opens up so many more opportunities." A condensed width fits more characters into a narrow heading.
- **30 Masters and interpolation:** named weights and widths are points on a continuous scale in variable fonts. Use named instances unless a layout needs an exact fit.
- **31 Multiplexed widths:** "Change the weight without affecting the horizontal space used by the type." When a tab, chip or segment turns bold on selection, its neighbours jump. Reserve the width, or use a multiplexed face.

**Pairing type (36–47)**
- **36–39 Four-step choice:** (36) choose a typeface that suits the project's purpose; (37) choose one with a comprehensive design (language coverage, weights, widths, optical sizes); (38) choose font files that are reliable (check the glyphs and kerning are really in the file); (39) choose font files that are usable in the situation, including licence and pairing.
- **34 Licensing:** "You can even let the license help you narrow down your typeface choices." Licences are priced by weights, media and users. "Free" does not mean any use is allowed.
- **40–41 Families and superfamilies:** "A shared skeleton and similar proportions take the guesswork out of pairing." A superfamily that already covers serif, sans and mono removes the need for a second family.
- **42 Pair only if you have to:** "It might be that you already have a type family that does everything you need."
- **43 Pair related type:** "Fonts from the same designer often have a lot in common."
- **44 Font matrix:** skeleton (dynamic, rational, geometric), flesh (contrast, serifs), skin (finer detail). Same skeleton pairs well; same flesh with different skeleton does not.
- **45 Pairs that align:** "Side-by-side type might need some additional consideration to play nice." Check x-heights and line height when two faces sit on one line.
- **46 Monospace as a complement:** "They're great for setting lines of code — but are by no means limited to that alone." Tabular figures are monospaced.
- **47 Distinction and harmony:** "Whether pairing typefaces or just combining different styles from one font, we've got to find that sweet spot between too different and too similar."

**Systems, rhythm, hierarchy (48–53)**
- **48 Design system:** "It needn't be complicated, it just needs to be consistent." A type scale and a short list of styles is already a system.
- **49 Baseline grid:** "Set the size of your body text, decide on its leading, and you have a baseline grid." Align other sizes to it with incremental leading (every nth line).
- **50 Rhythm:** "Vertical rhythm is even more important when you can't adhere to a baseline grid." On screens, rely on consistent spacing between blocks, since images break any grid.
- **51 Type scale:** "Pick whatever ratio you like, as long as each font size has a relationship to the size above and below it." A major third (1.25) gives a gentle scale; a golden ratio (1.618) gives much larger jumps.
- **52 Hierarchy:** "Size, weight, and spacing all help imply order within a document." A heading floating equally between paragraphs looks unrelated to what follows it. A heading can be lighter in weight if it is much bigger (about 150% of body).
- **53 Typographic colour:** "Once the demands of legibility and logical order are satisfied, evenness of color is the typographers normal aim." Squint at a screen: even density means good texture.

**Punctuation and dashes (32, 56–58)**
- **32 Quotation marks:** "At the very least, ensure that curly quotation marks are turned on by default." Use proper quotation marks and apostrophes, not straight ones.
- **56 Dashes:** the hyphen joins words and breaks words; an en dash connects ranges (08:00–17:00); an em dash marks an interruption. Do not use two hyphens in place of an em dash.
- **57 Spaces around dashes:** "Not all spaces are created equal either." Thin or hair spaces around an em dash usually look better than full spaces, and the width depends on the face.
- **58 Punctuation in emphasis:** italicise punctuation that follows italic words; do not embolden punctuation after bold words.

**Justification, breaks and optical care (59–63)**
- **59 Justify and hyphenate with caution:** justified text needs hyphenation and creates rivers in narrow columns. Default to ragged-right.
- **60 Widows and orphans:** "It might mean breaking a few rules along the way — and that's an acceptable trade-off." A single word on its own line is the one to avoid.
- **61 Optical trickery:** "Make things look aligned by misaligning them." Overshoot round letters, hang opening quotation marks, and nudge large display type so its visible edge aligns.
- **62 Diacritics:** "Don't forget the extra space required for accents and the like." Uppercase with diacritics needs more line height; a tight line height clashes accents with the line above.
- **63 Drop caps:** decorative only; they do not add function.

**Size, units and format (64–68)**
- **64 Size doesn't exist:** "Even absolute units don't produce reliable results — it depends where the reader is." Perceived size depends on the viewer's distance and the face.
- **65 Units:** "Relative units for screens, absolute units for print, but above all: consistency." On screens, use units that scale with the user's text-size setting.
- **66 Customise type:** tweaking outlines is for logotypes, not body text.
- **67 Font formats:** OpenType (OTF/TTF) is the standard; WOFF2 is the compressed web format.
- **68 OpenType:** features (ligatures, numerals, small caps, alternates) are switched on by the font and the software, not by the text.

**OpenType features (69–76)**
- **69 Alternates:** swap glyphs through named sets, not by hand.
- **70 Ligatures:** "As well as avoiding awkward clashes, they can avoid repeating letterforms, too." Common ligatures aid readability; discretionary ones are decorative. Copying text can lose ligatures.
- **71 Numerals:** four kinds: proportional lining, proportional oldstyle, tabular lining, tabular oldstyle. Use tabular figures in tables and columns of prices; oldstyle in running prose; lining for labels.
- **72 Swashes:** "But watch out for unsightly clashes between letterforms."
- **73 Proper fractions:** "If you're setting recipes, your readers will appreciate this subtle but important change."
- **74 Small caps:** "If you've got text containing acronyms, it's useful to have small caps to hand." Increase tracking on small caps and small uppercase.
- **75 Stylistic sets:** "Swap out alternate glyphs en masse."
- **76 Kerning:** "Tracking will probably get you most of the way there." Leave built-in kerning on; use metrics, not optical, spacing.

**Web and screens (77–85)**
- **77 Subsetting:** "Font files can be big and, for websites, that has an impact on users' bandwidth." Load only the glyph ranges a page needs.
- **78 Web fonts:** "Any font that's not preinstalled on a user's device is a web font."
- **79 Web typography:** "There's very little we can do in print that we can't also do online, but web typography comes with the added blessing (or curse) of responsive design."
- **80 Flexible content:** "We don't know how big the user's screen will be — and that's okay. Let's plan for it." Size type relative to the viewport and the user's settings.
- **81 Fluid type scales:** "Let the browser determine how to elegantly move between a type scale that works for small and large viewports."
- **82 Deliver font files with intent:** serve only the weights and scripts used; set a fallback that shows text while the font loads.
- **83 OpenType on the web:** "OpenType is well-supported in modern browsers, but there are still some nuances." Check the font really contains each feature.
- **84–85 Variable fonts and axes:** "Manipulate elements of the typeface's design, and move past traditional weights and styles." Axes are weight, width, slant, optical size, and custom ones.
- **86 Grade:** "But beware: print and screen behave in opposite ways." Light text on dark looks bolder on screens; a lighter grade can compensate in dark mode.
- **87 Parametric axes:** "Dive deep down the rabbit hole of granular-level refinement." Expert fine-tuning, after the optical size axis.
- **88 Inheritance problem:** "Employ CSS custom properties to make your code future-proof and your life a little easier." A child inherits the whole `font-feature-settings` string and loses the rest; set one variable per setting.
- **89 Icons and symbols:** icons often ship in font files. Check that the icon font has the glyphs you need and that they follow the text's weight.
- **90 Layer and colour fonts:** colour fonts and layered styles give more than one colour. Use them for logos and display, not body text.
- **91 Font menus:** conflicting fonts with the same name cause different results; use a font manager.
- **92 Indie foundries:** "While you can get your fonts from the big companies, developing a relationship with the smaller, often one-person foundries can go a long way."
- **93 More fonts:** "It's not like we have enough songs, is it?" Expect new faces; choose by fit, not by how many you already have.

**Languages and scripts (94–97)**
- **94 Script and writing system:** "'Script' and 'writing system' aren't quite the same thing." A writing system adds rules and conventions to a script. Italics are not relevant to most Asian writing systems; Indic scripts have no x-height.
- **95 Internationalisation:** "The sad truth is that not enough fonts support multiple languages, let alone multiple scripts." A missing glyph shows as tofu (the empty box). Use tofu as a test: type the names your users enter in Sinhala, Tamil and English, and check every character renders.
- **96 Shaping:** "As users of Latin type, we take shaping for granted, and when shaping goes wrong, it can mean unreadable text in other scripts." Sinhala is a shaped script: the glyphs change with their neighbours. Do not split a word into separately styled pieces, because that breaks the shaping.
- **97 Licensing and internationalisation together:** "Even the huge corporations can find this stuff hard." Confirm a font's licence covers every script you ship.

**Hierarchy of needs and judgement (98–100)**
- **98 Nix's hierarchy of typographic needs:** from the base: font functionality, font security (licence), typographic love and belonging, typographic esteem, typographic actualisation. Work from the base up; a delightful face that breaks reading or licensing fails at the base.
- **99 It depends:** "In typography, context is everything." Treat each rule as a guideline and test it in its context.
- **100 Keep learning:** "It's time to see how deep this rabbit hole goes."

Applying this to the OnGarage apps:
- Use the `FONTS` tokens (`bodyRegular`, `bodySemiBold`, `bodyBold`, `titleBold`) and make sure each one maps to a real font file, never a synthesised weight (27, 25).
- Do not set `fontStyle: 'italic'` on Sinhala text (24, 27).
- Give Sinhala body text the upper part of the line-height range and check that chip and button heights do not clip the vowel signs (20, 62). Inference for Sinhala.
- Keep selected chips, segments and tabs at a fixed width while the weight changes (31).
- Underline only real links; keep all caps for acronyms and short English labels (23).
- Bound the body measure on tablets and the web, and let line height grow with the line length (20, 21).
- Make headings clearly bigger than body text, and keep them close to the content they head (52).
- Use tabular figures in price columns, such as the bill and parts lists, where the platform supports them (71).
- Use en dashes for ranges such as times and dates, and em dashes for breaks in a sentence (56).
- Do not justify UI text; avoid a single word on the last line of a block (59, 60).
- Test every user-entered name in Sinhala, Tamil and English for tofu, and confirm the font covers the scripts the app ships (95, 97).
- Keep text containers flexible with respect to the user's text size; do not fix a text box to its absolute height (64, 65).

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
13. Is every weight, italic and underline used with one meaning, with no faked styles, and do selected states keep their width? (Typography 23, 27, 31)
14. Is body text set with enough line height and a bounded measure? (Typography 20, 21)

## Applying this to the apps

- Use the shared components (`Colors`, `themedStyles`, `ActionButton`, `ModalCard`) so the principles apply the same way in all four apps.
- The apps are in Sinhala. Keep Sinhala wording plain; use English only for proper nouns and category names.
- These principles guide decisions; they are not laws. Name the trade-off when you break one.
