
import { AppState, Attempt, MemoryData } from '../types';

/**
 * Handles the recording of a user's attempt into the global memory matrix.
 */
export const recordAttempt = (state: AppState, attempt: Attempt): MemoryData => {
  const newAttempts = [...state.memory.attempts, attempt];
  const newMistakeStats = { ...state.memory.mistakeStats };
  const newTopicStats = { ...state.memory.topicStats || {} };

  const topicKey = attempt.topic || 'General';
  const existingTopic = newTopicStats[topicKey] || { totalAttempts: 0, correctCount: 0 };
  
  newTopicStats[topicKey] = {
    totalAttempts: existingTopic.totalAttempts + 1,
    correctCount: existingTopic.correctCount + (attempt.isCorrect ? 1 : 0),
    lastPattern: attempt.pattern || 'conceptual',
    lastDifficulty: attempt.isCorrect ? existingTopic.lastDifficulty : 'medium'
  };

  if (!attempt.isCorrect) {
    // Find the original question object to store in mistake vault
    const sourceQuiz = state.quizzes.find(q => q.questions.some(que => que.id === attempt.questionId));
    const questionObj = sourceQuiz?.questions.find(que => que.id === attempt.questionId);
    
    if (questionObj) {
      const existing = newMistakeStats[attempt.questionId];
      newMistakeStats[attempt.questionId] = {
        count: (existing?.count || 0) + 1,
        question: questionObj,
        topic: attempt.topic || 'General'
      };
    }
  }

  return {
    attempts: newAttempts,
    mistakeStats: newMistakeStats,
    topicStats: newTopicStats
  };
};
