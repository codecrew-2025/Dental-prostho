import dns from 'dns';
dns.setServers(['8.8.8.8', '1.1.1.1']);

import dotenv from 'dotenv';
import path from 'path';
dotenv.config({ path: path.join(process.cwd(), 'server', '.env') });

import mongoose from 'mongoose';
import { User } from '../models/User.js';

const run = async () => {
  if (!process.env.MONGO_URI) {
    console.error('MONGO_URI is missing from env!');
    process.exit(1);
  }
  await mongoose.connect(process.env.MONGO_URI, { tlsAllowInvalidCertificates: true });
  console.log('Connected to DB');

  const users = await User.find({ role: { $in: ['pg', 'ug'] } }).limit(5).lean();
  console.log('=== PG/UG Users ===');
  console.log(JSON.stringify(users, null, 2));

  process.exit(0);
};

run().catch(err => {
  console.error(err);
  process.exit(1);
});
