import { Router, Request, Response } from 'express';
import OpenAI from 'openai';

const router = Router();

// Initialize OpenAI client (only if API key is available)
const openai = process.env.OPENAI_API_KEY ? new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
}) : null;

router.post('/ai/chat', async (req: Request, res: Response) => {
    try {
        const { prompt } = req.body;

        if (!prompt) {
            return res.status(400).json({ error: 'Prompt is required' });
        }

        if (!openai) {
            return res.status(500).json({ error: 'OpenAI API key not configured' });
        }

        console.log('Sending prompt to AI:', prompt);

        const completion = await openai.chat.completions.create({
            model: "gpt-3.5-turbo",
            messages: [
                {
                    role: "user",
                    content: prompt
                }
            ],
            max_tokens: 1000,
            temperature: 0.7,
        });

        const response = completion.choices[0]?.message?.content || 'No response generated';

        console.log('AI Response:', response);

        res.json({
            prompt,
            response,
            timestamp: new Date().toISOString(),
            model: completion.model,
            usage: completion.usage
        });

    } catch (error) {
        console.error('AI API Error:', error);
        res.status(500).json({
            error: 'Failed to get AI response',
            details: error instanceof Error ? error.message : 'Unknown error'
        });
    }
});

export default router;
