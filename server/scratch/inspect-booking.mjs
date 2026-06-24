import dotenv from 'dotenv';
import path from 'path';
dotenv.config({ path: path.join(process.cwd(), 'server', '.env') });

import connectDB from '../config/db.js';
import Appointment from '../models/AppoitmentBooked.js';

const run = async () => {
  await connectDB();
  const appts = await Appointment.find({ patientId: '2606012' }).lean();
  console.log('=== APPOINTMENTS FOR 2606012 ===');
  console.log(JSON.stringify(appts, null, 2));
  process.exit(0);
};

run().catch(err => {
  console.error(err);
  process.exit(1);
});
