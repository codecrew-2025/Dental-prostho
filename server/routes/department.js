// server/routes/department.js
// API routes for department management
import express from 'express';
import Department from '../models/Department.js';
import auth from '../middleware/auth.js';

const router = express.Router();

/**
 * GET /api/departments
 * Get all departments
 * Query params:
 *   - activeOnly: 'true' to get only active departments
 */
router.get('/', async (req, res) => {
  try {
    const { activeOnly } = req.query;
    
    const filter = {};
    if (activeOnly === 'true') {
      filter.isActive = true;
      filter.status = 'active';
    }

    const departments = await Department.find(filter)
      .sort({ order: 1 })
      .lean();

    res.json({
      success: true,
      data: departments
    });
  } catch (error) {
    console.error('Error fetching departments:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch departments',
      error: error.message
    });
  }
});

/**
 * GET /api/departments/active
 * Get only active departments (shorthand)
 */
router.get('/active', async (req, res) => {
  try {
    const departments = await Department.find({
      isActive: true,
      status: 'active'
    })
    .sort({ order: 1 })
    .lean();

    res.json({
      success: true,
      data: departments
    });
  } catch (error) {
    console.error('Error fetching active departments:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch active departments',
      error: error.message
    });
  }
});

/**
 * GET /api/departments/referral
 * Get departments available for referral (active departments excluding Oral/General)
 */
router.get('/referral', async (req, res) => {
  try {
    const departments = await Department.find({
      isActive: true,
      status: 'active',
      slug: { $ne: 'oral' } // Exclude Oral Medicine (general entry point)
    })
    .sort({ order: 1 })
    .lean();

    res.json({
      success: true,
      data: departments
    });
  } catch (error) {
    console.error('Error fetching referral departments:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch referral departments',
      error: error.message
    });
  }
});

/**
 * GET /api/departments/:slugOrId
 * Get a specific department by slug or ID
 */
router.get('/:slugOrId', async (req, res) => {
  try {
    const { slugOrId } = req.params;
    
    // Try to find by slug first, then by ID
    let department = await Department.findOne({ slug: slugOrId }).lean();
    
    if (!department) {
      department = await Department.findById(slugOrId).lean();
    }

    if (!department) {
      return res.status(404).json({
        success: false,
        message: 'Department not found'
      });
    }

    res.json({
      success: true,
      data: department
    });
  } catch (error) {
    console.error('Error fetching department:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch department',
      error: error.message
    });
  }
});

/**
 * Middleware to check if a department is active
 * Use this in routes that need to verify department access
 */
export const checkDepartmentActive = async (req, res, next) => {
  try {
    const deptIdentifier = req.params.deptSlug || req.params.deptId || req.body.department || req.body.referredDepartment;
    
    if (!deptIdentifier) {
      return next(); // No department specified, let route handle it
    }

    // Try to find department by various identifiers
    let department = await Department.findOne({ 
      $or: [
        { slug: String(deptIdentifier).toLowerCase().trim() },
        { name: String(deptIdentifier).trim() }
      ]
    });

    if (!department) {
      // Try by ID if it looks like a MongoDB ObjectId
      if (deptIdentifier.match(/^[0-9a-fA-F]{24}$/)) {
        department = await Department.findById(deptIdentifier);
      }
    }

    // If department not found in collection, it might be a legacy string reference
    // Allow it to pass through (backwards compatibility)
    if (!department) {
      return next();
    }

    // Check if department is active
    if (department.status !== 'active' || !department.isActive) {
      return res.status(403).json({
        success: false,
        message: `${department.displayName} is not yet active. This department is coming soon.`,
        status: department.status,
        departmentName: department.displayName
      });
    }

    // Attach department to request for downstream use
    req.department = department;
    next();
  } catch (error) {
    console.error('Error in checkDepartmentActive middleware:', error);
    return res.status(500).json({
      success: false,
      message: 'Error checking department status',
      error: error.message
    });
  }
};

export default router;
