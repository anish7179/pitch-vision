// ============================================
// src/routes/dashboard.routes.js
// ============================================
// RESTful CRUD routes for saved dashboards.
// All routes are protected — require a valid JWT access token.
//
// Route map:
//   POST   /api/dashboards        → Create dashboard
//   GET    /api/dashboards        → List dashboards (paginated)
//   GET    /api/dashboards/:id    → Get single dashboard
//   PATCH  /api/dashboards/:id    → Update dashboard
//   DELETE /api/dashboards/:id    → Delete dashboard
// ============================================

import { Router } from 'express';
import authenticate from '../middleware/auth.js';
import {
  createDashboard,
  getAllDashboards,
  getDashboardById,
  updateDashboard,
  deleteDashboard,
} from '../controllers/dashboard.controller.js';

const router = Router();

// Apply auth middleware to all routes in this router
router.use(authenticate);

router.post('/', createDashboard);
router.get('/', getAllDashboards);
router.get('/:id', getDashboardById);
router.patch('/:id', updateDashboard);
router.delete('/:id', deleteDashboard);

export default router;
