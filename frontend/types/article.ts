export interface Article {
  id?: number;
  title?: string;
  content: string;
  url?: string;
  source?: string;
  type?: 'sports' | 'politics' | null;
  summary?: string;
  timeline?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface ArticleAnalysis {
  type: 'sports' | 'politics' | 'general';
  sportsSummary?: {
    theme: string;
    background: string;
    keyEvents: string[];
    terminology: { term: string; explanation: string }[];
    sportType: string;
  };
  politicsTimeline?: {
    timeline: Array<{ date?: string; event: string; description: string }>;
    keyFigures: string[];
    locations: string[];
    summary: string;
  };
  generalSummary?: string;
  articleId: number;
}

