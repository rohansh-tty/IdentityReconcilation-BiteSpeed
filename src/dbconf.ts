import { Pool } from 'pg';
const dotenv = require('dotenv');

const itemsPool = new Pool({
    connectionString: dotenv.config().parsed.DB_URL,
    ssl: {
        rejectUnauthorized: false
    }
});
module.exports = itemsPool;
