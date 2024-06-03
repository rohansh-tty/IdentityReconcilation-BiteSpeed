// import { Pool } from 'pg';
import pkg from "pg";
// const dotenv = require('dotenv');
// dotenv.config();
const { Pool } = pkg;
import { config } from "dotenv";
config();
export const itemsPool = new Pool({
    connectionString: process.env.DB_URL,
    ssl: {
        rejectUnauthorized: false,
    },
});
// module.exports = itemsPool;
