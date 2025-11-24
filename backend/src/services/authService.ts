import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { getDatabase } from '../db/database.js';
import { User, UserWithPassword } from '../models/User.js';

const db = getDatabase();
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';

export async function registerUser(username: string, password: string, email?: string): Promise<User> {
  // 检查用户名是否已存在
  const existingUser = db.prepare('SELECT id FROM users WHERE username = ?').get(username) as { id: number } | undefined;
  if (existingUser) {
    throw new Error('Username already exists');
  }

  // 加密密码
  const hashedPassword = await bcrypt.hash(password, 10);

  // 创建用户
  const stmt = db.prepare(`
    INSERT INTO users (username, password, email, role)
    VALUES (?, ?, ?, 'user')
  `);
  
  const result = stmt.run(username, hashedPassword, email || null);
  const userId = result.lastInsertRowid as number;

  // 返回用户信息（不包含密码）
  const user = db.prepare('SELECT id, username, email, role, createdAt, updatedAt FROM users WHERE id = ?').get(userId) as User;
  return user;
}

export async function loginUser(username: string, password: string): Promise<{ user: User; token: string }> {
  // 查找用户
  const user = db.prepare('SELECT * FROM users WHERE username = ?').get(username) as UserWithPassword | undefined;
  if (!user) {
    throw new Error('Invalid username or password');
  }

  // 验证密码
  const isValid = await bcrypt.compare(password, user.password);
  if (!isValid) {
    throw new Error('Invalid username or password');
  }

  // 生成JWT token
  const token = jwt.sign(
    { userId: user.id, username: user.username, role: user.role },
    JWT_SECRET,
    { expiresIn: '7d' }
  );

  // 返回用户信息（不包含密码）和token
  const { password: _, ...userWithoutPassword } = user;
  return {
    user: userWithoutPassword,
    token
  };
}

export function verifyToken(token: string): { userId: number; username: string; role: string } {
  try {
    const decoded = jwt.verify(token, JWT_SECRET) as { userId: number; username: string; role: string };
    return decoded;
  } catch (error) {
    throw new Error('Invalid token');
  }
}

export function getUserById(id: number): User | null {
  const user = db.prepare('SELECT id, username, email, role, createdAt, updatedAt FROM users WHERE id = ?').get(id) as User | undefined;
  return user || null;
}

export function getAllUsers(): User[] {
  return db.prepare('SELECT id, username, email, role, createdAt, updatedAt FROM users ORDER BY createdAt DESC').all() as User[];
}

