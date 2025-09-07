import OpenAI from 'openai';
import { WebsiteConnectionRequest, WebsiteAnalysisResult } from './types';

export class WebsiteAnalyzer {
    private static getOpenAI(): OpenAI {
        const apiKey = process.env.OPENAI_API_KEY;
        if (!apiKey) {
            throw new Error('OPENAI_API_KEY environment variable is required');
        }
        return new OpenAI({ apiKey });
    }
    /**
     * Analyzes a website connection request for phishing/fraud
     */
    static async analyzeWebsiteConnection(request: WebsiteConnectionRequest): Promise<WebsiteAnalysisResult> {
        try {
            const domain = this.extractDomain(request.url);
            const websiteInfo = {
                url: request.url,
                domain,
                isKnownPhishing: false,
                isOnBlacklist: false
            };

            // Create AI prompt for website analysis
            const prompt = this.createWebsiteAnalysisPrompt(request);
            console.log('Website analysis prompt:', prompt);

            const openai = this.getOpenAI();
            const completion = await openai.chat.completions.create({
                model: 'gpt-4',
                messages: [
                    {
                        role: 'system',
                        content: `You are an expert cybersecurity analyst specializing in phishing and crypto fraud detection.
                        Analyze the provided website connection request and determine if it's potentially malicious.
                        
                        Focus on detecting:
                        - Phishing websites impersonating legitimate crypto services
                        - Suspicious domain patterns (typosquatting, homograph attacks)
                        - Known malicious domains
                        - Fake DeFi/NFT platforms
                        - Scam websites
                        
                        Return ONLY valid JSON in this exact format:
                        {
                            "riskLevel": "low|medium|high",
                            "fraudScore": 0-100,
                            "description": "Brief description",
                            "reasoning": "Detailed analysis reasoning",
                            "warnings": ["warning1", "warning2"],
                            "isKnownPhishing": true/false,
                            "isOnBlacklist": true/false,
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
                    riskLevel: aiAnalysis.riskLevel,
                    fraudScore: aiAnalysis.fraudScore,
                    description: aiAnalysis.description,
                    reasoning: aiAnalysis.reasoning,
                    warnings: aiAnalysis.warnings || [],
                    websiteInfo: {
                        ...websiteInfo,
                        isKnownPhishing: aiAnalysis.isKnownPhishing,
                        isOnBlacklist: aiAnalysis.isOnBlacklist
                    },
                    aiConfidence: aiAnalysis.aiConfidence
                },
                timestamp: new Date().toISOString()
            };

        } catch (error) {
            console.error('Website analysis error:', error);

            return {
                success: false,
                analysis: {
                    riskLevel: 'high',
                    fraudScore: 100,
                    description: 'Website analysis failed',
                    reasoning: 'Unable to analyze website due to technical error',
                    warnings: ['Analysis service unavailable'],
                    websiteInfo: {
                        url: request.url,
                        domain: this.extractDomain(request.url),
                        isKnownPhishing: false,
                        isOnBlacklist: false
                    },
                    aiConfidence: 0
                },
                timestamp: new Date().toISOString(),
                error: error instanceof Error ? error.message : 'Unknown error'
            };
        }
    }

    /**
     * Creates analysis prompt for website security assessment
     */
    private static createWebsiteAnalysisPrompt(request: WebsiteConnectionRequest): string {
        return `Analyze this website connection request for potential phishing/fraud:

WEBSITE CONNECTION REQUEST:
- URL: ${request.url}
- Origin: ${request.origin}
- Wallet Type: ${request.walletType}
- Request Type: ${request.requestType}
- User Agent: ${request.userAgent || 'Not provided'}
- Timestamp: ${new Date(request.timestamp).toISOString()}

${request.metadata ? `
WEBSITE METADATA:
- Title: ${request.metadata.title || 'Not provided'}
- Description: ${request.metadata.description || 'Not provided'}
- Favicon: ${request.metadata.favicon || 'Not provided'}
` : ''}

Please analyze this website for:
1. Phishing indicators (typosquatting, suspicious domains)
2. Known malicious websites
3. Fake crypto/DeFi platforms
4. Suspicious patterns in URL structure
5. Potential security risks

Provide a comprehensive fraud risk assessment for this website connection attempt.`;
    }

    /**
     * Extracts domain from URL
     */
    private static extractDomain(url: string): string {
        try {
            const urlObj = new URL(url);
            return urlObj.hostname;
        } catch {
            return url;
        }
    }
}
