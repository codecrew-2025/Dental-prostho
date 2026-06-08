import dotenv from 'dotenv';
dotenv.config();

import connectDB from '../config/db.js';
import { User } from '../models/User.js';

const run = async () => {
  await connectDB();
  const identity = 'DNT1000';
  const u = await User.findOne({ Identity: identity }).lean();
  console.log('User:', u);
  process.exit(0);
};

run();
