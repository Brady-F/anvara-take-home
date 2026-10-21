import express, { type Application } from 'express';
import cors from 'cors';
import routes from './routes/index.js';

const app: Application = express();
const frontendOrigin = new URL(process.env.BETTER_AUTH_URL || 'http://localhost:3847').origin;

// Reject browser requests from other origins before any cookie-authenticated mutation.
app.use((req, res, next) => {
  if (req.headers.origin && req.headers.origin !== frontendOrigin) {
    res.status(403).json({ error: 'Origin not allowed' });
    return;
  }
  next();
});
app.use(cors({ origin: frontendOrigin, credentials: true }));
app.use(express.json());
app.use('/api', routes);

export default app;
