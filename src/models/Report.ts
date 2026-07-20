import { Schema, model, Document, Types } from 'mongoose';

export interface IReport extends Document {
  projectId: Types.ObjectId;
  type: 'weekly' | 'sprint' | 'project' | 'risk';
  title: string;
  summary: string;
  details: Schema.Types.Mixed;
  createdAt: Date;
}

const ReportSchema = new Schema<IReport>({
  projectId: { type: Schema.Types.ObjectId, ref: 'Project', required: true },
  type: { type: String, enum: ['weekly', 'sprint', 'project', 'risk'], required: true },
  title: { type: String, required: true },
  summary: { type: String, required: true },
  details: { type: Schema.Types.Mixed },
  createdAt: { type: Date, default: Date.now }
});

export default model<IReport>('Report', ReportSchema);
