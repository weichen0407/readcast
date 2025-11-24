<template>
  <div class="text-selector" ref="containerRef">
    <span 
      v-for="(word, index) in words" 
      :key="index"
      class="word-block"
      :class="{ selected: selectedWords.includes(index) }"
      @click.stop="handleWordClick(word, index)"
      @mousedown="handleMouseDown(index)"
      @mouseenter="handleMouseEnter(index)"
    >
      {{ word }}{{ index < words.length - 1 ? ' ' : '' }}
    </span>
  </div>
</template>

<script setup lang="ts">
const props = defineProps<{
  text: string;
}>();

const emit = defineEmits<{
  translate: [text: string];
  explain: [text: string];
  wordClick: [word: string];
}>();

const containerRef = ref<HTMLElement>();
const words = computed(() => {
  // Split text into words, preserving spaces and punctuation
  const tokens = props.text.match(/\S+|\s+/g) || [];
  return tokens;
});

const selectedWords = ref<number[]>([]);
const isSelecting = ref(false);
const selectionStart = ref<number | null>(null);
const hoveredIndex = ref<number | null>(null);

const handleWordClick = (word: string, index: number) => {
  // Single click on word - emit word click event
  const cleanWord = word.trim().replace(/[.,!?;:()"]/g, '');
  if (cleanWord) {
    emit('wordClick', cleanWord);
  }
};

const handleMouseDown = (index: number) => {
  isSelecting.value = true;
  selectionStart.value = index;
  selectedWords.value = [index];
};

const handleMouseEnter = (index: number) => {
  hoveredIndex.value = index;
  if (isSelecting.value && selectionStart.value !== null) {
    const start = Math.min(selectionStart.value, index);
    const end = Math.max(selectionStart.value, index);
    selectedWords.value = Array.from({ length: end - start + 1 }, (_, i) => start + i);
  }
};

// Handle mouse up for text selection
let handleMouseUp: (() => void) | null = null;
let nativeSelectionHandler: ((e: MouseEvent) => void) | null = null;

onMounted(() => {
  handleMouseUp = () => {
    if (isSelecting.value && selectionStart.value !== null && hoveredIndex.value !== null) {
      const start = Math.min(selectionStart.value, hoveredIndex.value);
      const end = Math.max(selectionStart.value, hoveredIndex.value);
      const selectedText = words.value.slice(start, end + 1).join('').trim();
      
      if (selectedText && selectedText.length > 1) {
        emit('translate', selectedText);
      }
    }
    
    isSelecting.value = false;
    selectionStart.value = null;
    hoveredIndex.value = null;
  };

  if (handleMouseUp) {
    document.addEventListener('mouseup', handleMouseUp);
  }

  // Also support native text selection
  if (containerRef.value) {
    nativeSelectionHandler = () => {
      // Small delay to let native selection work
      setTimeout(() => {
        const selection = window.getSelection();
        if (selection && selection.toString().trim() && selection.toString().trim().length > 1) {
          emit('translate', selection.toString().trim());
        }
      }, 100);
    };
    containerRef.value.addEventListener('mouseup', nativeSelectionHandler);
  }
});

onUnmounted(() => {
  if (handleMouseUp) {
    document.removeEventListener('mouseup', handleMouseUp);
  }
  if (nativeSelectionHandler && containerRef.value) {
    containerRef.value.removeEventListener('mouseup', nativeSelectionHandler);
  }
});
</script>

<style scoped>
.text-selector {
  display: flex;
  flex-wrap: wrap;
  gap: 0.25rem;
  line-height: 1.8;
}

.word-block {
  padding: 0.2rem 0.4rem;
  cursor: pointer;
  border-radius: 3px;
  transition: all 0.2s;
  user-select: none;
}

.word-block:hover {
  background: #e3f2fd;
}

.word-block.selected {
  background: #2196f3;
  color: white;
}

.word-block.selected:hover {
  background: #1976d2;
}
</style>

