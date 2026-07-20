import { Request, Response } from 'express';
import SprintHistory from '../models/SprintHistory';
import Task from '../models/Task';
import { AuthRequest } from '../middlewares/auth';

export const getSprints = async (req: AuthRequest, res: Response) => {
  try {
    const { projectId } = req.query;
    if (!projectId) return res.status(400).json({ error: 'projectId is required' });

    const sprints = await SprintHistory.find({ projectId }).sort({ startDate: 1 });
    res.json(sprints);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
};

export const createSprint = async (req: AuthRequest, res: Response) => {
  try {
    const { projectId, name, startDate, endDate, goal } = req.body;

    if (!projectId || !name || !startDate || !endDate) {
      return res.status(400).json({ error: 'Missing required sprint fields' });
    }

    const sprint = new SprintHistory({
      projectId,
      name,
      startDate: new Date(startDate),
      endDate: new Date(endDate),
      goal,
      status: 'upcoming'
    });

    await sprint.save();
    res.status(201).json(sprint);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
};

export const updateSprint = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const updates = req.body;

    // Recalculate points if status changed to completed
    if (updates.status === 'completed') {
      const tasks = await Task.find({ sprintId: id });
      const totalPoints = tasks.reduce((sum, t) => sum + (t.storyPoints || 0), 0);
      const completedPoints = tasks
        .filter(t => t.status === 'done')
        .reduce((sum, t) => sum + (t.storyPoints || 0), 0);
      
      updates.totalPoints = totalPoints;
      updates.completedPoints = completedPoints;
    }

    const sprint = await SprintHistory.findByIdAndUpdate(id, updates, { new: true });
    if (!sprint) return res.status(404).json({ error: 'Sprint not found' });

    res.json(sprint);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
};

export const getSprintBurndown = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const sprint = await SprintHistory.findById(id);
    if (!sprint) return res.status(404).json({ error: 'Sprint not found' });

    const tasks = await Task.find({ sprintId: id });
    const totalPoints = tasks.reduce((sum, t) => sum + (t.storyPoints || 0), 0);

    // Create a mock/simulated burndown chart data based on completed tasks
    const days = Math.ceil((sprint.endDate.getTime() - sprint.startDate.getTime()) / (1000 * 60 * 60 * 24)) || 14;
    const burndownData: { day: string; ideal: number; actual: number }[] = [];

    let remainingActual = totalPoints;
    const dailyIdealDecrease = totalPoints / days;

    for (let i = 0; i <= days; i++) {
      const ideal = Math.max(0, Math.round((totalPoints - i * dailyIdealDecrease) * 10) / 10);
      
      // Simulate task completion step-down
      if (i > 0 && i < days && Math.random() > 0.6) {
        remainingActual = Math.max(0, remainingActual - Math.round(Math.random() * (totalPoints / 3)));
      } else if (i === days) {
        remainingActual = sprint.status === 'completed' ? 0 : remainingActual;
      }

      burndownData.push({
        day: `Day ${i}`,
        ideal,
        actual: remainingActual
      });
    }

    res.json({
      sprint,
      burndown: burndownData
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
};
