import pkg from "pg";
import { config } from "dotenv";

config();

const { Pool } = pkg;
export const itemsPool = new Pool({
  connectionString: process.env.DB_URL,
  ssl: {
    rejectUnauthorized: false,
  },
});
