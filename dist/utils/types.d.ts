export interface DecodedTransaction {
    hash: `0x${string}` | '';
    from?: `0x${string}` | null;
    to: `0x${string}` | null;
    value: string;
    gas: string;
    gasPrice?: string;
    nonce: number;
    data: `0x${string}`;
    type: 'legacy' | 'eip2930' | 'eip1559' | string;
    chainId: number;
    maxFeePerGas?: string;
    maxPriorityFeePerGas?: string;
    accessList?: readonly unknown[];
    decodedData?: {
        method: string;
        params: unknown[];
    };
    isContractCreation: boolean;
    isContractInteraction: boolean;
    transactionType: 'eth_transfer' | 'contract_creation' | 'contract_interaction' | 'unknown';
    contractAddress?: string;
    abiSource?: 'etherscan' | 'fallback' | 'none';
}
export interface DecodedTxWithAbi {
    success: boolean;
    transaction: DecodedTransaction;
    analysis: {
        type: 'eth_transfer' | 'contract_creation' | 'contract_interaction' | 'unknown';
        description: string;
        contractInfo?: {
            address: string;
            abiAvailable: boolean;
            abiSource: string;
        };
    };
    abi: string;
    timestamp: string;
    error?: string;
}
export interface TransactionAnalysisResult {
    success: boolean;
    transaction: DecodedTransaction;
    analysis: {
        type: 'eth_transfer' | 'contract_creation' | 'contract_interaction' | 'unknown';
        riskLevel: 'low' | 'medium' | 'high';
        description: string;
        contractInfo?: {
            address: string;
            abiAvailable: boolean;
            abiSource: string;
        };
    };
    timestamp: string;
    error?: string;
}
export interface AIAnalysisResult {
    success: boolean;
    analysis: {
        type: 'eth_transfer' | 'contract_creation' | 'contract_interaction' | 'unknown';
        riskLevel: 'low' | 'medium' | 'high';
        fraudScore: number;
        description: string;
        reasoning: string;
        warnings: string[];
        contractInfo?: {
            address: string;
            abiAvailable: boolean;
            abiSource: string;
            functionName?: string;
            functionDescription?: string;
        };
        aiConfidence: number;
    };
    timestamp: string;
    error?: string;
}
//# sourceMappingURL=types.d.ts.map