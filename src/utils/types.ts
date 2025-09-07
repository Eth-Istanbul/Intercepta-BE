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
            sourceCodeAvailable?: boolean;
        };
    };
    abi: string;
    sourceCode: string;
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
        fraudScore: number; // 0-100
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
        aiConfidence: number; // 0-100
    };
    timestamp: string;
    error?: string;
}

export interface WebsiteConnectionRequest {
    url: string;
    origin: string;
    userAgent?: string;
    timestamp: number;
    walletType: 'metamask' | 'walletconnect' | 'coinbase' | 'other';
    requestType: 'connect' | 'sign' | 'transaction' | 'other';
    metadata?: {
        title?: string;
        favicon?: string;
        description?: string;
    };
}

export interface WebsiteAnalysisResult {
    success: boolean;
    analysis: {
        riskLevel: 'low' | 'medium' | 'high';
        fraudScore: number; // 0-100
        description: string;
        reasoning: string;
        warnings: string[];
        websiteInfo: {
            url: string;
            domain: string;
            isKnownPhishing: boolean;
            isOnBlacklist: boolean;
            domainAge?: string;
            sslStatus?: string;
        };
        aiConfidence: number; // 0-100
    };
    timestamp: string;
    error?: string;
}
