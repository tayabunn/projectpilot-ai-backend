import { Schema, model, Document, Types } from 'mongoose';

export interface IProject extends Document {
  ownerId: Types.ObjectId;
  name: string;
  description?: string;
  prdUrl?: string;
  repoUrl?: string;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  deadline?: Date;
  status: 'planning' | 'active' | 'paused' | 'completed';
  riskScore: number;
  createdAt: Date;
}

const ProjectSchema = new Schema<IProject>({
  ownerId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  name: { type: String, required: true },
  description: { type: String },
  prdUrl: { type: String },
  repoUrl: { type: String },
  priority: { type: String, enum: ['low', 'medium', 'high', 'urgent'], default: 'medium' },
  deadline: { type: Date },
  status: { type: String, enum: ['planning', 'active', 'paused', 'completed'], default: 'planning' },
  riskScore: { type: Number, default: 0 },
  createdAt: { type: Date, default: Date.now }
});

export default model<IProject>('Project', ProjectSchema);
