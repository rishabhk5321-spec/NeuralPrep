
import { AppState, Attempt, Question } from '../types';
import { recordAttempt } from '../aiBrain/memoryEngine';
import { calculateNeuralProfile } from '../aiBrain/performanceAnalyzer';
import { getNeuralPrescription } from '../aiBrain/decisionEngine';

export const submitAttempt = (state: AppState, attempt: Attempt) => {
  return recordAttempt(state, attempt);
};

export const getFullPerformanceAnalysis = (state: AppState) => {
  return calculateNeuralProfile(state);
};

export const getBrainRecommendation = (state: AppState) => {
  return getNeuralPrescription(state);
};

export const getSmartTarget = (state: AppState) => {
  const profile = calculateNeuralProfile(state);
  if (!profile.weakestTopic) return null;
  
  return {
    topic: profile.weakestTopic,
    stats: state.memory.topicStats[profile.weakestTopic]
  };
};

export const getPracticeMistakes = (state: AppState): Question[] => {
  return Object.values(state.memory.mistakeStats)
    .sort((a, b) => b.count - a.count)
    .map(stat => stat.question);
};
