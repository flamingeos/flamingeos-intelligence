import Anthropic from "@anthropic-ai/sdk";

const globalForAnthropic = globalThis as unknown as {
  anthropic: Anthropic | undefined;
};

export const anthropic =
  globalForAnthropic.anthropic ??
  new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

if (process.env.NODE_ENV !== "production")
  globalForAnthropic.anthropic = anthropic;

export async function generateWithClaude(
  systemPrompt: string,
  userPrompt: string,
  options?: { maxTokens?: number; model?: string }
): Promise<{ content: string; tokensUsed: number }> {
  const response = await anthropic.messages.create({
    model: options?.model ?? "claude-opus-4-8",
    max_tokens: options?.maxTokens ?? 8192,
    system: systemPrompt,
    messages: [{ role: "user", content: userPrompt }],
  });

  const content =
    response.content[0].type === "text" ? response.content[0].text : "";

  return {
    content,
    tokensUsed: response.usage.input_tokens + response.usage.output_tokens,
  };
}

export async function generateScript(
  topic: string,
  scriptType: string,
  channelContext: string,
  targetDurationMinutes = 10
): Promise<{
  hook: string;
  intro: string;
  body: string;
  fullScript: string;
  openLoops: string[];
  retentionPoints: string[];
  ctaPlacements: { position: string; cta: string }[];
  outro: string;
  estimatedDuration: number;
  wordCount: number;
  tokensUsed: number;
}> {
  const systemPrompt = `You are an elite YouTube scriptwriter for @flamingeos.
Channel context: ${channelContext}

You write scripts that maximize:
- Hook strength (viewer retention in first 30 seconds)
- Open loops (psychological commitment devices)
- Pattern interrupts (every 60-90 seconds)
- Clear value delivery
- Strong CTAs

Script type: ${scriptType}
Target duration: ${targetDurationMinutes} minutes (~${targetDurationMinutes * 150} words)`;

  const userPrompt = `Write a complete YouTube script for: "${topic}"

Structure the response as valid JSON with:
{
  "hook": "The opening 30-second hook",
  "intro": "The 1-2 minute intro",
  "body": "Main content sections",
  "fullScript": "Complete script with all sections",
  "openLoops": ["List of open loops used"],
  "retentionPoints": ["Key retention moments"],
  "ctaPlacements": [{"position": "timestamp/location", "cta": "the CTA text"}],
  "outro": "The closing outro",
  "estimatedDuration": seconds,
  "wordCount": number
}`;

  const { content, tokensUsed } = await generateWithClaude(
    systemPrompt,
    userPrompt,
    { maxTokens: 8192 }
  );

  try {
    // Extract JSON from potential markdown code blocks
    const jsonMatch = content.match(/```json\n?([\s\S]*?)\n?```/) ||
      content.match(/\{[\s\S]*\}/);
    const jsonStr = jsonMatch ? jsonMatch[1] || jsonMatch[0] : content;
    const parsed = JSON.parse(jsonStr);
    return { ...parsed, tokensUsed };
  } catch {
    return {
      hook: "",
      intro: "",
      body: content,
      fullScript: content,
      openLoops: [],
      retentionPoints: [],
      ctaPlacements: [],
      outro: "",
      estimatedDuration: targetDurationMinutes * 60,
      wordCount: content.split(" ").length,
      tokensUsed,
    };
  }
}

export async function generateTrendResearch(
  topic: string,
  channelContext: string
): Promise<{
  researchReport: string;
  topicBreakdown: Record<string, string>;
  historicalContext: string;
  audienceInterest: Record<string, number>;
  relatedTopics: string[];
  viralAngles: string[];
  contrarianAngles: string[];
  velocityScore: number;
  competitionScore: number;
  opportunityScore: number;
  relevanceScore: number;
  overallScore: number;
  tokensUsed: number;
}> {
  const systemPrompt = `You are a YouTube growth strategist and trend analyst for @flamingeos.
Channel context: ${channelContext}
Analyze topics with depth, nuance, and actionable intelligence.
Always respond with valid JSON.`;

  const userPrompt = `Perform deep research analysis on this topic for YouTube: "${topic}"

Return JSON with:
{
  "researchReport": "800-word comprehensive research report",
  "topicBreakdown": {"subtopic1": "explanation", ...},
  "historicalContext": "Historical context and why this matters now",
  "audienceInterest": {"segment1": score0to100, ...},
  "relatedTopics": ["related topic 1", ...],
  "viralAngles": ["angle that could go viral", ...],
  "contrarianAngles": ["contrarian take", ...],
  "velocityScore": 0-10,
  "competitionScore": 0-10 (10=most competitive),
  "opportunityScore": 0-10,
  "relevanceScore": 0-10,
  "overallScore": 0-10
}`;

  const { content, tokensUsed } = await generateWithClaude(
    systemPrompt,
    userPrompt,
    { maxTokens: 4096 }
  );

  try {
    const jsonMatch = content.match(/```json\n?([\s\S]*?)\n?```/) ||
      content.match(/\{[\s\S]*\}/s);
    const jsonStr = jsonMatch ? (jsonMatch[1] || jsonMatch[0]) : content;
    const parsed = JSON.parse(jsonStr);
    return { ...parsed, tokensUsed };
  } catch {
    return {
      researchReport: content,
      topicBreakdown: {},
      historicalContext: "",
      audienceInterest: {},
      relatedTopics: [],
      viralAngles: [],
      contrarianAngles: [],
      velocityScore: 5,
      competitionScore: 5,
      opportunityScore: 5,
      relevanceScore: 5,
      overallScore: 5,
      tokensUsed,
    };
  }
}

export async function analyzeCompetitorVideo(
  videoTitle: string,
  videoDescription: string,
  viewCount: bigint,
  channelContext: string
): Promise<{
  summary: string;
  whyItPerforms: string;
  opportunityForUs: string;
  titleVariations: string[];
  confidenceScore: number;
  tokensUsed: number;
}> {
  const systemPrompt = `You are a competitive intelligence analyst for @flamingeos.
Channel context: ${channelContext}
Analyze competitor videos and identify opportunities.
Always respond with valid JSON.`;

  const userPrompt = `Analyze this competitor video and identify opportunities for @flamingeos:

Title: "${videoTitle}"
Description: "${videoDescription?.slice(0, 500)}"
Views: ${viewCount.toString()}

Return JSON:
{
  "summary": "2-3 sentence summary of what makes this video work",
  "whyItPerforms": "Detailed explanation of why this video is performing well",
  "opportunityForUs": "Specific opportunity for @flamingeos to create similar/better content",
  "titleVariations": ["5 title variations we could use"],
  "confidenceScore": 0-10
}`;

  const { content, tokensUsed } = await generateWithClaude(
    systemPrompt,
    userPrompt,
    { maxTokens: 1500, model: "claude-sonnet-4-6" }
  );

  try {
    const jsonMatch = content.match(/```json\n?([\s\S]*?)\n?```/) ||
      content.match(/\{[\s\S]*\}/s);
    const jsonStr = jsonMatch ? (jsonMatch[1] || jsonMatch[0]) : content;
    const parsed = JSON.parse(jsonStr);
    return { ...parsed, tokensUsed };
  } catch {
    return {
      summary: content,
      whyItPerforms: "",
      opportunityForUs: "",
      titleVariations: [],
      confidenceScore: 5,
      tokensUsed,
    };
  }
}
