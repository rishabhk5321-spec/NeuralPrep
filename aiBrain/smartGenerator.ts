
import { executeStructuredPrompt } from '../services/geminiService';
import { normalizeToQuestionSchema } from './questionAnalyzer';
import { getNeuralPrescription } from './decisionEngine';
import { AppState, Question, Flashcard } from '../types';

/**
 * Dynamically synthesizes a remedial quiz based on the Brain's current prescription.
 * STRICT: No Markdown in text fields.
 */
export const generateAdaptiveSession = async (state: AppState): Promise<Question[]> => {
  const action = getNeuralPrescription(state);
  
  let focusInstruction = "";
  if (action.type === 'REMEDIAL' && action.topic) {
    focusInstruction = `Focus deeply on Topic: "${action.topic}".`;
  } else if (action.type === 'MISTAKE_RESET') {
    focusInstruction = `Review core fundamentals of recent errors.`;
  } else if (action.pattern) {
    focusInstruction = `Exclusively use '${action.pattern}' style questions.`;
  }

  const prompt = `ACT AS SENIOR PROFESSOR.
  Generate 10 Questions for a Remedial Session.
  FOCUS: ${focusInstruction || "General Revision"}
  
  STRICT TEXT RULES:
  - DO NOT use Markdown characters (**, ###, *, _) in any field.
  - Return JSON array in CENTRAL QUESTION SCHEMA.
  - Explanation must be clear, normal text sentences only.`;

  const json = await executeStructuredPrompt(prompt, 2000);
  try {
    const data = JSON.parse(json);
    return Array.isArray(data) ? data.map(normalizeToQuestionSchema) : [];
  } catch (e) {
    console.error("Adaptive Gen Error:", e);
    return [];
  }
};

/**
 * Synthesizes flashcards for memory reinforcement.
 * STRICT: No Markdown in cards.
 */
export const createRevisionFlashcards = async (text: string): Promise<Flashcard[]> => {
  const prompt = `ACT AS NEURAL MEMORY ARCHITECT. Transform the text into 10 high-impact flashcards.
  
  STRICT RULES:
  - Response MUST be a JSON array.
  - Card text MUST be clear plain text.
  - DO NOT use Markdown special characters (**, #, etc).
  
  SOURCE TEXT: ${text.slice(0, 15000)}`;

  const json = await executeStructuredPrompt(prompt, 1500);
  try {
    const data = JSON.parse(json);
    return Array.isArray(data) ? data.map((d: any) => ({
      id: crypto.randomUUID(),
      front: d.front || 'Concept',
      back: d.back || 'Definition',
      mastered: false
    })) : [];
  } catch (e) {
    console.error("Flashcard Gen Error:", e);
    return [];
  }
};
