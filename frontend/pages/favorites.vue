<template>
  <div class="favorites-page">
    <div class="page-header">
      <h1>我的收藏 - 收藏的句子</h1>
      <button 
        v-if="favorites.length > 0"
        @click="showReadCastDialog = true"
        class="readcast-btn"
        title="ReadCast"
      >
        📄 ReadCast
      </button>
    </div>

    <div v-if="loading" class="loading">加载中...</div>
    <div v-else-if="error" class="error">
      <p>{{ error }}</p>
      <button @click="loadFavorites" class="retry-btn">重试</button>
    </div>
    <div v-else-if="favorites.length === 0" class="empty">
      <p>还没有收藏任何句子</p>
      <p class="hint">提示：在文章中选择文本后，点击右侧面板的"收藏句子"按钮即可收藏</p>
      <NuxtLink to="/" class="back-link">返回首页</NuxtLink>
    </div>
    <div v-else class="favorites-list">
      <div 
        v-for="item in favorites" 
        :key="item.id" 
        class="favorite-item"
      >
        <div class="favorite-sentence">
          <div class="sentence-header">
            <div class="sentence-text-wrapper">
              <!-- 显示原句，选中部分高亮 -->
              <div 
                class="sentence-text" 
                v-html="getHighlightedSentence(item)"
              ></div>
            </div>
            <div class="sentence-actions">
              <button 
                v-if="item.articleId"
                class="icon-btn"
                @click="$router.push(`/article/${item.articleId}`)"
                title="跳转到原文"
              >
                📄
              </button>
              <button 
                class="icon-btn"
                @click="deleteFavorite(item.id)"
                title="删除收藏"
              >
                🗑️
              </button>
            </div>
          </div>
          
          <!-- 标签展示区域 -->
          <div class="tags-section">
            <!-- 标签列表（小标签样式） -->
            <div class="tags-list">
              <!-- 笔记标签（第一个，黄色） -->
              <span 
                class="tag-item tag-note"
                @click="toggleNoteEditor(item.id)"
              >
                📝 笔记
              </span>

              <!-- AI解释标签 -->
              <span 
                v-if="item.explanation" 
                class="tag-item tag-system"
                @click="showTagContent(item.id, 'explanation', item.explanation, '💡 AI解释')"
              >
                AI解释
              </span>

              <!-- AI搜索结果标签 -->
              <span 
                v-for="(result, idx) in getAgentResults(item)" 
                :key="`result-${idx}`"
                class="tag-item tag-system"
                @click="showTagContent(item.id, `result-${idx}`, result.content, `${getTagIcon(result.agentType || result.type)} ${result.agentType || result.type || 'AI结果'}`)"
              >
                {{ result.agentType || result.type || 'AI结果' }}
              </span>
            </div>

            <!-- 笔记输入框（点击笔记标签后显示） -->
            <div v-if="editingNoteId === item.id" class="note-editor-inline">
              <textarea 
                v-model="noteTexts[item.id]"
                class="note-textarea-inline"
                placeholder="记录你的想法..."
                rows="3"
                @keydown.ctrl.enter="saveNote(item.id)"
                @keydown.meta.enter="saveNote(item.id)"
              ></textarea>
              <div class="note-actions-inline">
                <button @click="saveNote(item.id)" class="save-btn-small">保存</button>
                <button @click="cancelNoteEdit(item.id)" class="cancel-btn-small">取消</button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- 标签内容弹窗（全局） -->
    <div 
      v-if="activeTagContent"
      class="tag-content-modal"
      @click.self="closeTagContent"
    >
      <div class="tag-content-panel">
        <div class="tag-content-header">
          <span class="tag-content-title">{{ activeTagContent.title }}</span>
          <button class="tag-content-close" @click="closeTagContent">×</button>
        </div>
        <div class="tag-content-body">
          {{ activeTagContent.content }}
        </div>
      </div>
    </div>

    <!-- ReadCast对话框 -->
    <FavoritesReadCastDialog
      :show="showReadCastDialog"
      :favorites="favorites"
      @close="showReadCastDialog = false"
    />
  </div>
</template>

<script setup lang="ts">
// 应用认证中间件
definePageMeta({
  middleware: 'auth'
});

const { fetchApi } = useApi();
const favorites = ref<any[]>([]);
const loading = ref(true);
const error = ref<string | null>(null);
const activeTagContent = ref<{ title: string; content: string } | null>(null);
const editingNoteId = ref<number | null>(null);
const noteTexts = ref<Record<number, string>>({});
const showReadCastDialog = ref(false);

const loadFavorites = async () => {
  loading.value = true;
  error.value = null;
  
  try {
    // 检查token
    const token = localStorage.getItem('token');
    const user = localStorage.getItem('user');
    console.log('=== Loading Favorites ===');
    console.log('Token exists:', !!token);
    console.log('User info:', user ? JSON.parse(user) : null);
    
    if (!token) {
      error.value = '请先登录';
      favorites.value = [];
      loading.value = false;
      return;
    }
    
    const sentences = await fetchApi('/favorites/sentences');
    console.log('Loaded favorite sentences:', sentences);
    console.log('Sentences count:', Array.isArray(sentences) ? sentences.length : 0);
    favorites.value = Array.isArray(sentences) ? sentences : [];
    
    if (favorites.value.length === 0) {
      console.warn('No favorites returned, but API call succeeded');
    }
    
  } catch (err: any) {
    console.error('Failed to load favorites:', err);
    
    // 根据错误类型显示不同的错误信息
    if (err.status === 401) {
      error.value = '登录已过期，请重新登录';
      // 清除过期的token
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      // 跳转到登录页
      setTimeout(() => {
        window.location.href = '/my';
      }, 2000);
    } else if (err.status === 0) {
      error.value = '无法连接到服务器，请确保后端服务正在运行';
    } else {
      error.value = err.message || '加载收藏失败';
    }
    
    favorites.value = [];
  } finally {
    loading.value = false;
  }
};

// 获取所有标签（包括系统标签和用户标签）
const getTags = (item: any): string[] => {
  if (item.tags) {
    if (typeof item.tags === 'string') {
      return item.tags.split(',').filter((t: string) => t.trim()).map((t: string) => t.trim());
    }
    if (Array.isArray(item.tags)) {
      return item.tags;
    }
  }
  return [];
};

// 切换笔记编辑器
const toggleNoteEditor = (itemId: number) => {
  if (editingNoteId.value === itemId) {
    // 如果正在编辑，取消编辑
    editingNoteId.value = null;
    noteTexts.value[itemId] = '';
  } else {
    // 开始编辑
    const item = favorites.value.find(f => f.id === itemId);
    noteTexts.value[itemId] = item?.notes || '';
    editingNoteId.value = itemId;
  }
};

// 保存笔记
const saveNote = async (itemId: number) => {
  try {
    await fetchApi(`/favorites/sentences/${itemId}/notes`, {
      method: 'PUT',
      body: JSON.stringify({ notes: noteTexts.value[itemId] || '' }),
    });
    
    const item = favorites.value.find(f => f.id === itemId);
    if (item) {
      item.notes = noteTexts.value[itemId] || '';
    }
    editingNoteId.value = null;
  } catch (err) {
    console.error('Failed to save note:', err);
  }
};

// 取消编辑笔记
const cancelNoteEdit = (itemId: number) => {
  editingNoteId.value = null;
  noteTexts.value[itemId] = '';
};

// 获取AI搜索结果
const getAgentResults = (item: any): any[] => {
  if (item.agentResults) {
    if (typeof item.agentResults === 'string') {
      try {
        return JSON.parse(item.agentResults);
      } catch (e) {
        return [];
      }
    }
    if (Array.isArray(item.agentResults)) {
      return item.agentResults;
    }
  }
  return [];
};

// 获取标签图标
const getTagIcon = (agentType: string): string => {
  const iconMap: Record<string, string> = {
    '翻译': '🌐',
    '解释': '💡',
    '故事线': '📖',
    '情感分析': '😊',
    '实体提取': '🔍',
    '上下文理解': '🧠',
    '查看单词': '📚',
    '总结': '📝',
  };
  return iconMap[agentType] || '🏷️';
};

// 显示标签内容
const showTagContent = (itemId: number, tagKey: string, content: string, title: string) => {
  activeTagContent.value = {
    title,
    content
  };
};

// 关闭标签内容
const closeTagContent = () => {
  activeTagContent.value = null;
};


const deleteFavorite = async (id: number) => {
  if (!confirm('确定要删除这个收藏吗？')) return;
  
  try {
    await fetchApi(`/favorites/sentences/${id}`, {
      method: 'DELETE',
    });
    favorites.value = favorites.value.filter(f => f.id !== id);
  } catch (err) {
    console.error('Failed to delete favorite:', err);
  }
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
const getHighlightedSentence = (item: any) => {
  const originalSentence = item.originalSentence || item.sentence;
  const selectedText = item.sentence;
  const highlightColor = item.highlightColor || '#ffeb3b';
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
  loadFavorites();
});
</script>

<style scoped>
.favorites-page {
  width: 100%;
  max-width: 1000px;
  margin: 0 auto;
}

.page-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 2rem;
}

.page-header h1 {
  margin: 0;
}

.readcast-btn {
  padding: 0.75rem 1.5rem;
  background: #007bff;
  color: white;
  border: none;
  border-radius: 4px;
  font-size: 1rem;
  cursor: pointer;
  transition: all 0.2s;
}

.readcast-btn:hover {
  background: #0056b3;
}

h1 {
  margin-bottom: 2rem;
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

.error .retry-btn {
  margin-top: 1rem;
  padding: 0.5rem 1rem;
  background: #007bff;
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
}

.error .retry-btn:hover {
  background: #0056b3;
}

.empty p {
  margin-bottom: 1rem;
  color: #666;
}

.empty .hint {
  color: #999;
  font-size: 0.9rem;
  margin-top: 0.5rem;
}

.back-link {
  color: #007bff;
  text-decoration: none;
}

.back-link:hover {
  text-decoration: underline;
}

.favorites-list {
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
}

.favorite-item {
  background: white;
  padding: 1.5rem;
  border-radius: 8px;
  box-shadow: 0 2px 4px rgba(0,0,0,0.1);
}

.favorite-sentence {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.sentence-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 1rem;
}

.sentence-text-wrapper {
  flex: 1;
}

.sentence-text {
  display: inline-block;
  padding: 0.75rem 1rem;
  border-radius: 6px;
  line-height: 1.8;
  font-size: 1.05rem;
  background: #f8f9fa;
  border-left: 3px solid #007bff;
  word-break: break-word;
  color: #333;
}

.sentence-actions {
  display: flex;
  gap: 0.5rem;
}

.icon-btn {
  width: 32px;
  height: 32px;
  border-radius: 50%;
  border: 1px solid #ddd;
  background: white;
  cursor: pointer;
  font-size: 1rem;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s;
}

.icon-btn:hover {
  background: #f0f0f0;
  transform: scale(1.1);
}

.article-link {
  margin-top: 0.5rem;
}

.link {
  color: #007bff;
  text-decoration: none;
  font-size: 0.9rem;
}

.link:hover {
  text-decoration: underline;
}

.explanation {
  padding: 1rem;
  background: #f8f9fa;
  border-radius: 4px;
  border-left: 3px solid #007bff;
}

.explanation-label {
  font-weight: 600;
  margin-bottom: 0.5rem;
  color: #333;
}

.explanation-content {
  color: #555;
  line-height: 1.6;
}

.note-editor {
  padding: 1rem;
  background: #fff9e6;
  border-radius: 4px;
  border: 1px solid #ffd700;
}

.note-input {
  width: 100%;
  padding: 0.5rem;
  border: 1px solid #ddd;
  border-radius: 4px;
  font-size: 0.9rem;
  font-family: inherit;
  resize: vertical;
  margin-bottom: 0.5rem;
}

.note-actions {
  display: flex;
  gap: 0.5rem;
  justify-content: flex-end;
}

.save-btn, .cancel-btn {
  padding: 0.5rem 1rem;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-size: 0.9rem;
}

.save-btn {
  background: #28a745;
  color: white;
}

.save-btn:hover {
  background: #218838;
}

.cancel-btn {
  background: #6c757d;
  color: white;
}

.cancel-btn:hover {
  background: #5a6268;
}

.notes-display {
  padding: 1rem;
  background: #fff9e6;
  border-radius: 4px;
  border-left: 3px solid #ffd700;
}

.notes-label {
  font-weight: 600;
  margin-bottom: 0.5rem;
  color: #333;
}

.notes-content {
  color: #555;
  line-height: 1.6;
  white-space: pre-wrap;
}

.sticky-notes {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.sticky-note {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  padding: 0.75rem;
  background: #fff9e6;
  border-radius: 4px;
  border-left: 3px solid #ffc107;
}

.sticky-note-content {
  flex: 1;
  color: #555;
  line-height: 1.5;
}

.delete-note-btn {
  background: none;
  border: none;
  color: #999;
  cursor: pointer;
  font-size: 1.2rem;
  line-height: 1;
  padding: 0 0.25rem;
}

.delete-note-btn:hover {
  color: #666;
}

.add-sticky-note {
  display: flex;
  gap: 0.5rem;
}

.sticky-note-input {
  flex: 1;
  padding: 0.5rem;
  border: 1px solid #ddd;
  border-radius: 4px;
  font-size: 0.9rem;
}

.add-note-btn {
  width: 36px;
  height: 36px;
  border-radius: 50%;
  border: 1px solid #ddd;
  background: #ffc107;
  color: white;
  cursor: pointer;
  font-size: 1.2rem;
  display: flex;
  align-items: center;
  justify-content: center;
}

.add-note-btn:hover {
  background: #ffb300;
}

.tags-section {
  margin-top: 0.75rem;
}

.tags-list {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
  align-items: center;
}

.tag-item {
  display: inline-flex;
  align-items: center;
  padding: 0.25rem 0.75rem;
  border-radius: 16px;
  font-size: 0.85rem;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s;
  user-select: none;
  white-space: nowrap;
}

.tag-item.tag-system {
  background: #e3f2fd;
  color: #1976d2;
  border: 1px solid #90caf9;
}

.tag-item.tag-system:hover {
  background: #bbdefb;
  transform: translateY(-1px);
  box-shadow: 0 2px 4px rgba(25, 118, 210, 0.2);
}

.tag-item.tag-note {
  background: #fff9c4;
  color: #f57f17;
  border: 1px solid #ffeb3b;
}

.tag-item.tag-note:hover {
  background: #fff59d;
  transform: translateY(-1px);
  box-shadow: 0 2px 4px rgba(245, 127, 23, 0.2);
}

.tag-delete-btn-small {
  margin-left: 0.5rem;
  background: none;
  border: none;
  color: #e65100;
  cursor: pointer;
  font-size: 1rem;
  line-height: 1;
  padding: 0;
  width: 16px;
  height: 16px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
  opacity: 0.7;
  transition: all 0.2s;
}

.tag-delete-btn-small:hover {
  opacity: 1;
  background: rgba(230, 81, 0, 0.1);
}

/* 笔记编辑器（内联） */
.note-editor-inline {
  margin-top: 0.75rem;
  padding: 0.75rem;
  background: #fff9c4;
  border-radius: 6px;
  border: 1px solid #ffeb3b;
}

.note-textarea-inline {
  width: 100%;
  padding: 0.75rem;
  border: 1px solid #fdd835;
  border-radius: 4px;
  font-size: 0.9rem;
  font-family: inherit;
  resize: vertical;
  min-height: 80px;
  background: white;
  transition: border-color 0.2s;
}

.note-textarea-inline:focus {
  outline: none;
  border-color: #f57f17;
}

.note-actions-inline {
  display: flex;
  gap: 0.5rem;
  justify-content: flex-end;
  margin-top: 0.5rem;
}

.save-btn-small, .cancel-btn-small {
  padding: 0.4rem 0.8rem;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-size: 0.85rem;
  transition: all 0.2s;
}

.save-btn-small {
  background: #28a745;
  color: white;
}

.save-btn-small:hover {
  background: #218838;
}

.cancel-btn-small {
  background: #6c757d;
  color: white;
}

.cancel-btn-small:hover {
  background: #5a6268;
}

/* 标签内容弹窗 */
.tag-content-modal {
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
  animation: fadeIn 0.2s;
}

@keyframes fadeIn {
  from {
    opacity: 0;
  }
  to {
    opacity: 1;
  }
}

.tag-content-panel {
  background: white;
  border-radius: 8px;
  max-width: 600px;
  width: 90%;
  max-height: 80vh;
  display: flex;
  flex-direction: column;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.3);
  animation: slideUp 0.3s;
}

@keyframes slideUp {
  from {
    transform: translateY(20px);
    opacity: 0;
  }
  to {
    transform: translateY(0);
    opacity: 1;
  }
}

.tag-content-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 1rem 1.5rem;
  border-bottom: 1px solid #e0e0e0;
  background: #f8f9fa;
  border-radius: 8px 8px 0 0;
}

.tag-content-title {
  font-weight: 600;
  color: #333;
  font-size: 1rem;
}

.tag-content-close {
  background: none;
  border: none;
  font-size: 1.5rem;
  color: #666;
  cursor: pointer;
  width: 32px;
  height: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
  transition: all 0.2s;
}

.tag-content-close:hover {
  background: #e0e0e0;
  color: #333;
}

.tag-content-body {
  padding: 1.5rem;
  color: #555;
  line-height: 1.6;
  white-space: pre-wrap;
  overflow-y: auto;
  flex: 1;
}
</style>
