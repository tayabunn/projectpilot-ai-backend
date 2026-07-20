import { Response } from 'express';
import Project from '../models/Project';
import Task from '../models/Task';
import { Roadmap, Milestone } from '../models/Roadmap';
import SprintHistory from '../models/SprintHistory';
import Document from '../models/Document';
import { AuthRequest } from '../middlewares/auth';
import mongoose from 'mongoose';

export const getProjects = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });

    const search = req.query.search as string;
    const status = req.query.status as string;
    const priority = req.query.priority as string;
    const sort = req.query.sort as string;
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 12;

    const query: any = { ownerId: userId };

    if (search) {
      query.name = { $regex: search, $options: 'i' };
    }
    if (status && status !== 'all') {
      query.status = status;
    }
    if (priority && priority !== 'all') {
      query.priority = priority;
    }

    let sortOption: any = { createdAt: -1 };
    if (sort === 'oldest') {
      sortOption = { createdAt: 1 };
    } else if (sort === 'name') {
      sortOption = { name: 1 };
    } else if (sort === 'risk') {
      sortOption = { riskScore: -1 };
    }

    const total = await Project.countDocuments(query);
    const projects = await Project.find(query)
      .sort(sortOption)
      .skip((page - 1) * limit)
      .limit(limit);

    res.json({
      projects,
      total,
      page,
      pages: Math.ceil(total / limit)
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
};

export const createProject = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });

    const { name, description, priority, deadline, repoUrl } = req.body;

    if (!name) {
      return res.status(400).json({ error: 'Project name is required' });
    }

    const project = new Project({
      ownerId: userId,
      name,
      description,
      priority: priority || 'medium',
      deadline: deadline ? new Date(deadline) : undefined,
      repoUrl,
      status: 'planning',
      riskScore: 0
    });

    await project.save();

    // Initialize an empty roadmap for the project
    const roadmap = new Roadmap({
      projectId: project._id,
      goals: []
    });
    await roadmap.save();

    res.status(201).json(project);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
};

export const getProjectById = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ error: 'Invalid project ID format' });
    }

    const project = await Project.findOne({ _id: id, ownerId: userId });
    if (!project) {
      return res.status(404).json({ error: 'Project not found' });
    }

    // Get related data
    const tasks = await Task.find({ projectId: id });
    const roadmap = await Roadmap.findOne({ projectId: id });
    let milestones: any[] = [];
    if (roadmap) {
      milestones = await Milestone.find({ roadmapId: roadmap._id });
    }
    const sprints = await SprintHistory.find({ projectId: id }).sort({ startDate: 1 });
    const documents = await Document.find({ projectId: id }).select('-extractedText');

    res.json({
      project,
      tasks,
      roadmap,
      milestones,
      sprints,
      documents
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
};

export const deleteProject = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    const { id } = req.params;

    const project = await Project.findOneAndDelete({ _id: id, ownerId: userId });
    if (!project) {
      return res.status(404).json({ error: 'Project not found or unauthorized' });
    }

    // Cascading deletions
    await Task.deleteMany({ projectId: id });
    const roadmap = await Roadmap.findOneAndDelete({ projectId: id });
    if (roadmap) {
      await Milestone.deleteMany({ roadmapId: roadmap._id });
    }
    await SprintHistory.deleteMany({ projectId: id });
    await Document.deleteMany({ projectId: id });

    res.json({ message: 'Project and all related data deleted successfully' });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
};
