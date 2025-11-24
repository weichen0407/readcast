<template>
  <div class="selection-panel" v-if="selectedText">
    <div class="panel-header">
      <h3>选中内容</h3>
      <button class="close-btn" @click="clearSelection">×</button>
    </div>
    
    <div class="selected-text-area">
      <textarea 
        v-model="editableText"
        class="text-input"
        placeholder="选中的文本将显示在这里，您可以编辑..."
        rows="6"
      ></textarea>
    </div>

    <div class="agent-buttons">
      <button 
        v-for="agent in agents" 
        :key="agent.type"
        class="agent-btn"
        :class="{ loading: loadingAgents.includes(agent.type) }"
        @click="handleAgentClick(agent.type)"
        :disabled="loadingAgents.includes(agent.type)"
      >
        {{ loadingAgents.includes(agent.type) ? '处理中...' : agent.label }}
      </button>
    </div>

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
        <div class="result-content">{{ result.content }}</div>
      </div>
    </div>

    <div class="favorite-section">
      <button 
        class="favorite-btn"
        @click="handleFavorite"
        :disabled="!selectedText || favoriteLoading"
      >
        {{ favoriteLoading ? '收藏中...' : '⭐ 收藏这句话' }}
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
const props = defineProps<{
  selectedText: string;
  articleId?: number;
}>();

const emit = defineEmits<{
  agentRequest: [type: string, text: string];
  favorite: [text: string, explanation: string];
  clear: [];
}>();

const { fetchApi } = useApi();

const editableText = ref(props.selectedText);
const loadingAgents = ref<string[]>([]);
const agentResults = ref<Array<{ agentType: string; content: string }>>([]);
const favoriteLoading = ref(false);

const agents = [
  { type: 'translate', label: '翻译' },
  { type: 'explain', label: '解释' },
  { type: 'storyline', label: '故事线' },
  { type: 'sentiment', label: '情感分析' },
  { type: 'entities', label: '提取实体' },
  { type: 'context', label: '上下文理解' },
];

watch(() => props.selectedText, (newText) => {
  editableText.value = newText;
  agentResults.value = [];
});

const handleAgentClick = async (agentType: string) => {
  if (!editableText.value || !props.articleId) return;

  loadingAgents.value.push(agentType);
  
  try {
    emit('agentRequest', agentType, editableText.value);
    
    // 根据不同的agent类型调用不同的API
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
      // 其他agents
      const data = await fetchApi(`/text/${agentType}`, {
        method: 'POST',
        body: JSON.stringify({ 
          text: editableText.value,
          articleId: props.articleId 
        }),
      });
      result = data.result || data.content || JSON.stringify(data);
    }

    agentResults.value.push({
      agentType: agents.find(a => a.type === agentType)?.label || agentType,
      content: result
    });
  } catch (error) {
    console.error(`Agent ${agentType} error:`, error);
    agentResults.value.push({
      agentType: agents.find(a => a.type === agentType)?.label || agentType,
      content: `错误: ${error instanceof Error ? error.message : '处理失败'}`
    });
  } finally {
    loadingAgents.value = loadingAgents.value.filter(t => t !== agentType);
  }
};

const handleFavorite = async () => {
  if (!editableText.value || !props.articleId) return;
  
  favoriteLoading.value = true;
  try {
    // 获取最新的解释（如果有）
    const latestExplanation = agentResults.value.length > 0 
      ? agentResults.value[agentResults.value.length - 1].content
      : '';
    
    emit('favorite', editableText.value, latestExplanation);
    
    // 调用API保存收藏
    await fetchApi('/favorites/sentences', {
      method: 'POST',
      body: JSON.stringify({
        articleId: props.articleId,
        sentence: editableText.value,
        explanation: latestExplanation,
        agentType: agentResults.value.length > 0 ? agentResults.value[agentResults.value.length - 1].agentType : null
      }),
    });
  } catch (error) {
    console.error('Favorite error:', error);
  } finally {
    favoriteLoading.value = false;
  }
};

const clearSelection = () => {
  emit('clear');
};

const removeResult = (index: number) => {
  agentResults.value.splice(index, 1);
};
</script>

<style scoped>
.selection-panel {
  width: 100%;
  background: white;
  border-left: 1px solid #e0e0e0;
  display: flex;
  flex-direction: column;
  height: 100%;
}

.panel-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 1rem;
  border-bottom: 1px solid #e0e0e0;
  background: #f5f5f5;
}

.panel-header h3 {
  margin: 0;
  font-size: 1.1rem;
}

.close-btn {
  background: none;
  border: none;
  font-size: 1.5rem;
  cursor: pointer;
  color: #666;
  line-height: 1;
}

.close-btn:hover {
  color: #333;
}

.selected-text-area {
  padding: 1rem;
  border-bottom: 1px solid #e0e0e0;
}

.text-input {
  width: 100%;
  padding: 0.75rem;
  border: 1px solid #ddd;
  border-radius: 4px;
  font-size: 1rem;
  font-family: inherit;
  resize: vertical;
  min-height: 120px;
}

.agent-buttons {
  padding: 1rem;
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
  border-bottom: 1px solid #e0e0e0;
}

.agent-btn {
  padding: 0.5rem 1rem;
  background: #007bff;
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-size: 0.9rem;
  transition: background 0.2s;
}

.agent-btn:hover:not(:disabled) {
  background: #0056b3;
}

.agent-btn:disabled,
.agent-btn.loading {
  background: #ccc;
  cursor: not-allowed;
}

.results-section {
  flex: 1;
  overflow-y: auto;
  padding: 1rem;
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

.favorite-section {
  padding: 1rem;
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
  font-size: 1rem;
}

.favorite-btn:hover:not(:disabled) {
  background: #218838;
}

.favorite-btn:disabled {
  background: #ccc;
  cursor: not-allowed;
}
</style>

