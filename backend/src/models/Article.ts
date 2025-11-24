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

export interface CreateArticleInput {
  content?: string;
  url?: string;
  title?: string;
}

