export interface Analysis {
  id?: number;
  articleId: number;
  type: 'summary' | 'timeline' | 'translation' | 'explanation';
  content: string;
  createdAt?: string;
}

