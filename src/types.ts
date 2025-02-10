export interface Student {
  name: string;
  email: string;
  githubUsername: string;
}

export interface MCQQuestion {
  id: number;
  question: string;
  options: string[];
  correctAnswer: number;
}

export interface SAQQuestion {
  id: number;
  question: string;
}

export interface ExamState {
  mcqAnswers: Record<number, number>;
  saqAnswers: Record<number, string>;
}

export type ExamStage = 'signin' | 'rules' | 'exam' | 'success';