import type { WordDefinition } from '~/types/dictionary';

export const useWordLookup = () => {
  const { fetchApi } = useApi();
  const loading = ref(false);
  const error = ref<string | null>(null);

  const lookupWord = async (word: string): Promise<WordDefinition | null> => {
    loading.value = true;
    error.value = null;
    
    try {
      const data = await fetchApi(`/dictionary/${encodeURIComponent(word)}`);
      return data;
    } catch (err) {
      error.value = err instanceof Error ? err.message : 'Failed to lookup word';
      return null;
    } finally {
      loading.value = false;
    }
  };

  return {
    lookupWord,
    loading,
    error
  };
};

