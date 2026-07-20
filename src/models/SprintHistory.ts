import { Schema, model, Document, Types } from 'mongoose';

export interface ISprintHistory extends Document {
  projectId: Types.ObjectId;
  name: string;
  startDate: Date;
  endDate: Date;
  goal?: string;
  status: 'upcoming' | 'active' | 'completed';
  completedPoints: number;
  totalPoints: number;
}

const SprintHistorySchema = new Schema<ISprintHistory>({
  projectId: { type: Schema.Types.ObjectId, ref: 'Project', required: true },
  name: { type: String, required: true },
  startDate: { type: Date, required: true },
  endDate: { type: Date, required: true },
  goal: { type: String },
  status: { type: String, enum: ['upcoming', 'active', 'completed'], default: 'upcoming' },
  completedPoints: { type: Number, default: 0 },
  totalPoints: { type: Number, default: 0 }
});

export default model<ISprintHistory>('SprintHistory', SprintHistorySchema);
