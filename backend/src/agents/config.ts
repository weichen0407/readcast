import { ChatOpenAI } from '@langchain/openai';
import dotenv from 'dotenv';

// 确保加载环境变量
dotenv.config();

// 获取 DeepSeek API Key
const getDeepSeekApiKey = (): string => {
  const key = process.env.DEEPSEEK_API_KEY;
  if (!key) {
    throw new Error('DEEPSEEK_API_KEY is not set in environment variables. Please set it in .env file.');
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

