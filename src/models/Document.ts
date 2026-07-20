import { Schema, model, Document, Types } from 'mongoose';

export interface IDocument extends Document {
  projectId: Types.ObjectId;
  name: string;
  filePath?: string;
  fileType?: 'pdf' | 'docx' | 'txt';
  extractedText?: string;
  createdAt: Date;
}

const DocumentSchema = new Schema<IDocument>({
  projectId: { type: Schema.Types.ObjectId, ref: 'Project', required: true },
  name: { type: String, required: true },
  filePath: { type: String },
  fileType: { type: String, enum: ['pdf', 'docx', 'txt'] },
  extractedText: { type: String },
  createdAt: { type: Date, default: Date.now }
});

export default model<IDocument>('Document', DocumentSchema);
