import express from 'express';
import { registerUser, loginUser } from '../services/authService.js';

const router = express.Router();

// 注册
router.post('/register', async (req, res) => {
  try {
    const { username, password, email } = req.body;

    if (!username || !password) {
      return res.status(400).json({ error: 'Username and password are required' });
    }

    if (username.length < 3) {
      return res.status(400).json({ error: 'Username must be at least 3 characters' });
    }

    if (password.length < 6) {
      return res.status(400).json({ error: 'Password must be at least 6 characters' });
    }

    const user = await registerUser(username, password, email);
    res.json({ message: 'User registered successfully', user });
  } catch (error) {
    res.status(400).json({
      error: error instanceof Error ? error.message : 'Registration failed'
    });
  }
});

// 登录
router.post('/login', async (req, res) => {
  try {
    const { username, password } = req.body;

    if (!username || !password) {
      return res.status(400).json({ error: 'Username and password are required' });
    }

    const result = await loginUser(username, password);
    res.json(result);
  } catch (error) {
    res.status(401).json({
      error: error instanceof Error ? error.message : 'Login failed'
    });
  }
});

export default router;

