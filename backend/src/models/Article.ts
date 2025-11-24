export type ArticleType = 'sports' | 'politics' | 'technology' | 'business' | 'science' | 'entertainment' | 'general' | null;

export interface Article {
  id?: number;
  title?: string;
  content: string;
  url?: string;
  source?: string;
  type?: ArticleType;
  summary?: string;
  timeline?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface CreateArticleInput {
  content?: string;
  url?: string;
  title?: string;
}

