const { Pool } = require('pg');

// Database configuration
const dbConfig = {
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 5432,
  database: process.env.DB_NAME || 'email_extractor',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || 'your_password_here',
  max: 20, // maximum number of clients in the pool
  idleTimeoutMillis: 30000, // how long a client is allowed to remain idle before being closed
  connectionTimeoutMillis: 2000, // how long to wait when connecting a new client
};

// Create connection pool
const pool = new Pool(dbConfig);

// Database initialization
async function initializeDatabase() {
  try {
    const client = await pool.connect();
    
    // Create tables if they don't exist
    await client.query(`
      CREATE TABLE IF NOT EXISTS url_mappings (
        id SERIAL PRIMARY KEY,
        short_id VARCHAR(50) UNIQUE NOT NULL,
        original_url TEXT NOT NULL,
        resource_type VARCHAR(20) NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    
    await client.query(`
      CREATE TABLE IF NOT EXISTS email_logs (
        id SERIAL PRIMARY KEY,
        email VARCHAR(255),
        username VARCHAR(255),
        short_id VARCHAR(50),
        resource_type VARCHAR(20),
        ip_address INET,
        user_agent TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (short_id) REFERENCES url_mappings(short_id)
      )
    `);
    
    // Create indexes for better performance
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_url_mappings_short_id ON url_mappings(short_id)
    `);
    
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_email_logs_short_id ON email_logs(short_id)
    `);
    
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_email_logs_email ON email_logs(email)
    `);
    
    client.release();
    console.log('✅ Database initialized successfully');
    
  } catch (error) {
    console.error('❌ Database initialization failed:', error);
    throw error;
  }
}

// Database operations
const db = {
  // URL Mappings
  async saveUrlMapping(shortId, originalUrl, resourceType) {
    const client = await pool.connect();
    try {
      const result = await client.query(
        'INSERT INTO url_mappings (short_id, original_url, resource_type) VALUES ($1, $2, $3) RETURNING *',
        [shortId, originalUrl, resourceType]
      );
      return result.rows[0];
    } finally {
      client.release();
    }
  },
  
  async getUrlMapping(shortId) {
    const client = await pool.connect();
    try {
      const result = await client.query(
        'SELECT * FROM url_mappings WHERE short_id = $1',
        [shortId]
      );
      return result.rows[0];
    } finally {
      client.release();
    }
  },
  
  async getAllUrlMappings() {
    const client = await pool.connect();
    try {
      const result = await client.query(
        'SELECT * FROM url_mappings ORDER BY created_at DESC'
      );
      return result.rows;
    } finally {
      client.release();
    }
  },
  
  // Email Logs
  async saveEmailLog(email, username, shortId, resourceType, ipAddress, userAgent) {
    const client = await pool.connect();
    try {
      const result = await client.query(
        'INSERT INTO email_logs (email, username, short_id, resource_type, ip_address, user_agent) VALUES ($1, $2, $3, $4, $5, $6) RETURNING *',
        [email, username, shortId, resourceType, ipAddress, userAgent]
      );
      return result.rows[0];
    } finally {
      client.release();
    }
  },
  
  async getAllEmailLogs() {
    const client = await pool.connect();
    try {
      const result = await client.query(`
        SELECT 
          el.*,
          um.original_url,
          um.created_at as url_created_at
        FROM email_logs el
        LEFT JOIN url_mappings um ON el.short_id = um.short_id
        ORDER BY el.created_at DESC
      `);
      return result.rows;
    } finally {
      client.release();
    }
  },
  
  async getEmailLogsByShortId(shortId) {
    const client = await pool.connect();
    try {
      const result = await client.query(
        'SELECT * FROM email_logs WHERE short_id = $1 ORDER BY created_at DESC',
        [shortId]
      );
      return result.rows;
    } finally {
      client.release();
    }
  },
  
  // Statistics
  async getStats() {
    const client = await pool.connect();
    try {
      const urlCount = await client.query('SELECT COUNT(*) FROM url_mappings');
      const emailCount = await client.query('SELECT COUNT(*) FROM email_logs');
      const uniqueEmails = await client.query('SELECT COUNT(DISTINCT email) FROM email_logs WHERE email != \'not-configured\'');
      
      return {
        totalUrls: parseInt(urlCount.rows[0].count),
        totalEmailLogs: parseInt(emailCount.rows[0].count),
        uniqueEmails: parseInt(uniqueEmails.rows[0].count)
      };
    } finally {
      client.release();
    }
  }
};

// Graceful shutdown
process.on('SIGINT', async () => {
  console.log('Closing database connections...');
  await pool.end();
  process.exit(0);
});

process.on('SIGTERM', async () => {
  console.log('Closing database connections...');
  await pool.end();
  process.exit(0);
});

module.exports = { db, initializeDatabase, pool }; 