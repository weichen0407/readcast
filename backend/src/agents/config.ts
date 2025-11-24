import { ChatOpenAI } from '@langchain/openai';
import dotenv from 'dotenv';

// 确保加载环境变量
dotenv.config();

// 获取 DeepSeek API Key
const getDeepSeekApiKey = (): string => {
  const key = process.env.DEEPSEEK_API_KEY;
  if (!key) {
    console.warn('⚠️ DEEPSEEK_API_KEY is not set. Some AI features may not work.');
    return ''; // 返回空字符串而不是抛出错误，允许应用启动
  }
  return key;
};

// 创建 DeepSeek 模型的统一配置函数
export function createDeepSeekModel(options: {
  temperature?: number;
  model?: string;
} = {}) {
  const apiKey = getDeepSeekApiKey();
  
  return new ChatOpenAI({
    model: options.model || 'deepseek-chat',
    temperature: options.temperature ?? 0.3,
    apiKey: apiKey,
    configuration: {
      baseURL: 'https://api.deepseek.com/v1',
    },
  });
}

