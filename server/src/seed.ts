import 'dotenv/config';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import mongoose from 'mongoose';
import { MaterialModel } from './models/material.model.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const seedData = JSON.parse(readFileSync(join(__dirname, 'seed-data.json'), 'utf-8'));

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/materials-app';

async function seed() {
  await mongoose.connect(MONGODB_URI);
  console.log('Connected to MongoDB');

  await MaterialModel.deleteMany({});
  console.log('Cleared existing materials');

  const result = await MaterialModel.insertMany(seedData);
  console.log(`Seeded ${result.length} categories`);

  await mongoose.disconnect();
  console.log('Done');
}

seed().catch((err) => {
  console.error('Seed error:', err);
  process.exit(1);
});
