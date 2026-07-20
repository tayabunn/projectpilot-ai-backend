import { Response } from 'express';
import Task from '../models/Task';
import Project from '../models/Project';
import { AuthRequest } from '../middlewares/auth';
import { GoogleGenAI } from '@google/genai';

export const getTasks = async (req: AuthRequest, res: Response) => {
  try {
    const { projectId, status, priority } = req.query;

    const query: any = {};
    if (projectId) query.projectId = projectId;
    if (status && status !== 'all') query.status = status;
    if (priority && priority !== 'all') query.priority = priority;

    const tasks = await Task.find(query).populate('dependencies', 'title status');
    res.json(tasks);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
};

export const createTask = async (req: AuthRequest, res: Response) => {
  try {
    const { projectId, title, description, status, priority, labels, estimatedHours, storyPoints, assignee, dependencies, acceptanceCriteria } = req.body;

    if (!projectId || !title) {
      return res.status(400).json({ error: 'ProjectId and Title are required.' });
    }

    const task = new Task({
      projectId,
      title,
      description,
      status: status || 'backlog',
      priority: priority || 'medium',
      labels: labels || [],
      estimatedHours: estimatedHours || 0,
      storyPoints: storyPoints || 0,
      assignee,
      dependencies: dependencies || [],
      acceptanceCriteria: acceptanceCriteria || []
    });

    await task.save();
    res.status(201).json(task);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
};

export const updateTask = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const updates = req.body;

    const task = await Task.findByIdAndUpdate(id, updates, { new: true });
    if (!task) {
      return res.status(404).json({ error: 'Task not found' });
    }

    // Auto-update project risk score if status or priority changes
    // (In a real system, changing cards triggers recalculated EM metrics)
    const project = await Project.findById(task.projectId);
    if (project) {
      const allTasks = await Task.find({ projectId: project._id });
      const blockedCount = allTasks.filter(t => t.status === 'in-progress' && t.priority === 'urgent').length;
      project.riskScore = Math.min(100, Math.round((blockedCount / (allTasks.length || 1)) * 100));
      await project.save();
    }

    res.json(task);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
};

export const deleteTask = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const task = await Task.findByIdAndDelete(id);
    if (!task) {
      return res.status(404).json({ error: 'Task not found' });
    }
    res.json({ message: 'Task deleted successfully' });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
};

export const getAIRecommendations = async (req: AuthRequest, res: Response) => {
  try {
    const { projectId } = req.body;

    if (!projectId) {
      return res.status(400).json({ error: 'projectId is required' });
    }

    const tasks = await Task.find({ projectId });
    const project = await Project.findById(projectId);

    if (!project) {
      return res.status(404).json({ error: 'Project not found' });
    }

    const apiKey = process.env.GEMINI_API_KEY || '';
    if (!apiKey) {
      // Fallback response if API key is not configured
      return res.json({
        recommendation: `### Sprint Recommendations for **${project.name}**\n\n` +
          `1. **Focus on Core Infrastructure**: You have ${tasks.filter(t => t.status === 'todo').length} items pending in To-Do. Prioritize high-complexity setup tasks first.\n` +
          `2. **Resolve Blockers**: Transition items in review column before pulling new workload. \n` +
          `3. **Team Velocity Suggestion**: Maintain average velocity of 20 Story Points per sprint.`
      });
    }

    const ai = new GoogleGenAI({ apiKey });
    const prompt = `
      You are a Senior Engineering Manager. Provide a sprint recommendations summary for the project: "${project.name}".
      
      Here is the project status:
      - Risk score: ${project.riskScore}%
      - Total Tasks: ${tasks.length}
      - Backlog: ${tasks.filter(t => t.status === 'backlog').length}
      - To-Do: ${tasks.filter(t => t.status === 'todo').length}
      - In-Progress: ${tasks.filter(t => t.status === 'in-progress').length}
      - Review: ${tasks.filter(t => t.status === 'review').length}
      - Done: ${tasks.filter(t => t.status === 'done').length}

      Analyze these stats and output:
      1. What should the team build next?
      2. Are there resource blocks or high-priority warnings?
      3. Actionable sprint adjustments.
      Format with markdown.
    `;

    const response = await ai.models.generateContent({
      model: 'gemini-1.5-flash',
      contents: prompt,
      config: { temperature: 0.4 }
    });

    res.json({ recommendation: response.text });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
};
