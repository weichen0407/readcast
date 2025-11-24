<template>
  <div class="register-page">
    <div class="register-container">
      <h1>注册</h1>
      <form @submit.prevent="handleRegister" class="register-form">
        <div class="form-group">
          <label for="username">用户名</label>
          <input
            id="username"
            v-model="username"
            type="text"
            required
            minlength="3"
            placeholder="至少3个字符"
          />
        </div>
        <div class="form-group">
          <label for="email">邮箱（可选）</label>
          <input
            id="email"
            v-model="email"
            type="email"
            placeholder="请输入邮箱"
          />
        </div>
        <div class="form-group">
          <label for="password">密码</label>
          <input
            id="password"
            v-model="password"
            type="password"
            required
            minlength="6"
            placeholder="至少6个字符"
          />
        </div>
        <div class="form-group">
          <label for="confirmPassword">确认密码</label>
          <input
            id="confirmPassword"
            v-model="confirmPassword"
            type="password"
            required
            placeholder="请再次输入密码"
          />
        </div>
        <div v-if="error" class="error-message">{{ error }}</div>
        <button type="submit" :disabled="loading" class="submit-btn">
          {{ loading ? '注册中...' : '注册' }}
        </button>
        <div class="login-link">
          已有账号？
          <NuxtLink to="/login">立即登录</NuxtLink>
        </div>
      </form>
    </div>
  </div>
</template>

<script setup lang="ts">
const { fetchApi } = useApi();
const router = useRouter();
const username = ref('');
const email = ref('');
const password = ref('');
const confirmPassword = ref('');
const loading = ref(false);
const error = ref<string | null>(null);

const handleRegister = async () => {
  error.value = null;

  if (password.value !== confirmPassword.value) {
    error.value = '两次输入的密码不一致';
    return;
  }

  loading.value = true;

  try {
    await fetchApi('/auth/register', {
      method: 'POST',
      body: JSON.stringify({
        username: username.value,
        password: password.value,
        email: email.value || undefined,
      }),
    });

    // 注册成功后跳转到登录页
    alert('注册成功！请登录');
    router.push('/login');
  } catch (err) {
    error.value = err instanceof Error ? err.message : '注册失败';
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
.register-page {
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #f5f5f5;
}

.register-container {
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

.register-form {
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

.login-link {
  margin-top: 1rem;
  text-align: center;
  color: #666;
  font-size: 0.9rem;
}

.login-link a {
  color: #007bff;
  text-decoration: none;
}

.login-link a:hover {
  text-decoration: underline;
}
</style>

