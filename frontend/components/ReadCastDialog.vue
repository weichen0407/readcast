<template>
  <div v-if="show" class="readcast-dialog-overlay" @click.self="handleOverlayClick">
    <div class="readcast-dialog">
      <div class="dialog-header">
        <h2>📄 ReadCast</h2>
        <button @click="close" class="close-btn">×</button>
      </div>

      <div class="dialog-content">
        <!-- 第一步：配置文档 -->
        <div v-if="!documentGenerated" class="config-section">
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
              placeholder="例如：新闻类我想知道前因后果，体育类我想知道专业术语..."
              rows="4"
              :disabled="generating"
              class="requirements-input"
            ></textarea>
            <div class="hint">
              <p>提示：</p>
              <ul>
                <li>新闻类：可以要求关注前因后果、时间线、背景信息</li>
                <li>体育类：可以要求关注专业术语、比赛规则、技术分析</li>
                <li>科技类：可以要求关注技术概念、应用场景、发展趋势</li>
              </ul>
            </div>
          </div>

          <div class="form-actions">
            <button @click="close" class="btn-cancel" :disabled="generating">取消</button>
            <button @click="generateDocument" class="btn-primary" :disabled="generating || !difficulty">
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
                      :disabled="generatingScript || generatingPodcast"
                    />
                    <span>{{ mode.label }}</span>
                  </label>
                </div>
                
                <!-- 第一步：生成脚本 -->
                <div v-if="!podcastScript" class="script-generation">
                  <button 
                    @click="generateScript" 
                    class="btn-podcast" 
                    :disabled="generatingScript || !podcastMode || !document"
                  >
                    {{ generatingScript ? '生成脚本中...' : '📝 生成播客脚本' }}
                  </button>
                </div>
                
                <!-- 第二步：查看脚本 -->
                <div v-if="podcastScript" class="script-preview">
                  <h5>播客脚本预览：</h5>
                  <div class="script-content">
                    <div v-if="podcastScript.intro" class="script-segment">
                      <strong>开场白：</strong>
                      <p>{{ podcastScript.intro }}</p>
                    </div>
                    <div v-for="(segment, idx) in podcastScript.segments" :key="idx" class="script-segment">
                      <strong v-if="podcastScript.mode === 'dialogue' && segment.speaker">
                        {{ segment.speaker }}：
                      </strong>
                      <p>{{ segment.content }}</p>
                      <span v-if="segment.language" class="script-language">
                        ({{ segment.language === 'zh' ? '中文' : 'English' }})
                      </span>
                    </div>
                    <div v-if="podcastScript.outro" class="script-segment">
                      <strong>结尾：</strong>
                      <p>{{ podcastScript.outro }}</p>
                    </div>
                  </div>
                  
                  <div class="script-actions">
                    <button 
                      @click="generatePodcast" 
                      class="btn-podcast" 
                      :disabled="generatingPodcast"
                    >
                      {{ generatingPodcast ? '生成音频中...' : '🎙️ 生成播客音频' }}
                    </button>
                    <button 
                      @click="regenerateScript" 
                      class="btn-secondary"
                      :disabled="generatingScript"
                    >
                      {{ generatingScript ? '重新生成中...' : '🔄 重新生成脚本' }}
                    </button>
                  </div>
                </div>
                
                <!-- 第三步：下载播客 -->
                <ClientOnly>
                  <button 
                    v-if="podcastUrl" 
                    @click="downloadPodcast" 
                    class="btn-download"
                    :disabled="downloadingPodcast"
                  >
                    {{ downloadingPodcast ? '下载中...' : '📥 下载播客' }}
                  </button>
                  <template #fallback>
                    <button v-if="podcastUrl" class="btn-download" disabled>下载播客</button>
                  </template>
                </ClientOnly>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { useApi } from '~/composables/useApi';

// 确保在客户端环境
const isClient = ref(false);

onMounted(() => {
  isClient.value = true;
});

// 辅助函数：安全地下载文件
const downloadBlob = (blob: Blob, filename: string) => {
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
    a.download = filename;
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
};

interface Props {
  show: boolean;
  articleId: number | null;
  articleType?: string;
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

const difficulty = ref<'low' | 'medium' | 'high'>('medium');
const customRequirements = ref('');
const language = ref<'bilingual' | 'english'>('bilingual'); // 语言选择：双语或纯英文
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
const isNewDocument = ref(false);

// 播客相关
const podcastMode = ref<'solo' | 'dialogue'>('solo');
const generatingScript = ref(false);
const generatingPodcast = ref(false);
const podcastScript = ref<any>(null);
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

const generateDocument = async (forceNew: boolean = false) => {
  if (!props.articleId) {
    error.value = '文章ID无效';
    return;
  }

  generating.value = true;
  error.value = null;

  try {
    const response = await fetchApi('/readcast/article/generate', {
      method: 'POST',
      body: JSON.stringify({
        articleId: props.articleId,
        difficulty: difficulty.value,
        language: language.value,
        customRequirements: customRequirements.value || undefined,
        forceNew: forceNew, // 强制重新生成
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
    isNewDocument.value = response.isNew || false;
    
    // 如果有保存的脚本，加载它
    if (response.podcastScript) {
      podcastScript.value = response.podcastScript;
    }
  } catch (err) {
    error.value = err instanceof Error ? err.message : '生成文档失败';
  } finally {
    generating.value = false;
  }
};

// 重新生成文档
const regenerateDocument = async () => {
  await generateDocument(true);
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
      a.download = `readcast_${props.articleId}_${Date.now()}.json`;
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
  error.value = null;
  
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

    console.log('Download response status:', response.status);

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Download failed:', errorText);
      let errorData;
      try {
        errorData = JSON.parse(errorText);
      } catch {
        errorData = { error: errorText || '下载失败' };
      }
      throw new Error(errorData.error || `下载失败 (${response.status})`);
    }

    const blob = await response.blob();
    console.log('Blob received, size:', blob.size);
    
    if (blob.size === 0) {
      throw new Error('下载的文件为空');
    }

    // 直接调用，ClientOnly 已确保客户端环境
    const ext = currentFormat.value === 'pdf' ? 'pdf' : 'md';
    downloadBlob(blob, `readcast_${props.articleId}_${Date.now()}.${ext}`);
    
    console.log(`${currentFormat.value.toUpperCase()} downloaded successfully`);
  } catch (err) {
    console.error('Download error:', err);
    error.value = err instanceof Error ? err.message : '下载PDF失败';
  } finally {
    downloadingPDF.value = false;
  }
};

// 生成播客脚本（第一步）
const generateScript = async () => {
  if (!documentId.value && !document.value) {
    error.value = '请先生成文档';
    return;
  }

  generatingScript.value = true;
  error.value = null;
  podcastScript.value = null;

  try {
    const response = await fetchApi('/readcast/article/podcast/script', {
      method: 'POST',
      body: JSON.stringify({
        documentId: documentId.value,
        documentContent: document.value ? JSON.stringify(document.value) : undefined,
        mode: podcastMode.value,
        language: language.value
      })
    });

    podcastScript.value = response.script;
  } catch (err) {
    error.value = err instanceof Error ? err.message : '生成脚本失败';
  } finally {
    generatingScript.value = false;
  }
};

// 重新生成脚本
const regenerateScript = async () => {
  await generateScript();
};

// 生成播客音频（第二步）
const generatePodcast = async () => {
  if (!podcastScript.value) {
    error.value = '请先生成脚本';
    return;
  }

  generatingPodcast.value = true;
  error.value = null;

  try {
    const response = await fetchApi('/readcast/article/podcast/audio', {
      method: 'POST',
      body: JSON.stringify({
        documentId: documentId.value,
        script: podcastScript.value,
        mode: podcastMode.value
      })
    });

    podcastUrl.value = response.podcastUrl;
  } catch (err) {
    error.value = err instanceof Error ? err.message : '生成播客音频失败';
  } finally {
    generatingPodcast.value = false;
  }
};

const downloadPodcast = async () => {
  if (!podcastUrl.value) return;

  downloadingPodcast.value = true;
  error.value = null;
  
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
    
    // 直接调用，ClientOnly 已确保客户端环境
    downloadBlob(blob, `readcast_${props.articleId}_${Date.now()}.mp3`);
  } catch (err) {
    console.error('Download podcast error:', err);
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
  podcastScript.value = null;
};

// 处理遮罩层点击（只在点击遮罩层本身时关闭，不在对话框内容区域）
const handleOverlayClick = (event: MouseEvent) => {
  // 检查点击的是遮罩层本身，而不是对话框内容
  if (event.target === event.currentTarget) {
    // 只有在没有正在生成内容时才允许关闭
    if (!generating.value && !generatingScript.value && !generatingPodcast.value) {
      close();
    }
  }
};

const close = () => {
  reset();
  emit('close');
};
</script>

<style scoped>
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
  max-width: 600px;
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

.radio-label input[type="radio"] {
  cursor: pointer;
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

.requirements-input:focus {
  outline: none;
  border-color: #007bff;
}

.hint {
  margin-top: 0.5rem;
  padding: 0.75rem;
  background: #f8f9fa;
  border-radius: 4px;
  font-size: 0.85rem;
  color: #666;
}

.hint p {
  margin: 0 0 0.5rem 0;
  font-weight: 500;
}

.hint ul {
  margin: 0;
  padding-left: 1.5rem;
}

.hint li {
  margin-bottom: 0.25rem;
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

.btn-cancel:hover:not(:disabled) {
  background: #e0e0e0;
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

.podcast-section h5 {
  margin: 15px 0 10px 0;
  color: #555;
  font-size: 14px;
}

.podcast-mode-select {
  display: flex;
  gap: 1rem;
  margin-bottom: 1rem;
}

.script-generation {
  margin-bottom: 15px;
}

.script-preview {
  margin-top: 15px;
  padding: 15px;
  background: #f9f9f9;
  border-radius: 8px;
  border: 1px solid #e0e0e0;
}

.script-content {
  max-height: 300px;
  overflow-y: auto;
  margin-bottom: 15px;
  padding: 10px;
  background: white;
  border-radius: 4px;
}

.script-segment {
  margin-bottom: 15px;
  padding-bottom: 15px;
  border-bottom: 1px solid #eee;
}

.script-segment:last-child {
  border-bottom: none;
  margin-bottom: 0;
  padding-bottom: 0;
}

.script-segment strong {
  display: block;
  margin-bottom: 5px;
  color: #333;
  font-size: 13px;
}

.script-segment p {
  margin: 5px 0;
  line-height: 1.6;
  color: #666;
  white-space: pre-wrap;
}

.script-language {
  display: inline-block;
  margin-top: 5px;
  padding: 2px 8px;
  background: #e3f2fd;
  color: #1976d2;
  border-radius: 4px;
  font-size: 11px;
}

.script-actions {
  display: flex;
  gap: 10px;
  margin-top: 15px;
}

.document-actions {
  display: flex;
  gap: 10px;
  margin-bottom: 15px;
}

.btn-secondary {
  padding: 8px 16px;
  background: #f5f5f5;
  color: #333;
  border: 1px solid #ddd;
  border-radius: 4px;
  cursor: pointer;
  font-size: 14px;
  transition: all 0.3s;
}

.btn-secondary:hover:not(:disabled) {
  background: #e0e0e0;
}

.btn-secondary:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}
</style>

