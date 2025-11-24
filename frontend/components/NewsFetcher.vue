<template>
  <div class="news-fetcher">
    <div class="fetch-controls">
      <h3>获取新闻</h3>
      <div class="selectors">
        <div class="category-selector">
          <label>分类：</label>
          <select v-model="selectedCategory">
            <option value="all">全部</option>
            <option value="sports">体育</option>
            <option value="politics">政治</option>
            <option value="technology">科技</option>
            <option value="business">商业</option>
            <option value="science">科学</option>
            <option value="entertainment">娱乐</option>
          </select>
        </div>
        <div class="source-selector">
          <label>数据源：</label>
          <select v-model="selectedSource">
            <option value="all">全部来源</option>
            <option value="guardian">The Guardian (API)</option>
            <option value="hackernews">Hacker News (API)</option>
            <option value="reddit">Reddit (API)</option>
          </select>
        </div>
      </div>
      <button 
        class="fetch-btn"
        @click="fetchNews"
        :disabled="loading"
      >
        {{ loading ? '获取中...' : '获取新闻' }}
      </button>
    </div>

      <!-- 导入新闻部分 -->
    <div class="import-section">
      <div class="section-header">
        <h4>导入新闻</h4>
        <div class="import-tabs">
          <button 
            :class="{ active: importType === 'url' }"
            @click="importType = 'url'"
          >
            URL
          </button>
          <button 
            :class="{ active: importType === 'text' }"
            @click="importType = 'text'"
          >
            文本
          </button>
        </div>
      </div>
      
      <div class="import-tip" v-if="importType === 'url'">
        <p>💡 <strong>提示</strong>：某些网站可能阻止自动访问。如果URL导入失败，请使用"文本"方式：打开文章页面，复制全文内容后粘贴导入。</p>
      </div>

      <div v-if="importType === 'url'" class="import-url">
        <input 
          v-model="importUrl"
          type="url"
          placeholder="输入文章URL..."
          class="url-input"
        />
        <button 
          class="import-btn"
          @click="importFromUrl"
          :disabled="!importUrl || importing"
        >
          {{ importing ? '导入中...' : '导入' }}
        </button>
      </div>

      <div v-if="importType === 'text'" class="import-text">
        <input 
          v-model="importTitle"
          type="text"
          placeholder="文章标题（可选）..."
          class="title-input"
        />
        <textarea 
          v-model="importContent"
          placeholder="粘贴文章内容..."
          rows="8"
          class="content-textarea"
        ></textarea>
        <div class="import-actions">
          <button 
            class="ai-clean-btn"
            @click="aiCleanArticle"
            :disabled="!importContent || cleaning"
          >
            {{ cleaning ? 'AI解析中...' : '🤖 AI解析文章' }}
          </button>
          <button 
            class="import-btn"
            @click="importFromText"
            :disabled="!importContent || importing"
          >
            {{ importing ? '导入中...' : '导入' }}
          </button>
        </div>
      </div>

      <div v-if="cleanedArticle" class="cleaned-preview">
        <div class="preview-header">
          <h5>AI解析结果</h5>
          <button class="close-preview" @click="cleanedArticle = null">×</button>
        </div>
        <div class="preview-content">
          <div class="preview-title">
            <strong>标题：</strong>{{ cleanedArticle.title }}
          </div>
          <div class="preview-text">
            <strong>内容：</strong>
            <div class="text-content">{{ cleanedArticle.content.substring(0, 500) }}{{ cleanedArticle.content.length > 500 ? '...' : '' }}</div>
          </div>
          <div v-if="cleanedArticle.removedElements && cleanedArticle.removedElements.length > 0" class="removed-elements">
            <strong>已移除：</strong>
            <ul>
              <li v-for="(item, idx) in cleanedArticle.removedElements" :key="idx">{{ item }}</li>
            </ul>
          </div>
          <button 
            class="use-cleaned-btn"
            @click="useCleanedArticle"
          >
            使用AI解析结果
          </button>
        </div>
      </div>
    </div>

    <div v-if="error" class="error">{{ error }}</div>

    <div v-if="news.length > 0" class="news-list">
      <div 
        v-for="item in news" 
        :key="item.url"
        class="news-item"
      >
        <h4>{{ item.title }}</h4>
        <p class="source">{{ item.source }} • {{ formatDate(item.publishedAt) }}</p>
        <p class="preview">{{ item.content.substring(0, 200) }}...</p>
        <div class="actions">
          <button 
            class="save-btn"
            @click="saveArticle(item)"
            :disabled="saving"
          >
            {{ saving ? '保存中...' : '保存文章' }}
          </button>
          <NuxtLink 
            :to="`/article/${item.id}`" 
            v-if="item.id"
            class="view-btn"
          >
            查看
          </NuxtLink>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { NewsArticle } from '~/types/news';

const { fetchApi } = useApi();

const selectedCategory = ref<'all' | 'sports' | 'politics' | 'technology' | 'business' | 'science' | 'entertainment'>('all');
const selectedSource = ref<'all' | 'guardian' | 'hackernews' | 'reddit'>('all');
const loading = ref(false);
const saving = ref(false);
const error = ref<string | null>(null);
const news = ref<Array<NewsArticle & { id?: number }>>([]);

// 导入新闻相关
const importType = ref<'url' | 'text'>('url');
const importUrl = ref('');
const importTitle = ref('');
const importContent = ref('');
const importing = ref(false);
const cleaning = ref(false);
const cleanedArticle = ref<any>(null);

const fetchNews = async () => {
  loading.value = true;
  error.value = null;
  news.value = []; // 清空之前的新闻
  
  try {
    const articles = await fetchApi(`/news/fetch?category=${selectedCategory.value}&source=${selectedSource.value}&count=10`);
    if (Array.isArray(articles)) {
      news.value = articles;
      if (articles.length === 0) {
        error.value = '未获取到新闻，请尝试其他分类或数据源';
      }
    } else {
      error.value = '返回数据格式错误';
    }
  } catch (err: any) {
    console.error('Fetch news error:', err);
    error.value = err.message || err.error || '获取新闻失败';
    if (err.suggestion) {
      error.value += `\n提示：${err.suggestion}`;
    }
  } finally {
    loading.value = false;
  }
};

const saveArticle = async (item: NewsArticle) => {
  saving.value = true;
  try {
    // 清理HTML标签
    const cleanContent = item.content
      .replace(/<[^>]*>/g, '')
      .replace(/&nbsp;/g, ' ')
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&quot;/g, '"')
      .replace(/\s+/g, ' ')
      .trim();
    
    // 直接保存这篇文章
    const article = await fetchApi('/articles', {
      method: 'POST',
      body: JSON.stringify({
        title: item.title,
        content: cleanContent,
        url: item.url,
        source: item.source
      }),
    });
    
    // 更新新闻项，添加ID
    const index = news.value.findIndex(n => n.url === item.url);
    if (index !== -1) {
      news.value[index].id = article.id;
    }
  } catch (err) {
    console.error('Failed to save article:', err);
    error.value = '保存文章失败，请重试';
  } finally {
    saving.value = false;
  }
};

const formatDate = (dateStr?: string) => {
  if (!dateStr) return '';
  return new Date(dateStr).toLocaleString('zh-CN');
};

const importFromUrl = async () => {
  if (!importUrl.value.trim()) return;
  
  importing.value = true;
  error.value = null;
  
  try {
    // 先使用AI清理
    const cleaned = await fetchApi('/articles/clean', {
      method: 'POST',
      body: JSON.stringify({
        url: importUrl.value.trim()
      }),
    });
    
    // 创建文章
    const article = await fetchApi('/articles', {
      method: 'POST',
      body: JSON.stringify({
        title: cleaned.title,
        content: cleaned.content,
        url: importUrl.value.trim()
      }),
    });
    
    // 重置表单
    importUrl.value = '';
    
    // 导航到文章页面
    await navigateTo(`/article/${article.id}`);
  } catch (err: any) {
    // 显示更友好的错误信息
    let errorMsg = err.error || err.message || '导入失败';
    
    if (err.isStrictSite) {
      // 如果是严格网站（CNN等），提供特殊提示
      errorMsg = `${errorMsg}\n\n💡 解决方案：\n${err.suggestion || ''}`;
      if (err.alternative) {
        errorMsg += `\n\n${err.alternative}`;
      }
      errorMsg += '\n\n📋 操作步骤：\n1. 打开文章页面\n2. 复制全文内容（Ctrl+A / Cmd+A，然后复制）\n3. 切换到"文本"标签\n4. 粘贴内容\n5. 点击"AI解析文章"进行清理';
    } else if (err.suggestion) {
      errorMsg = `${errorMsg}\n提示：${err.suggestion}`;
    } else {
      errorMsg = `${errorMsg}\n请检查URL是否正确或稍后重试`;
    }
    
    error.value = errorMsg;
  } finally {
    importing.value = false;
  }
};

const aiCleanArticle = async () => {
  if (!importContent.value.trim()) return;
  
  cleaning.value = true;
  error.value = null;
  
  try {
    const cleaned = await fetchApi('/articles/clean', {
      method: 'POST',
      body: JSON.stringify({
        content: importContent.value.trim(),
        title: importTitle.value.trim() || undefined
      }),
    });
    
    cleanedArticle.value = cleaned;
  } catch (err: any) {
    // 显示更友好的错误信息
    if (err.suggestion) {
      error.value = `${err.message || 'AI解析失败'}\n提示：${err.suggestion}`;
    } else {
      error.value = err.message || 'AI解析失败，请稍后重试';
    }
    console.error('AI clean error:', err);
  } finally {
    cleaning.value = false;
  }
};

const useCleanedArticle = () => {
  if (cleanedArticle.value) {
    importTitle.value = cleanedArticle.value.title;
    importContent.value = cleanedArticle.value.content;
    cleanedArticle.value = null;
  }
};

const importFromText = async () => {
  if (!importContent.value.trim()) return;
  
  importing.value = true;
  error.value = null;
  
  try {
    const article = await fetchApi('/articles', {
      method: 'POST',
      body: JSON.stringify({
        title: importTitle.value.trim() || undefined,
        content: importContent.value.trim()
      }),
    });
    
    // 重置表单
    importTitle.value = '';
    importContent.value = '';
    cleanedArticle.value = null;
    
    // 导航到文章页面
    await navigateTo(`/article/${article.id}`);
  } catch (err) {
    error.value = err instanceof Error ? err.message : '导入失败';
  } finally {
    importing.value = false;
  }
};
</script>

<style scoped>
.news-fetcher {
  background: white;
  padding: 1.5rem;
  border-radius: 8px;
  box-shadow: 0 2px 4px rgba(0,0,0,0.1);
  margin-bottom: 2rem;
}

.fetch-controls {
  display: flex;
  align-items: center;
  gap: 1rem;
  margin-bottom: 1rem;
  flex-wrap: wrap;
}

.selectors {
  display: flex;
  gap: 1rem;
  align-items: center;
  flex-wrap: wrap;
}

.source-selector {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.source-selector select {
  padding: 0.5rem;
  border: 1px solid #ddd;
  border-radius: 4px;
}

.fetch-controls h3 {
  margin: 0;
}

.category-selector {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.category-selector select {
  padding: 0.5rem;
  border: 1px solid #ddd;
  border-radius: 4px;
}

.fetch-btn {
  padding: 0.5rem 1.5rem;
  background: #007bff;
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-size: 1rem;
}

.fetch-btn:hover:not(:disabled) {
  background: #0056b3;
}

.fetch-btn:disabled {
  background: #ccc;
  cursor: not-allowed;
}

.error {
  color: #c33;
  padding: 0.75rem;
  background: #fee;
  border-radius: 4px;
  margin-bottom: 1rem;
}

.news-list {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.news-item {
  padding: 1rem;
  border: 1px solid #e0e0e0;
  border-radius: 4px;
  background: #f9f9f9;
}

.news-item h4 {
  margin: 0 0 0.5rem 0;
  color: #333;
}

.source {
  color: #666;
  font-size: 0.9rem;
  margin-bottom: 0.5rem;
}

.preview {
  color: #555;
  line-height: 1.6;
  margin-bottom: 1rem;
}

.actions {
  display: flex;
  gap: 0.5rem;
}

.save-btn, .view-btn {
  padding: 0.5rem 1rem;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  text-decoration: none;
  font-size: 0.9rem;
}

.save-btn {
  background: #28a745;
  color: white;
}

.save-btn:hover:not(:disabled) {
  background: #218838;
}

.save-btn:disabled {
  background: #ccc;
  cursor: not-allowed;
}

.view-btn {
  background: #007bff;
  color: white;
  display: inline-block;
}

.view-btn:hover {
  background: #0056b3;
}

.import-section {
  margin-top: 2rem;
  padding: 1.5rem;
  background: #f8f9fa;
  border-radius: 8px;
  border: 1px solid #e0e0e0;
}

.import-tip {
  margin-bottom: 1rem;
  padding: 0.75rem 1rem;
  background: #fff3cd;
  border-left: 3px solid #ffc107;
  border-radius: 4px;
  font-size: 0.9rem;
  line-height: 1.6;
}

.import-tip p {
  margin: 0;
  color: #856404;
}

.section-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1rem;
}

.section-header h4 {
  margin: 0;
  color: #333;
}

.import-tabs {
  display: flex;
  gap: 0.5rem;
}

.import-tabs button {
  padding: 0.5rem 1rem;
  border: 1px solid #ddd;
  background: white;
  border-radius: 4px;
  cursor: pointer;
  font-size: 0.9rem;
  transition: all 0.2s;
}

.import-tabs button.active {
  background: #007bff;
  color: white;
  border-color: #007bff;
}

.import-url {
  display: flex;
  gap: 0.5rem;
}

.url-input {
  flex: 1;
  padding: 0.75rem;
  border: 1px solid #ddd;
  border-radius: 4px;
  font-size: 1rem;
}

.import-text {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.title-input {
  padding: 0.75rem;
  border: 1px solid #ddd;
  border-radius: 4px;
  font-size: 1rem;
}

.content-textarea {
  padding: 0.75rem;
  border: 1px solid #ddd;
  border-radius: 4px;
  font-size: 1rem;
  font-family: inherit;
  resize: vertical;
}

.import-actions {
  display: flex;
  gap: 0.5rem;
  justify-content: flex-end;
}

.ai-clean-btn {
  padding: 0.75rem 1.5rem;
  background: #9c27b0;
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-size: 1rem;
  transition: background 0.2s;
}

.ai-clean-btn:hover:not(:disabled) {
  background: #7b1fa2;
}

.ai-clean-btn:disabled {
  background: #ccc;
  cursor: not-allowed;
}

.import-btn {
  padding: 0.75rem 1.5rem;
  background: #28a745;
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-size: 1rem;
  transition: background 0.2s;
}

.import-btn:hover:not(:disabled) {
  background: #218838;
}

.import-btn:disabled {
  background: #ccc;
  cursor: not-allowed;
}

.cleaned-preview {
  margin-top: 1.5rem;
  padding: 1.5rem;
  background: white;
  border-radius: 8px;
  border: 2px solid #9c27b0;
}

.preview-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1rem;
}

.preview-header h5 {
  margin: 0;
  color: #9c27b0;
}

.close-preview {
  background: none;
  border: none;
  font-size: 1.5rem;
  cursor: pointer;
  color: #999;
  line-height: 1;
}

.close-preview:hover {
  color: #333;
}

.preview-content {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.preview-title {
  padding: 0.75rem;
  background: #f8f9fa;
  border-radius: 4px;
}

.preview-text {
  padding: 0.75rem;
  background: #f8f9fa;
  border-radius: 4px;
}

.text-content {
  margin-top: 0.5rem;
  line-height: 1.6;
  color: #555;
  white-space: pre-wrap;
}

.removed-elements {
  padding: 0.75rem;
  background: #fff3cd;
  border-radius: 4px;
  font-size: 0.9rem;
}

.removed-elements ul {
  margin: 0.5rem 0 0 1.5rem;
  padding: 0;
}

.removed-elements li {
  margin-bottom: 0.25rem;
  color: #856404;
}

.use-cleaned-btn {
  padding: 0.75rem 1.5rem;
  background: #9c27b0;
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-size: 1rem;
  transition: background 0.2s;
}

.use-cleaned-btn:hover {
  background: #7b1fa2;
}
</style>

