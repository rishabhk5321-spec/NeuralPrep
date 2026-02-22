
export enum ThemeId {
  DeepSpace = 'DeepSpace',
  CrimsonFlash = 'CrimsonFlash',
  EmeraldLight = 'EmeraldLight',
  NebulaGold = 'NebulaGold',
  CyberGrid = 'CyberGrid'
}

export interface ThemeConfig {
  id: ThemeId;
  name: string;
  bgGradient: string;
  accentColor: string;
  cardBg: string;
  textColor: string;
  borderColor: string;
  unlockLevel?: number;
}

export interface Badge {
  id: string;
  name: string;
  description: string;
  icon: string;
  unlockedAt: number;
}

export interface UserProfile {
  name: string;
  avatar: string;
  streak: number;
  accuracy: number;
  completedTests: number;
  avgScore: number;
  lastVisit: string;
  xp: number;
  level: number;
  badges: Badge[];
  unlockedThemes: ThemeId[];
}

export interface Question {
  id: string;
  type: 'mcq' | 'match_the_column' | 'diagram' | 'assertion_reason' | 'numeric';
  questionText: string;
  
  // MCQ and generic types
  options?: string[];
  correctAnswer?: string | string[];

  // Matching specific
  columnA?: string[];
  columnB?: string[];
  correctMatches?: Record<string, string>;

  // Metadata & Classification
  topic?: string;
  subtopic?: string;
  difficulty?: 'easy' | 'medium' | 'hard';
  pattern?: string;
  
  // Advanced features
  diagramUrl?: string;
  hint?: string;
  explanation?: string;
  metadata?: {
    source?: string;
    pageNumber?: number;
    tags?: string[];
  };
}

export interface Attempt {
  questionId: string;
  questionText: string;
  topic: string;
  subtopic?: string;
  selectedAnswer: any;
  correctAnswer: any;
  isCorrect: boolean;
  timestamp: number;
  timeTaken?: number;
  pattern?: string;
}

export interface TopicStat {
  totalAttempts: number;
  correctCount: number;
  lastPattern?: string;
  lastDifficulty?: string;
}

export interface MemoryData {
  attempts: Attempt[];
  mistakeStats: Record<string, { 
    count: number; 
    question: Question;
    topic: string;
  }>;
  topicStats: Record<string, TopicStat>;
}

export interface QuizHistoryEntry {
  score: number;
  timestamp: number;
  answers: Record<string, any>;
  timeTaken?: number;
}

export interface Quiz {
  id: string;
  title: string;
  questions: Question[];
  timestamp: number;
  duration: number; // in seconds
  score?: number;
  lastAnswers?: Record<string, any>;
  history?: QuizHistoryEntry[]; // List of previous attempts
  isMistakeMode?: boolean;
  isSmartMode?: boolean;
}

export interface Flashcard {
  id: string;
  front: string;
  back: string;
  mastered?: boolean;
}

export interface Summary {
  id: string;
  title: string;
  content: string;
  timestamp: number;
}

export interface AppState {
  user: UserProfile;
  theme: ThemeId;
  quizzes: Quiz[];
  flashcards: { id: string; title: string; cards: Flashcard[]; timestamp: number }[];
  summaries: Summary[];
  memory: MemoryData;
  devMode: boolean;
}

export interface ChatMessage {
  role: 'user' | 'model';
  content: string;
}
