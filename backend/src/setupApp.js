import express from 'express';
import cors from 'cors';
import morgan from 'morgan';
import routes from './routes/index.js';
import { notFound, errorHandler } from './utils/errors.js';

const app = express();

app.use(cors({ origin: process.env.FRONTEND_ORIGIN?.split(',') || true, credentials: true }));
app.use(express.json({ limit: '2mb' }));
app.use(express.urlencoded({ extended: true }));
app.use(morgan('dev'));

app.get('/api/health', (req, res) => res.json({ ok: true }));

app.use('/api', routes);

app.use(notFound);
app.use(errorHandler);

export default app;
