<template>
  <div v-if="show" class="readcast-dialog-overlay" @click.self="close">
    <div class="readcast-dialog">
      <div class="dialog-header">
        <h2>📄 ReadCast</h2>
        <button @click="close" class="close-btn">×</button>
      </div>

      <div class="dialog-content">
        <!-- 第一步：配置文档 -->
        <div v-if="!documentGenerated" class="config-section">
          <div class="form-group">
            <label>生成类型：</label>
            <div class="radio-group">
              <label class="radio-label">
                <input 
                  type="radio" 
                  value="today" 
                  v-model="generateType"
                  :disabled="generating"
                />
                <span>今日收藏</span>
              </label>
              <label class="radio-label">
                <input 
                  type="radio" 
                  value="selected" 
                  v-model="generateType"
                  :disabled="generating"
                />
                <span>选择收藏</span>
              </label>
            </div>
          </div>

          <!-- 选择收藏列表 -->
          <div v-if="generateType === 'selected'" class="form-group">
            <label>选择要包含的收藏（可多选）：</label>
            <div class="favorites-list">
              <label 
                v-for="fav in availableFavorites" 
                :key="fav.id" 
                class="favorite-item"
              >
                <input 
                  type="checkbox" 
                  :value="fav.id" 
                  v-model="selectedFavoriteIds"
                  :disabled="generating"
                />
                <span class="favorite-text">{{ fav.originalSentence || fav.sentence }}</span>
                <span v-if="fav.articleTitle" class="favorite-source">{{ fav.articleTitle }}</span>
              </label>
            </div>
            <p v-if="selectedFavoriteIds.length === 0" class="hint">请至少选择一个收藏</p>
          </div>

          <div class="form-group">
            <label>难度级别：</label>
            <div class="radio-group">
              <label v-for="level in difficultyLevels" :key="level.value" class="radio-label">
                <input 
                  type="radio" 
                  :value="level.value" 
                  v-model="difficulty"
                  :disabled="generating"
                />
                <span>{{ level.label }}</span>
              </label>
            </div>
          </div>

          <div class="form-group">
            <label>语言选择：</label>
            <div class="radio-group">
              <label class="radio-label">
                <input 
                  type="radio" 
                  value="bilingual" 
                  v-model="language"
                  :disabled="generating"
                />
                <span>双语（中英文）</span>
              </label>
              <label class="radio-label">
                <input 
                  type="radio" 
                  value="english" 
                  v-model="language"
                  :disabled="generating"
                />
                <span>纯英文</span>
              </label>
            </div>
          </div>

          <div class="form-group">
            <label>导出格式：</label>
            <div class="radio-group">
              <label class="radio-label">
                <input 
                  type="radio" 
                  value="pdf" 
                  v-model="exportFormat"
                  :disabled="generating"
                />
                <span>PDF</span>
              </label>
              <label class="radio-label">
                <input 
                  type="radio" 
                  value="json" 
                  v-model="exportFormat"
                  :disabled="generating"
                />
                <span>JSON</span>
              </label>
              <label class="radio-label">
                <input 
                  type="radio" 
                  value="md" 
                  v-model="exportFormat"
                  :disabled="generating"
                />
                <span>Markdown</span>
              </label>
            </div>
          </div>

          <div class="form-group">
            <label>自定义要求（可选）：</label>
            <textarea 
              v-model="customRequirements"
              placeholder="例如：我想重点复习这些知识点..."
              rows="4"
              :disabled="generating"
              class="requirements-input"
            ></textarea>
          </div>

          <div class="form-actions">
            <button @click="close" class="btn-cancel" :disabled="generating">取消</button>
            <button 
              @click="generateDocument" 
              class="btn-primary" 
              :disabled="generating || !difficulty || (generateType === 'selected' && selectedFavoriteIds.length === 0)"
            >
              {{ generating ? '生成中...' : '生成文档' }}
            </button>
          </div>
        </div>

        <!-- 第二步：文档生成完成 -->
        <div v-else class="result-section">
          <div v-if="generating" class="loading-state">
            <p>正在生成文档，请稍候...</p>
          </div>

          <div v-else-if="error" class="error-state">
            <p class="error-message">{{ error }}</p>
            <button @click="reset" class="btn-primary">重试</button>
          </div>

          <div v-else-if="document" class="success-state">
            <div class="document-preview">
              <h3>{{ document.title }}</h3>
              <p class="summary">{{ document.summary }}</p>
              
              <div v-if="document.knowledgePoints && document.knowledgePoints.length > 0" class="preview-section">
                <h4>📚 知识点（{{ document.knowledgePoints.length }}个）</h4>
                <ul class="knowledge-list">
                  <li v-for="(kp, idx) in document.knowledgePoints" :key="idx" class="knowledge-item">
                    <strong>{{ kp.point }}</strong>
                    <p v-if="kp.explanation" class="explanation">{{ kp.explanation }}</p>
                  </li>
                </ul>
              </div>

              <div v-if="document.difficulties && document.difficulties.length > 0" class="preview-section">
                <h4>⚠️ 难点（{{ document.difficulties.length }}个）</h4>
                <ul class="difficulty-list">
                  <li v-for="(diff, idx) in document.difficulties" :key="idx" class="difficulty-item">
                    <strong>{{ diff.difficulty }}</strong>
                    <p v-if="diff.explanation" class="explanation">{{ diff.explanation }}</p>
                    <ul v-if="diff.examples && diff.examples.length > 0" class="examples-list">
                      <li v-for="(example, eIdx) in diff.examples" :key="eIdx" class="example-item">{{ example }}</li>
                    </ul>
                  </li>
                </ul>
              </div>

              <div v-if="document.terminology && document.terminology.length > 0" class="preview-section">
                <h4>📖 术语（{{ document.terminology.length }}个）</h4>
                <ul class="terminology-list">
                  <li v-for="(term, idx) in document.terminology" :key="idx" class="terminology-item">
                    <strong>{{ term.term }}</strong>
                    <p v-if="term.definition" class="definition">{{ term.definition }}</p>
                    <p v-if="term.context" class="context">{{ term.context }}</p>
                  </li>
                </ul>
              </div>
            </div>

            <div class="actions-section">
              <ClientOnly>
                <button @click="downloadFile" class="btn-download" :disabled="downloadingPDF">
                  {{ downloadingPDF ? '下载中...' : `📥 下载${getFormatLabel(currentFormat)}` }}
                </button>
                <button v-if="currentFormat === 'json'" @click="copyJSON" class="btn-download" style="margin-left: 10px;">
                  📋 复制JSON
                </button>
                <template #fallback>
                  <button class="btn-download" disabled>下载PDF</button>
                </template>
              </ClientOnly>

              <div class="podcast-section">
                <h4>生成播客</h4>
                <div class="podcast-mode-select">
                  <label v-for="mode in podcastModes" :key="mode.value" class="radio-label">
                    <input 
                      type="radio" 
                      :value="mode.value" 
                      v-model="podcastMode"
                      :disabled="generatingPodcast"
                    />
                    <span>{{ mode.label }}</span>
                  </label>
                </div>
                <button 
                  @click="generatePodcast" 
                  class="btn-podcast" 
                  :disabled="generatingPodcast || !podcastMode"
                >
                  {{ generatingPodcast ? '生成中...' : '🎙️ 生成播客' }}
                </button>
                <button 
                  v-if="podcastUrl" 
                  @click="downloadPodcast" 
                  class="btn-download"
                  :disabled="downloadingPodcast"
                >
                  {{ downloadingPodcast ? '下载中...' : '📥 下载播客' }}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import { useApi } from '~/composables/useApi';

// 确保在客户端环境
const isClient = ref(false);

onMounted(() => {
  isClient.value = true;
});

interface Props {
  show: boolean;
  favorites: Array<{
    id: number;
    sentence: string;
    originalSentence?: string;
    articleTitle?: string;
  }>;
}

interface Document {
  title: string;
  summary: string;
  knowledgePoints: Array<{ point: string; explanation: string }>;
  difficulties: Array<{ difficulty: string; explanation: string; examples?: string[] }>;
  terminology?: Array<{ term: string; definition: string; context?: string }>;
  customContent?: string;
}

const props = defineProps<Props>();
const emit = defineEmits<{
  close: [];
}>();

const { fetchApi } = useApi();

const generateType = ref<'today' | 'selected'>('today');
const selectedFavoriteIds = ref<number[]>([]);
const difficulty = ref<'low' | 'medium' | 'high'>('medium');
const language = ref<'bilingual' | 'english'>('bilingual'); // 语言选择：双语或纯英文
const customRequirements = ref('');
const generating = ref(false);
const documentGenerated = ref(false);
const document = ref<Document | null>(null);
const error = ref<string | null>(null);
const downloadingPDF = ref(false);
const documentId = ref<number | null>(null);
const pdfUrl = ref<string | null>(null);
const fileUrl = ref<string | null>(null);
const jsonContent = ref<string | null>(null);
const exportFormat = ref<'pdf' | 'json' | 'md'>('pdf');
const currentFormat = ref<'pdf' | 'json' | 'md'>('pdf');

// 播客相关
const podcastMode = ref<'solo' | 'dialogue'>('solo');
const generatingPodcast = ref(false);
const podcastUrl = ref<string | null>(null);
const downloadingPodcast = ref(false);

const difficultyLevels = [
  { value: 'low', label: '低' },
  { value: 'medium', label: '中' },
  { value: 'high', label: '高' }
];

const podcastModes = [
  { value: 'solo', label: '单人' },
  { value: 'dialogue', label: '对话' }
];

const availableFavorites = computed(() => props.favorites || []);

const generateDocument = async () => {
  if (generateType.value === 'selected' && selectedFavoriteIds.value.length === 0) {
    error.value = '请至少选择一个收藏';
    return;
  }

  generating.value = true;
  error.value = null;

  try {
    const response = await fetchApi('/readcast/favorites/generate', {
      method: 'POST',
      body: JSON.stringify({
        type: generateType.value,
        favoriteIds: generateType.value === 'selected' ? selectedFavoriteIds.value : undefined,
        difficulty: difficulty.value,
        language: language.value,
        customRequirements: customRequirements.value || undefined,
        format: exportFormat.value
      })
    });

    document.value = response.document;
    documentId.value = response.documentId;
    currentFormat.value = response.format || exportFormat.value;
    
    if (response.format === 'json') {
      jsonContent.value = response.jsonContent;
      fileUrl.value = null;
    } else {
      fileUrl.value = response.fileUrl;
      jsonContent.value = null;
      if (response.format === 'pdf') {
        pdfUrl.value = response.fileUrl;
      } else {
        pdfUrl.value = null;
      }
    }
    
    documentGenerated.value = true;
  } catch (err) {
    error.value = err instanceof Error ? err.message : '生成文档失败';
  } finally {
    generating.value = false;
  }
};

const getFormatLabel = (format: string) => {
  const labels: Record<string, string> = {
    pdf: 'PDF',
    json: 'JSON',
    md: 'Markdown'
  };
  return labels[format] || format.toUpperCase();
};

const copyJSON = async () => {
  if (!jsonContent.value) {
    error.value = 'JSON内容不存在';
    return;
  }
  
  try {
    await navigator.clipboard.writeText(jsonContent.value);
    alert('JSON已复制到剪贴板');
  } catch (err) {
    error.value = '复制失败';
    console.error('Copy error:', err);
  }
};

const downloadFile = async () => {
  if (currentFormat.value === 'json') {
    // JSON格式直接下载
    if (!jsonContent.value) {
      error.value = 'JSON内容不存在';
      return;
    }
    
    downloadingPDF.value = true;
    try {
      const blob = new Blob([jsonContent.value], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `readcast_favorites_${Date.now()}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (err) {
      error.value = err instanceof Error ? err.message : '下载JSON失败';
    } finally {
      downloadingPDF.value = false;
    }
    return;
  }
  
  // PDF或MD格式从服务器下载
  const urlToUse = fileUrl.value || pdfUrl.value;
  if (!urlToUse) {
    error.value = '文件URL不存在';
    return;
  }

  downloadingPDF.value = true;
  try {
    const config = useRuntimeConfig();
    const apiBase = config.public.apiBase || '/api';
    const token = localStorage.getItem('token');
    
    // url已经包含了/api前缀，所以直接使用
    const downloadUrl = urlToUse.startsWith('/api') ? urlToUse : `${apiBase}${urlToUse}`;
    console.log(`Downloading ${currentFormat.value.toUpperCase()} from:`, downloadUrl);
    
    const response = await fetch(downloadUrl, {
      method: 'GET',
      headers: {
        ...(token ? { Authorization: `Bearer ${token}` } : {})
      }
    });

    if (!response.ok) {
      throw new Error('下载失败');
    }

    const blob = await response.blob();
    
    // 确保在客户端环境
    if (!isClient.value || typeof window === 'undefined') {
      throw new Error('下载功能需要在浏览器环境中使用');
    }

    // 使用全局的 window 和 document 对象
    const win = window as any;
    const doc = win.document;
    
    if (!doc || typeof doc.createElement !== 'function') {
      throw new Error('浏览器环境未正确初始化');
    }

    try {
      const ext = currentFormat.value === 'pdf' ? 'pdf' : 'md';
      const url = win.URL.createObjectURL(blob);
      const a = doc.createElement('a');
      a.href = url;
      a.download = `readcast_favorites_${Date.now()}.${ext}`;
      a.style.display = 'none';
      doc.body.appendChild(a);
      a.click();
      // 延迟移除，确保下载开始
      setTimeout(() => {
        if (doc.body.contains(a)) {
          doc.body.removeChild(a);
        }
        win.URL.revokeObjectURL(url);
      }, 100);
    } catch (err) {
      console.error('Download file error:', err);
      throw new Error('下载失败：' + (err instanceof Error ? err.message : '未知错误'));
    }
  } catch (err) {
    error.value = err instanceof Error ? err.message : `下载${getFormatLabel(currentFormat.value)}失败`;
  } finally {
    downloadingPDF.value = false;
  }
};

const generatePodcast = async () => {
  if (!documentId.value && !document.value) {
    error.value = '请先生成文档';
    return;
  }

  generatingPodcast.value = true;
  error.value = null;

  try {
    const response = await fetchApi('/readcast/favorites/podcast', {
      method: 'POST',
      body: JSON.stringify({
        documentId: documentId.value,
        documentContent: document.value ? JSON.stringify(document.value) : undefined,
        mode: podcastMode.value
      })
    });

    podcastUrl.value = response.podcastUrl;
  } catch (err) {
    error.value = err instanceof Error ? err.message : '生成播客失败';
  } finally {
    generatingPodcast.value = false;
  }
};

const downloadPodcast = async () => {
  if (!podcastUrl.value) return;

  downloadingPodcast.value = true;
  try {
    const config = useRuntimeConfig();
    const apiBase = config.public.apiBase || '/api';
    const token = localStorage.getItem('token');
    
    // podcastUrl已经包含了/api前缀，所以直接使用
    const downloadUrl = podcastUrl.value.startsWith('/api') ? podcastUrl.value : `${apiBase}${podcastUrl.value}`;
    console.log('Downloading podcast from:', downloadUrl);
    
    const response = await fetch(downloadUrl, {
      method: 'GET',
      headers: {
        ...(token ? { Authorization: `Bearer ${token}` } : {})
      }
    });

    if (!response.ok) {
      throw new Error('下载失败');
    }

    const blob = await response.blob();
    
    // 确保在客户端环境
    if (!isClient.value || typeof window === 'undefined') {
      throw new Error('下载功能需要在浏览器环境中使用');
    }

    // 使用全局的 window 和 document 对象
    const win = window as any;
    const doc = win.document;
    
    if (!doc || typeof doc.createElement !== 'function') {
      throw new Error('浏览器环境未正确初始化');
    }

    try {
      const url = win.URL.createObjectURL(blob);
      const a = doc.createElement('a');
      a.href = url;
      a.download = `readcast_favorites_${Date.now()}.mp3`;
      a.style.display = 'none';
      doc.body.appendChild(a);
      a.click();
      // 延迟移除，确保下载开始
      setTimeout(() => {
        if (doc.body.contains(a)) {
          doc.body.removeChild(a);
        }
        win.URL.revokeObjectURL(url);
      }, 100);
    } catch (err) {
      console.error('Download file error:', err);
      throw new Error('下载失败：' + (err instanceof Error ? err.message : '未知错误'));
    }
  } catch (err) {
    error.value = err instanceof Error ? err.message : '下载播客失败';
  } finally {
    downloadingPodcast.value = false;
  }
};

const reset = () => {
  documentGenerated.value = false;
  document.value = null;
  error.value = null;
  documentId.value = null;
  pdfUrl.value = null;
  podcastUrl.value = null;
  selectedFavoriteIds.value = [];
};

const close = () => {
  reset();
  emit('close');
};
</script>

<style scoped>
/* 复用ReadCastDialog的样式 */
.readcast-dialog-overlay {
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

.readcast-dialog {
  background: white;
  border-radius: 8px;
  width: 90%;
  max-width: 700px;
  max-height: 90vh;
  overflow-y: auto;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.3);
}

.dialog-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 1.5rem;
  border-bottom: 1px solid #e0e0e0;
}

.dialog-header h2 {
  margin: 0;
  font-size: 1.3rem;
  color: #333;
}

.close-btn {
  background: none;
  border: none;
  font-size: 2rem;
  color: #999;
  cursor: pointer;
  line-height: 1;
  padding: 0;
  width: 30px;
  height: 30px;
}

.close-btn:hover {
  color: #333;
}

.dialog-content {
  padding: 1.5rem;
}

.form-group {
  margin-bottom: 1.5rem;
}

.form-group label {
  display: block;
  margin-bottom: 0.5rem;
  font-weight: 500;
  color: #333;
}

.radio-group {
  display: flex;
  gap: 1rem;
}

.radio-label {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  cursor: pointer;
}

.favorites-list {
  max-height: 300px;
  overflow-y: auto;
  border: 1px solid #ddd;
  border-radius: 4px;
  padding: 0.5rem;
}

.favorite-item {
  display: flex;
  align-items: flex-start;
  gap: 0.5rem;
  padding: 0.75rem;
  border-bottom: 1px solid #f0f0f0;
  cursor: pointer;
}

.favorite-item:last-child {
  border-bottom: none;
}

.favorite-item:hover {
  background: #f8f9fa;
}

.favorite-text {
  flex: 1;
  font-size: 0.9rem;
  color: #333;
}

.favorite-source {
  font-size: 0.8rem;
  color: #999;
}

.requirements-input {
  width: 100%;
  padding: 0.75rem;
  border: 1px solid #ddd;
  border-radius: 4px;
  font-size: 0.9rem;
  font-family: inherit;
  resize: vertical;
}

.form-actions {
  display: flex;
  gap: 1rem;
  justify-content: flex-end;
  margin-top: 2rem;
}

.btn-cancel,
.btn-primary,
.btn-download,
.btn-podcast {
  padding: 0.75rem 1.5rem;
  border: none;
  border-radius: 4px;
  font-size: 1rem;
  cursor: pointer;
  transition: all 0.2s;
}

.btn-cancel {
  background: #f0f0f0;
  color: #333;
}

.btn-primary,
.btn-download,
.btn-podcast {
  background: #007bff;
  color: white;
}

.btn-primary:hover:not(:disabled),
.btn-download:hover:not(:disabled),
.btn-podcast:hover:not(:disabled) {
  background: #0056b3;
}

.btn-primary:disabled,
.btn-download:disabled,
.btn-podcast:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.loading-state,
.error-state {
  text-align: center;
  padding: 2rem;
}

.error-message {
  color: #c33;
  margin-bottom: 1rem;
}

.success-state {
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
}

.document-preview {
  padding: 1rem;
  background: #f8f9fa;
  border-radius: 4px;
}

.document-preview h3 {
  margin: 0 0 0.5rem 0;
  color: #333;
}

.summary {
  color: #666;
  line-height: 1.6;
  margin-bottom: 1rem;
}

.preview-section {
  margin-top: 1rem;
}

.preview-section h4 {
  margin: 0 0 0.5rem 0;
  font-size: 0.9rem;
  color: #555;
}

.preview-section ul {
  margin: 0;
  padding-left: 1.5rem;
  color: #666;
}

.knowledge-list,
.difficulty-list,
.terminology-list {
  list-style: none;
  padding: 0;
  margin: 0.5rem 0;
}

.knowledge-item,
.difficulty-item,
.terminology-item {
  margin-bottom: 1rem;
  padding: 0.75rem;
  background: white;
  border-left: 3px solid #007bff;
  border-radius: 4px;
}

.knowledge-item strong,
.difficulty-item strong,
.terminology-item strong {
  display: block;
  color: #333;
  font-size: 1rem;
  margin-bottom: 0.5rem;
}

.explanation,
.definition {
  color: #666;
  font-size: 0.9rem;
  line-height: 1.5;
  margin: 0.5rem 0;
}

.context {
  color: #888;
  font-size: 0.85rem;
  font-style: italic;
  margin-top: 0.25rem;
}

.examples-list {
  margin: 0.5rem 0 0 0;
  padding-left: 1.5rem;
  list-style: disc;
}

.example-item {
  color: #666;
  font-size: 0.85rem;
  margin-bottom: 0.25rem;
}

.actions-section {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.podcast-section {
  padding: 1rem;
  background: #f8f9fa;
  border-radius: 4px;
}

.podcast-section h4 {
  margin: 0 0 1rem 0;
  font-size: 1rem;
  color: #333;
}

.podcast-mode-select {
  display: flex;
  gap: 1rem;
  margin-bottom: 1rem;
}

.hint {
  margin-top: 0.5rem;
  color: #999;
  font-size: 0.85rem;
}
</style>

