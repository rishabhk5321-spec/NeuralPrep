
import { GoogleGenAI, GenerateContentParameters, GenerateContentResponse, Chat } from "@google/genai";
import { ChatMessage } from "../types";

/**
 * Always creates a new instance to ensure we use the most up-to-date key
 */
const getAiInstance = () => {
  const apiKey = process.env.API_KEY;
  if (!apiKey || apiKey === "undefined" || apiKey === "") {
    throw new Error("Neural Link Offline: API_KEY is missing. Use the 'Link Project' protocol.");
  }
  return new GoogleGenAI({ apiKey });
};

/**
 * Utility for exponential backoff retries.
 */
const withRetry = async <T>(fn: () => Promise<T>, retries = 2, delay = 1500): Promise<T> => {
  try {
    return await fn();
  } catch (error: any) {
    const status = error?.status;
    const isRetryable = status === 429 || status === 500 || status === 503;
    
    if (retries > 0 && isRetryable) {
      console.warn(`Neural Engine Throttled (Status: ${status}). Retrying...`);
      await new Promise(resolve => setTimeout(resolve, delay));
      return withRetry(fn, retries - 1, delay * 2);
    }
    
    let finalMessage = error?.message || "Unknown Neural Core Fault";
    const enhancedError = new Error(finalMessage);
    (enhancedError as any).rawError = error;
    (enhancedError as any).status = status;
    throw enhancedError;
  }
};

/**
 * Core execution method for sending prompts to Gemini.
 */
export const executePrompt = async (params: GenerateContentParameters): Promise<GenerateContentResponse> => {
  const ai = getAiInstance();
  return withRetry(async () => {
    return await ai.models.generateContent(params);
  });
};

/**
 * Standardized method for structured JSON outputs.
 */
export const executeStructuredPrompt = async (prompt: string, thinkingBudget = 0): Promise<string> => {
  const model = "gemini-3-flash-preview";
  const response = await executePrompt({
    model,
    contents: prompt,
    config: {
      thinkingConfig: thinkingBudget > 0 ? { thinkingBudget } : undefined,
      responseMimeType: "application/json"
    }
  });
  return response.text || '[]';
};

/**
 * Generates summaries from raw text.
 * STRICT: Plain text only, no Markdown.
 */
export const generateSummaryFromText = async (text: string): Promise<string> => {
  const response = await executePrompt({
    model: 'gemini-3-flash-preview',
    contents: `ACT AS A NEURALPREP COGNITIVE MASTER. 
    Create high-quality revision notes. Focus ONLY on exam-relevant facts and core concepts.
    
    FORMATTING RULES:
    1. DO NOT use any Markdown (no **, no ###, no _).
    2. DO NOT use special characters or symbols for headings.
    3. Use ALL CAPS for section titles.
    4. Use standard line breaks and simple numbering (1. 2. 3.) for lists.
    
    Text: ${text.slice(0, 20000)}`,
    config: {
      thinkingConfig: { thinkingBudget: 1000 }
    }
  });
  return response.text || "Summary generation failed.";
};

/**
 * Analyzes performance results.
 * STRICT: Plain text only, no Markdown.
 */
export const analyzePerformance = async (analysis: any): Promise<string> => {
  const response = await executePrompt({
    model: 'gemini-3-flash-preview',
    contents: `ACT AS A SENIOR NEURALPREP SCHOLASTIC COORDINATOR.
    Review this performance data and provide actionable study recommendations.
    DATA: ${JSON.stringify(analysis)}
    
    STRICT FORMAT RULES:
    1. USE PLAIN TEXT ONLY.
    2. NO MARKDOWN (Do not use ** for bold or ### for headers).
    3. NO BULLET SYMBOLS (Do not use * or -).
    4. USE ALL CAPS FOR TITLES.
    5. USE STANDARD NUMBERS (1, 2, 3) FOR LISTS.`
  });
  return response.text || "Performance analysis unavailable.";
};

/**
 * Chat interaction with a supportive study buddy.
 * STRICT: Plain text only, no Markdown.
 */
export const chatWithStudyBuddy = async (history: ChatMessage[], message: string): Promise<string> => {
  const ai = getAiInstance();
  
  // Convert our ChatMessage format to Gemini's Content format
  const contents = history.map(msg => ({
    role: msg.role === 'user' ? 'user' : 'model',
    parts: [{ text: msg.content }]
  }));

  const chat: Chat = ai.chats.create({
    model: 'gemini-3-flash-preview',
    config: {
      systemInstruction: `You are "NeuralPrep Assistant", a professional and highly precise scholastic tutor.
      
      CORE BEHAVIOR:
      1. DO NOT introduce yourself in every message. Only introduce yourself if it's the very first message of a session.
      2. Be extremely precise, clear, and concise. Avoid fluff or unnecessary conversational filler.
      3. When discussing a question or concept, provide a direct explanation first, then follow up with supporting details if necessary.
      4. If the user is asking about a specific quiz question, analyze their answer vs the correct answer and explain the underlying logic clearly.
      
      CRITICAL COMMUNICATION RULES:
      1. ALWAYS respond in clear, normal, plain text.
      2. NEVER use Markdown characters like asterisks (**), hashes (###), or underscores (_).
      3. For emphasis, use ALL CAPS instead of bolding.
      4. For structure, use simple line breaks and numbered lists (1, 2, 3).
      5. Maintain a professional yet encouraging tone without being repetitive.`,
    },
    history: contents
  });
  
  const response: GenerateContentResponse = await chat.sendMessage({ message });
  return response.text || "I'm having trouble thinking right now. Could you repeat that?";
};
