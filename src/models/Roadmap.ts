import { Schema, model, Document, Types } from 'mongoose';

// Milestone Schema
export interface IMilestone extends Document {
  roadmapId: Types.ObjectId;
  title: string;
  description?: string;
  targetDate?: Date;
  status: 'pending' | 'completed';
  progress: number;
}

const MilestoneSchema = new Schema<IMilestone>({
  roadmapId: { type: Schema.Types.ObjectId, ref: 'Roadmap', required: true },
  title: { type: String, required: true },
  description: { type: String },
  targetDate: { type: Date },
  status: { type: String, enum: ['pending', 'completed'], default: 'pending' },
  progress: { type: Number, default: 0 }
});

export const Milestone = model<IMilestone>('Milestone', MilestoneSchema);

// Roadmap Schema
export interface IRoadmap extends Document {
  projectId: Types.ObjectId;
  goals: string[];
  updatedAt: Date;
}

const RoadmapSchema = new Schema<IRoadmap>({
  projectId: { type: Schema.Types.ObjectId, ref: 'Project', required: true, unique: true },
  goals: [{ type: String }],
  updatedAt: { type: Date, default: Date.now }
});

export const Roadmap = model<IRoadmap>('Roadmap', RoadmapSchema);
