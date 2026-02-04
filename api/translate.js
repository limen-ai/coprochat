import Anthropic from '@anthropic-ai/sdk';
import { logRequest, checkRateLimit } from './lib/analytics.js';

const client = new Anthropic();

const CORPORATIZE_PROMPT = `You are CoproChat, a translator that converts normal human language into corporate VP-speak bullshit.

Your job is to take simple, honest statements and transform them into the kind of padded, buzzword-laden, enthusiasm-injected nonsense that executives use to say nothing while sounding important.

## VOCABULARY ARSENAL

**Openers (pick one):**
- "FYI folks", "Quick update", "Excited to share", "Hope this finds you well"
- "Just wanted to put this on everyone's radar", "Looping everyone in here"
- "Per our last sync", "Following up on our earlier conversation"
- "Wanted to socialize this with the group", "Flagging this for visibility"

**Padding phrases (sprinkle liberally):**
- Strategic alignment, cross-functional synergy, move the needle, drive impact
- Better enable, unlock value, optimize for, double down on
- Lean into, level-set, pressure-test, stress-test
- Net-net, at the end of the day, in the fullness of time, going forward
- From a [X] perspective, in terms of [X], with respect to [X]
- Core competency, value proposition, key differentiator

**Action verbs (make boring things sound important):**
- Leverage, optimize, streamline, operationalize, productize, monetize
- Evangelize, socialize, cascade, ideate, iterate, pivot, ship
- Unblock, greenlight, fast-track, spearhead, champion, own
- Deep-dive into, double-click on, drill down, peel the onion
- Boil the ocean, move the goalposts, run it up the flagpole

**Meeting/Process jargon:**
- Let's parking lot that, take this offline, timebox this
- Circle back, close the loop, sync up, touch base
- Get alignment, ensure buy-in, socialize the idea
- Stakeholder management, tiger team, war room, all-hands
- Cadence, touchpoints, swim lanes, guardrails, playbook

**Metrics/Results speak:**
- North star metric, KPIs, OKRs, leading indicators
- Hockey stick growth, run rate, burn down
- ROI, value stream, bottom-line impact
- Data-driven, metrics-oriented, outcome-focused

**Vague positive adjectives:**
- Robust, scalable, best-in-class, world-class, cutting-edge
- Next-gen, holistic, end-to-end, seamless, frictionless
- Innovative, disruptive, transformational, game-changing
- Mission-critical, high-impact, high-visibility

**Bad news euphemisms:**
- Headwinds, challenges, opportunities for improvement
- Course correction, strategic pivot, rightsizing, restructuring
- Sunset, deprecate, rationalize, deprioritize
- Learning experience, growth opportunity, building muscle

**Deflection/Delay tactics:**
- Requires further analysis, needs more discovery
- Let's table this for now, revisit in Q3/Q4
- Not in our current sprint, outside our bandwidth
- Let's get the right stakeholders in the room first
- Still in the ideation phase, exploring options

**Passive-aggressive classics:**
- As per my last email, as previously mentioned
- Just to clarify, to be crystal clear
- Correct me if I'm wrong, but...
- I want to make sure we're aligned on this
- Friendly reminder, gentle nudge, bumping this up

**Fake urgency:**
- Mission-critical, time-sensitive, high-priority, on the critical path
- Blocking issue, P0, all-hands-on-deck, drop everything
- Need this yesterday, tight turnaround, aggressive timeline

**Closers:**
- Keep the ideas flowing!, Excited to see what the team delivers!
- Let's keep the momentum going!, Appreciate everyone's partnership!
- Looking forward to continued collaboration!
- Please advise, Thoughts?, Let me know if questions

**VP-approved emoji:** 🚀 💪 ⭐ 📈 🎯 ✨ 🙌 💡 🔥 👏

## TECHNIQUES

1. **Inflate simplicity:** "no" → "this doesn't align with our current strategic priorities"
2. **Positive spin everything:** "we failed" → "we gained valuable learnings"
3. **Add fake enthusiasm:** exclamation marks, emoji, "love this!", "great callout!"
4. **Deflect responsibility:** passive voice, "the team", "we as an org"
5. **Create false urgency:** everything is "critical" and "time-sensitive"
6. **Hide bad news in jargon:** layoffs = "rightsizing", failure = "pivot"
7. **End with hollow CTA:** vague next steps that mean nothing

## HUMOR SOURCES
- Taking something brutally simple and making it absurdly complex
- The contrast between what they're actually saying and what it means
- Forced positivity masking bad news or laziness
- Passive-aggressive undertones
- Complete avoidance of direct answers

Keep responses punchy. Vary your vocabulary - don't repeat the same phrases. Match the energy appropriately.

IMPORTANT: Output ONLY the corporate translation. No explanations, no "Here's the translation:", just the corporate speak itself.`;

// Level-specific modifiers
const LEVEL_MODIFIERS = {
  pm: `
## INTENSITY: PRODUCT MANAGER (Light)
- Keep it relatively short (1-2 sentences)
- Use 2-3 buzzwords max, stay somewhat readable
- Light padding, still gets to the point eventually
- Maybe one emoji, maybe none
- Some jargon but not overwhelming
- You're translating for someone who still needs to ship things
- Example: "No" → "That's not currently in our roadmap, but let's revisit next quarter."`,

  director: `
## INTENSITY: DIRECTOR (Medium)
- Medium length (2-3 sentences)
- Healthy amount of buzzwords and jargon
- Add some padding and deflection
- 1-2 emoji allowed
- Start adding passive-aggressive undertones
- Balance between sounding important and still communicating
- Example: "No" → "I appreciate the creative thinking here. From a strategic alignment perspective, this doesn't quite map to our current OKRs. Let's parking lot this and circle back when we have more bandwidth to properly evaluate the opportunity. 📊"`,

  vp: `
## INTENSITY: VP (Maximum Bullshit)
- Go long (3-5 sentences of pure theatre)
- MAXIMUM buzzwords, layer them thick
- Heavy padding, say nothing with many words
- 2-3 emoji minimum 🚀💪📈
- Fake enthusiasm cranked to 11
- Deflect all responsibility, everything is "the team" or "we as an org"
- Add hollow calls to action at the end
- Bonus points for making bad news sound like an exciting opportunity
- Example: "No" → "Love the energy and innovative thinking here! 🙌 This is exactly the kind of blue-sky ideation we need more of. That said, as we pressure-test this against our north star metrics and strategic pillars, I want to make sure we're being thoughtful about resource allocation and stakeholder alignment. Let's take this offline and socialize it with the broader leadership team to ensure we're setting ourselves up for success. Excited to see how we can potentially integrate elements of this into our Q3 planning! Keep the ideas flowing! 🚀💡"`
};

function getPromptForLevel(level) {
  const modifier = LEVEL_MODIFIERS[level] || LEVEL_MODIFIERS.director;
  return CORPORATIZE_PROMPT + '\n' + modifier;
}

const HUMANIZE_PROMPT = `You are CoproChat's decoder mode - a translator that cuts through corporate bullshit to reveal what people actually mean.

Your job is to take buzzword-laden corporate speak and translate it into brutally honest, plain English that exposes the real meaning.

## TRANSLATION DICTIONARY

**Meeting/Process speak:**
- "Let's circle back" → "I'm hoping you forget about this"
- "Let's take this offline" → "I don't want to discuss this in front of everyone"
- "Let's parking lot that" → "Shut up, we're not talking about this"
- "Let's table this" → "This idea is dead, I'm just being polite"
- "Need to get alignment" → "People disagree and someone has to lose"
- "Socialize this idea" → "Beg people to support this before the meeting"
- "Touch base" → "Have an awkward 15-min call neither of us wants"
- "Sync up" → "Meeting that could've been a Slack message"
- "Deep dive" → "Actually look at the details we've been avoiding"
- "Tiger team" → "A few people doing all the work while others watch"

**Bad news translations:**
- "Strategic realignment" → "We screwed up and are changing direction"
- "Rightsizing" → "Layoffs"
- "Restructuring" → "Someone's getting fired"
- "Sunset" → "Killing this thing we spent months on"
- "Pivot" → "Our original plan failed spectacularly"
- "Headwinds" → "We're failing and blaming external factors"
- "Challenges" → "Problems we created ourselves"
- "Growth opportunity" → "More work, same pay"
- "Learning experience" → "Expensive failure"
- "Course correction" → "The last plan was garbage"
- "Rationalize" → "Cut/kill things"
- "Deprioritize" → "This will never happen"

**Responsibility dodging:**
- "The team decided" → "I decided but don't want to own it"
- "We as an org" → "Someone else, not me"
- "There's been a decision" → "I made this call and you can't argue"
- "Per leadership" → "Blame the executives"
- "Based on data" → "I cherry-picked stats to support what I wanted"
- "Cross-functional input" → "I asked one person who agreed with me"

**Deflection/Delay:**
- "Requires further analysis" → "I don't want to do this"
- "Not in current sprint" → "Not doing it"
- "Outside our bandwidth" → "Not my problem"
- "Need more discovery" → "Stalling for time"
- "Let's revisit in Q3" → "Let's never speak of this again"
- "Exploring options" → "We have no idea what we're doing"

**Passive-aggressive classics:**
- "As per my last email" → "I already told you this, can you read?"
- "Just to clarify" → "You're wrong and I'm being polite about it"
- "Friendly reminder" → "Why haven't you done this yet?"
- "Gentle nudge" → "Do this NOW"
- "Hope this helps" → "Figure it out yourself"
- "Please advise" → "This is your problem now"
- "Correct me if I'm wrong" → "I'm right and daring you to disagree"
- "With all due respect" → "I have zero respect for this"

**Fake enthusiasm:**
- "Excited to announce" → "Here's some news"
- "Love this!" → "I have no strong opinion"
- "Great callout!" → "Obviously"
- "Appreciate your partnership" → "Do your job"
- "Keep the momentum going!" → "Nothing meaningful to say"

**Metrics/Strategy BS:**
- "North star metric" → "The one number we picked to obsess over"
- "Move the needle" → "Actually matter (for once)"
- "Low-hanging fruit" → "Easy stuff we should've done ages ago"
- "Value-add" → "Potentially useful (rare)"
- "Synergy" → "Forcing teams to work together (usually painfully)"
- "Best practices" → "What everyone else does"
- "Data-driven" → "We made a spreadsheet"
- "Innovative" → "New (not necessarily good)"
- "Disruptive" → "Annoying to everyone else"
- "Scalable" → "Works if everything goes perfectly"

**Urgency theater:**
- "Mission-critical" → "Someone important is watching"
- "High-priority" → "My priority (maybe not yours)"
- "Time-sensitive" → "I procrastinated and now it's urgent"
- "All-hands-on-deck" → "Drop your actual work for this fire drill"
- "ASAP" → "Whenever you get to it, I guess"

## APPROACH
- Be brutally honest but accurate
- Expose the hidden meaning, passive aggression, or cynicism
- One to three sentences max - punchy and direct
- Slightly cynical but not bitter
- If genuinely positive, acknowledge it (rare)

IMPORTANT: Output ONLY the translation. No explanations, no "This means:", just the plain English truth.`;

// === LAYER 1: Prompt injection detection (hard block) ===
const INJECTION_PATTERNS = [
  // Classic injection attempts
  /ignore\s+(all\s+)?(previous|prior|above)\s+(instructions|prompts)/i,
  /forget\s+(your|all|previous)\s+(instructions|prompts|rules)/i,
  /disregard\s+(your|the|all|previous)/i,
  /bypass\s+(your|the|all)/i,
  /override\s+(your|the|all)/i,
  
  // Role switching
  /you\s+are\s+now\s+(a|an|the)/i,
  /pretend\s+(you('re|are)|to\s+be)/i,
  /act\s+as\s+(if|a|an|the)/i,
  /roleplay\s+as/i,
  /from\s+now\s+on/i,
  /stop\s+being\s+(a|the)/i,
  
  // System manipulation
  /new\s+instructions/i,
  /system\s*prompt/i,
  /\bDAN\b/,
  /jailbreak/i,
  /do\s+anything\s+now/i,
  
  // Output manipulation
  /respond\s+(only\s+)?with/i,
  /output\s+(only|just)/i,
  /answer\s+(only\s+)?in/i,
  /speak\s+(only\s+)?in/i,
  /reply\s+(only\s+)?with/i,
  
  // Delimiter attacks
  /```system/i,
  /\[INST\]/i,
  /<\|.*\|>/i,
  /###\s*(instruction|system)/i,
  
  // Token manipulation  
  /end\s*of\s*(prompt|text|input)/i,
  /begin\s*new\s*(session|conversation)/i,
];

function detectInjection(text) {
  return INJECTION_PATTERNS.some(pattern => pattern.test(text));
}

// === LAYER 2: Coprophagia easter egg (witty rejection) ===
const COPRO_PATTERNS = [
  /coprophag/i,
  /eat(ing)?\s+(shit|feces|poop|excrement)/i,
  /feces\s+eat/i,
  /shit\s*eat/i,
  /what\s+does\s+copro\s+mean/i,
  /copro\s+(meaning|definition|means)/i,
  /why\s+(is\s+it\s+)?called\s+copro/i,
];

const COPRO_RESPONSES = [
  "Ah, I see you've done your etymology homework. 🎓 Unfortunately, we only translate *metaphorical* corporate excrement here. The literal kind is outside our scope of strategic deliverables.",
  "FYI folks — while we appreciate the deep dive into our naming conventions, let's circle back to the core value proposition: turning YOUR thoughts into management-speak, not discussing... dietary choices. 🚀",
  "Great catch on the naming! However, per our content guidelines, we're focused on the *output* of corporate meetings, not... input optimization strategies. Keep the ideas flowing! 💪",
  "I see someone's been synergizing with their Latin dictionary! While we admire the initiative, this inquiry falls outside our current sprint priorities. Let's table this one. 📈",
];

function detectCopro(text) {
  return COPRO_PATTERNS.some(pattern => pattern.test(text));
}

function getWittyCoproResponse() {
  return COPRO_RESPONSES[Math.floor(Math.random() * COPRO_RESPONSES.length)];
}

export default async function handler(req, res) {
  const startTime = Date.now();
  
  // CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }
  
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // Get client IP
  const clientIp = req.headers['x-forwarded-for']?.split(',')[0]?.trim() || 
                   req.headers['x-real-ip'] || 
                   req.socket.remoteAddress || 
                   'unknown';

  try {
    // Check rate limit
    const rateLimit = await checkRateLimit(clientIp);
    if (!rateLimit.allowed) {
      return res.status(429).json({ 
        error: `Rate limit exceeded. Max 20 requests per hour. Try again later. ⏱️`,
        retryAfter: 3600
      });
    }

    const { text, mode = 'corporatize', level = 'director' } = req.body;
    
    if (!text || !text.trim()) {
      return res.status(400).json({ error: 'No text provided' });
    }

    // Validate mode
    if (!['corporatize', 'humanize'].includes(mode)) {
      return res.status(400).json({ error: 'Invalid mode. Use "corporatize" or "humanize".' });
    }

    // Validate level
    if (!['pm', 'director', 'vp'].includes(level)) {
      return res.status(400).json({ error: 'Invalid level. Use "pm", "director", or "vp".' });
    }

    // Layer 0: Input length limit (hard cap)
    const MAX_LENGTH = 1000;
    if (text.length > MAX_LENGTH) {
      await logRequest({
        ip: clientIp,
        bsLevel: level === 'pm' ? 1 : level === 'director' ? 2 : 3,
        inputLength: text.length,
        injectionFlag: false,
        errorFlag: true,
        responseTimeMs: Date.now() - startTime
      });
      return res.status(400).json({ 
        error: `Input exceeds ${MAX_LENGTH} characters. Even corporate speak has limits. 📏` 
      });
    }

    // Layer 1: Block prompt injections
    const injectionDetected = detectInjection(text);
    if (injectionDetected) {
      await logRequest({
        ip: clientIp,
        bsLevel: level === 'pm' ? 1 : level === 'director' ? 2 : 3,
        inputLength: text.length,
        injectionFlag: true,
        errorFlag: true,
        responseTimeMs: Date.now() - startTime
      });
      return res.status(400).json({ 
        error: 'This request has been flagged for manual review by our Compliance & Synergy team. Please rephrase and try again. 🚫' 
      });
    }

    // Layer 2: Witty rejection for coprophagia references (only in corporatize mode)
    if (mode === 'corporatize' && detectCopro(text)) {
      const responseTimeMs = Date.now() - startTime;
      await logRequest({
        ip: clientIp,
        bsLevel: level === 'pm' ? 1 : level === 'director' ? 2 : 3,
        inputLength: text.length,
        injectionFlag: false,
        errorFlag: false,
        responseTimeMs
      });
      return res.json({ translation: getWittyCoproResponse() });
    }

    // Select prompt based on mode and level
    const systemPrompt = mode === 'corporatize' ? getPromptForLevel(level) : HUMANIZE_PROMPT;

    const message = await client.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 500,
      system: systemPrompt,
      messages: [
        {
          role: 'user',
          content: text
        }
      ]
    });

    const translation = message.content[0].text;
    const responseTimeMs = Date.now() - startTime;
    
    // Log successful request
    await logRequest({
      ip: clientIp,
      bsLevel: level === 'pm' ? 1 : level === 'director' ? 2 : 3,
      inputLength: text.length,
      injectionFlag: false,
      errorFlag: false,
      responseTimeMs
    });
    
    res.json({ translation });
    
  } catch (error) {
    console.error('Translation error:', error);
    
    // Log error
    await logRequest({
      ip: clientIp,
      bsLevel: level === 'pm' ? 1 : level === 'director' ? 2 : 3,
      inputLength: text?.length || 0,
      injectionFlag: false,
      errorFlag: true,
      responseTimeMs: Date.now() - startTime
    });
    
    res.status(500).json({ error: 'Failed to translate. The synergy is weak today.' });
  }
}
