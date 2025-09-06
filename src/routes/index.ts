import { Router } from 'express';
import healthRoutes from './health';
import transactionRoutes from './transaction';

const router = Router();

// Mount route modules
router.use('/', healthRoutes);
router.use('/', transactionRoutes);

export default router;
