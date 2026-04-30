import mongoose, { Schema } from 'mongoose';

const SignalSchema = new Schema(
  {
    workItemId: { type: String, index: true },
    componentId: { type: String, required: true, index: true },
    componentType: {
      type: String,
      enum: ['API', 'MCP_HOST', 'CACHE', 'QUEUE', 'RDBMS', 'NOSQL'],
      required: true,
    },
    errorCode: String,
    errorMessage: String,
    latencyMs: Number,
    severity: { type: String, enum: ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'] },
    metadata: Schema.Types.Mixed,
    receivedAt: { type: Date, default: Date.now, index: true },
  },
  {
    collection: 'raw_signals',
    expireAfterSeconds: 90 * 24 * 3600, // Auto-delete after 90 days (TTL index)
  }
);

export const Signal = mongoose.model('Signal', SignalSchema);
