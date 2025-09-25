import 'express-async-errors';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import path from 'path';

// Load env from project root (default) and also from src/.env as a fallback
dotenv.config();
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, '.env'), override: false });
