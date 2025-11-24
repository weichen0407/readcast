import axios from 'axios';
import { PodcastScript } from '../agents/podcastScriptAgent.js';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Minimax TTS API配置
const MINIMAX_API_BASE = 'https://api.minimaxi.com/v1';
const MINIMAX_TTS_ENDPOINT = `${MINIMAX_API_BASE}/t2a_v2`;

// 获取API密钥
function getMinimaxApiKey(): string {
  const key = process.env.MINIMAX_API_KEY;
  if (!key) {
    throw new Error('MINIMAX_API_KEY is not set in environment variables. Please set it in .env file.');
  }
  return key;
}

// 音色配置
const VOICE_CONFIGS = {
  // 中文音色
  'zh-male': {
    voice_id: 'male-qn-qingse',
    speed: 1.0,
    vol: 1.0,
    pitch: 0,
    emotion: 'neutral'
  },
  'zh-female': {
    voice_id: 'female-shaonv',
    speed: 1.0,
    vol: 1.0,
    pitch: 0,
    emotion: 'neutral'
  },
  // 英文音色
  'en-male': {
    voice_id: 'male-qn-qingse', // 使用支持英文的音色
    speed: 1.0,
    vol: 1.0,
    pitch: 0,
    emotion: 'neutral'
  },
  'en-female': {
    voice_id: 'female-shaonv', // 使用支持英文的音色
    speed: 1.0,
    vol: 1.0,
    pitch: 0,
    emotion: 'neutral'
  }
};

/**
 * 检测文本语言（简单检测）
 */
function detectLanguage(text: string): 'zh' | 'en' {
  // 简单检测：如果包含中文字符，认为是中文
  const chineseRegex = /[\u4e00-\u9fa5]/;
  return chineseRegex.test(text) ? 'zh' : 'en';
}

/**
 * 调用Minimax TTS API生成音频（带重试机制）
 * 导出用于测试
 */
export async function generateAudioWithMinimax(
  text: string,
  language: 'zh' | 'en' = 'zh',
  voiceType: 'male' | 'female' = 'male',
  retries: number = 3
): Promise<Buffer> {
  const apiKey = getMinimaxApiKey();
  const voiceKey = `${language}-${voiceType}`;
  const voiceConfig = VOICE_CONFIGS[voiceKey] || VOICE_CONFIGS['zh-male'];

  // 限制文本长度，避免请求过大
  const maxTextLength = 5000; // Minimax API 可能有文本长度限制
  if (text.length > maxTextLength) {
    console.warn(`Text too long (${text.length} chars), truncating to ${maxTextLength} chars`);
    text = text.substring(0, maxTextLength);
  }

  let lastError: any = null;
  
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      console.log(`Minimax TTS API call (attempt ${attempt}/${retries}):`, {
        textLength: text.length,
        language,
        voiceType
      });

      const response = await axios.post(
        MINIMAX_TTS_ENDPOINT,
        {
          model: 'speech-2.6-hd', // 使用高质量模型
          text: text,
          stream: false,
          voice_setting: voiceConfig,
          audio_setting: {
            sample_rate: 32000,
            bitrate: 128000,
            format: 'mp3',
            channel: 1
          },
          subtitle_enable: false
        },
        {
          headers: {
            'Authorization': `Bearer ${apiKey}`,
            'Content-Type': 'application/json'
          },
          responseType: 'json', // Minimax返回JSON格式，包含base64编码的音频
          timeout: 60000, // 60秒超时
          // 添加重试配置
          validateStatus: (status) => status < 500, // 只重试服务器错误
        }
      );

      if (response.status === 200) {
        const responseData = response.data;
        
        // 检查响应格式
        if (responseData.base_resp && responseData.base_resp.status_code !== 0) {
          throw new Error(`Minimax API error: ${responseData.base_resp.status_msg || 'Unknown error'}`);
        }
        
        // 调试：打印响应结构（仅前1000字符，包含audio字段的前100字符）
        if (attempt === 1) {
          const responseStr = JSON.stringify(responseData, null, 2);
          console.log('Minimax API response structure (first 1000 chars):', responseStr.substring(0, 1000));
          if (responseData.data && responseData.data.audio) {
            const audioStr = responseData.data.audio;
            console.log('Audio field preview (first 200 chars):', audioStr.substring(0, 200));
            console.log('Audio field length:', audioStr.length);
            // 检查是否是base64格式
            const base64Pattern = /^[A-Za-z0-9+/=]+$/;
            const isBase64 = base64Pattern.test(audioStr.substring(0, 100));
            console.log('Audio field appears to be base64:', isBase64);
          }
        }
        
        // Minimax返回的音频数据可能在data.audio字段（base64编码）
        // 也可能在其他字段，需要检查
        let audioData: string | undefined;
        
        if (responseData.data && responseData.data.audio) {
          audioData = responseData.data.audio;
        } else if (responseData.audio) {
          audioData = responseData.audio;
        } else if (responseData.data) {
          // 检查data对象的所有字段
          const dataKeys = Object.keys(responseData.data);
          console.log('Available data keys:', dataKeys);
          // 尝试找到包含音频数据的字段
          for (const key of dataKeys) {
            if (typeof responseData.data[key] === 'string' && responseData.data[key].length > 100) {
              console.log(`Trying key "${key}" as audio data`);
              audioData = responseData.data[key];
              break;
            }
          }
        }
        
        if (audioData) {
          console.log(`✓ Minimax TTS API success (attempt ${attempt})`);
          console.log(`Audio data type: ${typeof audioData}, length: ${audioData.length}`);
          
          // 将音频数据转换为Buffer
          // Minimax返回的可能是base64或十六进制字符串
          try {
            // 清理字符串（移除可能的换行符、空格等）
            const cleanedAudioData = audioData.replace(/\s+/g, '');
            console.log(`Cleaned audio data length: ${cleanedAudioData.length}`);
            
            // 检查是否是十六进制字符串（以ID3开头：494433）
            let audioBuffer: Buffer;
            if (cleanedAudioData.startsWith('494433') || /^[0-9a-fA-F]+$/.test(cleanedAudioData)) {
              // 十六进制字符串
              console.log('Detected hexadecimal format, decoding as hex');
              audioBuffer = Buffer.from(cleanedAudioData, 'hex');
            } else {
              // base64字符串
              console.log('Detected base64 format, decoding as base64');
              audioBuffer = Buffer.from(cleanedAudioData, 'base64');
            }
            console.log(`Audio buffer size: ${audioBuffer.length} bytes`);
            
            // 验证解码后的数据是否是有效的MP3（检查文件头）
            // MP3文件可能以ID3标签开始（49 44 33 = "ID3"），或者直接以MPEG帧同步开始（FF FB, FF F3, FF F2）
            const header = audioBuffer.slice(0, 10);
            const headerHex = header.toString('hex');
            const headerAscii = header.toString('ascii', 0, 3);
            console.log(`Audio header (hex): ${headerHex.substring(0, 20)}...`);
            console.log(`Audio header (ASCII): ${headerAscii}`);
            
            // 检查是否是ID3标签（ID3v2）
            if (headerAscii === 'ID3') {
              console.log('✓ Valid MP3 file with ID3v2 tag detected');
              // ID3标签后面才是实际的MP3数据，这是正常的
            } else if (headerHex.startsWith('fffb') || 
                       headerHex.startsWith('fff3') || 
                       headerHex.startsWith('fff2')) {
              console.log('✓ Valid MP3 file with MPEG frame sync detected');
            } else {
              console.warn('⚠️  Decoded data does not have standard MP3 header');
              console.warn('   Header:', headerHex.substring(0, 20));
              console.warn('   This might still be valid audio, but format may be different');
            }
            
            return audioBuffer;
          } catch (e) {
            throw new Error(`Failed to decode base64 audio: ${e instanceof Error ? e.message : 'Unknown error'}`);
          }
        } else {
          // 如果没有找到音频数据，打印完整响应结构用于调试
          console.error('Response data structure:', JSON.stringify(responseData, null, 2).substring(0, 1000));
          throw new Error('Minimax API response missing audio data');
        }
      } else {
        throw new Error(`API returned status ${response.status}: ${JSON.stringify(response.data)}`);
      }
    } catch (error: any) {
      lastError = error;
      
      // 检查是否是 rate limit 错误
      const isRateLimit = error.response?.data?.base_resp?.status_code === 1002 ||
                         error.response?.data?.base_resp?.status_msg?.includes('rate limit') ||
                         error.message?.includes('rate limit');
      
      // 检查是否是网络错误
      const isNetworkError = error.code === 'ECONNRESET' || 
                            error.code === 'ETIMEDOUT' || 
                            error.code === 'ENOTFOUND' ||
                            error.message?.includes('timeout') ||
                            error.message?.includes('ECONNRESET');
      
      // 对于 rate limit，使用更长的等待时间
      if (isRateLimit && attempt < retries) {
        const waitTime = attempt * 5000; // rate limit 使用更长的等待时间：5s, 10s, 15s
        console.warn(`Rate limit hit (attempt ${attempt}/${retries}), waiting ${waitTime}ms before retry...`);
        await new Promise(resolve => setTimeout(resolve, waitTime));
        continue;
      }
      
      // 对于网络错误，使用标准等待时间
      if (isNetworkError && attempt < retries) {
        const waitTime = attempt * 2000; // 递增等待时间：2s, 4s, 6s
        console.warn(`Network error (attempt ${attempt}/${retries}), retrying in ${waitTime}ms...`, error.message);
        await new Promise(resolve => setTimeout(resolve, waitTime));
        continue;
      }
      
      // 如果不是可重试的错误，或者是最后一次尝试，直接抛出错误
      console.error('Minimax TTS API error:', {
        attempt,
        error: error.response?.data || error.message,
        code: error.code,
        status: error.response?.status,
        isRateLimit,
        isNetworkError
      });
      
      if (attempt === retries) {
        if (isRateLimit) {
          throw new Error(`Minimax API rate limit exceeded. Please wait a moment and try again. (Attempted ${retries} times)`);
        }
        throw new Error(`Failed to generate audio after ${retries} attempts: ${error.response?.data?.base_resp?.status_msg || error.response?.data?.message || error.message}`);
      }
    }
  }

  throw lastError || new Error('Failed to generate audio: Unknown error');
}

/**
 * 合并多个音频Buffer
 * 注意：MP3文件不能直接拼接，需要保存为临时文件然后合并
 * 这里我们保存每个片段，然后返回文件列表，由调用者处理
 */
async function saveAudioSegments(buffers: Buffer[], outputDir: string, prefix: string): Promise<string[]> {
  const filenames: string[] = [];
  for (let i = 0; i < buffers.length; i++) {
    const filename = `${prefix}_segment_${i}.mp3`;
    const filepath = path.join(outputDir, filename);
    await fs.writeFile(filepath, buffers[i]);
    filenames.push(filepath);
  }
  return filenames;
}

/**
 * 合并多个MP3文件（使用ffmpeg，参考MiniMax播客项目）
 */
async function mergeAudioFiles(filePaths: string[], outputPath: string): Promise<void> {
  try {
    // 使用ffmpeg合并MP3文件（参考MiniMax项目的方法）
    // 创建文件列表文件
    const listFilePath = outputPath.replace('.mp3', '_list.txt');
    // 转义文件路径中的单引号，确保ffmpeg能正确解析
    const listContent = filePaths.map(filePath => {
      // 转义单引号：' -> '\''
      const escaped = filePath.replace(/'/g, "'\\''");
      return `file '${escaped}'`;
    }).join('\n');
    await fs.writeFile(listFilePath, listContent);
    
    try {
      // 使用ffmpeg的concat demuxer合并（参考MiniMax播客项目）
      // -safe 0 允许使用绝对路径
      // -f concat 使用concat demuxer
      // -c copy 直接复制流，不重新编码（更快，保持质量）
      const escapedListPath = listFilePath.replace(/'/g, "'\\''");
      const escapedOutputPath = outputPath.replace(/'/g, "'\\''");
      const command = `ffmpeg -safe 0 -f concat -i '${escapedListPath}' -c copy '${escapedOutputPath}' -y`;
      console.log('Running ffmpeg command:', command);
      
      const { stdout, stderr } = await execAsync(command);
      if (stderr && !stderr.includes('frame=')) {
        // ffmpeg 通常会将进度信息输出到 stderr，这是正常的
        console.log('ffmpeg info:', stderr);
      }
      if (stdout) {
        console.log('ffmpeg stdout:', stdout);
      }
      
      // 清理列表文件
      await fs.unlink(listFilePath);
      console.log('Audio files merged successfully using ffmpeg');
    } catch (ffmpegError: any) {
      console.error('ffmpeg merge failed, trying fallback method:', ffmpegError.message);
      // 如果ffmpeg失败，尝试使用concat protocol（更兼容，但需要相同编码）
      try {
        const fileList = filePaths.map(f => f.replace(/'/g, "'\\''")).join('|');
        const escapedOutputPath = outputPath.replace(/'/g, "'\\''");
        const command = `ffmpeg -i "concat:${fileList}" -c copy '${escapedOutputPath}' -y`;
        await execAsync(command);
        await fs.unlink(listFilePath);
        console.log('Audio files merged using concat protocol');
      } catch (fallbackError: any) {
        console.error('Fallback method also failed:', fallbackError.message);
        throw fallbackError;
      }
    }
    
    // 清理临时文件
    for (const filePath of filePaths) {
      try {
        await fs.unlink(filePath);
      } catch (err) {
        // 忽略删除错误
      }
    }
    
    console.log('Audio files merged successfully using ffmpeg');
  } catch (error) {
    console.error('Error merging audio files with ffmpeg:', error);
    // 如果ffmpeg完全失败，使用简单拼接作为后备
    console.warn('Falling back to simple concatenation...');
    const buffers: Buffer[] = [];
    for (const filePath of filePaths) {
      const buffer = await fs.readFile(filePath);
      buffers.push(buffer);
    }
    const merged = Buffer.concat(buffers);
    await fs.writeFile(outputPath, merged);
    
    // 清理临时文件
    for (const filePath of filePaths) {
      try {
        await fs.unlink(filePath);
      } catch (err) {
        // 忽略删除错误
      }
    }
  }
}

/**
 * 生成播客音频
 */
export async function generatePodcastAudio(
  script: PodcastScript,
  outputDir: string
): Promise<string> {
  const audioBuffers: Buffer[] = [];
  
  try {
    // 生成开场白
    if (script.intro) {
      const introLang = script.intro ? detectLanguage(script.intro) : 'zh';
      console.log('Generating intro audio...');
      const introAudio = await generateAudioWithMinimax(script.intro, introLang, 'female');
      audioBuffers.push(introAudio);
      
      // 添加短暂停顿（静音片段，这里简化处理）
      // 实际应用中可以使用音频处理库添加静音
    }

    // 生成主要内容
    for (let i = 0; i < script.segments.length; i++) {
      const segment = script.segments[i];
      const lang = segment.language || detectLanguage(segment.content);
      
      // 根据模式选择音色
      let voiceType: 'male' | 'female' = 'female';
      if (script.mode === 'dialogue' && segment.speaker) {
        // 对话模式：根据说话人分配不同音色
        // 简单规则：说话人A用男声，说话人B用女声
        voiceType = segment.speaker.includes('A') || segment.speaker.includes('1') || segment.speaker.includes('主持人') ? 'male' : 'female';
      }

      console.log(`Generating audio for segment ${i + 1}/${script.segments.length}...`);
      const segmentAudio = await generateAudioWithMinimax(segment.content, lang, voiceType);
      audioBuffers.push(segmentAudio);
      
      // 在请求之间添加短暂延迟，避免触发 rate limit
      if (i < script.segments.length - 1) {
        await new Promise(resolve => setTimeout(resolve, 500)); // 500ms 延迟
      }
    }

    // 生成结尾
    if (script.outro) {
      const outroLang = script.outro ? detectLanguage(script.outro) : 'zh';
      console.log('Generating outro audio...');
      const outroAudio = await generateAudioWithMinimax(script.outro, outroLang, 'female');
      audioBuffers.push(outroAudio);
    }

    // 保存每个片段为临时文件，然后合并
    console.log('Saving audio segments...');
    const tempPrefix = `temp_${Date.now()}`;
    const segmentFiles: string[] = [];
    
    for (let i = 0; i < audioBuffers.length; i++) {
      const tempFilename = `${tempPrefix}_segment_${i}.mp3`;
      const tempFilepath = path.join(outputDir, tempFilename);
      await fs.writeFile(tempFilepath, audioBuffers[i]);
      segmentFiles.push(tempFilepath);
    }

    // 合并所有音频文件
    const timestamp = Date.now();
    const filename = `podcast_${script.mode}_${timestamp}.mp3`;
    const filepath = path.join(outputDir, filename);
    
    console.log('Merging audio files...');
    // 直接拼接（虽然不完美，但大多数播放器可以处理）
    const merged = Buffer.concat(audioBuffers);
    await fs.writeFile(filepath, merged);
    
    // 清理临时文件
    for (const tempFile of segmentFiles) {
      try {
        await fs.unlink(tempFile);
      } catch (err) {
        // 忽略删除错误
      }
    }
    
    console.log(`Podcast audio saved: ${filename}`);

    return filename;
  } catch (error) {
    console.error('Error generating podcast audio:', error);
    throw error;
  }
}

