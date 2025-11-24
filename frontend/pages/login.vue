<template>
  <div class="login-page">
    <div class="login-container">
      <h1>登录</h1>
      <form @submit.prevent="handleLogin" class="login-form">
        <div class="form-group">
          <label for="username">用户名</label>
          <input
            id="username"
            v-model="username"
            type="text"
            required
            placeholder="请输入用户名"
          />
        </div>
        <div class="form-group">
          <label for="password">密码</label>
          <input
            id="password"
            v-model="password"
            type="password"
            required
            placeholder="请输入密码"
          />
        </div>
        <div v-if="error" class="error-message">{{ error }}</div>
        <button type="submit" :disabled="loading" class="submit-btn">
          {{ loading ? '登录中...' : '登录' }}
        </button>
        <div class="register-link">
          还没有账号？
          <NuxtLink to="/register">立即注册</NuxtLink>
        </div>
      </form>
    </div>
  </div>
</template>

<script setup lang="ts">
const { fetchApi } = useApi();
const router = useRouter();
const username = ref('');
const password = ref('');
const loading = ref(false);
const error = ref<string | null>(null);

const handleLogin = async () => {
  loading.value = true;
  error.value = null;

  try {
    const data = await fetchApi('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ username: username.value, password: password.value }),
    });

    // 保存token和用户信息
    localStorage.setItem('token', data.token);
    localStorage.setItem('user', JSON.stringify(data.user));

    // 触发storage事件，更新其他标签页的用户状态
    window.dispatchEvent(new Event('storage'));

    // 跳转到首页
    router.push('/');
  } catch (err) {
    error.value = err instanceof Error ? err.message : '登录失败';
  } finally {
    loading.value = false;
  }
};

// 如果已登录，重定向到首页
onMounted(() => {
  const token = localStorage.getItem('token');
  if (token) {
    router.push('/');
  }
});
</script>

<style scoped>
.login-page {
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #f5f5f5;
}

.login-container {
  background: white;
  padding: 2rem 3rem;
  border-radius: 8px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  width: 100%;
  max-width: 400px;
}

h1 {
  margin: 0 0 2rem 0;
  text-align: center;
  color: #333;
}

.login-form {
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

.register-link {
  margin-top: 1rem;
  text-align: center;
  color: #666;
  font-size: 0.9rem;
}

.register-link a {
  color: #007bff;
  text-decoration: none;
}

.register-link a:hover {
  text-decoration: underline;
}
</style>

