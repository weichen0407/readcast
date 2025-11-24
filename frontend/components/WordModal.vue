<template>
  <div class="modal-overlay" @click.self="$emit('close')">
    <div class="modal-content">
      <div class="modal-header">
        <h2>{{ word }}</h2>
        <button class="close-btn" @click="$emit('close')">×</button>
      </div>

      <div v-if="loading" class="loading">加载中...</div>
      <div v-else-if="error" class="error">{{ error }}</div>
      <div v-else-if="definition" class="definition">
        <div v-if="definition.phonetic" class="phonetic">
          {{ definition.phonetic }}
        </div>
        
        <div v-if="definition.audio" class="audio">
          <button @click="playAudio" class="play-btn">🔊 播放读音</button>
          <audio ref="audioRef" :src="definition.audio" />
        </div>

        <div v-for="(meaning, idx) in definition.meanings" :key="idx" class="meaning">
          <h3 class="part-of-speech">{{ meaning.partOfSpeech }}</h3>
          <ul class="definitions">
            <li v-for="(def, defIdx) in meaning.definitions" :key="defIdx">
              <div class="definition-text">{{ def.definition }}</div>
              <div v-if="def.example" class="example">
                <em>例：{{ def.example }}</em>
              </div>
            </li>
          </ul>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { WordDefinition } from '~/types/dictionary';

const props = defineProps<{
  word: string;
}>();

const emit = defineEmits<{
  close: [];
}>();

const { lookupWord, loading, error } = useWordLookup();
const definition = ref<WordDefinition | null>(null);
const audioRef = ref<HTMLAudioElement>();

const loadDefinition = async () => {
  if (props.word) {
    definition.value = await lookupWord(props.word);
  }
};

const playAudio = () => {
  if (audioRef.value && definition.value?.audio) {
    audioRef.value.play().catch(err => {
      console.error('Failed to play audio:', err);
    });
  }
};

watch(() => props.word, () => {
  loadDefinition();
}, { immediate: true });
</script>

<style scoped>
.modal-overlay {
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

.modal-content {
  background: white;
  border-radius: 8px;
  max-width: 600px;
  width: 90%;
  max-height: 80vh;
  overflow-y: auto;
  box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
}

.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 1.5rem;
  border-bottom: 1px solid #eee;
}

.modal-header h2 {
  margin: 0;
  color: #333;
}

.close-btn {
  background: none;
  border: none;
  font-size: 2rem;
  cursor: pointer;
  color: #666;
  line-height: 1;
}

.close-btn:hover {
  color: #333;
}

.loading, .error {
  padding: 2rem;
  text-align: center;
}

.error {
  color: #c33;
}

.definition {
  padding: 1.5rem;
}

.phonetic {
  font-size: 1.2rem;
  color: #666;
  margin-bottom: 1rem;
}

.audio {
  margin-bottom: 1.5rem;
}

.play-btn {
  padding: 0.5rem 1rem;
  background: #007bff;
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-size: 1rem;
}

.play-btn:hover {
  background: #0056b3;
}

.meaning {
  margin-bottom: 1.5rem;
}

.part-of-speech {
  font-size: 1rem;
  color: #007bff;
  margin-bottom: 0.5rem;
  font-style: italic;
}

.definitions {
  list-style: none;
  padding: 0;
}

.definitions li {
  margin-bottom: 1rem;
  padding-left: 1rem;
  border-left: 3px solid #e3f2fd;
}

.definition-text {
  margin-bottom: 0.5rem;
}

.example {
  color: #666;
  font-size: 0.9rem;
  margin-top: 0.5rem;
}
</style>

