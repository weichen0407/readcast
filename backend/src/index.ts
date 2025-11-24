import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { initDatabase } from './db/database.js';
import articleRoutes from './routes/article/index.js';
import dictionaryRoutes from './routes/dictionary.js';
import favoriteRoutes from './routes/favorite.js';
import newsRoutes from './routes/news.js';
import textRoutes from './routes/text.js';
import agentsRoutes from './routes/agents.js';
import authRoutes from './routes/auth.js';
import adminRoutes from './routes/admin.js';
import readcastRoutes from './routes/readcast.js';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors());
app.use(express.json());

// Initialize database
initDatabase();

// API Routes
app.use('/api/articles', articleRoutes);
app.use('/api/dictionary', dictionaryRoutes);
app.use('/api/favorites', favoriteRoutes);
app.use('/api/news', newsRoutes);
app.use('/api/text', textRoutes);
app.use('/api/agents', agentsRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/readcast', readcastRoutes);

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok' });
});

// Serve static files from frontend dist in production
if (process.env.NODE_ENV === 'production') {
  const frontendDist = path.join(__dirname, '../../frontend/.output/public');
  app.use(express.static(frontendDist));
  
  // Handle all other routes by serving index.html (for SPA routing)
  app.get('*', (req, res) => {
    res.sendFile(path.join(frontendDist, 'index.html'));
  });
}

app.listen(PORT, '0.0.0.0', () => {
  console.log(`Server running on port ${PORT}`);
});

