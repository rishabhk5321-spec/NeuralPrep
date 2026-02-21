
import { AppState } from '../types';
import { calculateNeuralProfile, NeuralAnalysis } from './performanceAnalyzer';

export interface BrainAction {
  type: 'STABLE' | 'REMEDIAL' | 'SPEED_DRILL' | 'MISTAKE_RESET' | 'CALIBRATION';
  topic?: string;
  pattern?: string;
  reason: string;
  priority: 1 | 2 | 3; // 3 is highest
}

/**
 * Evaluates the Neural Profile and prescribes the most critical study action.
 */
export const getNeuralPrescription = (state: AppState): BrainAction => {
  const profile = calculateNeuralProfile(state);

  // 1. Minimum Data Check
  if (profile.totalAttempts < 10) {
    return {
      type: 'CALIBRATION',
      reason: "Gathering baseline neural patterns. Complete more PDF Syncs to activate AI Analysis.",
      priority: 1
    };
  }

  // 2. High Priority: Mistake Cluster
  const mistakeCounts = Object.values(state.memory.mistakeStats);
  const repeatedMistakes = mistakeCounts.filter(m => m.count >= 2);
  if (repeatedMistakes.length > 5) {
    return {
      type: 'MISTAKE_RESET',
      reason: "Multiple persistence errors detected. A Mistake Recovery session is mandatory to prevent pattern solidification.",
      priority: 3
    };
  }

  // 3. High Priority: Specific Topic Failure
  if (profile.weakestTopic && profile.topicMastery[profile.weakestTopic] < 40) {
    return {
      type: 'REMEDIAL',
      topic: profile.weakestTopic,
      reason: `Critical failure in ${profile.weakestTopic}. Adaptive remediation is required.`,
      priority: 3
    };
  }

  // 4. Medium Priority: Pattern Bottleneck (e.g., weak at Assertion-Reason)
  const weakPattern = Object.entries(profile.patternPerformance).find(([_, stats]) => stats.accuracy < 60);
  if (weakPattern) {
    return {
      type: 'REMEDIAL',
      pattern: weakPattern[0],
      reason: `Conceptual bottleneck identified in ${weakPattern[0]} logic questions.`,
      priority: 2
    };
  }

  // 5. Medium Priority: Speed
  if (profile.speedBottleneck) {
    return {
      type: 'SPEED_DRILL',
      reason: "High retrieval latency detected. Recommend a Timed Sprint to improve cognitive speed.",
      priority: 2
    };
  }

  return {
    type: 'STABLE',
    reason: "Neural pathways are stabilizing. Performance is within optimal parameters.",
    priority: 1
  };
};
