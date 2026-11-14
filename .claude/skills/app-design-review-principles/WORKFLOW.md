# App Design Review - Workflow Guide

## Overview
This workflow explains how to use the App Design Review skill to analyze screens, flows, and interactions using 20+ design books.

## How to Get Started

### Basic Usage
```
@app-design-review-principles Review the SOS flow on localhost:8091
```

```
@app-design-review-principles Check typography on localhost:8091/pricing-page
```

### Integration with Your Existing UI/UX Principles

**When to use this skill:**
1. Need evidence from specific books
2. Complex issues requiring research
3. Implementation prompts for developers
4. When you need principle titles with citations

**When to use existing UI/UX Principles instead:**
- Routine OnGarage app refinements
- Quick fixes using your core set (C1-C13)
- Simple design questions

## Step-by-Step Workflow

### Step 1: Set Up the Review
1. **Get the screen or text:**
   - Screenshot or dev server URL
   - Phone viewport (412×915)
   - Walk through named flow step-by-step
   - Stop before actions that submit, send, pay

2. **Capture scrolling:**
   - Scroll the full page in steps
   - Content below the fold is part of the review
   - Use condition-based checks, not long sleeps

### Step 2: Map Each Step
1. **Note the user's goal:** What the user is trying to accomplish
2. **Identify risks:** What could go wrong
3.عي **Apply design principles:** Search sources by keyword
4. **Confirm details:** Principle number, book, and title

### Step 3: Check User Context
**Before flagging an issue:**
1. **Verify with user:** Before reporting issues that may be intentional
2. **Check for placeholders:** Dummy data or layout still in development
3. **Drop rejected findings:** User rejects findings can't be fixed

### Step 4: Rank by User Impact
**Priority order:**
1. **Money loss:** Bugs that cost users money
2. **Safety risks:** Issues that create unsafe conditions
3. **Dead ends:** Paths that don't work or lead nowhere
4. **Cosmetic issues:** Visual problems that don't affect function

### Step 5: Provide Concrete Fixes
**Format for each finding:**
```
1. [Issue] | [Principle: Book Chapter/Title]
   Fix: [What to change, where, and what to show]
```

### Step 6: Generate Implementation Prompt
**Coding assistant prompt format:**
```
[code block with implementation prompt]
```

**Requirements:**
- One screen focus only
- No rebuilding or changing other screens
- Numbered fixes list
- Style constraints (contrast, touch size, language, type scale)
- Request changed files and short change list

## Integration Commands

### Book-Specific Reviews
```
@app-design-review-principles Review using Norman for affordances and Buley for testing
```

```
@app-design-review-principles Check typography using typography book principles 20-27
```

### Implementation-Ready Prompts
```
@app-design-review-principles Generate coding prompt for SOS flow fixes
```

```
@app-design-review-principles Review and create implementation for pricing page
```

## Example Workflows

### Example 1: Basic Review
**User asks:** "Review the SOS flow on localhost:8091"

**What happens:**
1. I walk through the SOS flow step-by-step
2. Map findings to principles from relevant books
3. Rank by user impact (safety-critical issues first)
4. Generate implementation prompt with specific fixes
5. Provide coding instructions for the team

### Example 2: Book-Specific Research
**User asks:** "Review using Norman for affordances and Buley for testing"

**What happens:**
1. Use Norman principles for affordance issues
2. Apply Buley for team testing and quick validation methods
3. Provide evidence-based findings with specific principle citations
4. Generate implementation prompts with exact principle references

### Example 3: Implementation Focus
**User asks:** "Generate coding prompt for the pricing page"

**What happens:**
1. Review pricing page structure and flow
2. Identify design issues with principle citations
3. Generate coding assistant prompt with numbered fixes
4. Provide file change instructions

## Integration with Your Existing Skills

### Complementary Usage

**App Design Review (this skill):**
- Provides evidence from 20+ design books
- Generates implementation prompts
- Handles complex research-heavy issues
- Gives specific principle citations with titles

**UI/UX Principles (existing skill):**
- Focuses on OnGarage-specific core principles (C1-C13)
- Handles routine app refinements
- App-specific pattern fixes

**Practical Integration:**
1. **Use UI/UX Principles for:** Daily refinements, simple fixes, app-specific questions
2. **Use App Design Review for:** Complex issues, book citations, implementation prompts

## Example Session Flow

**Step 1: Routine Refinement**
```
User: @ui-ux-principles Review the home screen button placement
Assistant: Uses your existing core set (C1-C13) for quick fix
```

**Step 2: Complex Review**
```
User: @app-design-review-principles Review the SOS flow using Norman for affordances
Assistant: Uses book research + provides implementation prompt
```

**Step 3: Implementation Focus**
```
User: @app-design-review-principles Generate coding prompt for the checkout flow
Assistant: Provides structured implementation instructions
```

## Success Metrics

**Your team should see:**
- Ranked findings with principle citations
- Concrete fixes for each issue
- Implementation prompts in code blocks
- Evidence-based recommendations

**Integration with existing workflow:**
- Works alongside your UI/UX Principles usage
- Provides additional research depth when needed
- Generates implementation-ready code prompts
- Maintains consistency with your app review process

This workflow gives you both the practical daily use (UI/UX Principles) and the research/implementation depth (App Design Review) needed for OnGarage development.