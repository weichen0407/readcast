<template>
  <div class="home-page">
    <h1>欢迎使用 ReadCast</h1>
    <p class="subtitle">智能英语学习平台 - 阅读、学习、播客</p>
    
    <!-- 新闻获取组件 -->
    <NewsFetcher />
    
    <!-- 最近文章 -->
    <div v-if="articles.length > 0" class="articles-section">
      <h2>最近文章</h2>
      <div class="articles-grid">
        <div 
          v-for="article in articles.slice(0, 6)" 
          :key="article.id"
          class="article-card"
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
          </p>
          <p class="preview">{{ getPreview(article.content) }}</p>
        </div>
      </div>
      <div class="view-all">
        <NuxtLink to="/articles" class="view-all-btn">查看所有文章 →</NuxtLink>
      </div>
    </div>
    
    <div v-else class="empty-state">
      <p>📰 还没有文章</p>
      <p class="hint">使用上方工具获取新闻或导入文章</p>
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

const loadArticles = async () => {
  try {
    articles.value = await fetchApi('/articles');
  } catch (err: any) {
    console.error('Failed to load articles:', err);
    // 静默失败，不显示错误（首页加载时可能还没有文章）
    // 如果需要，可以在这里添加错误提示
  }
};

const formatDate = (dateStr?: string) => {
  if (!dateStr) return '';
  return new Date(dateStr).toLocaleString('zh-CN');
};

const getPreview = (content?: string) => {
  if (!content) return '';
  return content.substring(0, 150) + (content.length > 150 ? '...' : '');
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

onMounted(() => {
  loadArticles();
});
</script>

<style scoped>
.home-page {
  width: 100%;
}

h1 {
  margin-bottom: 0.5rem;
  color: #333;
  text-align: center;
  font-size: 2.5rem;
  font-weight: 700;
}

.subtitle {
  text-align: center;
  color: #666;
  font-size: 1.1rem;
  margin-bottom: 2rem;
  font-weight: 400;
}

.articles-section {
  margin-top: 3rem;
}

.articles-section h2 {
  margin-bottom: 1.5rem;
  color: #333;
}

.articles-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(350px, 1fr));
  gap: 1.5rem;
  margin-bottom: 2rem;
}

.article-card {
  background: white;
  padding: 1.5rem;
  border-radius: 8px;
  box-shadow: 0 2px 4px rgba(0,0,0,0.1);
  transition: transform 0.2s, box-shadow 0.2s;
}

.article-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 8px rgba(0,0,0,0.15);
}

.article-card h3 {
  margin: 0 0 0.75rem 0;
  font-size: 1.1rem;
}

.article-card h3 a {
  color: #007bff;
  text-decoration: none;
}

.article-card h3 a:hover {
  text-decoration: underline;
}

.meta {
  display: flex;
  gap: 1rem;
  color: #666;
  font-size: 0.85rem;
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

.preview {
  color: #555;
  line-height: 1.6;
  font-size: 0.95rem;
}

.view-all {
  text-align: center;
  margin-top: 2rem;
}

.view-all-btn {
  display: inline-block;
  padding: 0.75rem 2rem;
  background: #007bff;
  color: white;
  text-decoration: none;
  border-radius: 4px;
  font-size: 1rem;
  transition: background 0.2s;
}

.view-all-btn:hover {
  background: #0056b3;
}

.empty-state {
  text-align: center;
  padding: 3rem;
  color: #666;
}

.empty-state .hint {
  margin-top: 0.5rem;
  color: #999;
  font-size: 0.9rem;
}
</style>

