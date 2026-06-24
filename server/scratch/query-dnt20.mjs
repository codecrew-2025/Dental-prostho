import dns from 'dns';
dns.setServers(['8.8.8.8', '1.1.1.1']);

import dotenv from 'dotenv';
import path from 'path';
dotenv.config({ path: path.join(process.cwd(), '.env') });

import mongoose from 'mongoose';
import { PatientDetails } from '../models/patientDetails.js';
import Appointment from '../models/AppoitmentBooked.js';

const run = async () => {
  const uris = {
    remote: process.env.MONGO_URI,
    local: 'mongodb://127.0.0.1:27017/Dental'
  };

  for (const [name, uri] of Object.entries(uris)) {
    if (!uri) {
      console.log(`Skipping ${name} - URI not set.`);
      continue;
    }
    console.log(`\nConnecting to ${name} database: ${uri.split('@')[1] || uri}...`);
    try {
      const conn = await mongoose.connect(uri, { tlsAllowInvalidCertificates: true, serverSelectionTimeoutMS: 5000 });
      console.log(`Connected successfully to ${name}!`);

      // Search for DNT20 in PatientDetails
      const patients = await PatientDetails.find({
        $or: [
          { patientId: 'DNT20' },
          { patientId: /DNT20/i },
          { patientId: 'SRMDNT20' },
          { patientId: /SRMDNT20/i }
        ]
      }).lean();

      console.log(`Found ${patients.length} matching patients in ${name}:`);
      patients.forEach(p => {
        console.log(`- ID: ${p.patientId}, Name: ${p.personalInfo?.firstName} ${p.personalInfo?.lastName}`);
      });

      // Search appointments
      const appts = await Appointment.find({
        $or: [
          { patientId: 'DNT20' },
          { patientId: /DNT20/i },
          { patientId: 'SRMDNT20' },
          { patientId: /SRMDNT20/i }
        ]
      }).lean();

      console.log(`Found ${appts.length} matching appointments in ${name}:`);
      appts.forEach(a => {
        console.log(`- BookingID: ${a.bookingId}, PatientID: ${a.patientId}, Status: ${a.status}`);
      });

      await mongoose.disconnect();
    } catch (err) {
      console.error(`Error with ${name} database:`, err.message);
    }
  }

  process.exit(0);
};

run().catch(err => {
  console.error(err);
  process.exit(1);
});
