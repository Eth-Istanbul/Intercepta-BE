import { Router } from 'express';
import healthRoutes from './health';
import pingRoutes from './ping';
import aiRoutes from './ai';

const router = Router();

// Mount route modules
router.use('/', healthRoutes);
router.use('/', pingRoutes);
router.use('/', aiRoutes);

export default router;
