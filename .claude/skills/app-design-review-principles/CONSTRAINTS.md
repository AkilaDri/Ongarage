# App Design Review - Constraints and Rules

## Core Rules

### 1. Findings Labeling
**Every finding must be labeled:** `likely, verify`
**Exception:** Only if a screenshot or test proves the issue

### 2. Citation Requirements  
**Every finding must cite:**
- Book name
- Principle or chapter number/title
- Full principle title

**Example:**
```
1. [Issue with SOS button visibility] | [Principle: Universal Principles of Design, 005 Affordance]
   Fix: Ensure SOS button has 44px minimum touch target and high contrast
```

### 3. No Personal Data
**Never include in output:**
- Personal data
- Account details  
- Real contact numbers
- Secrets or private information

### 4. No Submissions During Review
**Never:**
- Publish, send, or submit anything during a review
- Make changes directly to the app
- Trigger payment or login processes

### 5. Language Notes
**Handle multilingual content carefully:**
- Do not translate silently if a screen mixes languages or scripts
- Note it as a finding rather than changing the language
- Respect existing language policies in the app

### 6. Partial Knowledge Management
**For Garrett excerpt (partial coverage):**
- Treat as partial knowledge
- Re-read the text before quoting
- Don't rely on memory for exact wording

**For Buley OCR (processed text):**
- OCR may have errors
- Check exact wording in the text before quoting
- Verify technical terms and formatting

## Usage Integration with Existing Skills

### Complementary Constraints

**App Design Review Constraints:**
- Research from 20+ design books (different scope from your UI/UX Principles)
- Evidence-based findings (more rigorous than routine refinements)
- Implementation prompts (additional deliverable beyond simple fixes)

**UI/UX Principles Constraints (existing skill):**
- Focus on OnGarage-specific core principles (C1-C13)
- Routine app refinements (more practical, less research-heavy)
- App-specific pattern fixes (more targeted than broad book research)

**No conflicts between skills:**
- Different scopes, different purposes
- Complementary rather than competing
- Integration enhances overall design review capability

## Validation Requirements

### Finding Validation
**Each finding must validate:**
- ✅ Cites a book, principle/chapter, and title
- ✅ Is ranked by user impact
- ✅ Has a concrete, specific fix

### Prompt Validation
**Coding assistant prompt must be:**
- ✅ Single code block with nothing else in reply
- ✅ Names one screen only
- ✅ States restructuring, not rebuilding
- ✅ Forbids changing other screens
- ✅ Contains numbered fixes
- ✅ Includes style constraints (contrast, touch size, language, type scale)
- ✅ No device sizes or emulator names
- ✅ Requests changed files and short change list

### Integration Validation
**Team should see:**
- ✅ Ranked findings with principle citations
- ✅ Concrete fixes for each issue
- ✅ Implementation prompts in proper code blocks
- ✅ Evidence-based recommendations
- ✅ Complementary to existing UI/UX Principles workflow

## Quality Assurance

### Review Process
1. **Check all findings** cite books and principles correctly
2. **Validate ranking** by user impact (money loss > safety > usability > cosmetic)
3. **Verify fixes** are specific and actionable
4. **Confirm prompts** follow all requirements
5. **Ensure integration** with existing UI/UX Principles workflow

### Continuous Improvement
**Your team should:**
- Regularly use both skills as needed
- Log usage for understanding integration patterns
- Refine constraints based on team feedback
- Document new book discoveries
- Track effectiveness of implementation prompts

## Example of Valid vs Invalid Findings

### Valid Finding
```
1. [SOS button not accessible in low light] | [Principle: Universal Principles of Design, 005 Affordance: The change button is not visible]
   Fix: Ensure SOS button has 44px minimum touch target and high contrast (4.5:1 ratio)
```

### Invalid Finding
```
❌ Missing book citation
❌ No principle number
❌ No specific fix
❌ No "likely, verify" label
```

## Best Practices

### For This Skill (App Design Review)
1. **Research depth:** Use this skill when you need broader research or specific book citations
2. **Implementation focus:** This skill generates coding prompts your team can use directly
3. **Evidence-based:** Provide concrete principle references that your UI/UX Principles may not have
4. **Complex issues:** Use when problems require deeper research or cross-book knowledge

### Integration with Existing Workflow
1. **Complementary tools:** Use UI/UX Principles for daily work, App Design Review for complex issues
2. **Team training:** Train your team on when to use each skill
3. **Documentation:** Document integration patterns as your team develops them
4. **Continuous refinement:** Improve both skills based on team experience

This constraint system ensures high-quality, evidence-based design reviews while maintaining practical integration with your existing UI/UX Principles workflow.