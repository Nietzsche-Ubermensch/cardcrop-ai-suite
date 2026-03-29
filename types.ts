export enum ProcessingStatus {
  Pending = 'Pending',
  Processing = 'Processing',
  Completed = 'Completed',
  Failed = 'Failed'
}

export interface CardImage {
  id: string;
  file: File;
  previewUrl: string;
  processedUrl?: string;
  status: ProcessingStatus;
  originalWidth: number;
  originalHeight: number;
  analysis?: AnalysisResult;
}

export interface AnalysisResult {
  damageScore: number;
  issues: string[];
  recommendedFixes: string[];
  boundingBox?: number[]; // [ymin, xmin, ymax, xmax]
}

export enum RestorationLevel {
  Light = 'Light',
  Balanced = 'Balanced',
  Aggressive = 'Aggressive'
}

export interface ProcessingSettings {
  aspectRatio: number; // e.g., 2.5 / 3.5
  jpegQuality: number;
  enableUpscaling: boolean;
  enableDescratching: boolean;
  restorationLevel: RestorationLevel;
  upscalingScale: number;
  backgroundColor: string;
  autoCrop: boolean;
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'model';
  text: string;
  timestamp: Date;
}

export enum ImageSize {
  Size1K = '1K',
  Size2K = '2K',
  Size4K = '4K'
}

// Global augmentation for OpenAI configuration
declare global {
  interface Window {
    openaiConfig?: {
      apiKey?: string;
      organization?: string;
    };
  }
}