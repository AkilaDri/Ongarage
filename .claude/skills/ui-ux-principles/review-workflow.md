# Review workflow and output format

Merged from the former `app-design-review-principles` skill (retired 2026-11-17). Use it whenever the user asks for a review, an analysis or recommendations on a screen. The principles themselves are in [SKILL.md](SKILL.md); the reference screen is [benchmark-bids.md](benchmark-bids.md).

## Two depths

- **Quick fix** (a single element, a spacing or wording question): check the benchmark and the core set (C1–C15), answer in a few lines.
- **Deep review** (a whole screen or flow, or the user says "analyse"): follow the steps below. Use the book library (see "Book reference" in SKILL.md) when the core set does not settle a case, and name the book.

## Steps for a deep review

1. **Set up.** Get a screenshot or the dev server page. Judge it at phone size (412 × 915), and label each finding with its viewport. Scroll the whole page in steps; content below the fold is part of the review. Never submit, send or pay during a review, and make no changes to the app while reviewing.
2. **Map each step.** For each screen or step, note the user's goal and what could go wrong, then pick the principles that apply (the benchmark first, then C1–C15, then the library). Cite the principle number, the book and its title.
3. **Check context before flagging.** Ask the user before reporting something that may be intentional. Ignore placeholders and test data, except to mention data that looks broken (a garbled name). Drop a finding the user has rejected; do not raise it again.
4. **Rank by user impact:** money loss, then safety, then dead ends, then usability, then cosmetic.
5. **Write each finding** as: the issue | the principle (book, number, title) | the fix: what to change, where, and what should show. State the viewport. Label the finding "likely, verify" unless a screenshot or test proves it.
6. **Plan.** End with a numbered order of work, smallest safe step first, and ask which step to start with. When the user asks for the plan, say which files change.

## Coding prompt (only when the user asks for one for another coder or tool)

Give it as one code block with nothing else in the reply. It names one screen only, says "restructure, do not rebuild", forbids changing other screens, lists numbered fixes (each: change, where, what to show, the style constraint), includes the style constraints (contrast, 44px touch size, language, type scale, the theme tokens in CLAUDE.md), and asks for the changed files and a short change list. Do not name device sizes or emulators in the prompt. When the user wants the change made by me, skip the prompt and make it.

```
// Screen: <one screen>
// Note: restructure, do not rebuild; change no other screen
1. <fix> - Principle <book, number, title>
   - Change: …  Where: <file / component>  Show: …  Constraint: …
// Reply with the changed files and a short list of changes
```

## Rules for findings

- Every finding names a book (or the benchmark), a principle number and its title, and a concrete fix. A finding without these is not reported.
- No personal data, account details, real phone numbers or secrets in any output.
- If a screen mixes Sinhala, English or other scripts, report that as a finding; do not translate silently. Follow the app's language rule (Sinhala UI, English only for proper nouns, category names and the owner app's bottom tabs).
- Garrett is an excerpt and the Buley text is OCR: re-read the text before quoting either.
- Do not run the typecheck unless the user asks, except after a structural edit.

## Quality check before sending a review

- Each finding cites a source, is ranked, and has a specific fix.
- The viewport is stated; desktop-only findings are re-checked at phone size.
- Anything the screen already gets right is said first, briefly.
- Consistency with the benchmark page is named, not assumed.
