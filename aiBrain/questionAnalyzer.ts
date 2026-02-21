
import { executeStructuredPrompt } from '../services/geminiService';
import { runNeuralTask, WorkerTask } from '../services/pdfService';
import { Question } from '../types';

/**
 * Normalizes a raw question object into the strict Question schema.
 */
export const normalizeToQuestionSchema = (q: any): Question => {
  const questionText = q.questionText || q.question || '';
  let normalizedOptions = [];
  if (Array.isArray(q.options)) {
    normalizedOptions = q.options.map(String);
  } else if (typeof q.options === 'object' && q.options !== null) {
    normalizedOptions = Object.values(q.options).map(String);
  }

  if (q.type === 'assertion_reason' && normalizedOptions.length === 0) {
    normalizedOptions = [
      "Both Assertion and Reason are true and Reason is the correct explanation",
      "Both Assertion and Reason are true but Reason is NOT the correct explanation",
      "Assertion is true but Reason is false",
      "Assertion is false but Reason is true"
    ];
  }

  const columnA = Array.isArray(q.columnA) ? q.columnA.map(String) : [];
  const columnB = Array.isArray(q.columnB) ? q.columnB.map(String) : [];
  let correctMatches = q.correctMatches || {};

  return {
    id: q.id || (typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).substring(7)),
    type: q.type || 'mcq',
    questionText,
    options: normalizedOptions,
    correctAnswer: q.correctAnswer || '',
    columnA,
    columnB,
    correctMatches,
    topic: q.topic || 'General Science',
    subtopic: q.subtopic || '',
    difficulty: q.difficulty || 'medium',
    pattern: q.pattern || (q.type === 'assertion_reason' ? 'logical' : 'conceptual'),
    explanation: q.explanation || 'Consult Neural Engine for breakdown.',
    hint: q.hint || 'No hint provided.'
  };
};

/**
 * Advanced Extraction Prompt.
 * Added directive to exclude Markdown from explanations and hints.
 */
export const processPDFExtraction = async (text: string, count?: number): Promise<Question[]> => {
  const countInstruction = count 
    ? `Extract exactly ${count} questions.` 
    : "PERFORM A DEEP-BRAIN EXHAUSTIVE SCAN. Extract EVERY single detected question.";

  const prompt = `ACT AS A NEURAL DATA ARCHITECT.
  Perform a MANDATORY COMPLETE ARCHIVE EXTRACTION.

  STRICT CONTENT RULES:
  1. SCIENTIFIC FIDELITY: Maintain formulas exactly.
  2. NO MARKDOWN: In the 'explanation' and 'hint' fields, DO NOT use any Markdown characters (no **, no ###, no *). Use clear, plain sentences.
  3. JSON FORMAT: Return ONLY a JSON array.

  JSON SCHEMA:
  { 
    id: uuid, 
    type: 'mcq' | 'match_the_column' | 'assertion_reason' | 'numeric', 
    questionText: string, 
    options: string[], 
    columnA: string[], 
    columnB: string[], 
    correctAnswer: string, 
    correctMatches: object,
    explanation: string (Plain text, no Markdown), 
    hint: string (Plain text, no Markdown), 
    topic: string, 
    difficulty: 'easy'|'medium'|'hard' 
  }

  ${countInstruction}

  SOURCE TEXT: ${text.slice(0, 25000)}`;

  const jsonResponse = await executeStructuredPrompt(prompt, 3000);
  
  try {
    const normalizedQuestions = await runNeuralTask(WorkerTask.NORMALIZE_QUESTIONS, jsonResponse);
    return normalizedQuestions;
  } catch (e) {
    console.error("Neural Worker Structural Parse Error:", e);
    return [];
  }
};
