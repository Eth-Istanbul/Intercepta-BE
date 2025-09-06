import OpenAI from 'openai';
import { DecodedTxWithAbi, AIAnalysisResult } from './types';

export class AIService {
    private static getOpenAI(): OpenAI {
        const apiKey = process.env.OPENAI_API_KEY;
        if (!apiKey) {
            throw new Error('OPENAI_API_KEY environment variable is required');
        }
        return new OpenAI({ apiKey });
    }
    /**
     * Analyzes transaction using AI for fraud detection
     */
    static async analyzeTransactionForFraud(decodedTxWithAbi: DecodedTxWithAbi): Promise<AIAnalysisResult> {
        try {
            const prompt = this.createAnalysisPrompt(decodedTxWithAbi);
            console.log('prompt', prompt);
            const openai = this.getOpenAI();


            const completion = await openai.chat.completions.create({
                model: 'gpt-4',
                messages: [
                    {
                        role: 'system',
                        content: `You are an expert blockchain security analyst specializing in fraud detection. 
                        Analyze the provided transaction data and return a JSON response with fraud assessment.
                        Focus on detecting common fraud patterns like:
                        - Suspicious contract interactions
                        - High-risk function calls
                        - Unusual transaction patterns
                        - Known malicious contracts
                        
                        Return ONLY valid JSON in this exact format:
                        {
                            "riskLevel": "low|medium|high",
                            "fraudScore": 0-100,
                            "description": "Brief description",
                            "reasoning": "Detailed analysis reasoning",
                            "warnings": ["warning1", "warning2"],
                            "functionName": "function name if contract interaction",
                            "functionDescription": "what this function does",
                            "aiConfidence": 0-100
                        }`
                    },
                    {
                        role: 'user',
                        content: prompt
                    }
                ],
                temperature: 0.3,
                max_tokens: 1000
            });

            const response = completion.choices[0]?.message?.content;
            if (!response) {
                throw new Error('No response from AI');
            }

            const aiAnalysis = JSON.parse(response);

            return {
                success: true,
                analysis: {
                    type: decodedTxWithAbi.analysis.type,
                    riskLevel: aiAnalysis.riskLevel,
                    fraudScore: aiAnalysis.fraudScore,
                    description: aiAnalysis.description,
                    reasoning: aiAnalysis.reasoning,
                    warnings: aiAnalysis.warnings || [],
                    contractInfo: decodedTxWithAbi.analysis.contractInfo ? {
                        ...decodedTxWithAbi.analysis.contractInfo,
                        functionName: aiAnalysis.functionName,
                        functionDescription: aiAnalysis.functionDescription
                    } : undefined,
                    aiConfidence: aiAnalysis.aiConfidence
                },
                timestamp: new Date().toISOString()
            };

        } catch (error) {
            console.error('AI analysis error:', error);

            return {
                success: false,
                analysis: {
                    type: decodedTxWithAbi.analysis.type,
                    riskLevel: 'high',
                    fraudScore: 100,
                    description: 'AI analysis failed',
                    reasoning: 'Unable to analyze transaction due to AI service error',
                    warnings: ['AI analysis unavailable'],
                    aiConfidence: 0
                },
                timestamp: new Date().toISOString(),
                error: error instanceof Error ? error.message : 'Unknown error'
            };
        }
    }

    /**
     * Creates analysis prompt for AI
     */
    private static createAnalysisPrompt(decodedTxWithAbi: DecodedTxWithAbi): string {
        const { transaction, analysis, abi } = decodedTxWithAbi;

        // Handle BigInt serialization
        const safeStringify = (obj: any) => {
            return JSON.stringify(obj, (key, value) =>
                typeof value === 'bigint' ? value.toString() : value, 2
            );
        };

        return `Analyze this blockchain transaction for fraud risk:

TRANSACTION DATA:
- Type: ${analysis.type}
- Chain ID: ${transaction.chainId}
- To Address: ${transaction.to}
- Value: ${transaction.value} wei
- Gas: ${transaction.gas}
- Data: ${transaction.data}

${transaction.decodedData ? `
DECODED FUNCTION CALL:
- Method: ${transaction.decodedData.method}
- Parameters: ${safeStringify(transaction.decodedData.params)}
` : ''}

${analysis.contractInfo ? `
CONTRACT INFO:
- Address: ${analysis.contractInfo.address}
- ABI Available: ${analysis.contractInfo.abiAvailable}
- ABI Source: ${analysis.contractInfo.abiSource}
` : ''}

${abi ? `
CONTRACT ABI:
${abi}
` : ''}

Please analyze this transaction for potential fraud indicators and provide a comprehensive risk assessment.`;
    }
}
