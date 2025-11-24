<template>
  <div class="knowledge-panel">
    <div class="panel-header sticky-header">
      <h3>知识面板</h3>
      <button v-if="selectedText" class="close-btn" @click="clearSelection">×</button>
    </div>

    <div class="panel-content">
      <!-- 选中文本区域 -->
      <div v-if="selectedText" class="selected-text-section">
        <div class="section-title">选中内容</div>
        <textarea 
          v-model="editableText"
          class="text-input"
          placeholder="选中的文本将显示在这里，您可以编辑..."
          rows="4"
        ></textarea>
        
        <!-- Agent操作按钮（圆形图标） -->
        <div class="agent-icons">
          <button 
            v-for="agent in agents" 
            :key="agent.type"
            class="agent-icon-btn"
            :class="{ loading: loadingAgents.includes(agent.type), active: hasResult(agent.type) }"
            @click="handleAgentClick(agent.type)"
            :disabled="loadingAgents.includes(agent.type)"
            :title="agent.label"
          >
            {{ agent.icon }}
          </button>
        </div>
      </div>

      <!-- 文章总结 -->
      <div v-if="summary" class="summary-section">
        <div class="section-title">📝 文章总结</div>
        <div class="content-box">{{ summary }}</div>
      </div>

      <!-- 收藏的AI结果（从点击高亮句子触发） -->
      <div v-if="props.favoriteResults && props.favoriteResults.agentResults" class="results-section favorite-results-section">
        <div class="section-title">📚 保存的AI搜索结果</div>
        <div 
          v-for="(result, index) in getFavoriteAgentResults()" 
          :key="index"
          class="result-item favorite-result-item"
        >
          <div class="result-header">
            <strong>{{ result.agentType || result.type || '结果' }}</strong>
            <button class="remove-btn" @click="clearFavoriteResults">×</button>
          </div>
          <div class="result-content">{{ result.content }}</div>
        </div>
      </div>

      <!-- Agent结果 -->
      <div v-if="agentResults.length > 0" class="results-section">
        <div 
          v-for="(result, index) in agentResults" 
          :key="index"
          class="result-item"
        >
          <div class="result-header">
            <strong>{{ result.agentType }}</strong>
            <button class="remove-btn" @click="removeResult(index)">×</button>
          </div>
          <div class="result-content">
            <div v-if="result.type === 'words' && result.wordData" class="words-result">
              <div 
                v-for="(wordData, wordIdx) in result.wordData" 
                :key="wordIdx"
                class="word-item"
              >
                <div class="word-header">
                  <strong>{{ wordData.word }}</strong>
                  <span v-if="wordData.definition?.phonetic" class="phonetic">
                    [{{ wordData.definition.phonetic }}]
                  </span>
                  <button 
                    v-if="wordData.definition?.audio" 
                    @click="playWordAudio(wordData.definition.audio)"
                    class="audio-btn"
                    title="播放读音"
                  >
                    🔊
                  </button>
                </div>
                <div v-if="wordData.definition" class="word-meanings">
                  <div 
                    v-for="(meaning, meaningIdx) in wordData.definition.meanings" 
                    :key="meaningIdx"
                    class="meaning-item"
                  >
                    <em class="part-of-speech">{{ meaning.partOfSpeech }}</em>
                    <ul class="definitions-list">
                      <li v-for="(def, defIdx) in meaning.definitions.slice(0, 2)" :key="defIdx">
                        {{ def.definition }}
                        <div v-if="def.example" class="example">例: {{ def.example }}</div>
                      </li>
                    </ul>
                  </div>
                </div>
                <div v-else-if="wordData.error" class="word-error">
                  {{ wordData.error }}
                </div>
              </div>
            </div>
            <div v-else class="result-text">{{ result.content }}</div>
          </div>
        </div>
      </div>

      <!-- 对话机器人 -->
      <div class="chat-section">
        <div class="section-title">💬 智能问答</div>
        <div class="chat-messages" ref="chatMessagesRef">
          <div 
            v-for="(msg, idx) in chatMessages" 
            :key="idx"
            :class="['chat-message', msg.role]"
          >
            <div class="message-content">{{ msg.content }}</div>
          </div>
        </div>
        <div class="chat-input-area">
          <input 
            v-model="chatInput"
            @keyup.enter="sendChatMessage"
            class="chat-input"
            placeholder="输入问题..."
          />
          <button 
            @click="sendChatMessage"
            class="send-btn"
            :disabled="!chatInput || chatLoading"
          >
            {{ chatLoading ? '...' : '发送' }}
          </button>
        </div>
      </div>

      <!-- 收藏按钮 -->
      <div v-if="selectedText" class="favorite-section">
        <button 
          class="favorite-btn"
          @click="handleFavorite"
          :disabled="!selectedText || favoriteLoading"
        >
          {{ favoriteLoading ? '收藏中...' : '⭐ 收藏这句话' }}
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { Article } from '~/types/article';

const props = defineProps<{
  selectedText: string;
  articleId?: number;
  article?: Article | null;
  summary?: string;
  keywords?: string[];
  storyline?: any;
  favoriteResults?: any;
}>();

// 从文章内容中提取包含选中文本的完整句子
const extractOriginalSentence = (selectedText: string, articleContent: string): string => {
  if (!selectedText || !articleContent) return '';
  
  // 转义特殊字符用于正则表达式
  const escapedText = selectedText.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  
  // 查找选中文本在文章中的位置
  const index = articleContent.indexOf(selectedText);
  if (index === -1) {
    // 如果找不到精确匹配，尝试不区分大小写
    const lowerContent = articleContent.toLowerCase();
    const lowerSelected = selectedText.toLowerCase();
    const lowerIndex = lowerContent.indexOf(lowerSelected);
    if (lowerIndex === -1) {
      return selectedText; // 如果找不到，返回选中的文本本身
    }
    // 从找到的位置提取句子
    return extractSentenceAtPosition(articleContent, lowerIndex, selectedText.length);
  }
  
  return extractSentenceAtPosition(articleContent, index, selectedText.length);
};

// 从指定位置提取完整句子
const extractSentenceAtPosition = (text: string, position: number, selectionLength: number): string => {
  // 句子结束符
  const sentenceEnders = /[.!?。！？]\s+/g;
  
  // 向前查找句子开始（句号、问号、感叹号后的空格，或段落开始）
  let start = position;
  while (start > 0) {
    const char = text[start - 1];
    if (char === '.' || char === '!' || char === '?' || char === '。' || char === '！' || char === '？') {
      // 检查后面是否有空格或换行
      if (start < text.length && (text[start] === ' ' || text[start] === '\n')) {
        start++;
        break;
      }
    }
    if (char === '\n' && start > 1) {
      // 段落开始
      const prevChar = text[start - 2];
      if (prevChar === '\n' || start === 1) {
        break;
      }
    }
    start--;
  }
  
  // 向后查找句子结束
  let end = position + selectionLength;
  while (end < text.length) {
    const char = text[end];
    if (char === '.' || char === '!' || char === '?' || char === '。' || char === '！' || char === '？') {
      // 检查后面是否有空格或换行
      if (end + 1 >= text.length || text[end + 1] === ' ' || text[end + 1] === '\n') {
        end++;
        break;
      }
    }
    if (char === '\n' && end > position + selectionLength) {
      // 段落结束
      break;
    }
    end++;
  }
  
  // 提取句子并清理
  let sentence = text.substring(start, end).trim();
  
  // 如果提取的句子太短（小于选中文本长度），返回原始文本片段
  if (sentence.length < selectionLength) {
    // 返回包含选中文本的片段
    return text.substring(Math.max(0, position - 20), Math.min(text.length, position + selectionLength + 20)).trim();
  }
  
  // 清理句子：移除多余空格
  sentence = sentence.replace(/\s+/g, ' ');
  
  return sentence;
};

const emit = defineEmits<{
  favorite: [];
  clear: [];
}>();

const { fetchApi } = useApi();

const editableText = ref(props.selectedText);
const loadingAgents = ref<string[]>([]);
const agentResults = ref<Array<{ 
  agentType: string; 
  content: string; 
  type: string; 
  wordData?: Array<{ word: string; definition: any; error?: string }> 
}>>([]);
const favoriteLoading = ref(false);
const chatInput = ref('');
const chatMessages = ref<Array<{ role: 'user' | 'assistant'; content: string }>>([]);
const chatLoading = ref(false);
const chatMessagesRef = ref<HTMLElement>();
const audioRefs = ref<Map<string, HTMLAudioElement>>(new Map());

// 播放单词读音
const playWordAudio = (audioUrl: string) => {
  if (!audioUrl) return;
  
  // 如果URL是相对路径，添加完整URL
  const fullUrl = audioUrl.startsWith('http') 
    ? audioUrl 
    : `https:${audioUrl}`;
  
  const audio = new Audio(fullUrl);
  audio.play().catch(err => {
    console.error('Failed to play audio:', err);
  });
};

const agents = [
  { type: 'translate', label: '翻译', icon: '🌐' },
  { type: 'explain', label: '解释', icon: '💡' },
  { type: 'storyline', label: '故事线', icon: '📖' },
  { type: 'sentiment', label: '情感分析', icon: '😊' },
  { type: 'entities', label: '提取实体', icon: '👤' },
  { type: 'context', label: '上下文理解', icon: '🔍' },
  { type: 'words', label: '查看单词', icon: '📚' },
];

watch(() => props.selectedText, (newText) => {
  editableText.value = newText;
  // 如果切换了选中文本，清除收藏结果
  if (newText !== props.favoriteResults?.sentence) {
    clearFavoriteResults();
  }
});

watch(() => props.favoriteResults, (newFavorite) => {
  if (newFavorite) {
    // 当收到收藏结果时，更新选中文本
    editableText.value = newFavorite.sentence || newFavorite.originalSentence || props.selectedText;
  }
}, { immediate: true });

const hasResult = (type: string) => {
  return agentResults.value.some(r => r.type === type);
};

const handleAgentClick = async (agentType: string) => {
  if (!editableText.value) return;
  
  if (agentType === 'words') {
    // 查看单词功能：提取文本中的单词并查询字典
    await handleWordsLookup();
    return;
  }
  
  if (!props.articleId) return;

  loadingAgents.value.push(agentType);
  
  try {
    let result;
    if (agentType === 'translate') {
      const data = await fetchApi(`/articles/${props.articleId}/translate`, {
        method: 'POST',
        body: JSON.stringify({ text: editableText.value }),
      });
      result = data.translation;
    } else if (agentType === 'explain') {
      const data = await fetchApi(`/articles/${props.articleId}/explain`, {
        method: 'POST',
        body: JSON.stringify({ text: editableText.value }),
      });
      result = data.explanation;
    } else {
      const data = await fetchApi(`/text/${agentType}`, {
        method: 'POST',
        body: JSON.stringify({ 
          text: editableText.value,
          articleId: props.articleId 
        }),
      });
      result = data.result || data.content || JSON.stringify(data);
    }

    // 移除同类型的结果
    agentResults.value = agentResults.value.filter(r => r.type !== agentType);
    
    agentResults.value.push({
      agentType: agents.find(a => a.type === agentType)?.label || agentType,
      content: result,
      type: agentType
    });
  } catch (error) {
    console.error(`Agent ${agentType} error:`, error);
    agentResults.value.push({
      agentType: agents.find(a => a.type === agentType)?.label || agentType,
      content: `错误: ${error instanceof Error ? error.message : '处理失败'}`,
      type: agentType
    });
  } finally {
    loadingAgents.value = loadingAgents.value.filter(t => t !== agentType);
  }
};

// 处理单词查询
const handleWordsLookup = async () => {
  loadingAgents.value.push('words');
  
  try {
    // 提取文本中的单词（去除标点符号，只保留字母）
    const words = editableText.value
      .toLowerCase()
      .replace(/[^a-z\s]/g, ' ')
      .split(/\s+/)
      .filter(word => word.length > 2) // 过滤太短的单词
      .filter((word, index, self) => self.indexOf(word) === index) // 去重
      .slice(0, 10); // 最多查询10个单词
    
    if (words.length === 0) {
      agentResults.value.push({
        agentType: '查看单词',
        content: '未找到可查询的单词',
        type: 'words'
      });
      return;
    }
    
    const { lookupWord } = useWordLookup();
    const wordResults: Array<{ word: string; definition: any; error?: string }> = [];
    
    // 查询每个单词
    for (const word of words) {
      try {
        const definition = await lookupWord(word);
        if (definition) {
          wordResults.push({ word, definition });
        }
      } catch (error: any) {
        // 如果是简单单词，跳过
        if (error?.isSimple) {
          continue;
        }
        wordResults.push({ 
          word, 
          definition: null, 
          error: error?.message || '查询失败' 
        });
      }
    }
    
    // 移除同类型的结果
    agentResults.value = agentResults.value.filter(r => r.type !== 'words');
    
    if (wordResults.length === 0) {
      agentResults.value.push({
        agentType: '查看单词',
        content: '未找到需要查询的单词（已过滤简单单词）',
        type: 'words'
      });
      return;
    }
    
    // 格式化结果显示
    const formattedResults = wordResults.map(({ word, definition, error }) => {
      if (error) {
        return `**${word}**: ${error}`;
      }
      if (!definition) {
        return `**${word}**: 未找到`;
      }
      
      let result = `**${word}**`;
      if (definition.phonetic) {
        result += ` [${definition.phonetic}]`;
      }
      if (definition.audio) {
        result += ` 🔊`;
      }
      result += '\n';
      
      definition.meanings.forEach((meaning: any) => {
        result += `\n*${meaning.partOfSpeech}*\n`;
        meaning.definitions.slice(0, 2).forEach((def: any, idx: number) => {
          result += `${idx + 1}. ${def.definition}\n`;
          if (def.example) {
            result += `   例: ${def.example}\n`;
          }
        });
      });
      
      return result;
    }).join('\n\n---\n\n');
    
    agentResults.value.push({
      agentType: '查看单词',
      content: formattedResults,
      type: 'words',
      wordData: wordResults // 保存原始数据用于播放读音
    });
  } catch (error) {
    console.error('Words lookup error:', error);
    agentResults.value.push({
      agentType: '查看单词',
      content: `错误: ${error instanceof Error ? error.message : '处理失败'}`,
      type: 'words'
    });
  } finally {
    loadingAgents.value = loadingAgents.value.filter(t => t !== 'words');
  }
};

const sendChatMessage = async () => {
  if (!chatInput.value.trim() || chatLoading.value) return;
  
  const question = chatInput.value.trim();
  chatMessages.value.push({ role: 'user', content: question });
  chatInput.value = '';
  chatLoading.value = true;

  // 添加一个空的助手消息，用于流式更新
  const assistantMessageIndex = chatMessages.value.length;
  chatMessages.value.push({ role: 'assistant', content: '' });

  // 滚动到底部
  nextTick(() => {
    if (chatMessagesRef.value) {
      chatMessagesRef.value.scrollTop = chatMessagesRef.value.scrollHeight;
    }
  });

  try {
    // 构建上下文
    const context = {
      article: props.article,
      summary: props.summary,
      keywords: props.keywords,
      storyline: props.storyline,
      selectedText: editableText.value,
      agentResults: agentResults.value
    };

    const { fetchApi } = useApi();
    const config = useRuntimeConfig();
    const apiBase = config.public.apiBase || '/api';
    
    const response = await fetch(`${apiBase}/text/qa`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        question,
        articleId: props.articleId,
        context: JSON.stringify(context)
      }),
    });

    if (!response.ok) {
      throw new Error('Failed to get answer');
    }

    // 读取流式响应
    const reader = response.body?.getReader();
    const decoder = new TextDecoder();
    
    if (!reader) {
      throw new Error('No response body');
    }

    let buffer = '';
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop() || '';

      for (const line of lines) {
        if (line.startsWith('data: ')) {
          const data = line.slice(6);
          if (data === '[DONE]') {
            break;
          }
          try {
            const parsed = JSON.parse(data);
            if (parsed.chunk) {
              // 追加内容到助手消息
              chatMessages.value[assistantMessageIndex].content += parsed.chunk;
              
              // 实时滚动到底部
              nextTick(() => {
                if (chatMessagesRef.value) {
                  chatMessagesRef.value.scrollTop = chatMessagesRef.value.scrollHeight;
                }
              });
            }
          } catch (e) {
            // 忽略解析错误
          }
        }
      }
    }
  } catch (error) {
    chatMessages.value[assistantMessageIndex].content = `错误: ${error instanceof Error ? error.message : '回答失败'}`;
  } finally {
    chatLoading.value = false;
    nextTick(() => {
      if (chatMessagesRef.value) {
        chatMessagesRef.value.scrollTop = chatMessagesRef.value.scrollHeight;
      }
    });
  }
};

const handleFavorite = async () => {
  if (!editableText.value) return;
  
  favoriteLoading.value = true;
  try {
    const latestExplanation = agentResults.value.length > 0 
      ? agentResults.value[agentResults.value.length - 1].content
      : '';
    
    // 确保 articleId 是有效的数字
    const articleId = props.articleId && !isNaN(props.articleId) && props.articleId > 0 
      ? props.articleId 
      : undefined;
    
    // 提取原句（如果文章内容可用）
    let originalSentence = '';
    if (props.article && props.article.content) {
      originalSentence = extractOriginalSentence(editableText.value, props.article.content);
    }
    
    // 提取标签（从agentResults中提取agentType作为标签）
    const tags = agentResults.value.map(r => r.agentType || r.agentType).filter(Boolean);
    
    await fetchApi('/favorites/sentences', {
      method: 'POST',
      body: JSON.stringify({
        articleId: articleId,
        sentence: editableText.value,
        originalSentence: originalSentence || editableText.value, // 如果提取失败，使用选中文本
        explanation: latestExplanation,
        agentType: agentResults.value.length > 0 ? agentResults.value[agentResults.value.length - 1].agentType : null,
        tags: tags, // 保存所有agent类型作为标签
        agentResults: agentResults.value // 保存所有AI搜索结果
      }),
    });
    
    emit('favorite');
  } catch (error) {
    console.error('Favorite error:', error);
    // 显示用户友好的错误信息
    const errorMessage = error instanceof Error ? error.message : '收藏失败';
    alert(`收藏失败: ${errorMessage}`);
  } finally {
    favoriteLoading.value = false;
  }
};

const clearSelection = () => {
  emit('clear');
  clearFavoriteResults();
};

const clearFavoriteResults = () => {
  // 通过emit清除父组件的showFavoriteResults
  // 这里我们需要一个更好的方式，暂时先这样
};

// 获取收藏的AI结果
const getFavoriteAgentResults = (): any[] => {
  if (!props.favoriteResults || !props.favoriteResults.agentResults) {
    return [];
  }
  
  const results = props.favoriteResults.agentResults;
  if (typeof results === 'string') {
    try {
      return JSON.parse(results);
    } catch (e) {
      return [];
    }
  }
  if (Array.isArray(results)) {
    return results;
  }
  return [];
};

const removeResult = (index: number) => {
  agentResults.value.splice(index, 1);
};
</script>

<style scoped>
.knowledge-panel {
  display: flex;
  flex-direction: column;
  height: 100%;
  background: white;
}

.sticky-header {
  position: sticky;
  top: 0;
  z-index: 10;
  background: white;
  border-bottom: 1px solid #e0e0e0;
}

.panel-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 1rem 1.5rem;
  background: #f8f9fa;
}

.panel-header h3 {
  margin: 0;
  font-size: 1.1rem;
  color: #333;
}

.close-btn {
  background: none;
  border: none;
  font-size: 1.5rem;
  cursor: pointer;
  color: #666;
  line-height: 1;
  width: 24px;
  height: 24px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.close-btn:hover {
  color: #333;
}

.panel-content {
  flex: 1;
  overflow-y: auto;
  padding: 1rem 1.5rem;
}

.section-title {
  font-weight: 600;
  margin-bottom: 0.75rem;
  color: #333;
  font-size: 0.95rem;
}

.selected-text-section {
  margin-bottom: 1.5rem;
  padding-bottom: 1.5rem;
  border-bottom: 1px solid #e0e0e0;
}

.text-input {
  width: 100%;
  padding: 0.75rem;
  border: 1px solid #ddd;
  border-radius: 4px;
  font-size: 0.95rem;
  font-family: inherit;
  resize: vertical;
  margin-bottom: 1rem;
}

.agent-icons {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
  justify-content: flex-end;
}

.agent-icon-btn {
  width: 36px;
  height: 36px;
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

.agent-icon-btn:hover:not(:disabled) {
  background: #f0f0f0;
  transform: scale(1.1);
}

.agent-icon-btn:disabled,
.agent-icon-btn.loading {
  opacity: 0.5;
  cursor: not-allowed;
}

.agent-icon-btn.active {
  background: #e3f2fd;
  border-color: #1976d2;
}

.summary-section,
.results-section {
  margin-bottom: 1.5rem;
}

.favorite-results-section {
  background: #fff9e6;
  border-left: 3px solid #ffc107;
  padding: 1rem;
  border-radius: 4px;
}

.favorite-result-item {
  background: white;
  margin-top: 0.5rem;
}

.content-box {
  padding: 1rem;
  background: #f8f9fa;
  border-radius: 4px;
  line-height: 1.6;
  color: #555;
}

.result-item {
  margin-bottom: 1rem;
  padding: 1rem;
  background: #f8f9fa;
  border-radius: 4px;
  border-left: 3px solid #007bff;
}

.result-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 0.5rem;
}

.remove-btn {
  background: none;
  border: none;
  color: #999;
  cursor: pointer;
  font-size: 1.2rem;
  line-height: 1;
}

.remove-btn:hover {
  color: #666;
}

.result-content {
  color: #555;
  line-height: 1.6;
  white-space: pre-wrap;
}

.words-result {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.word-item {
  padding: 0.75rem;
  background: white;
  border-radius: 4px;
  border: 1px solid #e0e0e0;
}

.word-header {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  margin-bottom: 0.5rem;
  font-size: 1.1rem;
}

.word-header strong {
  color: #1976d2;
}

.phonetic {
  color: #666;
  font-size: 0.9rem;
  font-style: italic;
}

.audio-btn {
  background: #4caf50;
  color: white;
  border: none;
  border-radius: 50%;
  width: 28px;
  height: 28px;
  cursor: pointer;
  font-size: 0.9rem;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s;
}

.audio-btn:hover {
  background: #45a049;
  transform: scale(1.1);
}

.word-meanings {
  margin-top: 0.5rem;
}

.meaning-item {
  margin-bottom: 0.75rem;
}

.part-of-speech {
  color: #666;
  font-size: 0.85rem;
  font-style: italic;
  margin-right: 0.5rem;
}

.definitions-list {
  margin: 0.25rem 0 0 1rem;
  padding: 0;
  list-style: none;
}

.definitions-list li {
  margin-bottom: 0.5rem;
  line-height: 1.5;
}

.example {
  margin-top: 0.25rem;
  padding-left: 1rem;
  color: #888;
  font-size: 0.9rem;
  font-style: italic;
}

.word-error {
  color: #d32f2f;
  font-size: 0.9rem;
}

.chat-section {
  margin-bottom: 1.5rem;
  padding-bottom: 1.5rem;
  border-bottom: 1px solid #e0e0e0;
}

.chat-messages {
  max-height: 300px;
  overflow-y: auto;
  margin-bottom: 1rem;
  padding: 0.5rem;
  background: #f8f9fa;
  border-radius: 4px;
}

.chat-message {
  margin-bottom: 0.75rem;
}

.chat-message.user {
  text-align: right;
}

.chat-message.assistant {
  text-align: left;
}

.message-content {
  display: inline-block;
  padding: 0.5rem 0.75rem;
  border-radius: 8px;
  max-width: 80%;
  line-height: 1.4;
}

.user .message-content {
  background: #007bff;
  color: white;
}

.assistant .message-content {
  background: white;
  color: #333;
  border: 1px solid #ddd;
}

.chat-input-area {
  display: flex;
  gap: 0.5rem;
}

.chat-input {
  flex: 1;
  padding: 0.5rem;
  border: 1px solid #ddd;
  border-radius: 4px;
  font-size: 0.9rem;
}

.send-btn {
  padding: 0.5rem 1rem;
  background: #007bff;
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-size: 0.9rem;
}

.send-btn:hover:not(:disabled) {
  background: #0056b3;
}

.send-btn:disabled {
  background: #ccc;
  cursor: not-allowed;
}

.favorite-section {
  padding-top: 1rem;
  border-top: 1px solid #e0e0e0;
}

.favorite-btn {
  width: 100%;
  padding: 0.75rem;
  background: #28a745;
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-size: 0.95rem;
}

.favorite-btn:hover:not(:disabled) {
  background: #218838;
}

.favorite-btn:disabled {
  background: #ccc;
  cursor: not-allowed;
}
</style>

