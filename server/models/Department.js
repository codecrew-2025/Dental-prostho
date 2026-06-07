// server/models/Department.js
import mongoose from 'mongoose';

const DepartmentSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    unique: true,
    trim: true
  },
  slug: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    trim: true
  },
  displayName: {
    type: String,
    required: true,
    trim: true
  },
  description: {
    type: String,
    default: ''
  },
  isActive: {
    type: Boolean,
    default: false
  },
  status: {
    type: String,
    enum: ['active', 'coming_soon', 'disabled'],
    default: 'coming_soon'
  },
  color: {
    type: String,
    default: '#00B894'
  },
  order: {
    type: Number,
    default: 0
  }
}, {
  timestamps: true
});

DepartmentSchema.index({ slug: 1 });
DepartmentSchema.index({ status: 1, isActive: 1 });

export const Department = mongoose.models.Department || mongoose.model('Department', DepartmentSchema);
export default Department;
