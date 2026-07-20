import bcrypt from 'bcryptjs';
import User from '../models/User';
import Project from '../models/Project';
import Task from '../models/Task';
import { Roadmap, Milestone } from '../models/Roadmap';
import SprintHistory from '../models/SprintHistory';
import Report from '../models/Report';

export const seedDatabase = async () => {
  try {
    const userCount = await User.countDocuments();
    if (userCount > 0) {
      console.log('Database already has users. Skipping seeder...');
      return;
    }

    console.log('Seeding initial database workspace records...');

    // 1. Create Demo User
    const hashedPassword = await bcrypt.hash('password123', 10);
    const user = new User({
      name: 'Demo Project Lead',
      email: 'demo@projectpilot.ai',
      password: hashedPassword
    });
    await user.save();

    // 2. Create Active Projects
    const project = new Project({
      ownerId: user._id as any,
      name: 'DocuMind AI Portal Suite',
      description: 'AI-powered document intelligence workspace built with Next.js App Router, Express, and MongoDB. Integrates file uploads and multi-agent roadmaps.',
      priority: 'high',
      status: 'active',
      riskScore: 25,
      deadline: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
    });
    await project.save();

    // 3. Create Roadmap
    const roadmap = new Roadmap({
      projectId: project._id as any,
      goals: [
        'Setup Express backend structures and verify database mapping',
        'Implement TanStack Query client wrapper in client',
        'Integrate Google Gemini SSE streaming for project chat'
      ]
    });
    await roadmap.save();

    // 4. Create Milestones
    const milestone1 = new Milestone({
      roadmapId: roadmap._id as any,
      title: 'Infrastructure & Data Models',
      description: 'Setup database instances, auth protection middlewares, and file uploads directory.',
      targetDate: new Date(Date.now() + 10 * 24 * 60 * 60 * 1000),
      status: 'completed',
      progress: 100
    });
    await milestone1.save();

    const milestone2 = new Milestone({
      roadmapId: roadmap._id as any,
      title: 'Agent Orchestration Framework',
      description: 'Implement multi-agent prompting sequence, chat sessions, and risk analyzer engines.',
      targetDate: new Date(Date.now() + 20 * 24 * 60 * 60 * 1000),
      status: 'pending',
      progress: 40
    });
    await milestone2.save();

    // 5. Create Sprint
    const sprint1 = new SprintHistory({
      projectId: project._id as any,
      name: 'Sprint 1: System Scaffolding',
      startDate: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
      endDate: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000),
      goal: 'Deliver clean architecture models and auth controllers.',
      status: 'active',
      totalPoints: 16,
      completedPoints: 8
    });
    await sprint1.save();

    // 6. Create Tasks
    const tasks = [
      {
        projectId: project._id,
        milestoneId: milestone1._id,
        sprintId: sprint1._id,
        title: 'Configure Mongoose Schemas & DB modules',
        description: 'Verify field validation indexes for User, Project, and Task schemas.',
        status: 'done',
        priority: 'high',
        storyPoints: 5,
        estimatedHours: 10,
        labels: ['database', 'setup']
      },
      {
        projectId: project._id,
        milestoneId: milestone1._id,
        sprintId: sprint1._id,
        title: 'Implement JWT Auth flow and middleware cookie storage',
        description: 'Store auth key securely inside HTTPOnly Cookie client wrappers.',
        status: 'done',
        priority: 'high',
        storyPoints: 3,
        estimatedHours: 6,
        labels: ['auth', 'backend']
      },
      {
        projectId: project._id,
        milestoneId: milestone2._id,
        sprintId: sprint1._id,
        title: 'Create file upload API endpoints with Multer',
        description: 'Check max upload limits and set disk file configurations.',
        status: 'in-progress',
        priority: 'medium',
        storyPoints: 3,
        estimatedHours: 5,
        labels: ['backend', 'upload']
      },
      {
        projectId: project._id,
        milestoneId: milestone2._id,
        sprintId: sprint1._id,
        title: 'Connect Next.js Providers and Client routes',
        description: 'Establish route groups, layouts, and login forms validation.',
        status: 'todo',
        priority: 'medium',
        storyPoints: 5,
        estimatedHours: 8,
        labels: ['frontend', 'setup']
      },
      {
        projectId: project._id,
        milestoneId: milestone2._id,
        title: 'Configure SSE Streaming chat interface',
        description: 'Read fetch stream chunks and render character tokens live in the client UI.',
        status: 'backlog',
        priority: 'high',
        storyPoints: 8,
        estimatedHours: 16,
        labels: ['frontend', 'ai']
      }
    ];

    await Task.insertMany(tasks);

    // 7. Create Risk Report
    const riskReport = new Report({
      projectId: project._id as any,
      type: 'risk',
      title: 'Sprint 1 Risk Brief',
      summary: 'Task dependencies checked. The stream chat task has high story points and is currently unassigned.',
      details: {
        risks: [
          { title: 'High complexity tasks backlog', mitigation: 'Break task down to smaller 2SP modules.' },
          { title: 'Auth flow session security checks', mitigation: 'Setup short JWT duration limits.' }
        ]
      }
    });
    await riskReport.save();

    console.log('Database seeded successfully.');
  } catch (error) {
    console.error('Error seeding database:', error);
  }
};
