<template>
  <div class="articles-page">
    <div class="page-header">
      <h1>文章列表</h1>
      <p class="page-subtitle">浏览和管理所有文章</p>
    </div>
    
    <div v-if="loading" class="loading">加载中...</div>
    <div v-else-if="error" class="error">{{ error }}</div>
    <div v-else-if="articles.length === 0" class="empty">
      <p>还没有文章</p>
      <NuxtLink to="/" class="back-link">返回首页获取新闻</NuxtLink>
    </div>
    <div v-else class="articles-list">
      <div 
        v-for="article in articles" 
        :key="article.id"
        class="article-item"
      >
        <h3>
          <NuxtLink :to="`/article/${article.id}`">
            {{ article.title || 'Untitled' }}
          </NuxtLink>
        </h3>
        <p class="meta">
          <span class="source">{{ article.source || '导入' }}</span>
          <span v-if="article.type" class="type">{{ getTypeDisplay(article.type) }}</span>
          <span class="date">{{ formatDate(article.createdAt) }}</span>
          <button 
            class="delete-btn"
            @click="deleteArticle(article.id!)"
            title="删除文章"
          >
            🗑️
          </button>
        </p>
        <p class="preview">{{ getPreview(article.content) }}</p>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { Article } from '~/types/article';

// 应用认证中间件
definePageMeta({
  middleware: 'auth'
});

const { fetchApi } = useApi();
const articles = ref<Article[]>([]);
const loading = ref(true);
const error = ref<string | null>(null);

const loadArticles = async () => {
  loading.value = true;
  error.value = null;
  
  try {
    articles.value = await fetchApi('/articles');
  } catch (err) {
    error.value = err instanceof Error ? err.message : '加载文章失败';
  } finally {
    loading.value = false;
  }
};

const formatDate = (dateStr?: string) => {
  if (!dateStr) return '';
  return new Date(dateStr).toLocaleString('zh-CN');
};

const getPreview = (content?: string) => {
  if (!content) return '';
  return content.substring(0, 200) + (content.length > 200 ? '...' : '');
};

const getTypeDisplay = (type?: string | null) => {
  if (!type) {
    return '';
  }
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

const deleteArticle = async (id: number) => {
  if (!confirm('确定要删除这篇文章吗？')) return;
  
  try {
    await fetchApi(`/articles/${id}`, {
      method: 'DELETE',
    });
    await loadArticles();
  } catch (err) {
    alert('删除失败：' + (err instanceof Error ? err.message : '未知错误'));
  }
};

onMounted(() => {
  loadArticles();
});
</script>

<style scoped>
.articles-page {
  width: 100%;
}

.page-header {
  margin-bottom: 2rem;
}

.page-header h1 {
  margin-bottom: 0.5rem;
  color: #333;
  font-size: 2rem;
}

.page-subtitle {
  color: #666;
  font-size: 1rem;
  margin: 0;
}

.loading, .error, .empty {
  text-align: center;
  padding: 3rem;
  background: white;
  border-radius: 8px;
  box-shadow: 0 2px 4px rgba(0,0,0,0.1);
}

.error {
  color: #c33;
}

.empty p {
  margin-bottom: 1rem;
  color: #666;
}

.back-link {
  color: #007bff;
  text-decoration: none;
}

.back-link:hover {
  text-decoration: underline;
}

.articles-list {
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
}

.article-item {
  background: white;
  padding: 1.5rem;
  border-radius: 8px;
  box-shadow: 0 2px 4px rgba(0,0,0,0.1);
  transition: transform 0.2s, box-shadow 0.2s;
}

.article-item:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 8px rgba(0,0,0,0.15);
}

.article-item h3 {
  margin: 0 0 0.75rem 0;
}

.article-item h3 a {
  color: #007bff;
  text-decoration: none;
}

.article-item h3 a:hover {
  text-decoration: underline;
}

.meta {
  display: flex;
  gap: 1rem;
  color: #666;
  font-size: 0.9rem;
  margin-bottom: 0.75rem;
  flex-wrap: wrap;
}

.meta .source {
  font-weight: 500;
  color: #007bff;
}

.meta .type {
  padding: 0.15rem 0.5rem;
  background: #e3f2fd;
  color: #1976d2;
  border-radius: 12px;
}

.delete-btn {
  background: none;
  border: none;
  cursor: pointer;
  font-size: 1rem;
  padding: 0.25rem 0.5rem;
  opacity: 0.6;
  transition: opacity 0.2s;
}

.delete-btn:hover {
  opacity: 1;
}

.preview {
  color: #555;
  line-height: 1.6;
}
</style>

