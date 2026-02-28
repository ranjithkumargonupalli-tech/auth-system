const sql = require('mssql');

const config = {
    user: 'sa',                         // your SQL Server login
    password: 'Ranjith@123',         // your password
    server: 'Ranjith\\SQLEXPRESS',       // your instance name
    database: 'auth_demo',
    options: {
        encrypt: false,
        trustServerCertificate: true
    }
};

const pool = new sql.ConnectionPool(config);
const poolConnect = pool.connect();

pool.on('error', err => {
    console.error('SQL Pool Error', err);
});

module.exports = {
    sql, pool, poolConnect
};