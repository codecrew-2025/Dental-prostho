// server/scripts/seed-departments.js
// Seeds all departments with proper active/coming_soon status
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';
import Department from '../models/Department.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

dotenv.config({ path: resolve(__dirname, '../../.env') });
dotenv.config({ path: resolve(__dirname, '../.env') });

const MONGO_URI = process.env.MONGO_URI;

const departments = [
  {
    name: 'Oral',
    slug: 'oral',
    displayName: 'Oral Medicine and Radiology',
    description: 'General entry point for all patients. Primary screening and diagnosis.',
    isActive: true,
    status: 'active',
    color: '#3B82F6',
    order: 1
  },
  {
    name: 'Prosthodontics',
    slug: 'prosthodontics',
    displayName: 'Prosthodontics',
    description: 'Specializes in dental prosthetics including dentures, crowns, bridges, and implants.',
    isActive: true,
    status: 'active',
    color: '#00B894',
    order: 2
  },
  {
    name: 'Pedodontics',
    slug: 'pedodontics',
    displayName: 'Pedodontics',
    description: 'Pediatric dentistry for children.',
    isActive: false,
    status: 'coming_soon',
    color: '#6C5CE7',
    order: 3
  },
  {
    name: 'Periodontics',
    slug: 'periodontics',
    displayName: 'Periodontics',
    description: 'Treatment of gum diseases and supporting structures.',
    isActive: false,
    status: 'coming_soon',
    color: '#FD79A8',
    order: 4
  },
  {
    name: 'Conservative Dentistry and Endodontics',
    slug: 'conservative',
    displayName: 'Conservative Dentistry and Endodontics',
    description: 'Tooth conservation, fillings, and root canal treatments.',
    isActive: false,
    status: 'coming_soon',
    color: '#FDCB6E',
    order: 5
  },
  {
    name: 'Oral and Maxillofacial Surgery',
    slug: 'oral-surgery',
    displayName: 'Oral and Maxillofacial Surgery',
    description: 'Surgical treatments for oral and facial conditions.',
    isActive: false,
    status: 'coming_soon',
    color: '#E17055',
    order: 6
  },
  {
    name: 'Public Health Dentistry',
    slug: 'public-health',
    displayName: 'Public Health Dentistry',
    description: 'Community dental health and preventive care.',
    isActive: false,
    status: 'coming_soon',
    color: '#74B9FF',
    order: 7
  },
  {
    name: 'Implantology',
    slug: 'implant',
    displayName: 'Implantology',
    description: 'Dental implant procedures and treatments.',
    isActive: false,
    status: 'coming_soon',
    color: '#A29BFE',
    order: 8
  }
];

const seedDepartments = async () => {
  try {
    console.log('\n🔌 Connecting to MongoDB...');
    await mongoose.connect(MONGO_URI);
    console.log('✅ Connected to MongoDB\n');

    console.log('📋 Seeding departments...\n');

    for (const dept of departments) {
      const existing = await Department.findOne({ slug: dept.slug });
      
      if (existing) {
        // Update existing department
        await Department.updateOne(
          { slug: dept.slug },
          { $set: dept }
        );
        console.log(`🔄 Updated: ${dept.displayName}`);
        console.log(`   Status: ${dept.status} | isActive: ${dept.isActive}`);
      } else {
        // Create new department
        await Department.create(dept);
        console.log(`✨ Created: ${dept.displayName}`);
        console.log(`   Status: ${dept.status} | isActive: ${dept.isActive}`);
      }
    }

    console.log('\n═══════════════════════════════════════');
    console.log('📊 Department Status Summary:');
    console.log('═══════════════════════════════════════\n');

    const activeDepts = await Department.find({ isActive: true }).sort({ order: 1 });
    const comingSoonDepts = await Department.find({ isActive: false }).sort({ order: 1 });

    console.log('✅ ACTIVE DEPARTMENTS:');
    activeDepts.forEach(dept => {
      console.log(`   • ${dept.displayName} (${dept.name})`);
    });

    console.log('\n⏳ COMING SOON:');
    comingSoonDepts.forEach(dept => {
      console.log(`   • ${dept.displayName} (${dept.name})`);
    });

    console.log('\n═══════════════════════════════════════');
    console.log('✅ Department seeding complete!\n');

    await mongoose.connection.close();
    process.exit(0);
  } catch (error) {
    console.error('\n❌ Error seeding departments:', error);
    process.exit(1);
  }
};

seedDepartments();
