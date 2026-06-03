import OpenAI from "openai";

const globalForOpenAI = globalThis as unknown as { openai: OpenAI | undefined };

export const openai =
  globalForOpenAI.openai ??
  new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
    organization: process.env.OPENAI_ORG_ID || undefined,
  });

if (process.env.NODE_ENV !== "production") globalForOpenAI.openai = openai;

export async function generateWithGPT4o(
  systemPrompt: string,
  userPrompt: string,
  options?: { temperature?: number; maxTokens?: number; jsonMode?: boolean }
): Promise<{ content: string; tokensUsed: number }> {
  const response = await openai.chat.completions.create({
    model: "gpt-4o",
    messages: [
      { role: "system", content: systemPrompt },
      { role: "user", content: userPrompt },
    ],
    temperature: options?.temperature ?? 0.7,
    max_tokens: options?.maxTokens ?? 4096,
    response_format: options?.jsonMode ? { type: "json_object" } : undefined,
  });

  return {
    content: response.choices[0].message.content ?? "",
    tokensUsed: response.usage?.total_tokens ?? 0,
  };
}

export async function generateTitles(topic: string, channelContext: string): Promise<{
  titles: Array<{
    title: string;
    curiosityScore: number;
    emotionScore: number;
    clarityScore: number;
    searchabilityScore: number;
    ctrPrediction: number;
    overallScore: number;
    reasoning: string;
  }>;
  tokensUsed: number;
}> {
  const systemPrompt = `You are an expert YouTube title strategist for the channel @flamingeos.
You analyze viral title patterns, CTR psychology, and SEO.
Your channel context: ${channelContext}
Always respond with valid JSON.`;

  const userPrompt = `Generate 20 YouTube title options for this topic: "${topic}"

For each title, provide scores (0-10) for:
- curiosityScore: How much curiosity/intrigue does it create?
- emotionScore: Emotional pull (fear, excitement, FOMO, etc.)
- clarityScore: Is the value proposition clear?
- searchabilityScore: Will people search for this?
- ctrPrediction: Predicted CTR score (0-10)
- overallScore: Weighted average

Return JSON: { "titles": [{ "title": string, "curiosityScore": number, "emotionScore": number, "clarityScore": number, "searchabilityScore": number, "ctrPrediction": number, "overallScore": number, "reasoning": string }] }`;

  const { content, tokensUsed } = await generateWithGPT4o(systemPrompt, userPrompt, {
    jsonMode: true,
    maxTokens: 3000,
  });

  const parsed = JSON.parse(content);
  return { titles: parsed.titles, tokensUsed };
}

export async function generateThumbnailConcepts(topic: string, title: string): Promise<{
  concepts: Array<{
    visualDescription: string;
    subjectPlacement: string;
    textPlacement: string;
    colorPsychology: string;
    emotionalTrigger: string;
    predictedCtr: number;
    dallePrompt: string;
    reasoning: string;
  }>;
  tokensUsed: number;
}> {
  const systemPrompt = `You are an expert YouTube thumbnail strategist for @flamingeos.
You understand visual psychology, click-through rates, and viral thumbnail patterns.
Always respond with valid JSON.`;

  const userPrompt = `Generate 5 thumbnail concepts for:
Title: "${title}"
Topic: "${topic}"

For each concept provide:
- visualDescription: Detailed visual description
- subjectPlacement: Where the main subject/person should be
- textPlacement: Where and how text should appear
- colorPsychology: Color choices and why
- emotionalTrigger: Primary emotion triggered
- predictedCtr: Predicted CTR score (0-10)
- dallePrompt: A DALL-E prompt to generate this thumbnail
- reasoning: Why this thumbnail will work

Return JSON: { "concepts": [...] }`;

  const { content, tokensUsed } = await generateWithGPT4o(systemPrompt, userPrompt, {
    jsonMode: true,
    maxTokens: 3000,
  });

  const parsed = JSON.parse(content);
  return { concepts: parsed.concepts, tokensUsed };
}
