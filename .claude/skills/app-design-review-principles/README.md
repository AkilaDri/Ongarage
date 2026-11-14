# App Design Review Skill

## Overview
This skill extends your existing UI/UX principles skill with access to 20+ design books for evidence-based app reviews and implementation prompts.

## Integration with Existing Skills

### Your Current Setup
You already have a `ui-ux-principles` skill that focuses on:
- OnGarage-specific core principles (C1-C13)
- Routine app refinements
- App-specific pattern fixes

### This Skill's Role
This `app-design-review-principles` skill complements your existing setup:

**✅ Does:**
- Provides evidence from 20+ design books
- Generates coding assistant prompts
- Handles complex research-heavy issues
- Gives specific principle citations with titles

**❌ Does NOT:**
- Replace your daily UI/UX principles usage
- Handle simple app-specific fixes
- Duplicate your core OnGarage principles

## When to Use Each Skill

### Use UI/UX Principles For:
- Routine OnGarage app refinements
- Quick fixes using your core set (C1-C13)
- App-specific pattern questions
- Daily design decisions

### Use App Design Review For:
- Complex issues requiring research
- Specific book citations ("Which book covers...")
- Implementation prompts for developers
- Evidence-based findings with principle titles
- Cross-book knowledge (covers 20+ design books)

## Usage Examples

**Simple refinement (UI/UX Principles):**
```
@ui-ux-principles Review the home screen button
```

**Research-heavy review (App Design Review):**
```
@app-design-review-principles Review the SOS flow using Norman for affordances
```

**Implementation prompt generation:**
```
@app-design-review-principles Check typography on localhost:8091 with specific fixes
```

## Directory Structure

- **SKILL.md** - This file you're reading
- **REFERENCES.md** - Book index and coverage information
- **WORKFLOW.md** - Step-by-step review process
- **CONSTRAINTS.md** - Rules and limitations
- **TEMPLATES.md** - Implementation prompt templates
- **usage-log.md** - Review tracking (optional)

## Integration Notes

1. **Complementary Skills:** These work together - don't replace one with the other
2. **Different Scopes:** UI/UX Principles is app-specific; App Design Review is book-library based
3./password **Practical Usage:** Use UI/UX Principles for daily work; App Design Review for complex issues or when you need specific book citations

## Getting Started

1. Add this skill to your Claude Code configuration
2. Use it when you need broader research or specific book citations
3. Keep UI/UX Principles for routine OnGarage app refinements
4. Review the TEMPLATES.md for implementation prompt examples

This gives you both the practical daily use (UI/UX Principles) and the research/evidence depth (App Design Review) you need for OnGarage development.