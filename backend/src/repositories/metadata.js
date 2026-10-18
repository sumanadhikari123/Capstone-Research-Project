import { getPool } from "./postgres.js";

export class MetadataRepository {
  async saveProduct(product) {
    const pool = getPool();
    await pool.query(
      `INSERT INTO product_metadata(product_id, manufacturer_id, product_name, description)\n       VALUES($1,$2,$3,$4)\n       ON CONFLICT(product_id) DO NOTHING`,
      [product.productId, product.manufacturerId, product.productName, product.description || ""]
    );
  }

  async saveBatch(batch) {
    const pool = getPool();
    await pool.query(
      `INSERT INTO batch_metadata(batch_id, product_id, manufacturer_id, current_location, expiry_date, document_hash)\n       VALUES($1,$2,$3,$4,$5,$6)\n       ON CONFLICT(batch_id) DO UPDATE SET current_location=EXCLUDED.current_location, document_hash=EXCLUDED.document_hash`,
      [batch.batchId, batch.productId, batch.manufacturerId, batch.currentLocation || null, batch.expiryDate || null, batch.documentHash || null]
    );
  }
}
