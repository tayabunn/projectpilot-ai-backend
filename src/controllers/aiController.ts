import { Response } from 'express';
import { AuthRequest } from '../middlewares/auth';
import Project from '../models/Project';
import Task from '../models/Task';
import { Roadmap, Milestone } from '../models/Roadmap';
import Document from '../models/Document';
import ChatSession from '../models/ChatSession';
import SprintHistory from '../models/SprintHistory';
import Report from '../models/Report';
import { GoogleGenAI } from '@google/genai';
import PDFDocument from 'pdfkit';

const getAIClient = () => {
  const apiKey = process.env.GEMINI_API_KEY || '';
  if (!apiKey) return null;
  return new GoogleGenAI({ apiKey });
};

// 1. AI Document Intelligence (PRD Multi-Agent Planner Pipeline)
export const analyzePRD = async (req: AuthRequest, res: Response) => {
  try {
    const { projectId, documentId } = req.body;

    if (!projectId || !documentId) {
      return res.status(400).json({ error: 'projectId and documentId are required' });
    }

    const project = await Project.findById(projectId);
    const doc = await Document.findById(documentId);

    if (!project || !doc) {
      return res.status(404).json({ error: 'Project or Document not found' });
    }

    const ai = getAIClient();
    if (!ai) {
      // Mock agent planning output if no API Key
      // Generate some dummy roadmap milestones and issues
      const roadmap = await Roadmap.findOneAndUpdate(
        { projectId },
        { goals: ['Setup basic infrastructure', 'Implement core user flow', 'Finalize API integrations'] },
        { new: true, upsert: true }
      );

      // Create a default milestone
      const milestone = new Milestone({
        roadmapId: roadmap._id,
        title: 'MVP Foundation',
        description: 'Complete basic structure based on PRD',
        targetDate: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000),
        status: 'pending'
      });
      await milestone.save();

      // Create mock tasks
      const task1 = new Task({
        projectId,
        milestoneId: milestone._id,
        title: 'Set up Next.js frontend',
        description: 'Configure TypeScript, Tailwind CSS, and TanStack query dependencies.',
        status: 'todo',
        priority: 'high',
        storyPoints: 3,
        estimatedHours: 6,
        labels: ['frontend', 'setup']
      });
      await task1.save();

      const task2 = new Task({
        projectId,
        milestoneId: milestone._id,
        title: 'Configure Node/Express backend routes',
        description: 'Set up basic routing, model schemas, and error middlewares.',
        status: 'todo',
        priority: 'high',
        storyPoints: 5,
        estimatedHours: 10,
        labels: ['backend', 'setup']
      });
      await task2.save();

      project.status = 'active';
      await project.save();

      return res.json({
        success: true,
        message: 'Project successfully analyzed (Demo Mock Output)',
        milestonesCount: 1,
        tasksCount: 2
      });
    }

    // Call LLM executing Multi-Agent logic
    const systemPrompt = `
      You are a Staff AI Engineering Manager running a multi-agent planning workflow (Planner, Research, Issue Generator, Risk Analyzer, Scrum Master).
      
      Your task is to analyze the following Product Requirement Document (PRD) text and structure a complete software project plan.
      PRD Text:
      "${doc.extractedText}"
      
      You must respond with a STRICT JSON object matching this structure:
      {
        "goals": ["Goal 1", "Goal 2"],
        "milestones": [
          { "title": "Milestone Title", "description": "Short description" }
        ],
        "tasks": [
          { 
            "title": "Task Title", 
            "description": "Task description details", 
            "priority": "low" | "medium" | "high" | "urgent", 
            "storyPoints": 1 | 2 | 3 | 5 | 8,
            "estimatedHours": number,
            "labels": ["label1", "label2"]
          }
        ],
        "risks": [
          { "title": "Risk description", "mitigation": "Mitigation recommendation" }
        ]
      }
      
      Ensure you only return valid JSON. Do not include markdown code block tags.
    `;

    const response = await ai.models.generateContent({
      model: 'gemini-1.5-flash',
      contents: systemPrompt,
      config: { 
        temperature: 0.2,
        responseMimeType: 'application/json'
      }
    });

    const result = JSON.parse(response.text?.trim() || '{}');

    // Update DB
    const roadmap = await Roadmap.findOneAndUpdate(
      { projectId },
      { goals: result.goals || [] },
      { new: true, upsert: true }
    );

    // Save Milestones
    await Milestone.deleteMany({ roadmapId: roadmap._id });
    const milestonePromises = (result.milestones || []).map((m: any, idx: number) => {
      return new Milestone({
        roadmapId: roadmap._id,
        title: m.title,
        description: m.description,
        targetDate: new Date(Date.now() + (idx + 1) * 14 * 24 * 60 * 60 * 1000),
        status: 'pending'
      }).save();
    });
    const savedMilestones = await Promise.all(milestonePromises);
    const mainMilestoneId = savedMilestones[0]?._id;

    // Save Tasks
    await Task.deleteMany({ projectId });
    const taskPromises = (result.tasks || []).map((t: any) => {
      return new Task({
        projectId,
        milestoneId: mainMilestoneId,
        title: t.title,
        description: t.description,
        status: 'backlog',
        priority: t.priority || 'medium',
        storyPoints: t.storyPoints || 2,
        estimatedHours: t.estimatedHours || 4,
        labels: t.labels || []
      }).save();
    });
    await Promise.all(taskPromises);

    // Save Risk Assessment as a Report
    const riskReport = new Report({
      projectId,
      type: 'risk',
      title: 'AI Multi-Agent Risk Analysis',
      summary: `Detected ${result.risks?.length || 0} critical delivery risks.`,
      details: { risks: result.risks || [] }
    });
    await riskReport.save();

    project.status = 'active';
    project.riskScore = result.risks?.length ? Math.min(100, result.risks.length * 20) : 10;
    await project.save();

    res.json({
      success: true,
      message: 'PRD parsed and loaded into planning backlog.',
      milestonesCount: savedMilestones.length,
      tasksCount: result.tasks?.length || 0
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
};

// 2. AI Chat Companion (Streaming SSE + memory updates)
export const streamChat = async (req: AuthRequest, res: Response) => {
  try {
    const { projectId, message } = req.body;
    const userId = req.user?.id;

    if (!projectId || !message) {
      return res.status(400).json({ error: 'projectId and message are required' });
    }

    const project = await Project.findById(projectId);
    if (!project) return res.status(404).json({ error: 'Project not found' });

    let session = await ChatSession.findOne({ projectId, userId });
    if (!session) {
      session = new ChatSession({ projectId, userId, messages: [] });
    }

    session.messages.push({ sender: 'user', content: message, timestamp: new Date() });

    const systemInstruction = `
      You are the AI Engineering Manager ("ProjectPilot") for the project: "${project.name}".
      Project Overview: ${project.description || 'No description provided'}.
      
      Respond directly to developer or stakeholder questions in an analytical, professional tone. Use neat Markdown.
      Wrap suggested short questions inside custom tags at the end of the text. Format exactly:
      [Suggest: Question?]
    `;

    const ai = getAIClient();
    if (!ai) {
      // Mock static reply for missing API keys
      res.setHeader('Content-Type', 'text/event-stream');
      res.setHeader('Cache-Control', 'no-cache');
      res.write(`data: ${JSON.stringify({ text: `This is a mock assistant response for **${project.name}**.\n\n[Suggest: What should we build next?]` })}\n\n`);
      res.write('data: [DONE]\n\n');
      res.end();
      return;
    }

    // Set up SSE
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');

    const contents = session.messages.map(m => ({
      role: m.sender === 'user' ? 'user' : 'model',
      parts: [{ text: m.content }]
    }));

    const responseStream = await ai.models.generateContentStream({
      model: 'gemini-1.5-flash',
      contents: contents,
      config: { systemInstruction, temperature: 0.7 }
    });

    let completeResponse = '';
    for await (const chunk of responseStream) {
      const text = chunk.text;
      if (text) {
        completeResponse += text;
        res.write(`data: ${JSON.stringify({ text })}\n\n`);
      }
    }

    session.messages.push({ sender: 'assistant', content: completeResponse, timestamp: new Date() });
    await session.save();

    res.write('data: [DONE]\n\n');
    res.end();
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
};

// 3. AI Content Generator
export const generateContent = async (req: AuthRequest, res: Response) => {
  try {
    const { projectId, contentType, style, length } = req.body;

    if (!projectId || !contentType) {
      return res.status(400).json({ error: 'projectId and contentType are required' });
    }

    const project = await Project.findById(projectId);
    const tasks = await Task.find({ projectId });

    if (!project) return res.status(404).json({ error: 'Project not found' });

    const ai = getAIClient();
    if (!ai) {
      return res.json({
        content: `### Mocked Generated ${contentType} Document\n\n` +
          `*   **Project**: ${project.name}\n` +
          `*   **Tone/Style**: ${style || 'Professional'}\n` +
          `*   **Length**: ${length || 'Medium'}\n\n` +
          `This is a mock generation of ${contentType} documentation. Please configure GEMINI_API_KEY for dynamic generations.`
      });
    }

    const prompt = `
      Create a documentation artifact of type: "${contentType}" for the project "${project.name}".
      Project context: ${project.description || ''}
      Number of Tasks in backlog/todo: ${tasks.length}
      Tone/Style: ${style || 'Professional'}
      Length: ${length || 'Medium'}

      Write a thorough document in neat Markdown format. Do not use placeholders.
    `;

    const response = await ai.models.generateContent({
      model: 'gemini-1.5-flash',
      contents: prompt,
    });

    res.json({ content: response.text || '' });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
};

// 4. Download Report PDF
export const downloadReportPDF = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params; // Report ID
    const report = await Report.findById(id);

    if (!report) {
      return res.status(404).json({ error: 'Report not found' });
    }

    const doc = new PDFDocument({ margin: 50 });
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename=report-${report.type}-${id}.pdf`);

    doc.pipe(res);

    // Title Section
    doc.fillColor('#4338CA').fontSize(24).text('ProjectPilot AI Report', { align: 'center' });
    doc.moveDown(0.5);
    doc.fillColor('#6B7280').fontSize(12).text(`Generated on: ${new Date().toLocaleDateString()}`, { align: 'center' });
    doc.moveDown(1.5);

    // Metadata
    doc.fillColor('#1F2937').fontSize(14).text(`Report Type: ${report.type.toUpperCase()}`);
    doc.text(`Title: ${report.title}`);
    doc.moveDown(1);

    // Horizontal Rule
    doc.strokeColor('#E5E7EB').lineWidth(1).moveTo(50, doc.y).lineTo(550, doc.y).stroke();
    doc.moveDown(1.5);

    // Summary
    doc.fontSize(16).fillColor('#111827').text('Executive Summary', { underline: true });
    doc.moveDown(0.5);
    doc.fontSize(12).fillColor('#374151').text(report.summary, { lineGap: 4 });
    doc.moveDown(2);

    // Details / Data Table
    if (report.details && typeof report.details === 'object') {
      doc.fontSize(16).fillColor('#111827').text('Structural Analysis Details', { underline: true });
      doc.moveDown(0.5);

      const risks = (report.details as any).risks || [];
      if (risks.length > 0) {
        risks.forEach((risk: any, index: number) => {
          doc.fontSize(12).fillColor('#B91C1C').text(`Risk ${index + 1}: ${risk.title || risk}`);
          if (risk.mitigation) {
            doc.fontSize(11).fillColor('#1F2937').text(`Mitigation: ${risk.mitigation}`);
          }
          doc.moveDown(0.5);
        });
      } else {
        doc.fontSize(11).fillColor('#1F2937').text(JSON.stringify(report.details, null, 2));
      }
    }

    doc.end();
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
};
