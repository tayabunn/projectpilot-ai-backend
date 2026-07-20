import { Schema, model, Document, Types } from 'mongoose';

export interface ITask extends Document {
  projectId: Types.ObjectId;
  milestoneId?: Types.ObjectId;
  sprintId?: Types.ObjectId;
  title: string;
  description?: string;
  status: 'backlog' | 'todo' | 'in-progress' | 'review' | 'done';
  priority: 'low' | 'medium' | 'high' | 'urgent';
  labels: string[];
  estimatedHours: number;
  storyPoints: number;
  assignee?: string;
  dependencies: Types.ObjectId[];
  acceptanceCriteria: string[];
  githubIssueNumber?: number;
  createdAt: Date;
}

const TaskSchema = new Schema<ITask>({
  projectId: { type: Schema.Types.ObjectId, ref: 'Project', required: true },
  milestoneId: { type: Schema.Types.ObjectId, ref: 'Milestone' },
  sprintId: { type: Schema.Types.ObjectId, ref: 'SprintHistory' },
  title: { type: String, required: true },
  description: { type: String },
  status: { 
    type: String, 
    enum: ['backlog', 'todo', 'in-progress', 'review', 'done'], 
    default: 'backlog' 
  },
  priority: { 
    type: String, 
    enum: ['low', 'medium', 'high', 'urgent'], 
    default: 'medium' 
  },
  labels: [{ type: String }],
  estimatedHours: { type: Number, default: 0 },
  storyPoints: { type: Number, default: 0 },
  assignee: { type: String },
  dependencies: [{ type: Schema.Types.ObjectId, ref: 'Task' }],
  acceptanceCriteria: [{ type: String }],
  githubIssueNumber: { type: Number },
  createdAt: { type: Date, default: Date.now }
});

export default model<ITask>('Task', TaskSchema);
