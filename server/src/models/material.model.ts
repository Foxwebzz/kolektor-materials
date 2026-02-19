import mongoose, { Schema, Document, Types } from 'mongoose';

export interface IMaterialOption {
  name: string;
  price: number;
  quantity: number;
  unit: string;
  group: string;
}

export interface IMaterial extends Document {
  title: string;
  options: Types.DocumentArray<IMaterialOption>;
  order: number;
}

const MaterialOptionSchema = new Schema<IMaterialOption>(
  {
    name: { type: String, required: true },
    price: { type: Number, required: true },
    quantity: { type: Number, required: true, default: 1 },
    unit: { type: String, required: true },
    group: { type: String, required: true },
  },
  { _id: true }
);

const MaterialSchema = new Schema<IMaterial>(
  {
    title: { type: String, required: true },
    options: [MaterialOptionSchema],
    order: { type: Number, required: true, default: 0 },
  },
  { timestamps: true }
);

MaterialSchema.index({ order: 1 });

export const MaterialModel = mongoose.model<IMaterial>('Material', MaterialSchema);
