// db.js (Backend)
const mysql = require('mysql2/promise'); // '/promise' zaroor lagayein

const db = mysql.createPool({
  host: 'localhost',
  user: 'root',        // Aapka DB username
  password: '',        // Aapka DB password
  database: 'nexus_db' // Aapka DB name
});

module.exports = db;