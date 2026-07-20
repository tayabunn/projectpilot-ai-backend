import { Schema, model, Document, Types } from 'mongoose';

export interface IMessage {
  sender: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

export interface IChatSession extends Document {
  projectId: Types.ObjectId;
  userId: Types.ObjectId;
  messages: IMessage[];
  createdAt: Date;
}

const ChatSessionSchema = new Schema<IChatSession>({
  projectId: { type: Schema.Types.ObjectId, ref: 'Project', required: true },
  userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  messages: [{
    sender: { type: String, enum: ['user', 'assistant'], required: true },
    content: { type: String, required: true },
    timestamp: { type: Date, default: Date.now }
  }],
  createdAt: { type: Date, default: Date.now }
});

export default model<IChatSession>('ChatSession', ChatSessionSchema);
