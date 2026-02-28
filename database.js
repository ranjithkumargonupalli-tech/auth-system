const sql = require('mssql');

// Determine if we're in production (Render) or development
const isProduction = process.env.NODE_ENV === 'production';

const config = {
    // Use environment variables in production; fall back to local defaults for development
    user: process.env.DB_USER || 'sa',
    password: process.env.DB_PASSWORD || 'Ranjith@123',
    server: process.env.DB_SERVER || 'Ranjith\\SQLEXPRESS',
    database: process.env.DB_DATABASE || 'auth_demo',
    options: {
        // Enable encryption for Azure SQL (required), disable locally
        encrypt: isProduction ? true : false,
        // Trust server certificate locally; for Azure, set to false (use Azure's CA)
        trustServerCertificate: isProduction ? false : true,
        // Optional: Increase connection timeout for slower networks
        connectionTimeout: 30000, // 30 seconds
    }
};

// Log the configuration (without password) for debugging
console.log('Database config:', {
    user: config.user,
    server: config.server,
    database: config.database,
    encrypt: config.options.encrypt,
    trustServerCertificate: config.options.trustServerCertificate
});

const pool = new sql.ConnectionPool(config);
const poolConnect = pool.connect();

pool.on('error', err => {
    console.error('SQL Pool Error', err);
});

module.exports = {
    sql,
    pool,
    poolConnect
};