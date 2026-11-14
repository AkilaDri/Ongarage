# App Design Review - Setup Guide for OnGarage

## Quick Start

This guide explains how to set up and use the App Design Review skill in your OnGarage project alongside your existing UI/UX Principles skill.

## What You're Adding

**App Design Review Skill**
- **Purpose:** Evidence-based design reviews using 20+ design books
- **Focus:** Research-heavy analysis + implementation prompts
- **Complement:** Works alongside your existing UI/UX Principles skill

**Existing Skill**
- **Purpose:** OnGarage-specific design refinements  
- **Focus:** Routine app fixes using your core principles (C1-C13)
- **Strength:** Practical, app-specific daily use

## Directory Structure

```
/home/akila/Projects/Ongarage/.claude/skills/
├── ui-ux-principles/          ← Your existing skill
│   ├── SKILL.md              ← Core principles (C1-C13)
│   └── usage-log.md          ← Usage tracking
├── app-design-review-principles/  ← New skill (this)
│   ├── SKILL.md              ← Book-based research
│   ├── README.md             ← Quick start guide
│   ├── REFERENCES.md         ← Book index and coverage
│   ├── WORKFLOW.md           ← Step-by-step process
│   ├── CONSTRAINTS.md        ← Rules and limitations
│   ├── TEMPLATES.md          ← Implementation prompt templates
│   └── usage-log.md          ← Usage tracking
```

## Step 1: Skill Installation

### For Claude Code Integration

**Option A: Command Line Installation**
```bash
cd /home/akila/Projects/Ongarage/.claude/skills/app-design-review-principles
skill install skill.json
```

**Option B: VS Code Integration**
```bash
# In your VS Code workspace
cd /home/akila/Projects/Ongarage
claude-code skills install .claude/skills/app-design-review-principles/skill.json
```

## Step 2: Verify Installation

### Test Both Skills

**Test your existing UI/UX Principles skill:**
```
@ui-ux-principles Review the home screen button placement
```

**Test your new App Design Review skill:**
```
@app-design-review-principles Review the SOS flow on localhost:8091
```

## Step 3: Integration Workflow

### When to Use Each Skill

**Use UI/UX Principles For:**
- ✅ Routine OnGarage app refinements
- ✅ Quick fixes using your core set (C1-C13)
- ✅ App-specific pattern questions
- ✅ Daily design decisions

**Use App Design Review For:**
- ✅ Complex issues requiring research
- ✅ Need specific book citations
- ✅ Generate implementation prompts for developers
- ✅ Cross-book knowledge (covers 20+ design books)

### Example Integration Session

```
# Step 1: Routine refinement with existing skill
User: @ui-ux-principles Review the home screen button placement
Response: Uses your core set (C6 Primary action is clear)

# Step 2: Research-heavy review with new skill
User: @app-design-review-principles Review SOS flow using Norman for affordances
Response: Book research + implementation prompt with principle citations

# Step 3: Implementation focus
User: @app-design-review-principles Generate coding prompt for pricing page
Response: Structured implementation instructions with fixes
```

## Step 4: Integration with Your Existing Workflow

### Directory Structure Explanation

```
ui-ux-principles/
  SKILL.md              ← Your core principles (stable, rarely changes)
  usage-log.md          ← Daily usage tracking

app-design-review-principles/
  SKILL.md              ← New research skill (broader, research-heavy)
  README.md             ← Quick start guide
  REFERENCES.md         ← Book index and coverage
  WORKFLOW.md           ← Step-by-step process
  CONSTRAINTS.md        ← Rules and limitations
  TEMPLATES.md          ← Implementation prompt templates
  usage-log.md          ← Usage tracking
```

### Why This Structure?

**UI/UX Principles (existing):**
- Focuses on OnGarage-specific fixes
- Stable core principles (C1-C13)
- Daily practical use
- Simple structure

**App Design Review (new):**
- Broader book-library based
- Research-heavy and evidence-based
- Implementation prompt generation
- More complex documentation

## Step 5: Quick Commands

### For Your Team

**Get help:**
```
# See skill descriptions
@app-design-review-principles help
```

**Quick usage:**
```
# Basic review with book research
@app-design-review-principles Review the SOS flow on localhost:8091

# Specific book research
@app-design-review-principles Review using Norman for affordances

# Implementation prompt generation
@app-design-review-principles Generate coding prompt for screen fixes
```

**Integration checks:**
```
# See how skills complement each other
@app-design-review-principles integration-analysis

# Compare usage patterns
@app-design-review-principles usage-report
```

## Step 6: Success Metrics

### Track Usage
**Your team should see:**
- UI/UX Principles used for routine refinements
- App Design Review used for complex research
- Implementation prompts generated from new skill
- Evidence-based findings with book citations

### Integration Benefits
1. **Broader research depth:** Access to 20+ design books
2. **Implementation support:** Ready-to-use coding prompts
3. **Evidence-based decisions:** Specific principle citations
4. **Complementary tools:** Different scopes, different purposes

## Step 7: Team Training

### Training Your Team

**Phase 1: Skill Introduction**
1. Present both skills and their purposes
2. Show example usage of each
3. Explain when to use each skill
4. Demonstrate integration workflow

**Phase 2: Practice**
1. Team members try both skills
2. Document their experiences
3. Share successful patterns
4. Identify integration challenges

**Phase 3: Optimization**
1. Review usage patterns
2. Refine integration workflow
3. Update templates based on experience
4. Document best practices

## Step 8: Common Issues and Solutions

### Integration Challenges

**Challenge: Too many options**
**Solution:** Start with one skill, master it, then add the other

**Challenge: Over-researching**
**Solution:** Use UI/UX Principles for routine work, App Design Review for complex issues

**Challenge: Implementation prompts not used**
**Solution:** Involve coding team early, gather feedback

### Troubleshooting

**If App Design Review prompts aren't working:**
```
# Check installation
claude-code skills status app-design-review-principles

# Verify skill configuration
cd /home/akila/Projects/Ongarage/.claude/skills/app-design-review-principles
cat SKILL.md | grep -A 10 "name:" app-design-review-principles
```

**If UI/UX Principles skills are interfering:**
```
# Check both skill names
cd /home/akila/Projects/Ongarage/.claude/skills
ls -la
```

## Step 9: Maintenance and Updates

### Regular Updates
**For UI/UX Principles:**
- Stable core principles (C1-C13 rarely change)
- Update usage-log monthly
- Review core set every 20-30 logged refinements

**For App Design Review:**
- Review templates monthly
- Update book references as needed
- Monitor usage patterns
- Gather team feedback

### Monthly Review
1. **Analyze usage patterns:** Which skill is used for what?
2. **Review integration effectiveness:** How well do they work together?
3. **Identify improvements:** What can be enhanced?
4. **Plan updates:** What needs to be refined?

## Complete Setup Checklist

### Prerequisites
- [ ] Claude Code installed
- [ ] Existing UI/UX Principles skill working
- [ ] Development environment set up

### Installation Steps
- [ ] Copy this skill directory to `.claude/skills/app-design-review-principles`
- [ ] Install skill in Claude Code
- [ ] Test both skills work independently
- [ ] Verify integration workflow

### Team Setup
- [ ] Train team on both skills
- [ ] Document integration patterns
- [ ] Set up usage tracking
- [ ] Create shared templates

### Success Criteria
- [ ] Team uses both skills appropriately
- [ ] Integration workflow works smoothly
- [ ] Implementation prompts are useful
- [ ] Research depth provides value
- [ ] Complementary skills enhance overall capability

## Getting Started Today

**1. Copy the skill directory:**
```bash
cp -r /home/akila/Projects/Ongarage/.claude/skills/app-design-review-principles /home/akila/Projects/Ongarage/.claude/skills/app-design-review-principles
```

**2. Install the skill:**
```bash
cd /home/akila/Projects/Ongarage
claude-code skills install .claude/skills/app-design-review-principles/skill.json
```

**3. Test integration:**
```bash
# Test both skills
@app-design-review-principles help
@ui-ux-principles help
```

**4. Start using:**
```bash
# Your team now has both skills for design reviews
# Use UI/UX Principles for routine work
# Use App Design Review for research-heavy problems
# Generate implementation prompts when needed
```

## Benefits to Your OnGarage Project

1. **Enhanced design review capability:** Access to 20+ design books
2. **Implementation support:** Ready-to-use coding prompts
3. **Evidence-based decisions:** Specific principle citations
4. **Complementary tools:** Different scopes, different purposes
5. **Better team collaboration:** Research + implementation workflow
6. **Continuous improvement:** Integration patterns documented

Your team now has both practical daily use (UI/UX Principles) and research/implementation depth (App Design Review) for OnGarage development!

**Start using both skills today and see how they complement each other!** 🎯