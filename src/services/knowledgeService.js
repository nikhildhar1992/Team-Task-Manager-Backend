const fs = require('fs/promises');
const path = require('path');
const crypto = require('crypto');
const ApiError = require('../utils/apiError');
const knowledgeRepository = require('../repositories/knowledgeRepository');
const logger = require('../utils/logger');

const DEFAULT_TOP_K = 5;
const DEFAULT_EMBEDDING_MODEL = process.env.OPENAI_EMBEDDING_MODEL || 'text-embedding-3-small';
const DEFAULT_EMBEDDING_SIZE = Number(process.env.EMBEDDING_VECTOR_SIZE || 1536);
const DEFAULT_QDRANT_COLLECTION = process.env.QDRANT_COLLECTION || 'product_knowledge_v1';
const DEFAULT_CHUNK_SIZE = Number(process.env.KNOWLEDGE_CHUNK_WORDS || 220);
const DEFAULT_CHUNK_OVERLAP = Number(process.env.KNOWLEDGE_CHUNK_OVERLAP_WORDS || 40);
const OPENAI_API_KEY = process.env.OPENAI_API_KEY || process.env.OPEN_API_KEY || '';

function chunkText(content, chunkSize = DEFAULT_CHUNK_SIZE, overlap = DEFAULT_CHUNK_OVERLAP) {
  const words = String(content || '')
    .trim()
    .split(/\s+/)
    .filter(Boolean);

  if (words.length === 0) {
    return [];
  }

  const chunks = [];
  let index = 0;
  let cursor = 0;
  const step = Math.max(1, chunkSize - overlap);

  while (cursor < words.length) {
    const slice = words.slice(cursor, cursor + chunkSize);
    chunks.push({
      chunkIndex: index,
      content: slice.join(' '),
      tokenCount: Math.ceil(slice.length * 1.3),
    });
    index += 1;
    cursor += step;
  }

  return chunks;
}

function buildDeterministicEmbedding(text, size = DEFAULT_EMBEDDING_SIZE) {
  const hash = crypto.createHash('sha256').update(String(text || '')).digest();
  const vector = [];
  for (let i = 0; i < size; i += 1) {
    const byte = hash[i % hash.length];
    vector.push((byte - 128) / 128);
  }
  return vector;
}

function buildDeterministicUuid(text) {
  const hex = crypto.createHash('sha256').update(String(text || '')).digest('hex');
  const base = hex.slice(0, 32).split('');
  // RFC4122 v4-ish formatting with deterministic source
  base[12] = '4';
  const variantNibble = (parseInt(base[16], 16) & 0x3) | 0x8;
  base[16] = variantNibble.toString(16);
  const normalized = base.join('');
  return `${normalized.slice(0, 8)}-${normalized.slice(8, 12)}-${normalized.slice(12, 16)}-${normalized.slice(16, 20)}-${normalized.slice(20, 32)}`;
}

async function withTimeout(url, options = {}, timeoutMs = 15000) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, {
      ...options,
      signal: controller.signal,
    });
  } finally {
    clearTimeout(timeout);
  }
}

async function getEmbedding(text) {
  if (!OPENAI_API_KEY) {
    return {
      vector: buildDeterministicEmbedding(text),
      model: 'deterministic-fallback-v1',
    };
  }

  const response = await withTimeout('https://api.openai.com/v1/embeddings', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${OPENAI_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: DEFAULT_EMBEDDING_MODEL,
      input: text,
    }),
  });

  if (!response.ok) {
    const body = await response.text();
    throw new ApiError(502, `Embedding generation failed: ${body.slice(0, 300)}`);
  }

  const payload = await response.json();
  const vector = payload?.data?.[0]?.embedding;
  if (!Array.isArray(vector) || vector.length === 0) {
    throw new ApiError(502, 'Embedding API returned invalid vector');
  }

  return {
    vector,
    model: payload.model || DEFAULT_EMBEDDING_MODEL,
  };
}

function qdrantHeaders() {
  const headers = {
    'Content-Type': 'application/json',
  };
  if (process.env.QDRANT_API_KEY) {
    headers['api-key'] = process.env.QDRANT_API_KEY;
  }
  return headers;
}

function isQdrantConfigured() {
  return Boolean(process.env.QDRANT_URL);
}

async function ensureQdrantCollection(vectorSize) {
  if (!isQdrantConfigured()) {
    return;
  }

  const url = `${process.env.QDRANT_URL}/collections/${DEFAULT_QDRANT_COLLECTION}`;
  const createResponse = await withTimeout(url, {
    method: 'PUT',
    headers: qdrantHeaders(),
    body: JSON.stringify({
      vectors: {
        size: vectorSize,
        distance: 'Cosine',
      },
    }),
  });

  if (createResponse.status === 409) {
    return;
  }

  if (!createResponse.ok) {
    const body = await createResponse.text();
    throw new ApiError(502, `Qdrant collection setup failed: ${body.slice(0, 300)}`);
  }
}

async function upsertQdrantPoints(points) {
  if (!isQdrantConfigured() || points.length === 0) {
    return;
  }

  const url = `${process.env.QDRANT_URL}/collections/${DEFAULT_QDRANT_COLLECTION}/points?wait=true`;
  const response = await withTimeout(url, {
    method: 'PUT',
    headers: qdrantHeaders(),
    body: JSON.stringify({
      points,
    }),
  });

  if (!response.ok) {
    const body = await response.text();
    throw new ApiError(502, `Qdrant upsert failed: ${body.slice(0, 300)}`);
  }
}

async function searchQdrant(queryVector, topK, category) {
  if (!isQdrantConfigured()) {
    return [];
  }

  const url = `${process.env.QDRANT_URL}/collections/${DEFAULT_QDRANT_COLLECTION}/points/search`;
  const filter = category
    ? {
        must: [
          {
            key: 'category',
            match: { value: category },
          },
        ],
      }
    : undefined;

  const response = await withTimeout(url, {
    method: 'POST',
    headers: qdrantHeaders(),
    body: JSON.stringify({
      vector: queryVector,
      with_payload: true,
      limit: topK,
      ...(filter && { filter }),
    }),
  });

  if (!response.ok) {
    const body = await response.text();
    throw new ApiError(502, `Qdrant search failed: ${body.slice(0, 300)}`);
  }

  const payload = await response.json();
  return (payload.result || []).map((row) => ({
    id: row.payload?.pointId || String(row.id),
    content: row.payload?.content || '',
    score: Number(row.score || 0),
    source: {
      type: 'doc',
      id: row.payload?.sourceId || String(row.id),
      title: row.payload?.title || 'Knowledge Document',
      category: row.payload?.category || null,
      version: row.payload?.version || null,
      excerpt: String(row.payload?.content || '').slice(0, 220),
      score: Number(row.score || 0),
    },
    metadata: row.payload || {},
  }));
}

async function loadIngestDocuments() {
  const sourcePath = process.env.KNOWLEDGE_SOURCE_FILE
    ? path.resolve(process.env.KNOWLEDGE_SOURCE_FILE)
    : path.resolve(__dirname, '../../docs/knowledge/seed-documents.json');
  const raw = await fs.readFile(sourcePath, 'utf8');
  const parsed = JSON.parse(raw);
  if (!Array.isArray(parsed)) {
    throw new ApiError(400, 'Knowledge source file must contain an array');
  }
  return parsed;
}

async function ingestKnowledge({ documents = null } = {}) {
  const startedAt = Date.now();
  const sourceDocs = Array.isArray(documents) && documents.length > 0 ? documents : await loadIngestDocuments();
  let documentsIngested = 0;
  let chunksIngested = 0;

  for (const sourceDoc of sourceDocs) {
    if (!sourceDoc?.sourceKey || !sourceDoc?.content) {
      continue;
    }

    const document = await knowledgeRepository.upsertDocument({
      sourceKey: sourceDoc.sourceKey,
      title: sourceDoc.title || sourceDoc.sourceKey,
      category: sourceDoc.category || 'general',
      version: sourceDoc.version || 'v1',
      status: sourceDoc.status || 'active',
    });

    if (!document) {
      continue;
    }

    const rawChunks = chunkText(sourceDoc.content);
    const preparedChunks = [];
    const qdrantPoints = [];

    for (const chunk of rawChunks) {
      const embedding = await getEmbedding(chunk.content);
      const sourceChunkId = `${document.sourceKey}#chunk-${chunk.chunkIndex}`;
      const qdrantPointId = buildDeterministicUuid(sourceChunkId);
      const embeddingHash = crypto
        .createHash('sha256')
        .update(`${embedding.model}:${chunk.content}`)
        .digest('hex');

      preparedChunks.push({
        ...chunk,
        embeddingModel: embedding.model,
        embeddingHash,
        qdrantPointId,
        metadata: {
          sourceKey: document.sourceKey,
          title: document.title,
          category: document.category,
          version: document.version,
          tags: sourceDoc.tags || [],
        },
      });

      qdrantPoints.push({
        id: qdrantPointId,
        vector: embedding.vector,
        payload: {
          pointId: qdrantPointId,
          sourceId: sourceChunkId,
          documentId: document.id,
          title: document.title,
          category: document.category,
          version: document.version,
          tags: sourceDoc.tags || [],
          updatedAt: new Date().toISOString(),
          content: chunk.content,
        },
      });
    }

    if (qdrantPoints.length > 0) {
      await ensureQdrantCollection(qdrantPoints[0].vector.length);
      await upsertQdrantPoints(qdrantPoints);
    }

    await knowledgeRepository.replaceDocumentChunks({
      documentId: document.id,
      chunks: preparedChunks,
    });

    documentsIngested += 1;
    chunksIngested += preparedChunks.length;
  }

  const elapsedMs = Date.now() - startedAt;
  logger.info({ documentsIngested, chunksIngested, elapsedMs }, 'knowledge_ingest_completed');

  return {
    documentsIngested,
    chunksIngested,
    elapsedMs,
  };
}

async function searchKnowledge({ queryText, topK = DEFAULT_TOP_K, category = null }) {
  const normalizedTopK = Math.max(1, Math.min(20, Number(topK) || DEFAULT_TOP_K));
  const embedding = await getEmbedding(queryText);

  let chunks = [];
  if (isQdrantConfigured()) {
    chunks = await searchQdrant(embedding.vector, normalizedTopK, category);
  }

  if (chunks.length === 0) {
    const fallbackRows = await knowledgeRepository.searchChunks({
      searchTerm: queryText,
      category,
      topK: normalizedTopK,
    });
    chunks = fallbackRows.map((row, index) => ({
      id: row.qdrantPointId || `${row.sourceKey}#chunk-${row.chunkIndex}`,
      content: row.content,
      score: Number((1 - index * 0.05).toFixed(3)),
      source: {
        type: 'doc',
        id: `${row.sourceKey}#chunk-${row.chunkIndex}`,
        title: row.title,
        category: row.category,
        version: row.version,
        excerpt: String(row.content || '').slice(0, 220),
        score: Number((1 - index * 0.05).toFixed(3)),
      },
      metadata: row.metadata || {},
    }));
  }

  return {
    chunks,
    topK: normalizedTopK,
  };
}

module.exports = {
  ingestKnowledge,
  searchKnowledge,
};
