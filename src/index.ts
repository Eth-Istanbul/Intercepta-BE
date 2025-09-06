import express, { Request, Response } from 'express';
import cors from 'cors';

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());

// Routes
app.get('/ping', (req: Request, res: Response) => {
    res.json({ message: 'pong' });
});

app.get('/health', (req: Request, res: Response) => {
    res.json({
        status: 'OK',
        timestamp: new Date().toISOString(),
        uptime: process.uptime()
    });
});

// Start server
app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
    console.log(`Ping endpoint: http://localhost:${PORT}/ping`);
    console.log(`Health endpoint: http://localhost:${PORT}/health`);
});
