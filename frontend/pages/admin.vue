<template>
  <div class="admin-page">
    <div class="admin-header">
      <h1>管理员后台</h1>
      <div class="header-actions">
        <button @click="logout" class="logout-btn">退出登录</button>
      </div>
    </div>

    <div v-if="loading" class="loading">加载中...</div>
    <div v-else-if="error" class="error">{{ error }}</div>
    <div v-else class="admin-content">
      <!-- 统计卡片 -->
      <div class="stats-grid">
        <div class="stat-card">
          <h3>用户总数</h3>
          <p class="stat-number">{{ userStats.totalUsers || 0 }}</p>
          <p class="stat-detail">管理员: {{ userStats.adminUsers || 0 }} | 普通用户: {{ userStats.regularUsers || 0 }}</p>
        </div>
        <div class="stat-card">
          <h3>收藏文章</h3>
          <p class="stat-number">{{ favoriteStats.totalFavorites || 0 }}</p>
          <p class="stat-detail">用户数: {{ favoriteStats.uniqueUsers || 0 }} | 文章数: {{ favoriteStats.uniqueArticles || 0 }}</p>
        </div>
        <div class="stat-card">
          <h3>收藏句子</h3>
          <p class="stat-number">{{ sentenceStats.totalSentences || 0 }}</p>
          <p class="stat-detail">涉及文章: {{ sentenceStats.uniqueArticles || 0 }}</p>
        </div>
      </div>

      <!-- 用户列表 -->
      <div class="section">
        <h2>用户列表</h2>
        <div v-if="users.length === 0" class="empty">暂无用户</div>
        <div v-else class="table-container">
          <table class="data-table">
            <thead>
              <tr>
                <th>ID</th>
                <th>用户名</th>
                <th>邮箱</th>
                <th>角色</th>
                <th>注册时间</th>
                <th>操作</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="user in users" :key="user.id">
                <td>{{ user.id }}</td>
                <td>{{ user.username }}</td>
                <td>{{ user.email || '-' }}</td>
                <td>
                  <span :class="['role-badge', user.role === 'admin' ? 'admin' : 'user']">
                    {{ user.role === 'admin' ? '管理员' : '普通用户' }}
                  </span>
                </td>
                <td>{{ formatDate(user.createdAt) }}</td>
                <td>
                  <button @click="viewUserFavorites(user.id)" class="action-btn">查看收藏</button>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <!-- 用户收藏详情（模态框） -->
      <div v-if="selectedUser" class="modal-overlay" @click="closeModal">
        <div class="modal-content" @click.stop>
          <div class="modal-header">
            <h3>用户收藏 - {{ selectedUser.username }}</h3>
            <button @click="closeModal" class="close-btn">×</button>
          </div>
          <div class="modal-body">
            <div v-if="userFavoritesLoading" class="loading">加载中...</div>
            <div v-else-if="userFavorites.length === 0" class="empty">该用户暂无收藏</div>
            <div v-else class="favorites-list">
              <div v-for="fav in userFavorites" :key="fav.id" class="favorite-item">
                <h4>{{ fav.title || 'Untitled' }}</h4>
                <p class="meta">
                  <span>来源: {{ fav.source || '-' }}</span>
                  <span>主题: {{ getTypeDisplay(fav.type) || '-' }}</span>
                  <span>收藏时间: {{ formatDate(fav.createdAt) }}</span>
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
const { fetchApi } = useApi();
const router = useRouter();

const loading = ref(true);
const error = ref<string | null>(null);
const users = ref<any[]>([]);
const userStats = ref<any>({});
const favoriteStats = ref<any>({});
const sentenceStats = ref<any>({});
const selectedUser = ref<any>(null);
const userFavorites = ref<any[]>([]);
const userFavoritesLoading = ref(false);

const loadData = async () => {
  loading.value = true;
  error.value = null;

  try {
    const token = localStorage.getItem('token');
    if (!token) {
      router.push('/login');
      return;
    }

    // 并行加载所有数据
    const [usersRes, userStatsRes, favoriteStatsRes, sentenceStatsRes] = await Promise.all([
      fetchApi('/admin/users', {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      }),
      fetchApi('/admin/statistics/users', {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      }),
      fetchApi('/admin/statistics/favorites', {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      }),
      fetchApi('/admin/statistics/favorite-sentences', {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      }),
    ]);

    users.value = usersRes.users || [];
    userStats.value = userStatsRes;
    favoriteStats.value = favoriteStatsRes;
    sentenceStats.value = sentenceStatsRes;
  } catch (err: any) {
    if (err.message?.includes('401') || err.message?.includes('403')) {
      error.value = '无权限访问，请使用管理员账号登录';
      setTimeout(() => router.push('/login'), 2000);
    } else {
      error.value = err instanceof Error ? err.message : '加载失败';
    }
  } finally {
    loading.value = false;
  }
};

const viewUserFavorites = async (userId: number) => {
  selectedUser.value = users.value.find(u => u.id === userId);
  userFavoritesLoading.value = true;
  userFavorites.value = [];

  try {
    const token = localStorage.getItem('token');
    const data = await fetchApi(`/admin/users/${userId}/favorites`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });
    userFavorites.value = data.favorites || [];
  } catch (err) {
    console.error('Failed to load user favorites:', err);
    alert('加载收藏失败');
  } finally {
    userFavoritesLoading.value = false;
  }
};

const closeModal = () => {
  selectedUser.value = null;
  userFavorites.value = [];
};

const logout = () => {
  localStorage.removeItem('token');
  localStorage.removeItem('user');
  router.push('/login');
};

const formatDate = (dateStr?: string) => {
  if (!dateStr) return '';
  return new Date(dateStr).toLocaleString('zh-CN');
};

const getTypeDisplay = (type?: string | null) => {
  if (!type) return '';
  const typeMap: Record<string, string> = {
    'sports': '体育',
    'politics': '政治',
    'technology': '科技',
    'business': '商业',
    'science': '科学',
    'entertainment': '娱乐',
    'general': '综合'
  };
  return typeMap[type] || type;
};

onMounted(() => {
  // 检查是否已登录且是管理员
  const token = localStorage.getItem('token');
  const userStr = localStorage.getItem('user');
  
  if (!token) {
    router.push('/login');
    return;
  }

  if (userStr) {
    try {
      const user = JSON.parse(userStr);
      if (user.role !== 'admin') {
        error.value = '无权限访问管理员后台';
        return;
      }
    } catch (e) {
      // 忽略解析错误
    }
  }

  loadData();
});
</script>

<style scoped>
.admin-page {
  width: 100%;
  padding: 2rem;
  background: #f5f5f5;
  min-height: 100vh;
}

.admin-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 2rem;
  background: white;
  padding: 1.5rem;
  border-radius: 8px;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
}

.admin-header h1 {
  margin: 0;
  color: #333;
}

.logout-btn {
  padding: 0.5rem 1rem;
  background: #dc3545;
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
}

.logout-btn:hover {
  background: #c82333;
}

.loading, .error {
  text-align: center;
  padding: 3rem;
  background: white;
  border-radius: 8px;
}

.error {
  color: #c33;
}

.stats-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
  gap: 1.5rem;
  margin-bottom: 2rem;
}

.stat-card {
  background: white;
  padding: 1.5rem;
  border-radius: 8px;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
}

.stat-card h3 {
  margin: 0 0 1rem 0;
  color: #666;
  font-size: 0.9rem;
}

.stat-number {
  font-size: 2rem;
  font-weight: bold;
  color: #007bff;
  margin: 0.5rem 0;
}

.stat-detail {
  margin: 0.5rem 0 0 0;
  color: #999;
  font-size: 0.85rem;
}

.section {
  background: white;
  padding: 1.5rem;
  border-radius: 8px;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
  margin-bottom: 2rem;
}

.section h2 {
  margin: 0 0 1.5rem 0;
  color: #333;
}

.table-container {
  overflow-x: auto;
}

.data-table {
  width: 100%;
  border-collapse: collapse;
}

.data-table th,
.data-table td {
  padding: 0.75rem;
  text-align: left;
  border-bottom: 1px solid #e0e0e0;
}

.data-table th {
  background: #f8f9fa;
  font-weight: 600;
  color: #555;
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

.action-btn {
  padding: 0.25rem 0.75rem;
  background: #007bff;
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-size: 0.85rem;
}

.action-btn:hover {
  background: #0056b3;
}

.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
}

.modal-content {
  background: white;
  border-radius: 8px;
  width: 90%;
  max-width: 800px;
  max-height: 80vh;
  display: flex;
  flex-direction: column;
}

.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 1.5rem;
  border-bottom: 1px solid #e0e0e0;
}

.modal-header h3 {
  margin: 0;
}

.close-btn {
  background: none;
  border: none;
  font-size: 2rem;
  cursor: pointer;
  color: #999;
}

.close-btn:hover {
  color: #333;
}

.modal-body {
  padding: 1.5rem;
  overflow-y: auto;
  flex: 1;
}

.favorites-list {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.favorite-item {
  padding: 1rem;
  background: #f8f9fa;
  border-radius: 4px;
}

.favorite-item h4 {
  margin: 0 0 0.5rem 0;
  color: #333;
}

.favorite-item .meta {
  display: flex;
  gap: 1rem;
  color: #666;
  font-size: 0.85rem;
}

.empty {
  text-align: center;
  padding: 2rem;
  color: #999;
}
</style>

