<template>
  <div class="container">
    <div class="header">
      <NuxtLink to="/" class="back-link">← 返回首页</NuxtLink>
      <h1>收藏的句子</h1>
    </div>

    <div v-if="loading" class="loading">加载中...</div>
    <div v-else-if="error" class="error">{{ error }}</div>
    <div v-else-if="sentences.length === 0" class="empty">
      <p>还没有收藏任何句子</p>
    </div>
    <div v-else class="sentences-list">
      <div 
        v-for="sentence in sentences" 
        :key="sentence.id" 
        class="sentence-item"
      >
        <div class="sentence-header">
          <h3 v-if="sentence.articleTitle">
            <NuxtLink :to="`/article/${sentence.articleId}`">
              {{ sentence.articleTitle }}
            </NuxtLink>
          </h3>
          <span class="agent-type" v-if="sentence.agentType">
            {{ sentence.agentType }}
          </span>
        </div>
        <!-- 显示原句，选中部分高亮 -->
        <div 
          class="sentence-text" 
          v-html="getHighlightedSentence(sentence)"
        ></div>
        <div v-if="sentence.explanation" class="explanation">
          <strong>AI解释：</strong>
          <p>{{ sentence.explanation }}</p>
        </div>
        <div class="meta">
          收藏于 {{ formatDate(sentence.createdAt) }}
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
const { fetchApi } = useApi();
const sentences = ref<any[]>([]);
const loading = ref(true);
const error = ref<string | null>(null);

const loadSentences = async () => {
  loading.value = true;
  error.value = null;
  
  try {
    sentences.value = await fetchApi('/favorites/sentences');
  } catch (err) {
    error.value = err instanceof Error ? err.message : '加载收藏失败';
  } finally {
    loading.value = false;
  }
};

const formatDate = (dateStr?: string) => {
  if (!dateStr) return '';
  return new Date(dateStr).toLocaleString('zh-CN');
};

// 根据背景色计算合适的文字颜色
const getTextColor = (backgroundColor: string) => {
  if (!backgroundColor) return '#333';
  
  // 移除 # 号
  const hex = backgroundColor.replace('#', '');
  
  // 转换为 RGB
  const r = parseInt(hex.substr(0, 2), 16);
  const g = parseInt(hex.substr(2, 2), 16);
  const b = parseInt(hex.substr(4, 2), 16);
  
  // 计算亮度
  const brightness = (r * 299 + g * 587 + b * 114) / 1000;
  
  // 如果背景色较亮，使用深色文字；否则使用浅色文字
  return brightness > 155 ? '#333' : '#fff';
};

// 在原句中高亮显示选中的文本
const getHighlightedSentence = (sentence: any) => {
  const originalSentence = sentence.originalSentence || sentence.sentence;
  const selectedText = sentence.sentence;
  const highlightColor = sentence.highlightColor || '#ffeb3b';
  const textColor = getTextColor(highlightColor);
  
  // 如果原句和选中文本相同，直接返回
  if (originalSentence === selectedText) {
    return `<span style="background-color: ${highlightColor}; color: ${textColor}; padding: 2px 4px; border-radius: 3px;">${escapeHtml(originalSentence)}</span>`;
  }
  
  // 在原句中查找选中文本的位置（不区分大小写）
  const lowerOriginal = originalSentence.toLowerCase();
  const lowerSelected = selectedText.toLowerCase();
  const index = lowerOriginal.indexOf(lowerSelected);
  
  if (index === -1) {
    // 如果找不到，显示原句，选中文本单独高亮
    return `${escapeHtml(originalSentence)} <span style="background-color: ${highlightColor}; color: ${textColor}; padding: 2px 4px; border-radius: 3px; margin-left: 0.5rem;">[${escapeHtml(selectedText)}]</span>`;
  }
  
  // 在原句中高亮显示选中的部分
  const before = originalSentence.substring(0, index);
  const selected = originalSentence.substring(index, index + selectedText.length);
  const after = originalSentence.substring(index + selectedText.length);
  
  return `${escapeHtml(before)}<span style="background-color: ${highlightColor}; color: ${textColor}; padding: 2px 4px; border-radius: 3px; font-weight: 500;">${escapeHtml(selected)}</span>${escapeHtml(after)}`;
};

// HTML 转义
const escapeHtml = (text: string) => {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
};

onMounted(() => {
  loadSentences();
});
</script>

<style scoped>
.container {
  max-width: 1200px;
  margin: 0 auto;
  padding: 2rem;
}

.header {
  margin-bottom: 2rem;
}

.back-link {
  color: #007bff;
  text-decoration: none;
  margin-bottom: 1rem;
  display: inline-block;
}

.back-link:hover {
  text-decoration: underline;
}

h1 {
  margin-top: 1rem;
  color: #333;
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

.sentences-list {
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
}

.sentence-item {
  background: white;
  padding: 1.5rem;
  border-radius: 8px;
  box-shadow: 0 2px 4px rgba(0,0,0,0.1);
}

.sentence-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1rem;
}

.sentence-header h3 {
  margin: 0;
}

.sentence-header h3 a {
  color: #007bff;
  text-decoration: none;
}

.sentence-header h3 a:hover {
  text-decoration: underline;
}

.agent-type {
  padding: 0.25rem 0.75rem;
  background: #e3f2fd;
  color: #1976d2;
  border-radius: 12px;
  font-size: 0.85rem;
}

.sentence-text {
  font-size: 1.1rem;
  line-height: 1.8;
  margin-bottom: 1rem;
  padding: 1rem 1.25rem;
  border-radius: 6px;
  background: #f8f9fa;
  border-left: 3px solid #007bff;
  word-break: break-word;
  color: #333;
}

.explanation {
  margin-top: 1rem;
  padding: 1rem;
  background: #fff9e6;
  border-radius: 4px;
}

.explanation strong {
  color: #666;
  display: block;
  margin-bottom: 0.5rem;
}

.explanation p {
  margin: 0;
  color: #555;
  line-height: 1.6;
}

.meta {
  margin-top: 1rem;
  color: #999;
  font-size: 0.9rem;
}
</style>

