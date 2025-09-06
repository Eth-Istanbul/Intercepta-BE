import { TransactionAnalysisResult, DecodedTxWithAbi, AIAnalysisResult } from './types';
export declare class TransactionAnalyzer {
    /**
     * Analyzes a raw transaction and provides comprehensive information
     */
    static analyzeTransaction(rawTx: string): Promise<TransactionAnalysisResult>;
    /**
     * Creates DecodedTxWithAbi for AI prompt (internal use)
     */
    static createDecodedTxWithAbi(rawTx: string): Promise<DecodedTxWithAbi>;
    /**
     * Analyzes transaction with AI for fraud detection
     */
    static analyzeTransactionWithAI(payload: {
        chainId?: string;
        gas?: string;
        value?: string;
        from?: string;
        to?: string;
        data?: string;
    }): Promise<AIAnalysisResult>;
    /**
     * Creates DecodedTxWithAbi from payload for AI analysis
     */
    private static createDecodedTxWithAbiFromPayload;
    /**
     * Analyzes transaction directly from JSON payload
     */
    static analyzeTransactionPayload(payload: {
        chainId?: string;
        gas?: string;
        value?: string;
        from?: string;
        to?: string;
        data?: string;
    }): Promise<TransactionAnalysisResult>;
}
//# sourceMappingURL=transactionAnalyzer.d.ts.map