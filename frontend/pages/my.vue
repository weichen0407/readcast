<template>
  <div class="my-page">
    <div class="my-container">
      <h1>我的</h1>
      
      <!-- 已登录状态 -->
      <div v-if="user" class="user-info-section">
        <div class="user-card">
          <h2>用户信息</h2>
          <div class="info-item">
            <span class="label">用户名：</span>
            <span class="value">{{ user.username }}</span>
          </div>
          <div v-if="user.email" class="info-item">
            <span class="label">邮箱：</span>
            <span class="value">{{ user.email }}</span>
          </div>
          <div class="info-item">
            <span class="label">角色：</span>
            <span class="value role-badge" :class="user.role === 'admin' ? 'admin' : 'user'">
              {{ user.role === 'admin' ? '管理员' : '普通用户' }}
            </span>
          </div>
          <div class="info-item">
            <span class="label">注册时间：</span>
            <span class="value">{{ formatDate(user.createdAt) }}</span>
          </div>
        </div>
        
        <div class="actions">
          <NuxtLink v-if="user.role === 'admin'" to="/admin" class="action-btn admin-btn">
            管理员后台
          </NuxtLink>
          <button @click="handleLogout" class="action-btn logout-btn">退出登录</button>
        </div>
      </div>
      
      <!-- 未登录状态：显示登录/注册表单 -->
      <div v-else class="auth-section">
        <div class="tabs">
          <button 
            :class="['tab', { active: activeTab === 'login' }]"
            @click="activeTab = 'login'"
          >
            登录
          </button>
          <button 
            :class="['tab', { active: activeTab === 'register' }]"
            @click="activeTab = 'register'"
          >
            注册
          </button>
        </div>
        
        <!-- 登录表单 -->
        <form v-if="activeTab === 'login'" @submit.prevent="handleLogin" class="auth-form">
          <div class="form-group">
            <label for="login-username">用户名</label>
            <input
              id="login-username"
              v-model="loginForm.username"
              type="text"
              required
              placeholder="请输入用户名"
            />
          </div>
          <div class="form-group">
            <label for="login-password">密码</label>
            <input
              id="login-password"
              v-model="loginForm.password"
              type="password"
              required
              placeholder="请输入密码"
            />
          </div>
          <div v-if="loginError" class="error-message">{{ loginError }}</div>
          <button type="submit" :disabled="loginLoading" class="submit-btn">
            {{ loginLoading ? '登录中...' : '登录' }}
          </button>
        </form>
        
        <!-- 注册表单 -->
        <form v-if="activeTab === 'register'" @submit.prevent="handleRegister" class="auth-form">
          <div class="form-group">
            <label for="register-username">用户名</label>
            <input
              id="register-username"
              v-model="registerForm.username"
              type="text"
              required
              minlength="3"
              placeholder="至少3个字符"
            />
          </div>
          <div class="form-group">
            <label for="register-email">邮箱（可选）</label>
            <input
              id="register-email"
              v-model="registerForm.email"
              type="email"
              placeholder="请输入邮箱"
            />
          </div>
          <div class="form-group">
            <label for="register-password">密码</label>
            <input
              id="register-password"
              v-model="registerForm.password"
              type="password"
              required
              minlength="6"
              placeholder="至少6个字符"
            />
          </div>
          <div class="form-group">
            <label for="register-confirm-password">确认密码</label>
            <input
              id="register-confirm-password"
              v-model="registerForm.confirmPassword"
              type="password"
              required
              placeholder="请再次输入密码"
            />
          </div>
          <div v-if="registerError" class="error-message">{{ registerError }}</div>
          <button type="submit" :disabled="registerLoading" class="submit-btn">
            {{ registerLoading ? '注册中...' : '注册' }}
          </button>
        </form>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
definePageMeta({
  middleware: [] // 不应用auth中间件，因为这是登录页面
});

const { fetchApi } = useApi();
const router = useRouter();

const user = ref<any>(null);
const activeTab = ref<'login' | 'register'>('login');

const loginForm = ref({
  username: '',
  password: '',
});
const loginLoading = ref(false);
const loginError = ref<string | null>(null);

const registerForm = ref({
  username: '',
  email: '',
  password: '',
  confirmPassword: '',
});
const registerLoading = ref(false);
const registerError = ref<string | null>(null);

const loadUser = () => {
  const userStr = localStorage.getItem('user');
  if (userStr) {
    try {
      user.value = JSON.parse(userStr);
    } catch (e) {
      user.value = null;
    }
  } else {
    user.value = null;
  }
};

const handleLogin = async () => {
  loginLoading.value = true;
  loginError.value = null;

  try {
    const data = await fetchApi('/auth/login', {
      method: 'POST',
      body: JSON.stringify({
        username: loginForm.value.username,
        password: loginForm.value.password,
      }),
    });

    // 保存token和用户信息
    localStorage.setItem('token', data.token);
    localStorage.setItem('user', JSON.stringify(data.user));

    // 触发storage事件，更新其他标签页的用户状态
    window.dispatchEvent(new Event('storage'));

    // 更新本地用户状态
    user.value = data.user;

    // 跳转到首页
    router.push('/');
  } catch (err) {
    loginError.value = err instanceof Error ? err.message : '登录失败';
  } finally {
    loginLoading.value = false;
  }
};

const handleRegister = async () => {
  registerError.value = null;

  if (registerForm.value.password !== registerForm.value.confirmPassword) {
    registerError.value = '两次输入的密码不一致';
    return;
  }

  registerLoading.value = true;

  try {
    await fetchApi('/auth/register', {
      method: 'POST',
      body: JSON.stringify({
        username: registerForm.value.username,
        password: registerForm.value.password,
        email: registerForm.value.email || undefined,
      }),
    });

    // 注册成功后自动登录
    await handleLogin();
  } catch (err) {
    registerError.value = err instanceof Error ? err.message : '注册失败';
  } finally {
    registerLoading.value = false;
  }
};

const handleLogout = () => {
  localStorage.removeItem('token');
  localStorage.removeItem('user');
  user.value = null;
  // 触发storage事件，更新其他标签页的用户状态
  window.dispatchEvent(new Event('storage'));
  router.push('/my');
};

const formatDate = (dateStr?: string) => {
  if (!dateStr) return '';
  return new Date(dateStr).toLocaleString('zh-CN');
};

onMounted(() => {
  loadUser();
  // 监听storage变化（用于跨标签页同步）
  window.addEventListener('storage', loadUser);
});

onUnmounted(() => {
  window.removeEventListener('storage', loadUser);
});
</script>

<style scoped>
.my-page {
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #f5f5f5;
  padding: 2rem;
}

.my-container {
  background: white;
  padding: 2rem 3rem;
  border-radius: 8px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  width: 100%;
  max-width: 500px;
}

h1 {
  margin: 0 0 2rem 0;
  text-align: center;
  color: #333;
}

.user-info-section {
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
}

.user-card {
  padding: 1.5rem;
  background: #f8f9fa;
  border-radius: 8px;
}

.user-card h2 {
  margin: 0 0 1rem 0;
  color: #333;
  font-size: 1.2rem;
}

.info-item {
  display: flex;
  justify-content: space-between;
  padding: 0.75rem 0;
  border-bottom: 1px solid #e0e0e0;
}

.info-item:last-child {
  border-bottom: none;
}

.info-item .label {
  color: #666;
  font-weight: 500;
}

.info-item .value {
  color: #333;
}

.role-badge {
  padding: 0.25rem 0.75rem;
  border-radius: 12px;
  font-size: 0.85rem;
}

.role-badge.admin {
  background: #ffd700;
  color: #333;
}

.role-badge.user {
  background: #e3f2fd;
  color: #1976d2;
}

.actions {
  display: flex;
  gap: 1rem;
}

.action-btn {
  flex: 1;
  padding: 0.75rem;
  border: none;
  border-radius: 4px;
  font-size: 1rem;
  cursor: pointer;
  transition: background 0.2s;
}

.admin-btn {
  background: #007bff;
  color: white;
}

.admin-btn:hover {
  background: #0056b3;
}

.logout-btn {
  background: #dc3545;
  color: white;
}

.logout-btn:hover {
  background: #c82333;
}

.auth-section {
  display: flex;
  flex-direction: column;
}

.tabs {
  display: flex;
  gap: 0.5rem;
  margin-bottom: 1.5rem;
  border-bottom: 2px solid #e0e0e0;
}

.tab {
  flex: 1;
  padding: 0.75rem;
  background: none;
  border: none;
  border-bottom: 2px solid transparent;
  cursor: pointer;
  font-size: 1rem;
  color: #666;
  transition: all 0.2s;
  margin-bottom: -2px;
}

.tab:hover {
  color: #007bff;
}

.tab.active {
  color: #007bff;
  border-bottom-color: #007bff;
  font-weight: 600;
}

.auth-form {
  display: flex;
  flex-direction: column;
}

.form-group {
  margin-bottom: 1.5rem;
}

.form-group label {
  display: block;
  margin-bottom: 0.5rem;
  color: #555;
  font-weight: 500;
}

.form-group input {
  width: 100%;
  padding: 0.75rem;
  border: 1px solid #ddd;
  border-radius: 4px;
  font-size: 1rem;
  box-sizing: border-box;
}

.form-group input:focus {
  outline: none;
  border-color: #007bff;
}

.error-message {
  color: #c33;
  margin-bottom: 1rem;
  padding: 0.5rem;
  background: #ffe6e6;
  border-radius: 4px;
  font-size: 0.9rem;
}

.submit-btn {
  padding: 0.75rem;
  background: #007bff;
  color: white;
  border: none;
  border-radius: 4px;
  font-size: 1rem;
  cursor: pointer;
  transition: background 0.2s;
}

.submit-btn:hover:not(:disabled) {
  background: #0056b3;
}

.submit-btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}
</style>

