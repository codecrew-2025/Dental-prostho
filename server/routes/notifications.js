import { Router } from 'express';
import auth from '../middleware/auth.js';
import Notification from '../models/Notification.js';

const router = Router();

router.get('/', auth, async (req, res) => {
  try {
    const notifications = await Notification.find({ userId: req.user._id })
      .sort({ createdAt: -1 })
      .limit(100)
      .lean();
    res.json({ success: true, notifications });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to fetch notifications' });
  }
});

router.put('/:id/read', auth, async (req, res) => {
  try {
    await Notification.updateOne({ _id: req.params.id, userId: req.user._id }, { $set: { read: true } });
    res.json({ success: true });
  } catch {
    res.status(500).json({ success: false });
  }
});

export default router;
