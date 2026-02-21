
import { AppState } from '../types';
import { executePrompt } from '../services/geminiService';

export interface NeuralAnalysis {
  accuracy: number;
  totalAttempts: number;
  speedBottleneck: boolean;
  topicMastery: Record<string, number>;
  patternPerformance: Record<string, { accuracy: number; count: number }>;
  weakestTopic: string | null;
  remedialNeeded: boolean;
  overview: {
    accuracy: number;
    total: number;
  };
  weakTopics: Array<{
    topic: string;
    accuracy: number;
    avgTime: number;
    weaknessScore: number;
  }>;
  patterns: Array<{
    name: string;
    errorRate: number;
  }>;
  speed: {
    avgSeconds: number;
  };
}

/**
 * Generates a comprehensive neural profile of the user.
 */
export const calculateNeuralProfile = (state: AppState): NeuralAnalysis => {
  const attempts = state.memory.attempts;
  const topicStats = state.memory.topicStats || {};
  
  if (attempts.length === 0) {
    return {
      accuracy: 0,
      totalAttempts: 0,
      speedBottleneck: false,
      topicMastery: {},
      patternPerformance: {},
      weakestTopic: null,
      remedialNeeded: false,
      overview: { accuracy: 0, total: 0 },
      weakTopics: [],
      patterns: [],
      speed: { avgSeconds: 0 }
    };
  }

  const patterns: Record<string, { correct: number; total: number }> = {};
  const topicTimes: Record<string, { totalTime: number; count: number }> = {};
  let totalTime = 0;

  attempts.forEach(a => {
    const p = a.pattern || 'general';
    if (!patterns[p]) patterns[p] = { correct: 0, total: 0 };
    patterns[p].total++;
    if (a.isCorrect) patterns[p].correct++;

    const t = a.topic || 'General';
    if (!topicTimes[t]) topicTimes[t] = { totalTime: 0, count: 0 };
    topicTimes[t].totalTime += (a.timeTaken || 0);
    topicTimes[t].count++;

    totalTime += (a.timeTaken || 0);
  });

  const avgTimeSeconds = (totalTime / attempts.length) / 1000;
  const overallAccuracy = (attempts.filter(a => a.isCorrect).length / attempts.length) * 100;

  const topicMastery: Record<string, number> = {};
  Object.entries(topicStats).forEach(([topic, stats]) => {
    topicMastery[topic] = Math.round((stats.correctCount / stats.totalAttempts) * 100);
  });

  const weakTopics = Object.entries(topicStats).map(([topic, stats]) => {
    const acc = Math.round((stats.correctCount / stats.totalAttempts) * 100);
    const timeData = topicTimes[topic];
    const avgTime = timeData ? Math.round((timeData.totalTime / timeData.count) / 1000) : 0;
    return {
      topic,
      accuracy: acc,
      avgTime,
      weaknessScore: (100 - acc) / 100
    };
  }).sort((a, b) => b.weaknessScore - a.weaknessScore);

  const patternPerformanceList = Object.entries(patterns).map(([name, stats]) => ({
    name,
    errorRate: 100 - Math.round((stats.correct / stats.total) * 100)
  }));

  const weakestTopic = weakTopics[0]?.topic || null;

  return {
    accuracy: Math.round(overallAccuracy),
    totalAttempts: attempts.length,
    speedBottleneck: avgTimeSeconds > 50,
    topicMastery,
    patternPerformance: Object.fromEntries(
      Object.entries(patterns).map(([k, v]) => [k, { accuracy: Math.round((v.correct / v.total) * 100), count: v.total }])
    ),
    weakestTopic,
    remedialNeeded: overallAccuracy < 70 || (weakTopics[0]?.accuracy || 100) < 50,
    overview: {
      accuracy: Math.round(overallAccuracy),
      total: attempts.length
    },
    weakTopics,
    patterns: patternPerformanceList,
    speed: {
      avgSeconds: Math.round(avgTimeSeconds)
    }
  };
};

/**
 * Generates AI-driven text insights based on performance metrics.
 * STRICT: No Markdown.
 */
export const generateExecutiveInsights = async (state: AppState): Promise<string> => {
  const profile = calculateNeuralProfile(state);
  const response = await executePrompt({
    model: 'gemini-3-flash-preview',
    contents: `Analyze the following performance metrics and provide actionable study recommendations.
    
    METRICS:
    - Overall Accuracy: ${profile.accuracy}%
    - Total Attempts: ${profile.totalAttempts}
    - Major Weak Topic: ${profile.weakestTopic || 'None identified'}
    - Average Speed: ${profile.speed.avgSeconds}s
    
    STRICT RULES:
    1. Response MUST be clear, normal text.
    2. DO NOT use Markdown symbols (*, #, **, _).
    3. Use simple headers in ALL CAPS.
    4. Use numbers for lists.`
  });
  return response.text || "Focus on high-error topics identified in your diagnostic log.";
};
