import http from 'http';

function makeRequest(
  method: string,
  path: string,
  body?: Record<string, unknown>
): Promise<{ status: number; data: any }> {
  return new Promise((resolve, reject) => {
    const postData = body ? JSON.stringify(body) : '';
    const req = http.request(
      {
        hostname: '127.0.0.1',
        port: 3000,
        path,
        method,
        headers: {
          'Content-Type': 'application/json',
          'Content-Length': Buffer.byteLength(postData),
        },
      },
      (res) => {
        let raw = '';
        res.on('data', (chunk) => (raw += chunk));
        res.on('end', () => {
          try {
            const data = JSON.parse(raw);
            resolve({ status: res.statusCode || 0, data });
          } catch {
            resolve({ status: res.statusCode || 0, data: raw });
          }
        });
      }
    );
    req.on('error', reject);
    if (postData) req.write(postData);
    req.end();
  });
}

async function runCliTests() {
  console.log('🚀 Running Jobing Backend Test Suite...\n');
  let passed = 0;
  let failed = 0;

  const assert = (condition: boolean, title: string, detail?: string) => {
    if (condition) {
      console.log(`✅ [PASS] ${title}`);
      passed++;
    } else {
      console.error(`❌ [FAIL] ${title} - ${detail || ''}`);
      failed++;
    }
  };

  try {
    // 1. Health check
    const health = await makeRequest('GET', '/api/health');
    assert(health.status === 200 && health.data.status === 'ok', 'Server health endpoint');

    // 2. Create document with custom slug
    const customSlug = `cli-test-${Date.now().toString(36)}`;
    const content = `Hello from CLI test!\nPreserve linebreaks.\nEmoji: 🦕`;
    const createRes = await makeRequest('POST', '/api/documents', {
      slug: customSlug,
      content,
    });
    assert(
      createRes.status === 201 && createRes.data.success && createRes.data.document.slug === customSlug,
      'Document creation with custom slug'
    );

    // 3. Persistent retrieval
    const getRes = await makeRequest('GET', `/api/documents/${customSlug}`);
    assert(
      getRes.status === 200 && getRes.data.document.content === content,
      'Document retrieval & byte-accurate content match'
    );

    // 4. Duplicate slug collision rejection (409 Conflict)
    const dupRes = await makeRequest('POST', '/api/documents', {
      slug: customSlug,
      content: 'Different content attempting collision',
    });
    assert(
      dupRes.status === 409 && dupRes.data.success === false,
      'Duplicate slug rejection with 409 Conflict'
    );

    // 5. 100k Character limit enforcement
    const oversized = 'x'.repeat(100001);
    const overRes = await makeRequest('POST', '/api/documents', {
      slug: `over-${Date.now()}`,
      content: oversized,
    });
    assert(
      overRes.status === 400 && overRes.data.error.includes('exceeds maximum limit'),
      'Character limit enforcement (>100k rejected)'
    );

    // 6. Empty content rejection
    const emptyRes = await makeRequest('POST', '/api/documents', {
      slug: `empty-${Date.now()}`,
      content: '',
    });
    assert(emptyRes.status === 400, 'Empty content rejection');

    // 7. Non-existent document 404
    const notFoundRes = await makeRequest('GET', '/api/documents/non-existent-random-slug-999');
    assert(notFoundRes.status === 404, 'Non-existent document returns 404');

    console.log(`\n🎉 Results: ${passed} passed, ${failed} failed out of ${passed + failed} tests.\n`);
  } catch (err) {
    console.error('Test execution error:', err);
  }
}

runCliTests();
