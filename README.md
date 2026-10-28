# Jobing — Instant Text Sharing & Offline Clipboard

Jobing is a minimalist developer utility for sharing text, code snippets, configuration files, and notes via custom URLs, with an offline-style dinosaur clipboard route and genuine IndexedDB + Service Worker offline capabilities.

Inspired by [Jobing.site](https://jobing.site/c/).

---

## 🚀 Key Features

1. **Minimalist Text Editor (`/c/`)**
   - High-contrast, distraction-free writing environment.
   - Live character counter, word counter, and line counter.
   - Supports up to 100,000 characters per document.
   - Monospace (code) vs. Sans font toggle.
   - Custom slug support (`/c/my-notes`) or cryptographically secure random slug generator.
   - Instant 1-click clipboard copy of content or share URLs.
   - Unsaved changes alert before accidental tab close.

2. **Public Document Viewer (`/c/[slug]`)**
   - Direct permalink to saved documents.
   - Preformatted, line-break preserving, and Unicode/emoji-friendly text rendering.
   - Strict XSS protection (rendered as raw text, never executed as HTML).
   - Instant actions: Copy Content, Copy Public Link, Dinosaur Link, Fork as New Document, Download as `.txt`.

3. **Distinctive Dinosaur Copy Route (`/p/[slug]`)**
   - An intentionally minimal offline-style screen.
   - Clean, light or dark neutral background (strictly zero purple gradients).
   - An original retro pixel-art dinosaur in the center.
   - **Zero document text rendered on the screen**: content is loaded into memory only.
   - Clicking, tapping, or pressing <kbd>Space</kbd> / <kbd>Enter</kbd> activates the dinosaur:
     - 8-bit retro sound synthesized via Web Audio API.
     - Pixel bounce animation.
     - Copies exact stored content to the clipboard.

4. **Genuine Offline Functionality**
   - **IndexedDB**: Every document created or viewed online is automatically cached locally into IndexedDB (`jobing_offline_db`).
   - **Service Worker (`/sw.js`)**: Caches application shell and handles offline page routing.
   - **Offline Dinosaur Copying**: Open `/p/[slug]` while disconnected; if previously cached, it loads locally and copies to your clipboard.
   - **Offline Cache Drawer**: Inspect, copy, and manage locally stored documents directly in the UI.
   - **Honest Offline Boundaries**: If a document was never opened online on that device, the app displays a clear explanation rather than false promises.

5. **Built-in 15 Specification Tests**
   - Interactive Test Runner validating all 15 scenarios from the project specification (persistence, XSS defense, route resolution, character limits, collision handling, offline storage).

---

## 🛠️ Technology Stack

- **Frontend**: React 19, TypeScript, Tailwind CSS, Lucide Icons, Web Audio API, IndexedDB.
- **Backend**: Node.js, Express, `node:sqlite` (SQLite with Write-Ahead Logging `WAL` mode for ultra-fast ACID persistence).
- **Offline / PWA**: Web Application Manifest, Service Worker (`sw.js`), IndexedDB store.
- **Build & Dev**: Vite, TSX.

---

## 📦 Installation & Local Development

1. **Clone & Install Dependencies**:
   ```bash
   npm install
   ```

2. **Start Full-Stack Development Server**:
   ```bash
   npm run dev
   ```
   Server runs at `http://localhost:3000`.

3. **Run Automated Test Suite**:
   ```bash
   npx tsx test-suite.ts
   ```
   Or click **"Run Tests"** in the top navigation bar inside the app.

4. **Build for Production**:
   ```bash
   npm run build
   ```

---

## 🔒 Security & Privacy Considerations

- **Safe Text Rendering**: All document contents are rendered inside `<pre>` tags as pure string text nodes, preventing cross-site scripting (XSS) and script execution.
- **Slug Normalization & Collision Guarding**: Slugs are normalized to lowercase alphanumeric characters with hyphens and underscores. Attempting to overwrite an existing slug returns `409 Conflict`.
- **Character Limiting**: Enforces a strict server-side limit of 100,000 characters per document.
- **Abuse Prevention**: Built-in rate limiting on creation endpoints.
- **Public URL Disclosure**: Documents saved to Jobing are accessible to anyone who has the slug/link. Do not store sensitive secrets or credentials without external encryption.

---

## 📄 License

Apache-2.0
