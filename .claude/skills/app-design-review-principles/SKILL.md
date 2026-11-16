---
name: app-design-review-principles
description: "Review or improve an app screen, flow, interaction, or typography using 20+ design books. Provides evidence-based findings with specific principles and fixes, plus coding prompts for implementation teams."
---

# App Design Review - 20+ Design Book Library

## Core Capabilities
- **20+ design books** indexed for quick principle lookup
- **Evidence-based findings** with specific citations
- **Concrete fixes** for each design issue
- **Coding prompts** for implementation teams
- **Ranked by user impact** (money loss, safety, usability)

## Usage
When you need to: 
- Review a screen, flow, or interaction
- Find which book covers a specific design principle
- Get evidence-based recommendations
- Create implementation prompts for developers

## Book Library

### Core Books
- **Universal Principles of Design** (200 principles)
- **Universal Principles of UX** (100 principles)  
- **Universal Principles of Typography** (100 concepts)

### Supplemental Books
- Norman - The Design of Everyday Things
- Krug - Don't Make Me Think
- Saffer - Microinteractions
- Johnson - Designing with the Mind in Mind
- Buley - UX Team of One
- Garrett - Elements of User Experience (excerpt)
- Tidwell - Designing Interfaces
- Benyon - Designing User Experience
- Brown - Change by Design
- Rumelt - Good Strategy / Bad Strategy
- Nodder - Evil by Design
- Fitzpatrick - The Mom Test
- Nunnally - UX Research
- InVision - Design Systems Handbook
- Marsh - UX for Beginners
- Dashinsky - Solving Product Design Exercises
- Hurff - Designing Products People Love

## Workflow

### 1. Review Setup
- Screenshot or dev server URL
- Phone viewport (412×915)
- Walk through named flow step-by-step
- Stop before actions that submit/pay

### 2. Principle Mapping
- Map user goals, risks, and applicable principles
- Search sources by keyword
- Cite exact principle with book and title

### 3. Findings
- Label "likely, verify" unless proven
- Rank by user impact
- Provide concrete fix for each finding

### 4. Implementation
- Generate coding assistant prompt
- One screen focus only
- Structured, actionable instructions

## Integration with UI/UX Principles

This skill extends the existing `ui-ux-principles` skill:

**UI/UX Principles (your existing skill):**
- Focuses on OnGarage-specific core set (C1-C13)
- Provides app-specific fixes
- Handles day-to-day design decisions

**App Design Review (this skill):**
- Uses broader library of 20+ design books
- Provides evidence-based findings with citations
- Handles complex issues requiring research
- Generates implementation prompts

**Usage pattern:**
- Use UI/UX Principles for routine refinements
- Use App Design Review for complex issues, research-heavy problems, or when you need specific book citations

## Finding Cues

Use this skill when you need:
- **Specific book citations** for design decisions
- **Research-heavy analysis** (e.g., "Which book covers...'')
- **Implementation prompts** for coding teams
- **Evidence-based findings** with numbered principles
- **Cross-book knowledge** (covers 20+ design books)

Use UI/UX Principles instead for:
- OnGarage app-specific fixes
- Routine design refinements
- App-specific pattern questions

## Example Prompt

When you ask me to review a screen, I'll:
1. Walk through the flow step-by-step
2. Map findings to specific principles from any book
3. Rank by user impact
4. Generate a coding prompt for implementation

Example: "Review the SOS flow on localhost:8091 using Norman for affordances and research"

## Files
- `REFERENCES.md` - Book index and coverage
- `WORKFLOW.md` - Step-by-step process  
- `CONSTRAINTS.md` - Rules and limitations
- `TEMPLATES.md` - Implementation prompts
- `usage-log.md` - Track reviews for core set updates

## Integration Notes

This skill works alongside your existing UI/UX principles:

1. **Complementary:** Covers different scope (broad library vs app-specific)
2. **Evidence-based:** Provides book citations that UI/UX principles lack
3. **Implementation focus:** Generates code prompts that UI/UX principles don't
4. **Research-heavy:** Handles complex issues requiring broader knowledge base