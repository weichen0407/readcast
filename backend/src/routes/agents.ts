import express from 'express';
import { getArticleById } from '../services/articleService.js';
import { processArticleWithChain, executeAgentWorkflow } from '../agents/enhancedMasterAgent.js';

const router = express.Router();

// 展示 Chain 功能：处理文章（关键词 -> 总结 -> 故事线）
router.post('/process-with-chain/:id', async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const article = getArticleById(id);
    
    const result = await processArticleWithChain(
      article.title || 'Untitled',
      article.content
    );
    
    res.json({
      message: 'Processed with LangChain Chain',
      result
    });
  } catch (error) {
    res.status(500).json({
      error: error instanceof Error ? error.message : 'Failed to process with chain'
    });
  }
});

// 展示 Agent Executor 工作流
router.post('/workflow/:id', async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const { task } = req.body;
    
    if (!task) {
      return res.status(400).json({ error: 'Task is required' });
    }
    
    const article = getArticleById(id);
    const result = await executeAgentWorkflow(task, {
      title: article.title,
      content: article.content
    });
    
    res.json({
      message: 'Executed with Agent Workflow',
      task,
      result
    });
  } catch (error) {
    res.status(500).json({
      error: error instanceof Error ? error.message : 'Failed to execute workflow'
    });
  }
});

export default router;

