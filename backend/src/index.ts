import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs/promises';
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
const PORT = Number(process.env.PORT) || 3000;

// 添加启动错误处理
process.on('uncaughtException', (error) => {
  console.error('Uncaught Exception:', error);
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
  process.exit(1);
});

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
  const frontendIndex = path.join(frontendDist, 'index.html');
  
  // Check if frontend build exists (async check)
  fs.access(frontendDist)
    .then(() => {
      console.log('Frontend build found at:', frontendDist);
      app.use(express.static(frontendDist));
      
      // Handle all other routes by serving index.html (for SPA routing)
      app.get('*', (req, res) => {
        // Skip API routes
        if (req.path.startsWith('/api')) {
          return res.status(404).json({ error: 'API endpoint not found' });
        }
        res.sendFile(frontendIndex, (err) => {
          if (err) {
            console.error('Error serving index.html:', err);
            res.status(500).json({ error: 'Failed to serve frontend' });
          }
        });
      });
    })
    .catch((error) => {
      console.warn('Frontend build not found, serving API only:', error);
      // If frontend build doesn't exist, only serve API
      app.get('*', (req, res) => {
        if (!req.path.startsWith('/api')) {
          return res.status(503).json({ 
            error: 'Frontend not available',
            message: 'Frontend build is missing. Please ensure frontend is built before deployment.'
          });
        }
        res.status(404).json({ error: 'API endpoint not found' });
      });
    });
}

app.listen(PORT, '0.0.0.0', () => {
  console.log(`Server running on port ${PORT}`);
});

