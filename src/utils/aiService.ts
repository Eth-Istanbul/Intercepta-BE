import OpenAI from 'openai';
import { DecodedTxWithAbi, AIAnalysisResult } from './types';
import fs from 'fs';

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
            const openai = this.getOpenAI();

            fs.writeFileSync('prompt.txt', prompt);

            const completion = await openai.chat.completions.create({
                model: 'gpt-5-mini',

                tools: [
                    {
                        type: 'function',
                        function: {
                            "name": "generate_explanation_response",
                            "description": "Generate an explanation response with risk level, fraud score, description, reasoning, warnings, function metadata, and AI confidence.",
                            "strict": true,
                            "parameters": {
                                "type": "object",
                                "properties": {
                                    "riskLevel": {
                                        "type": "string",
                                        "description": "Level of risk determined by analysis",
                                        "enum": [
                                            "low",
                                            "medium",
                                            "high"
                                        ]
                                    },
                                    "fraudScore": {
                                        "type": "integer",
                                        "description": "Fraud risk score between 0 and 100",
                                        "minimum": 0,
                                        "maximum": 100
                                    },
                                    "description": {
                                        "type": "string",
                                        "description": "Brief description of the analysis result"
                                    },
                                    "reasoning": {
                                        "type": "string",
                                        "description": "Detailed analysis reasoning"
                                    },
                                    "warnings": {
                                        "type": "array",
                                        "description": "Array of warning messages relevant to the result",
                                        "items": {
                                            "type": "string",
                                            "description": "A warning statement"
                                        }
                                    },
                                    "functionName": {
                                        "type": "string",
                                        "description": "Function name if the analysis involves a contract interaction"
                                    },
                                    "functionDescription": {
                                        "type": "string",
                                        "description": "Description of what the contract function does"
                                    },
                                    "aiConfidence": {
                                        "type": "integer",
                                        "description": "AI confidence score between 0 and 100 for the explanation",
                                        "minimum": 0,
                                        "maximum": 100
                                    }
                                },
                                "required": [
                                    "riskLevel",
                                    "fraudScore",
                                    "description",
                                    "reasoning",
                                    "warnings",
                                    "functionName",
                                    "functionDescription",
                                    "aiConfidence"
                                ],
                                "additionalProperties": false
                            }
                        },



                    }
                ],
                //     "name": "generate_explanation_response",
                //     "description": "Generate an explanation response with risk level, fraud score, description, reasoning, warnings, function metadata, and AI confidence.",
                //     "strict": true,
                //     "parameters": {
                //         "type": "object",
                //         "properties": {
                //             "riskLevel": {
                //                 "type": "string",
                //                 "description": "Level of risk determined by analysis",
                //                 "enum": [
                //                     "low",
                //                     "medium",
                //                     "high"
                //                 ]
                //             },
                //             "fraudScore": {
                //                 "type": "integer",
                //                 "description": "Fraud risk score between 0 and 100",
                //                 "minimum": 0,
                //                 "maximum": 100
                //             },
                //             "description": {
                //                 "type": "string",
                //                 "description": "Brief description of the analysis result"
                //             },
                //             "reasoning": {
                //                 "type": "string",
                //                 "description": "Detailed analysis reasoning"
                //             },
                //             "warnings": {
                //                 "type": "array",
                //                 "description": "Array of warning messages relevant to the result",
                //                 "items": {
                //                     "type": "string",
                //                     "description": "A warning statement"
                //                 }
                //             },
                //             "functionName": {
                //                 "type": "string",
                //                 "description": "Function name if the analysis involves a contract interaction"
                //             },
                //             "functionDescription": {
                //                 "type": "string",
                //                 "description": "Description of what the contract function does"
                //             },
                //             "aiConfidence": {
                //                 "type": "integer",
                //                 "description": "AI confidence score between 0 and 100 for the explanation",
                //                 "minimum": 0,
                //                 "maximum": 100
                //             }
                //         },
                //         "required": [
                //             "riskLevel",
                //             "fraudScore",
                //             "description",
                //             "reasoning",
                //             "warnings",
                //             "functionName",
                //             "functionDescription",
                //             "aiConfidence"
                //         ],
                //         "additionalProperties": false
                //     }
                // },


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
                        - Verified code (Unverified code is bad)
                   `
                    },
                    {
                        role: 'user',
                        content: prompt
                    }
                ]
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
        const { transaction, analysis, abi, sourceCode } = decodedTxWithAbi;

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

${sourceCode ? `
CONTRACT SOURCE CODE:
${sourceCode}
` : ''}

Please analyze this transaction for potential fraud indicators and provide a comprehensive risk assessment. 
Pay special attention to the contract source code if available, as it provides the most accurate context for understanding what the contract does.`;
    }
}
