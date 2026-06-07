import Notification from '../models/Notification.js';
import { User } from '../models/User.js';

export async function createNotification({ userId, bookingId = '', type, title, message = '', meta = {} }) {
  if (!userId) return null;
  try {
    return await Notification.create({
      userId,
      bookingId: String(bookingId || ''),
      type,
      title,
      message,
      meta,
    });
  } catch (err) {
    console.error('createNotification failed:', err?.message || err);
    return null;
  }
}

export async function notifyUserByIdentity(identity, payload) {
  const key = String(identity || '').trim();
  if (!key) return null;
  const orQuery = [{ Identity: key }];
  if (/^[0-9a-fA-F]{24}$/.test(key)) orQuery.unshift({ _id: key });
  const user = await User.findOne({ $or: orQuery }, { _id: 1 }).lean();
  if (!user?._id) return null;
  return createNotification({ userId: user._id, ...payload });
}

export async function notifyUserById(userId, payload) {
  return createNotification({ userId, ...payload });
}
