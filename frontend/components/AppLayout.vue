<template>
  <div class="app-layout">
    <nav class="navbar">
      <div class="nav-container">
        <NuxtLink to="/" class="logo">📚 ReadCast</NuxtLink>
        <div class="nav-links">
          <NuxtLink
            to="/"
            class="nav-link"
            :class="{ active: isActive('/') && route.path === '/' }"
            >首页</NuxtLink
          >
          <NuxtLink
            to="/articles"
            class="nav-link"
            :class="{ active: isActive('/articles') }"
            >文章列表</NuxtLink
          >
          <NuxtLink
            to="/favorites"
            class="nav-link"
            :class="{ active: isActive('/favorites') }"
            >收藏</NuxtLink
          >
          <template v-if="user">
            <span class="user-info">{{ user.username }}</span>
            <NuxtLink v-if="user.role === 'admin'" to="/admin" class="nav-link"
              >管理员</NuxtLink
            >
            <button @click="handleLogout" class="logout-btn">退出</button>
          </template>
          <template v-else>
            <NuxtLink to="/my" class="nav-link">我的</NuxtLink>
          </template>
        </div>
      </div>
    </nav>
    <main class="main-content">
      <slot />
    </main>
  </div>
</template>

<script setup lang="ts">
const route = useRoute();
const router = useRouter();

const user = ref<any>(null);

const loadUser = () => {
  const userStr = localStorage.getItem("user");
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

const handleLogout = () => {
  localStorage.removeItem("token");
  localStorage.removeItem("user");
  user.value = null;
  // 触发storage事件，更新其他标签页的用户状态
  window.dispatchEvent(new Event("storage"));
  router.push("/my");
};

const isActive = (path: string) => {
  if (path === "/") {
    return route.path === "/";
  }
  return route.path.startsWith(path);
};

onMounted(() => {
  loadUser();
  // 监听storage变化（用于跨标签页同步）
  window.addEventListener("storage", loadUser);
});

onUnmounted(() => {
  window.removeEventListener("storage", loadUser);
});
</script>

<style scoped>
.app-layout {
  min-height: 100vh;
  display: flex;
  flex-direction: column;
}

.navbar {
  background: #fff;
  border-bottom: 1px solid #e0e0e0;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
  position: sticky;
  top: 0;
  z-index: 100;
}

.nav-container {
  max-width: 1400px;
  margin: 0 auto;
  padding: 0 2rem;
  display: flex;
  justify-content: space-between;
  align-items: center;
  height: 60px;
}

.logo {
  font-size: 1.5rem;
  font-weight: 700;
  color: #007bff;
  text-decoration: none;
  display: flex;
  align-items: center;
  gap: 0.5rem;
  transition: color 0.2s;
}

.logo:hover {
  color: #0056b3;
}

.nav-links {
  display: flex;
  gap: 2rem;
  align-items: center;
}

.nav-link {
  color: #333;
  text-decoration: none;
  font-size: 1rem;
  padding: 0.5rem 0;
  border-bottom: 2px solid transparent;
  transition: all 0.2s;
}

.nav-link:hover,
.nav-link.active,
.nav-link.router-link-active {
  color: #007bff;
  border-bottom-color: #007bff;
}

.user-info {
  color: #666;
  font-size: 0.9rem;
  margin-right: 1rem;
}

.logout-btn {
  background: #dc3545;
  color: white;
  border: none;
  padding: 0.5rem 1rem;
  border-radius: 4px;
  cursor: pointer;
  font-size: 0.9rem;
  transition: background 0.2s;
}

.logout-btn:hover {
  background: #c82333;
}

.main-content {
  flex: 1;
  max-width: 1400px;
  width: 100%;
  margin: 0 auto;
  padding: 2rem;
}
</style>
