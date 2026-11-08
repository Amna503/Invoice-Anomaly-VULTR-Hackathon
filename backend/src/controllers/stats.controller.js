import { calculateStats } from '../services/statsService.js';
import { success } from '../utils/response.js';

export const getStats = async (req, res, next) => {
  try {
    const stats = await calculateStats();
    return success(res, stats);
  } catch (error) {
    next(error);
  }
};
