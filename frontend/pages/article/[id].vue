<template>
  <div class="article-page-container">
    <div v-if="loading" class="loading">加载中...</div>
    <div v-else-if="error" class="error">{{ error }}</div>
    <div v-else-if="article" class="article-layout">
      <!-- 顶部导航栏 -->
      <div class="top-bar">
        <button @click="goBack" class="back-link">← 返回</button>
        <div class="article-title">
          <h1>{{ article.title || 'Untitled' }}</h1>
          <div class="meta">
            <span v-if="article.source">{{ article.source }}</span>
            <span v-if="article.type" class="type-tag">{{ getTypeDisplay(article.type) }}</span>
            <span v-if="article.createdAt">{{ formatDate(article.createdAt) }}</span>
          </div>
        </div>
        <div class="action-icons">
          <button 
            @click="summarizeArticle" 
            :disabled="summarizing"
            class="icon-btn"
            title="总结文章"
          >
            📝
          </button>
          <button 
            @click="extractKeywords" 
            :disabled="extractingKeywords"
            class="icon-btn"
            title="提取关键词"
          >
            🏷️
          </button>
          <button 
            class="icon-btn"
            :class="{ favorited: isFavorited }"
            @click="toggleFavorite"
            title="收藏文章"
          >
            {{ isFavorited ? '★' : '☆' }}
          </button>
          <button 
            @click="showReadCastDialog = true"
            class="icon-btn"
            title="ReadCast"
          >
            📄
          </button>
        </div>
      </div>

      <!-- 主要内容区域：左右分栏 -->
      <div class="main-content">
        <!-- 左侧：文章内容和背景信息 -->
        <div class="left-panel">
          <!-- 故事背景和主题词 -->
          <div v-if="storyline || keywords.length > 0" class="background-section">
            <div v-if="storyline" class="storyline-box">
              <h3>📖 故事背景</h3>
              <p>{{ storyline.background || storyline.storyline }}</p>
            </div>
            <div v-if="keywords.length > 0" class="keywords-box">
              <h3>🏷️ 主题词</h3>
              <div class="keywords-list">
                <span v-for="(keyword, idx) in keywords" :key="idx" class="keyword-tag">
                  {{ keyword }}
                </span>
              </div>
            </div>
          </div>

          <!-- 文章内容 -->
          <div class="article-content-panel">
            <ArticleReader 
              :content="article.content"
              :favorite-sentences="favoriteSentences"
              @text-selected="handleTextSelected"
              @favorite-clicked="handleFavoriteClicked"
            />
          </div>
        </div>

        <!-- 右侧：知识面板（吸顶） -->
        <div class="right-panel">
          <KnowledgePanel
            :selected-text="selectedText"
            :article-id="articleId"
            :article="article"
            :summary="summary"
            :keywords="keywords"
            :storyline="storyline"
            @favorite="handleFavoriteSentence"
            @clear="clearSelection"
          />
        </div>
      </div>

      <!-- ReadCast对话框 -->
      <ReadCastDialog
        :show="showReadCastDialog"
        :article-id="articleId"
        :article-type="article?.type"
        @close="showReadCastDialog = false"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import type { Article } from '~/types/article';

// 应用认证中间件
definePageMeta({
  middleware: 'auth'
});

const route = useRoute();
const router = useRouter();
const { fetchApi } = useApi();
const articleId = computed(() => {
  const id = route.params.id as string;
  const parsed = parseInt(id);
  return !isNaN(parsed) && parsed > 0 ? parsed : null;
});

const article = ref<Article | null>(null);
const loading = ref(true);
const error = ref<string | null>(null);
const isFavorited = ref(false);
const selectedText = ref('');
const summary = ref('');
const summarizing = ref(false);
const keywords = ref<string[]>([]);
const extractingKeywords = ref(false);
const storyline = ref<any>(null);
const favoriteSentences = ref<any[]>([]);
const showReadCastDialog = ref(false);

const loadArticle = async () => {
  if (!articleId.value) {
    error.value = '无效的文章ID';
    loading.value = false;
    return;
  }
  
  loading.value = true;
  error.value = null;
  
  try {
    article.value = await fetchApi(`/articles/${articleId.value}`);
    await checkFavoriteStatus();
    await loadFavoriteSentences();
  } catch (err) {
    error.value = err instanceof Error ? err.message : '加载文章失败';
  } finally {
    loading.value = false;
  }
};

const loadFavoriteSentences = async () => {
  if (!articleId.value) return;
  
  try {
    const sentences = await fetchApi(`/favorites/sentences?articleId=${articleId.value}`);
    favoriteSentences.value = sentences;
  } catch (err) {
    console.error('Failed to load favorite sentences:', err);
  }
};

const checkFavoriteStatus = async () => {
  if (!articleId.value) return;
  
  try {
    const data = await fetchApi(`/favorites/${articleId.value}/status`);
    isFavorited.value = data.favorited;
  } catch (err) {
    console.error('Failed to check favorite status:', err);
  }
};

const toggleFavorite = async () => {
  if (!articleId.value) return;
  
  try {
    const data = await fetchApi(`/favorites/${articleId.value}`, {
      method: 'POST',
    });
    isFavorited.value = data.favorited;
  } catch (err) {
    console.error('Failed to toggle favorite:', err);
  }
};

const summarizeArticle = async () => {
  if (!article.value || !articleId.value) return;
  
  summarizing.value = true;
  try {
    const data = await fetchApi(`/articles/${articleId.value}/summary`, {
      method: 'POST',
    });
    summary.value = data.summary;
    
    // 刷新文章数据，以便显示新分类的主题标签
    await loadArticle();
  } catch (err) {
    console.error('Failed to summarize:', err);
  } finally {
    summarizing.value = false;
  }
};

const extractKeywords = async () => {
  if (!article.value || !articleId.value) return;
  
  extractingKeywords.value = true;
  try {
    const data = await fetchApi(`/articles/${articleId.value}/keywords`, {
      method: 'POST',
    });
    keywords.value = data.keywords.keywords || [];
    
    // 同时获取故事线
    try {
      const storylineData = await fetchApi(`/text/storyline`, {
        method: 'POST',
        body: JSON.stringify({
          text: article.value.content.substring(0, 2000),
          articleId: articleId.value
        }),
      });
      storyline.value = typeof storylineData.result === 'string' 
        ? JSON.parse(storylineData.result) 
        : storylineData.result;
    } catch (e) {
      console.error('Failed to get storyline:', e);
    }
    
    // 刷新文章数据，以便显示新分类的主题标签
    await loadArticle();
  } catch (err) {
    console.error('Failed to extract keywords:', err);
  } finally {
    extractingKeywords.value = false;
  }
};

const handleTextSelected = (text: string) => {
  selectedText.value = text;
};

const handleFavoriteClicked = (favorite: any) => {
  // 当点击收藏的高亮句子时，显示保存的AI搜索结果
  selectedText.value = favorite.sentence || favorite.originalSentence || '';
  // 触发显示AI结果的事件
  showFavoriteResults.value = favorite;
};

const handleFavoriteSentence = async () => {
  await loadFavoriteSentences();
};

const showFavoriteResults = ref<any>(null);

const clearSelection = () => {
  selectedText.value = '';
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

const goBack = () => {
  // 使用浏览器历史记录返回上一页
  if (window.history.length > 1) {
    router.back();
  } else {
    // 如果没有历史记录，默认返回首页
    router.push('/');
  }
};

onMounted(() => {
  loadArticle();
});
</script>

<style scoped>
.article-page-container {
  width: 100%;
  height: 100vh;
  display: flex;
  flex-direction: column;
  background: #f5f5f5;
  overflow: hidden;
}

.loading, .error {
  padding: 2rem;
  text-align: center;
}

.error {
  color: #c33;
}

.article-layout {
  display: flex;
  flex-direction: column;
  height: 100%;
  overflow: hidden;
}

.top-bar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 1rem 2rem;
  background: white;
  border-bottom: 1px solid #e0e0e0;
  flex-shrink: 0;
}

.back-link {
  background: none;
  border: none;
  color: #007bff;
  text-decoration: none;
  font-size: 1rem;
  white-space: nowrap;
  cursor: pointer;
  padding: 0;
  font-family: inherit;
}

.back-link:hover {
  text-decoration: underline;
}

.article-title {
  flex: 1;
  margin: 0 2rem;
}

.article-title h1 {
  margin: 0 0 0.25rem 0;
  font-size: 1.3rem;
  color: #333;
}

.meta {
  color: #666;
  font-size: 0.85rem;
}

.meta span {
  margin-right: 1rem;
}

.action-icons {
  display: flex;
  gap: 0.75rem;
  align-items: center;
}

.icon-btn {
  width: 40px;
  height: 40px;
  border-radius: 50%;
  border: 1px solid #ddd;
  background: white;
  cursor: pointer;
  font-size: 1.2rem;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s;
}

.icon-btn:hover:not(:disabled) {
  background: #f0f0f0;
  transform: scale(1.05);
}

.icon-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.icon-btn.favorited {
  background: #ffd700;
  border-color: #ffd700;
}

.main-content {
  display: flex;
  flex: 1;
  overflow: hidden;
}

.left-panel {
  flex: 1;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  background: white;
}

.background-section {
  padding: 1.5rem 2rem;
  background: #f8f9fa;
  border-bottom: 1px solid #e0e0e0;
  flex-shrink: 0;
}

.storyline-box,
.keywords-box {
  margin-bottom: 1rem;
}

.storyline-box:last-child,
.keywords-box:last-child {
  margin-bottom: 0;
}

.storyline-box h3,
.keywords-box h3 {
  margin: 0 0 0.75rem 0;
  font-size: 1rem;
  color: #333;
}

.storyline-box p {
  margin: 0;
  color: #555;
  line-height: 1.6;
}

.keywords-list {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
}

.keyword-tag {
  padding: 0.25rem 0.75rem;
  background: #e3f2fd;
  color: #1976d2;
  border-radius: 12px;
  font-size: 0.9rem;
}

.article-content-panel {
  flex: 1;
  overflow-y: auto;
  padding: 2rem;
}

.right-panel {
  width: 450px;
  border-left: 1px solid #e0e0e0;
  background: white;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}
</style>
