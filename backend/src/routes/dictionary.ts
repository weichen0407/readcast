import express from 'express';
import axios from 'axios';

const router = express.Router();

// 简单单词列表（常见的基础单词，不需要显示）
const SIMPLE_WORDS = new Set([
  'a', 'an', 'the', 'is', 'are', 'was', 'were', 'be', 'been', 'being',
  'have', 'has', 'had', 'do', 'does', 'did', 'will', 'would', 'could', 'should',
  'can', 'may', 'might', 'must', 'shall',
  'i', 'you', 'he', 'she', 'it', 'we', 'they',
  'this', 'that', 'these', 'those',
  'in', 'on', 'at', 'to', 'for', 'of', 'with', 'by', 'from', 'up', 'about', 'into',
  'and', 'or', 'but', 'so', 'if', 'when', 'where', 'why', 'how',
  'not', 'no', 'yes',
  'my', 'your', 'his', 'her', 'its', 'our', 'their',
  'me', 'him', 'us', 'them',
  'what', 'who', 'which', 'whose',
  'am', 'get', 'got', 'go', 'went', 'come', 'came', 'see', 'saw', 'know', 'knew',
  'say', 'said', 'think', 'thought', 'take', 'took', 'give', 'gave', 'make', 'made',
  'look', 'want', 'use', 'find', 'tell', 'ask', 'work', 'seem', 'feel', 'try',
  'leave', 'call', 'need', 'help', 'show', 'move', 'live', 'believe', 'bring',
  'happen', 'write', 'sit', 'stand', 'lose', 'add', 'change', 'begin', 'start',
  'turn', 'play', 'run', 'walk', 'talk', 'speak', 'hear', 'listen', 'read',
  'eat', 'drink', 'sleep', 'wake', 'buy', 'sell', 'pay', 'cost', 'spend',
  'good', 'bad', 'big', 'small', 'new', 'old', 'young', 'long', 'short', 'high', 'low',
  'right', 'left', 'up', 'down', 'here', 'there', 'now', 'then', 'today', 'yesterday', 'tomorrow',
  'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten',
  'first', 'second', 'third', 'last', 'next', 'before', 'after',
  'very', 'much', 'many', 'more', 'most', 'some', 'any', 'all', 'each', 'every',
  'well', 'better', 'best', 'just', 'only', 'also', 'too', 'even', 'still', 'already',
  'again', 'back', 'away', 'out', 'off', 'over', 'under', 'through', 'across',
  'now', 'then', 'soon', 'later', 'early', 'late', 'always', 'never', 'often', 'sometimes',
  'here', 'there', 'where', 'everywhere', 'anywhere', 'somewhere',
  'way', 'thing', 'time', 'day', 'year', 'week', 'month', 'hour', 'minute',
  'man', 'woman', 'person', 'people', 'child', 'children', 'boy', 'girl',
  'house', 'home', 'room', 'door', 'window', 'table', 'chair', 'bed',
  'water', 'food', 'money', 'car', 'book', 'paper', 'pen', 'pencil',
  'hand', 'head', 'eye', 'ear', 'nose', 'mouth', 'foot', 'feet', 'body',
  'dog', 'cat', 'bird', 'fish', 'tree', 'flower', 'sun', 'moon', 'star',
  'red', 'blue', 'green', 'yellow', 'black', 'white', 'brown', 'gray',
  'hot', 'cold', 'warm', 'cool', 'nice', 'fine', 'ok', 'okay', 'sure',
  'hello', 'hi', 'bye', 'goodbye', 'thanks', 'thank', 'please', 'sorry',
  'yes', 'no', 'maybe', 'perhaps', 'probably', 'certainly', 'definitely',
  'hello', 'world', 'name', 'way', 'day', 'man', 'thing', 'woman', 'life', 'child',
  'government', 'work', 'system', 'program', 'question', 'work', 'government', 'number',
  'night', 'point', 'home', 'water', 'room', 'mother', 'area', 'money', 'story',
  'fact', 'month', 'lot', 'right', 'study', 'book', 'eye', 'job', 'word', 'business',
  'issue', 'side', 'kind', 'head', 'house', 'service', 'friend', 'father', 'power',
  'hour', 'game', 'line', 'end', 'member', 'law', 'car', 'city', 'community',
  'name', 'president', 'team', 'minute', 'idea', 'kid', 'body', 'information', 'back',
  'parent', 'face', 'others', 'level', 'office', 'door', 'health', 'person', 'art',
  'war', 'history', 'party', 'result', 'change', 'morning', 'reason', 'research', 'girl',
  'guy', 'moment', 'air', 'teacher', 'force', 'education'
]);

// 检查是否为简单单词
function isSimpleWord(word: string): boolean {
  const cleanWord = word.toLowerCase().replace(/[^a-z]/g, '');
  return SIMPLE_WORDS.has(cleanWord) || cleanWord.length <= 2;
}

// Get word definition from Free Dictionary API
router.get('/:word', async (req, res) => {
  try {
    const word = req.params.word.toLowerCase().trim();
    
    // 过滤简单单词
    if (isSimpleWord(word)) {
      return res.status(400).json({ 
        error: 'Simple word',
        message: 'This is a common word and does not need definition',
        isSimple: true
      });
    }
    
    const response = await axios.get(`https://api.dictionaryapi.dev/api/v2/entries/en/${word}`, {
      timeout: 10000
    });
    
    if (!response.data || !Array.isArray(response.data) || response.data.length === 0) {
      return res.status(404).json({ error: 'Word not found' });
    }
    
    const data = response.data[0];
    
    // 提取所有读音音频（优先选择有音频的）
    const phonetics = data.phonetics || [];
    const audioPhonetic = phonetics.find((p: any) => p.audio && p.audio.trim());
    const textPhonetic = phonetics.find((p: any) => p.text && p.text.trim());
    
    const result = {
      word: data.word,
      phonetic: data.phonetic || textPhonetic?.text || '',
      audio: audioPhonetic?.audio || phonetics.find((p: any) => p.audio)?.audio || '',
      meanings: data.meanings.map((meaning: any) => ({
        partOfSpeech: meaning.partOfSpeech,
        definitions: meaning.definitions.map((def: any) => ({
          definition: def.definition,
          example: def.example || null
        }))
      }))
    };
    
    res.json(result);
  } catch (error) {
    if (axios.isAxiosError(error)) {
      if (error.response?.status === 404) {
        res.status(404).json({ error: 'Word not found' });
      } else {
        res.status(500).json({ 
          error: error.message || 'Failed to fetch word definition' 
        });
      }
    } else {
      res.status(500).json({ 
        error: error instanceof Error ? error.message : 'Failed to fetch word definition' 
      });
    }
  }
});

export default router;

