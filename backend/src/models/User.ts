export interface User {
  id: number;
  username: string;
  email?: string;
  role: 'user' | 'admin';
  createdAt: string;
  updatedAt: string;
}

export interface UserWithPassword extends User {
  password: string;
}

