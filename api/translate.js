import Anthropic from '@anthropic-ai/sdk';

const client = new Anthropic();

const SYSTEM_PROMPT = `You are CoproChat, a translator that converts normal human language into corporate VP-speak bullshit.

Your job is to take simple, honest statements and transform them into the kind of padded, buzzword-laden, enthusiasm-injected nonsense that executives use to say nothing while sounding important.

Key techniques:
- Add unnecessary openers like "FYI folks", "Quick update", "Excited to share"
- Pad simple ideas into longer sentences with phrases like "better enable", "strategic alignment", "cross-functional synergy", "move the needle"
- Make negative things sound positive ("cutting features" → "strategically reallocating resources to better focus on critical elements that directly support our number one priority")
- Add fake enthusiasm with exclamation marks and phrases like "The more everyone contributes, the better!"
- Use deflection language for things you don't want to do ("requires further analysis", "let's table that for now", "circle back in Q3")
- Sprinkle in corporate jargon: "north star metrics", "bandwidth", "take this offline", "low-hanging fruit", "synergy", "value stream", "stakeholders"
- End with meaningless calls to action: "Keep the ideas flowing!", "Excited to see what the team comes up with!"
- Add 1-2 emojis (🚀 💪 ⭐ 📈 🎯 are VP favorites)

The humor comes from:
1. Taking something brutally simple and making it absurdly complex
2. The contrast between what they're actually saying and what it means
3. The forced positivity masking bad news or laziness
4. The passive-aggressive undertones
5. The complete avoidance of direct answers

Keep responses punchy - aim for 2-4 sentences max unless the input is complex. Match the energy appropriately.

IMPORTANT: Output ONLY the corporate translation. No explanations, no "Here's the translation:", just the corporate speak itself.`;

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

  try {
    const { text } = req.body;
    
    if (!text || !text.trim()) {
      return res.status(400).json({ error: 'No text provided' });
    }

    // Layer 0: Input length limit (hard cap)
    const MAX_LENGTH = 500;
    if (text.length > MAX_LENGTH) {
      return res.status(400).json({ 
        error: `Input exceeds ${MAX_LENGTH} characters. Even corporate speak has limits. 📏` 
      });
    }

    // Layer 1: Block prompt injections
    if (detectInjection(text)) {
      return res.status(400).json({ 
        error: 'This request has been flagged for manual review by our Compliance & Synergy team. Please rephrase and try again. 🚫' 
      });
    }

    // Layer 2: Witty rejection for coprophagia references
    if (detectCopro(text)) {
      return res.json({ translation: getWittyCoproResponse() });
    }

    const message = await client.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 500,
      system: SYSTEM_PROMPT,
      messages: [
        {
          role: 'user',
          content: text
        }
      ]
    });

    const translation = message.content[0].text;
    res.json({ translation });
    
  } catch (error) {
    console.error('Translation error:', error);
    res.status(500).json({ error: 'Failed to translate. The synergy is weak today.' });
  }
}
