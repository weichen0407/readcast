<template>
  <div 
    class="article-reader" 
    ref="readerRef"
    @dblclick="handleDoubleClick"
    @mouseup="handleMouseUp"
  >
    <div class="article-content" v-html="formattedContent"></div>
  </div>
</template>

<script setup lang="ts">
const props = defineProps<{
  content: string;
  favoriteSentences?: Array<{
    id: number;
    sentence: string;
    highlightColor?: string;
    agentResults?: any;
    tags?: string;
  }>;
}>();

const emit = defineEmits<{
  wordSelected: [word: string];
  textSelected: [text: string];
  favoriteClicked: [favorite: any];
}>();

const readerRef = ref<HTMLElement>();

// 格式化内容，高亮收藏的句子
const formattedContent = computed(() => {
  let text = props.content;
  
  // 先高亮收藏的句子
  if (props.favoriteSentences && props.favoriteSentences.length > 0) {
    // 按长度排序，先处理长句子，避免短句子被误匹配
    const sortedFavs = [...props.favoriteSentences].sort((a, b) => b.sentence.length - a.sentence.length);
    
    sortedFavs.forEach(fav => {
      const sentence = fav.sentence.trim();
      if (sentence && text.includes(sentence)) {
        const color = fav.highlightColor || '#ffeb3b';
        // 转义句子中的特殊字符，避免在HTML中出错
        const escapedSentence = sentence
          .replace(/&/g, '&amp;')
          .replace(/</g, '&lt;')
          .replace(/>/g, '&gt;');
        // 使用 encodeURIComponent + btoa 来安全地存储 JSON 数据（支持中文）
        const favoriteDataBase64 = btoa(encodeURIComponent(JSON.stringify(fav)));
        const highlighted = `<mark style="background-color: ${color}; padding: 2px 4px; border-radius: 2px; cursor: pointer;" data-favorite-id="${fav.id}" data-favorite-data="${favoriteDataBase64}" title="点击查看AI搜索结果" class="favorite-highlight">${escapedSentence}</mark>`;
        text = text.replace(sentence, highlighted);
      }
    });
  }
  
  // 将文本转换为段落
  const paragraphs = text.split('\n').map(para => para.trim()).filter(para => para.length > 0);
  
  return paragraphs.map(para => {
    // 如果段落中已经包含HTML标记（高亮），直接返回
    if (para.includes('<mark')) {
      return `<p>${para}</p>`;
    }
    // 否则转义HTML
    const escaped = para
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');
    return `<p>${escaped}</p>`;
  }).join('');
});

// 双击选词 - 现在只触发文本选择，不弹窗
const handleDoubleClick = (event: MouseEvent) => {
  // 双击时也触发文本选择，但不单独处理单词
  setTimeout(() => {
    const selection = window.getSelection();
    if (selection && selection.toString().trim()) {
      const text = selection.toString().trim();
      if (text.length > 0) {
        emit('textSelected', text);
      }
    }
  }, 10);
};

// 鼠标抬起时处理文本选择
const handleMouseUp = (event: MouseEvent) => {
  // 检查是否点击了收藏的高亮标记
  const target = event.target as HTMLElement;
  if (target.classList.contains('favorite-highlight') || target.closest('.favorite-highlight')) {
    const favoriteElement = target.classList.contains('favorite-highlight') 
      ? target 
      : target.closest('.favorite-highlight') as HTMLElement;
    
      if (favoriteElement) {
        const favoriteId = favoriteElement.getAttribute('data-favorite-id');
        const favoriteDataBase64 = favoriteElement.getAttribute('data-favorite-data');
        
        if (favoriteId && favoriteDataBase64) {
          try {
            // 从 base64 解码 JSON 数据（支持中文）
            const favorite = JSON.parse(decodeURIComponent(atob(favoriteDataBase64)));
            emit('favoriteClicked', favorite);
            return;
          } catch (e) {
            console.error('Failed to parse favorite data:', e);
          }
        }
      }
  }
  
  // 处理普通文本选择
  setTimeout(() => {
    const selection = window.getSelection();
    if (selection && selection.toString().trim()) {
      const text = selection.toString().trim();
      if (text.length > 0) {
        emit('textSelected', text);
      }
    }
  }, 10);
};
</script>

<style scoped>
.article-reader {
  width: 100%;
  min-height: 400px;
  padding: 1.5rem;
  line-height: 1.8;
  font-size: 1.1rem;
  color: #333;
  user-select: text;
  cursor: text;
}

.article-content {
  word-wrap: break-word;
}

.article-content p {
  margin-bottom: 1rem;
}

.article-content p:last-child {
  margin-bottom: 0;
}

/* 选中文本高亮 */
.article-reader ::selection {
  background: #b3d4fc;
  color: #000;
}
</style>

