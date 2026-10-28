export interface JobingDocument {
  id: string;
  slug: string;
  content: string;
  contentLength: number;
  createdAt: string;
  updatedAt: string;
  copyCount?: number;
  cachedAt?: string;
  isOfflineCache?: boolean;
}

export interface CachedDocument {
  slug: string;
  id?: string;
  content: string;
  contentLength: number;
  createdAt: string;
  updatedAt?: string;
  cachedAt: string;
}

export interface TestResult {
  id: string;
  title: string;
  description: string;
  status: 'pending' | 'running' | 'passed' | 'failed' | 'skipped';
  message?: string;
  durationMs?: number;
}
