import { DecodedTxWithAbi, AIAnalysisResult } from './types';
export declare class AIService {
    /**
     * Analyzes transaction using AI for fraud detection
     */
    static analyzeTransactionForFraud(decodedTxWithAbi: DecodedTxWithAbi): Promise<AIAnalysisResult>;
    /**
     * Creates analysis prompt for AI
     */
    private static createAnalysisPrompt;
}
//# sourceMappingURL=aiService.d.ts.map