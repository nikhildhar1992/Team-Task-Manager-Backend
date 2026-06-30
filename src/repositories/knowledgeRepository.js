const { query } = require('../config/mysql');

async function upsertDocument({ sourceKey, title, category, version, status }) {
  await query(
    `
      INSERT INTO knowledge_documents (source_key, title, category, version, status)
      VALUES (?, ?, ?, ?, ?)
      ON DUPLICATE KEY UPDATE
        title = VALUES(title),
        category = VALUES(category),
        version = VALUES(version),
        status = VALUES(status),
        updated_at = CURRENT_TIMESTAMP
    `,
    [sourceKey, title, category, version, status],
  );

  const rows = await query(
    `
      SELECT
        id,
        source_key AS sourceKey,
        title,
        category,
        version,
        status,
        created_at AS createdAt,
        updated_at AS updatedAt
      FROM knowledge_documents
      WHERE source_key = ?
      LIMIT 1
    `,
    [sourceKey],
  );

  return rows[0] || null;
}

async function replaceDocumentChunks({ documentId, chunks }) {
  await query(
    `
      DELETE FROM knowledge_chunks
      WHERE document_id = ?
    `,
    [documentId],
  );

  for (const chunk of chunks) {
    await query(
      `
        INSERT INTO knowledge_chunks (
          document_id,
          chunk_index,
          content,
          token_count,
          metadata_json,
          embedding_model,
          embedding_hash,
          qdrant_point_id
        )
        VALUES (?, ?, ?, ?, CAST(? AS JSON), ?, ?, ?)
      `,
      [
        documentId,
        chunk.chunkIndex,
        chunk.content,
        chunk.tokenCount,
        JSON.stringify(chunk.metadata || {}),
        chunk.embeddingModel,
        chunk.embeddingHash,
        chunk.qdrantPointId,
      ],
    );
  }
}

async function searchChunks({ searchTerm, category, topK }) {
  const filters = [];
  const params = [];

  if (searchTerm) {
    filters.push('(kc.content LIKE ? OR kd.title LIKE ?)');
    const like = `%${searchTerm}%`;
    params.push(like, like);
  }

  if (category) {
    filters.push('kd.category = ?');
    params.push(category);
  }

  const whereSql = filters.length > 0 ? `WHERE ${filters.join(' AND ')}` : '';

  const rows = await query(
    `
      SELECT
        kc.id,
        kc.document_id AS documentId,
        kc.chunk_index AS chunkIndex,
        kc.content,
        kc.token_count AS tokenCount,
        kc.metadata_json AS metadataJson,
        kc.embedding_model AS embeddingModel,
        kc.qdrant_point_id AS qdrantPointId,
        kd.title,
        kd.category,
        kd.source_key AS sourceKey,
        kd.version
      FROM knowledge_chunks kc
      INNER JOIN knowledge_documents kd ON kd.id = kc.document_id
      ${whereSql}
      ORDER BY kc.updated_at DESC
      LIMIT ${Math.max(1, Math.min(50, Number(topK) || 5))}
    `,
    params,
  );

  return rows.map((row) => ({
    ...row,
    metadata: row.metadataJson || {},
  }));
}

async function listDocuments() {
  return query(
    `
      SELECT
        id,
        source_key AS sourceKey,
        title,
        category,
        version,
        status,
        created_at AS createdAt,
        updated_at AS updatedAt
      FROM knowledge_documents
      ORDER BY updated_at DESC
    `,
  );
}

module.exports = {
  upsertDocument,
  replaceDocumentChunks,
  searchChunks,
  listDocuments,
};
