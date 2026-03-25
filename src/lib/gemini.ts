import { GoogleGenAI, ThinkingLevel, Modality, Type, GenerateContentResponse } from "@google/genai";
import { Message, ModelId, ChatMode } from "../types";

// Helper for exponential backoff retry
async function withRetry<T>(
  fn: () => Promise<T>,
  maxRetries: number = 7,
  initialDelay: number = 6000
): Promise<T> {
  let lastError: any;
  
  // Pre-emptive delay to respect free tier RPM limits
  await new Promise(resolve => setTimeout(resolve, 1500));

  for (let i = 0; i < maxRetries; i++) {
    try {
      return await fn();
    } catch (error: any) {
      lastError = error;
      const errorMsg = error?.message || String(error);
      const isQuotaError = 
        errorMsg.includes('429') || 
        errorMsg.includes('RESOURCE_EXHAUSTED') ||
        errorMsg.includes('Quota exceeded') ||
        error?.status === 429 ||
        error?.error?.code === 429;
      
      if (isQuotaError && i < maxRetries - 1) {
        // Jittered exponential backoff
        const delay = (initialDelay * Math.pow(2, i)) + (Math.random() * 2000);
        console.warn(`Gemini API Quota Exceeded. Retrying in ${Math.round(delay)}ms... (Attempt ${i + 1}/${maxRetries})`);
        await new Promise(resolve => setTimeout(resolve, delay));
        continue;
      }
      throw error;
    }
  }
  throw lastError;
}

export const MODELS: { id: ModelId; name: string; description: string }[] = [
  { id: 'gemini-3-flash-preview', name: 'Gemini 3 Flash', description: 'Fast & Reliable (Higher Quota)' },
  { id: 'gemini-3.1-flash-lite-preview', name: 'Gemini 3.1 Flash Lite', description: 'Fastest (Best for Free Tier)' },
  { id: 'gemini-3.1-pro-preview', name: 'Gemini 3.1 Pro', description: 'Complex reasoning (Very Limited Quota)' },
];

export const MODES: { id: ChatMode; name: string; description: string; systemInstruction: string }[] = [
  { 
    id: 'fast', 
    name: 'Fast Response', 
    description: 'Quick answers',
    systemInstruction: 'Provide extremely concise and direct answers. Skip pleasantries and get straight to the point.'
  },
  { 
    id: 'programmer_mini', 
    name: 'Programmer Mini', 
    description: 'Fast code generation',
    systemInstruction: 'You are an expert software engineer. Provide complete, functional code immediately. Minimize explanations. Use Markdown code blocks for all code.'
  },
  { 
    id: 'programmer_complex', 
    name: 'Programmer Complex', 
    description: 'Multi-step agentic coding',
    systemInstruction: 'You are an expert software engineer. You will use a multi-step process to generate, analyze, and fix code. Focus on best practices, efficiency, and modern syntax.'
  },
  { 
    id: 'creative', 
    name: 'Creative', 
    description: 'Creative writing & ideas',
    systemInstruction: 'You are a creative writer and brainstormer. Use vivid language, imaginative ideas, and explore unconventional perspectives.'
  },
  { 
    id: 'researcher', 
    name: 'Researcher', 
    description: 'Deep research & search',
    systemInstruction: 'You are a thorough researcher. Use search grounding to provide accurate, cited, and up-to-date information. Always verify facts before stating them.'
  },
  { 
    id: 'file_generator', 
    name: 'File Generator', 
    description: 'Generate & download files',
    systemInstruction: 'You are a file generation assistant. You can help users create various file types. \n\n1. For text-based files (JS, Python, HTML, etc.), provide the code in a markdown code block with the correct language tag.\n2. For Excel files, provide the data as a JSON object with "type": "excel", "filename": "name.xlsx", and "data": [[row1], [row2], ...].\n3. For PDF files, provide the content as a JSON object with "type": "pdf", "filename": "name.pdf", and "content": "The text content for the PDF".\n\nAlways encourage the user to specify the filename and content details.'
  },
];

export async function generateProgrammerResponse(
  apiKey: string,
  messages: Message[],
  mode: 'programmer_mini' | 'programmer_complex',
  onUpdate: (step: string, content: string, thinking?: string) => void,
  signal?: AbortSignal
) {
  if (signal?.aborted) throw new Error('Aborted');
  const ai = new GoogleGenAI({ apiKey });
  const now = new Date();
  const dateStr = now.toLocaleString('id-ID', { dateStyle: 'full', timeStyle: 'long' });
  const userPrompt = messages[messages.length - 1].content;

  if (mode === 'programmer_mini') {
    onUpdate('generating', 'Generating code...', 'Writing functional code based on requirements...');
    if (signal?.aborted) throw new Error('Aborted');
    const response = await withRetry(() => ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: messages.map(msg => ({
        role: msg.role === 'user' ? 'user' : 'model',
        parts: [{ text: msg.content }]
      })),
      config: {
        systemInstruction: `You are an expert software engineer. Provide complete, functional code. Waktu saat ini: ${dateStr}.`
      }
    }));
    return {
      text: response.text || "",
      thinking: String(response.candidates?.[0]?.content?.parts?.[0]?.thought || "Code generation completed.")
    };
  }

  // Step 1: Initial Generation (Complex Mode)
  onUpdate('generating', 'Generating initial code...', 'Analyzing requirements and writing the first draft of the code...');
  if (signal?.aborted) throw new Error('Aborted');
  const genResponse = await withRetry(() => ai.models.generateContent({
    model: 'gemini-3-flash-preview',
    contents: messages.map(msg => ({
      role: msg.role === 'user' ? 'user' : 'model',
      parts: [{ text: msg.content }]
    })),
    config: {
      systemInstruction: `You are an expert software engineer. Provide complete, functional code. Waktu saat ini: ${dateStr}.`
    }
  }));
  let currentCode = genResponse.text || "";
  let currentThinking = String(genResponse.candidates?.[0]?.content?.parts?.[0]?.thought || "Initial code generation completed.");
  onUpdate('draft', currentCode, currentThinking);

  // Iterative Correction Loop (Max 2 iterations to balance quality and speed)
  for (let i = 1; i <= 2; i++) {
    if (signal?.aborted) throw new Error('Aborted');
    // Add delay to avoid 429 on free tier (increased for stability)
    await new Promise(resolve => setTimeout(resolve, 6000));
    
    onUpdate('analyzing', `Analyzing code (Iteration ${i})...`, `Reviewing the code for potential bugs, syntax errors, and logical flaws...`);
    
    if (signal?.aborted) throw new Error('Aborted');
    const analysisResponse = await withRetry(() => ai.models.generateContent({
      model: 'gemini-3.1-flash-lite-preview',
      contents: `Analyze this code for any errors, bugs, or improvements. If there are issues, list them. If it's perfect, say "PERFECT".\n\nCode:\n${currentCode}`,
      config: {
        systemInstruction: "You are a senior code reviewer. Be extremely critical. Look for edge cases, security flaws, and performance issues."
      }
    }));
    
    const analysis = analysisResponse.text || "";
    if (analysis.includes("PERFECT") && !analysis.toLowerCase().includes("error") && !analysis.toLowerCase().includes("bug")) {
      onUpdate('finalizing', 'Code is verified and clean.', 'No major issues found during analysis.');
      break;
    }

    // Add delay to avoid 429 on free tier (increased for stability)
    await new Promise(resolve => setTimeout(resolve, 6000));

    if (signal?.aborted) throw new Error('Aborted');
    onUpdate('fixing', `Fixing issues (Iteration ${i})...`, `Applying fixes based on the analysis: ${analysis.slice(0, 100)}...`);
    
    const fixResponse = await withRetry(() => ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: `The following code has these issues: ${analysis}\n\nPlease provide the corrected, final version of the code.\n\nOriginal Code:\n${currentCode}`,
      config: {
        systemInstruction: "You are an expert debugger. Fix all reported issues and return only the complete, corrected code."
      }
    }));
    
    currentCode = fixResponse.text || "";
    currentThinking += `\n\n--- Iteration ${i} Fixes ---\n` + (fixResponse.text ? "Applied fixes for reported issues." : "");
    onUpdate('fixed', currentCode, currentThinking);
  }

  return {
    text: currentCode,
    thinking: currentThinking
  };
}

export async function generateAIResponse(
  apiKey: string,
  modelId: ModelId,
  messages: Message[],
  mode: ChatMode,
  onChunk?: (text: string, thinking?: string) => void,
  signal?: AbortSignal
) {
  if (signal?.aborted) throw new Error('Aborted');
  const ai = new GoogleGenAI({ apiKey });
  const currentMode = MODES.find(m => m.id === mode) || MODES[0];
  const now = new Date();
  const dateStr = now.toLocaleString('id-ID', { dateStyle: 'full', timeStyle: 'long' });
  
  const contents = messages.map(msg => ({
    role: msg.role === 'user' ? 'user' : 'model',
    parts: [{ text: msg.content }]
  }));

  const config: any = {
    systemInstruction: `${currentMode.systemInstruction}\n\nWaktu saat ini: ${dateStr}. Gunakan informasi ini untuk memberikan jawaban yang relevan secara temporal, terutama saat mencari berita atau informasi terkini.`,
  };

  if (modelId === 'gemini-3.1-pro-preview') {
    config.thinkingConfig = { thinkingLevel: ThinkingLevel.HIGH };
  }

  const searchKeywords = ['berita', 'news', 'hari ini', 'today', 'terkini', 'latest', 'sekarang', 'now', 'cuaca', 'weather', 'skor', 'score'];
  const needsSearch = searchKeywords.some(kw => messages[messages.length - 1].content.toLowerCase().includes(kw));

  if (mode === 'researcher' || modelId === 'gemini-3-flash-preview' || needsSearch) {
    config.tools = [{ googleSearch: {} }];
  }

  try {
    const stream = await withRetry(() => ai.models.generateContentStream({
      model: modelId,
      contents,
      config,
    }));

    let fullText = "";
    let fullThinking = "";
    let groundingMetadata: any = null;

    for await (const chunk of stream) {
      if (signal?.aborted) throw new Error('Aborted');
      const c = chunk as GenerateContentResponse;
      if (c.text) {
        fullText += c.text;
      }
      if (c.candidates?.[0]?.content?.parts?.[0]?.thought) {
        fullThinking += String(c.candidates[0].content.parts[0].thought);
      }
      if (c.candidates?.[0]?.groundingMetadata) {
        groundingMetadata = c.candidates[0].groundingMetadata;
      }
      onChunk?.(fullText, fullThinking);
    }

    return { text: fullText, thinking: fullThinking, groundingMetadata };
  } catch (error) {
    console.error("Gemini API Error:", error);
    throw error;
  }
}

/**
 * Multi-model discussion logic:
 * 1. Pro model analyzes and drafts.
 * 2. Flash model searches for facts.
 * 3. Lite model refines and summarizes.
 */
export async function generateCollaborativeResponse(
  apiKey: string,
  userPrompt: string,
  onUpdate: (step: string, content: string, thinking?: string) => void,
  signal?: AbortSignal
) {
  if (signal?.aborted) throw new Error('Aborted');
  const ai = new GoogleGenAI({ apiKey });
  const now = new Date();
  const dateStr = now.toLocaleString('id-ID', { dateStyle: 'full', timeStyle: 'long' });
  const timeInstruction = `\n\nWaktu saat ini: ${dateStr}. Gunakan informasi ini untuk memberikan jawaban yang relevan secara temporal.`;

  // Step 1: Flash Model (Architect) - Initial Thinking & Draft
  onUpdate('thinking', 'Flash model is analyzing the query...', 'Analyzing user intent and drafting initial response structure (Free Tier Optimized)...');
  if (signal?.aborted) throw new Error('Aborted');
  const proResponse = await withRetry(() => ai.models.generateContent({
    model: 'gemini-3-flash-preview',
    contents: userPrompt,
    config: {
      thinkingConfig: { thinkingLevel: ThinkingLevel.LOW },
      systemInstruction: "You are the lead architect in a multi-model discussion. Analyze the user query and provide a detailed draft and reasoning." + timeInstruction
    }
  }));
  const proDraft = proResponse.text || "";
  const proThinking = String(proResponse.candidates?.[0]?.content?.parts?.[0]?.thought || "");
  onUpdate('draft', proDraft, proThinking);

  // Add delay to avoid 429 on free tier (increased for stability)
  await new Promise(resolve => setTimeout(resolve, 6000));

  // Step 2: Flash Model - Fact Checking & Search
  onUpdate('searching', 'Flash model is verifying facts...', 'Searching for real-time data to ground the response...');
  if (signal?.aborted) throw new Error('Aborted');
  const flashResponse = await withRetry(() => ai.models.generateContent({
    model: 'gemini-3-flash-preview',
    contents: `Verify and enhance this draft with real-time data: ${proDraft}`,
    config: {
      tools: [{ googleSearch: {} }],
      systemInstruction: "You are a fact-checker. Use Google Search to verify claims in the draft and add missing real-time information." + timeInstruction
    }
  }));
  const flashEnhanced = flashResponse.text || "";
  onUpdate('enhanced', flashEnhanced);

  // Add delay to avoid 429 on free tier (increased for stability)
  await new Promise(resolve => setTimeout(resolve, 6000));

  // Step 3: Lite Model - Final Polish
  onUpdate('refining', 'Lite model is polishing the final answer...', 'Synthesizing all inputs into a perfect response...');
  if (signal?.aborted) throw new Error('Aborted');
  const liteResponse = await withRetry(() => ai.models.generateContent({
    model: 'gemini-3.1-flash-lite-preview',
    contents: `Synthesize this discussion into a perfect final answer for the user. 
    User Query: ${userPrompt}
    Pro Draft: ${proDraft}
    Flash Enhancement: ${flashEnhanced}`,
    config: {
      systemInstruction: "You are the final editor. Combine the deep reasoning of the Pro model and the factual grounding of the Flash model into a concise, perfect response." + timeInstruction
    }
  }));
  
  return {
    text: liteResponse.text || "",
    thinking: proThinking
  };
}
