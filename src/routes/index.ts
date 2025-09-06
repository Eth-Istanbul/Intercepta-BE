import { Router } from 'express';
import healthRoutes from './health';
import pingRoutes from './ping';
import aiRoutes from './ai';
import transactionRoutes from './transaction';

const router = Router();

// Mount route modules
router.use('/', healthRoutes);
router.use('/', pingRoutes);
router.use('/', aiRoutes);
router.use('/', transactionRoutes);

export default router;
