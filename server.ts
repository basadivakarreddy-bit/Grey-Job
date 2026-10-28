import express from 'express';
import { createServer as createViteServer } from 'vite';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';
import crypto from 'crypto';
import { DatabaseSync } from 'node:sqlite';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Ensure data directory exists
const DATA_DIR = path.resolve(__dirname, 'data');
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

// Initialize SQLite Database with WAL mode
const dbPath = path.resolve(DATA_DIR, 'jobing.db');
const db = new DatabaseSync(dbPath);

// Enable WAL for concurrency and performance
db.exec('PRAGMA journal_mode = WAL;');
db.exec('PRAGMA foreign_keys = ON;');

// Create tables
db.exec(`
  CREATE TABLE IF NOT EXISTS documents (
    id TEXT PRIMARY KEY,
    slug TEXT UNIQUE NOT NULL,
    content TEXT NOT NULL,
    contentLength INTEGER NOT NULL,
    createdAt TEXT NOT NULL,
    updatedAt TEXT NOT NULL,
    copyCount INTEGER DEFAULT 0
  );
  CREATE INDEX IF NOT EXISTS idx_documents_slug ON documents (slug);
`);

// Prepared statements for maximum speed & safety against SQL injection
const stmtFindBySlug = db.prepare('SELECT * FROM documents WHERE slug = ?');
const stmtInsert = db.prepare(`
  INSERT INTO documents (id, slug, content, contentLength, createdAt, updatedAt, copyCount)
  VALUES (?, ?, ?, ?, ?, ?, 0)
`);
const stmtIncrementCopy = db.prepare('UPDATE documents SET copyCount = copyCount + 1 WHERE slug = ?');
const stmtCountAll = db.prepare('SELECT COUNT(*) as count FROM documents');

// Reserved slugs that cannot be claimed as document names
const RESERVED_SLUGS = new Set([
  'api', 'c', 'p', 'app', 'assets', 'static', 'admin', 'favicon.ico',
  'sw.js', 'service-worker.js', 'manifest.json', 'robots.txt', 'index.html',
  'test', 'tests', 'health', 'ping', 'privacy', 'terms', 'about'
]);

// Helper for validating slugs
function validateSlug(slug: string): { valid: boolean; error?: string; normalized?: string } {
  if (!slug || typeof slug !== 'string') {
    return { valid: false, error: 'Slug is required.' };
  }
  const normalized = slug.trim().toLowerCase();
  if (normalized.length < 2) {
    return { valid: false, error: 'Slug must be at least 2 characters long.' };
  }
  if (normalized.length > 64) {
    return { valid: false, error: 'Slug cannot exceed 64 characters.' };
  }
  if (!/^[a-z0-9_-]+$/.test(normalized)) {
    return { valid: false, error: 'Slug can only contain letters, numbers, hyphens, and underscores.' };
  }
  if (RESERVED_SLUGS.has(normalized)) {
    return { valid: false, error: `The custom URL "${normalized}" is reserved by the system.` };
  }
  return { valid: true, normalized };
}

// Cryptographically secure random slug generator
function generateRandomSlug(length = 7): string {
  const chars = 'abcdefghjkmnpqrstuvwxyz23456789'; // excluded easily confused chars (l, 1, o, 0, i)
  const bytes = crypto.randomBytes(length);
  let result = '';
  for (let i = 0; i < length; i++) {
    result += chars[bytes[i] % chars.length];
  }
  return result;
}

// Simple in-memory rate limiter for abuse prevention
const rateLimitMap = new Map<string, { count: number; resetTime: number }>();
function checkRateLimit(ip: string, limit = 40, windowMs = 60000): boolean {
  const now = Date.now();
  const record = rateLimitMap.get(ip);
  if (!record || now > record.resetTime) {
    rateLimitMap.set(ip, { count: 1, resetTime: now + windowMs });
    return true;
  }
  if (record.count >= limit) {
    return false;
  }
  record.count++;
  return true;
}

// Periodic cleanup of stale rate-limiting entries
setInterval(() => {
  const now = Date.now();
  for (const [ip, record] of rateLimitMap.entries()) {
    if (now > record.resetTime) {
      rateLimitMap.delete(ip);
    }
  }
}, 120000);

async function startServer() {
  const app = express();
  const PORT = Number(process.env.PORT) || 3000;

  // JSON parser with 10MB limit (documents capped at 100,000 characters)
  app.use(express.json({ limit: '10mb' }));

  // Request security headers
  app.use((req, res, next) => {
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-Frame-Options', 'SAMEORIGIN');
    next();
  });

  // API ROUTE: Health check & stats
  app.get('/api/health', (req, res) => {
    try {
      const stats = stmtCountAll.get() as { count: number };
      res.json({
        status: 'ok',
        timestamp: new Date().toISOString(),
        totalDocuments: stats?.count || 0,
      });
    } catch {
      res.json({ status: 'ok', timestamp: new Date().toISOString() });
    }
  });

  // API ROUTE: Check slug availability
  app.get('/api/documents/check/:slug', (req, res) => {
    const rawSlug = req.params.slug;
    const validation = validateSlug(rawSlug);
    if (!validation.valid) {
      return res.status(400).json({
        available: false,
        error: validation.error,
      });
    }
    const existing = stmtFindBySlug.get(validation.normalized!) as unknown;
    res.json({
      available: !existing,
      slug: validation.normalized,
    });
  });

  // API ROUTE: Create a document
  app.post('/api/documents', (req, res) => {
    const clientIp = (req.headers['x-forwarded-for'] as string) || req.socket.remoteAddress || 'unknown';
    if (!checkRateLimit(clientIp, 45, 60000)) {
      return res.status(429).json({
        success: false,
        error: 'Too many requests. Please wait a minute before creating more documents.',
      });
    }

    const { content, slug: customSlug } = req.body;

    // Validate content
    if (content === undefined || content === null || typeof content !== 'string') {
      return res.status(400).json({
        success: false,
        error: 'Content is required.',
      });
    }

    const trimmedContent = content; // preserve exact spaces/newlines
    if (trimmedContent.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'Document content cannot be empty.',
      });
    }

    // Enforce 100,000 character limit strictly
    const MAX_CHAR_LIMIT = 100000;
    if (trimmedContent.length > MAX_CHAR_LIMIT) {
      return res.status(400).json({
        success: false,
        error: `Content exceeds maximum limit of ${MAX_CHAR_LIMIT.toLocaleString()} characters (received ${trimmedContent.length.toLocaleString()}).`,
      });
    }

    // Determine slug
    let finalSlug: string;
    if (customSlug && typeof customSlug === 'string' && customSlug.trim() !== '') {
      const validation = validateSlug(customSlug);
      if (!validation.valid) {
        return res.status(400).json({
          success: false,
          error: validation.error,
        });
      }
      finalSlug = validation.normalized!;

      // Check collision
      const existing = stmtFindBySlug.get(finalSlug) as unknown;
      if (existing) {
        return res.status(409).json({
          success: false,
          error: `The URL "/c/${finalSlug}" is already in use. Please choose another custom slug.`,
        });
      }
    } else {
      // Generate a unique random slug
      let attempts = 0;
      let generated = generateRandomSlug(6);
      while (stmtFindBySlug.get(generated) && attempts < 10) {
        generated = generateRandomSlug(7);
        attempts++;
      }
      finalSlug = generated;
    }

    const now = new Date().toISOString();
    const id = crypto.randomUUID();

    try {
      stmtInsert.run(
        id,
        finalSlug,
        trimmedContent,
        trimmedContent.length,
        now,
        now
      );

      return res.status(201).json({
        success: true,
        document: {
          id,
          slug: finalSlug,
          contentLength: trimmedContent.length,
          createdAt: now,
          updatedAt: now,
        },
      });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Database error';
      if (message.includes('UNIQUE constraint failed')) {
        return res.status(409).json({
          success: false,
          error: `The slug "${finalSlug}" was just claimed. Please choose a different slug.`,
        });
      }
      console.error('Failed to insert document:', err);
      return res.status(500).json({
        success: false,
        error: 'Failed to save document. Please try again.',
      });
    }
  });

  // API ROUTE: Get document by slug
  app.get('/api/documents/:slug', (req, res) => {
    const rawSlug = req.params.slug;
    if (!rawSlug) {
      return res.status(400).json({ success: false, error: 'Slug parameter is required.' });
    }
    const normalized = rawSlug.trim().toLowerCase();

    try {
      const row = stmtFindBySlug.get(normalized) as {
        id: string;
        slug: string;
        content: string;
        contentLength: number;
        createdAt: string;
        updatedAt: string;
        copyCount: number;
      } | undefined;

      if (!row) {
        return res.status(404).json({
          success: false,
          error: `Document "/c/${normalized}" was not found. It may have expired or never existed.`,
        });
      }

      // Return document payload safely
      return res.json({
        success: true,
        document: {
          id: row.id,
          slug: row.slug,
          content: row.content,
          contentLength: row.contentLength,
          createdAt: row.createdAt,
          updatedAt: row.updatedAt,
          copyCount: row.copyCount || 0,
        },
      });
    } catch (err) {
      console.error('Error fetching document:', err);
      return res.status(500).json({
        success: false,
        error: 'Internal server error while retrieving document.',
      });
    }
  });

  // API ROUTE: Get raw document content (ideal for curl or scripts)
  app.get('/api/documents/:slug/raw', (req, res) => {
    const rawSlug = req.params.slug;
    if (!rawSlug) {
      return res.status(400).send('Slug parameter is required.');
    }
    const normalized = rawSlug.trim().toLowerCase();

    try {
      const row = stmtFindBySlug.get(normalized) as { content: string } | undefined;
      if (!row) {
        return res.status(404).send('Document not found');
      }
      res.setHeader('Content-Type', 'text/plain; charset=utf-8');
      return res.send(row.content);
    } catch {
      return res.status(500).send('Error retrieving document');
    }
  });

  // API ROUTE: Increment copy count for metrics
  app.post('/api/documents/:slug/copy', (req, res) => {
    const rawSlug = req.params.slug;
    const normalized = rawSlug?.trim().toLowerCase();
    if (!normalized) {
      return res.status(400).json({ success: false, error: 'Invalid slug' });
    }
    try {
      stmtIncrementCopy.run(normalized);
      res.json({ success: true });
    } catch {
      res.json({ success: false });
    }
  });

  function seedInitialDocuments() {
    const now = new Date().toISOString();
    stmtInsert.run(
      crypto.randomUUID(),
      'welcome',
      `Welcome to grey-job!

grey-job is a minimalist text sharing and offline clipboard utility.
Save text, configs, code snippets, or notes under custom URLs.

URLs supported:
- /c/welcome : View this public document
- /p/welcome : Minimal offline-style pixel dinosaur copy page (tap dino to copy without showing text!)

Try creating your own document at /c/ !`,
      293,
      now,
      now
    );
    stmtInsert.run(
      crypto.randomUUID(),
      'python-notes',
      `# Python Quick Reference Notes
def fibonacci(n: int) -> list[int]:
    """Generates Fibonacci numbers up to n terms."""
    if n <= 0:
        return []
    sequence = [0, 1]
    while len(sequence) < n:
        sequence.append(sequence[-1] + sequence[-2])
    return sequence[:n]

if __name__ == '__main__':
    print("Fibonacci sequence (10):", fibonacci(10))
`,
      314,
      now,
      now
    );
    console.log('Seeded initial documents: /c/welcome and /c/python-notes');
  }

  // API ROUTE: Reset database (requires password authentication)
  app.post('/api/admin/reset-database', (req, res) => {
    const { password } = req.body || {};
    const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'basa@934673';
    if (!password || password !== ADMIN_PASSWORD) {
      return res.status(401).json({
        success: false,
        error: 'Invalid password. Database reset authorization failed.',
      });
    }

    try {
      db.exec('DELETE FROM documents;');
      seedInitialDocuments();
      return res.json({
        success: true,
        message: 'Database has been cleanly reset and reseeded with default sample documents.',
      });
    } catch (err: unknown) {
      console.error('Failed to reset database:', err);
      return res.status(500).json({ success: false, error: 'Database reset error' });
    }
  });

  // Seed sample documents if database is completely empty
  const initialCount = stmtCountAll.get() as { count: number };
  if (initialCount && initialCount.count === 0) {
    seedInitialDocuments();
  }

  // Vite middleware in dev or static files in production
  if (process.env.NODE_ENV === 'production' && fs.existsSync(path.resolve(__dirname, 'dist'))) {
    app.use(express.static(path.resolve(__dirname, 'dist')));
    app.get('*', (req, res) => {
      res.sendFile(path.resolve(__dirname, 'dist', 'index.html'));
    });
  } else {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`grey-job Full-Stack Server listening on port ${PORT}`);
  });
}

startServer().catch((err) => {
  console.error('Fatal server startup error:', err);
  process.exit(1);
});
