import { TransactionDecoder } from './txDecoder';
import { fetchContractAbiWithFallback } from './abi';
import { AIService } from './aiService';
import { DecodedTransaction, TransactionAnalysisResult, DecodedTxWithAbi, AIAnalysisResult } from './types';

export class TransactionAnalyzer {
    /**
     * Analyzes a raw transaction and provides comprehensive information
     */
    static async analyzeTransaction(rawTx: string): Promise<TransactionAnalysisResult> {
        try {
            // Validate input
            if (!TransactionDecoder.isValidRawTransaction(rawTx)) {
                return {
                    success: false,
                    transaction: {} as DecodedTransaction,
                    analysis: {
                        type: 'unknown',
                        riskLevel: 'high',
                        description: 'Invalid transaction format'
                    },
                    timestamp: new Date().toISOString(),
                    error: 'Invalid raw transaction format'
                };
            }

            // Decode the transaction
            const decoded = TransactionDecoder.decodeRawTransaction(rawTx);

            // For simple ETH transfers, return early
            if (decoded.transactionType === 'eth_transfer') {
                const riskLevel = TransactionDecoder.getRiskLevel(
                    decoded.transactionType,
                    decoded.value,
                    decoded.to
                );

                const description = TransactionDecoder.getTransactionDescription(
                    decoded.transactionType,
                    decoded.value
                );

                return {
                    success: true,
                    transaction: decoded,
                    analysis: {
                        type: decoded.transactionType,
                        riskLevel,
                        description
                    },
                    timestamp: new Date().toISOString()
                };
            }

            // For contract interactions, get ABI and continue with full analysis
            let abiSource: 'etherscan' | 'fallback' | 'none' = 'none';
            let contractInfo;

            if (decoded.transactionType === 'contract_interaction' && decoded.contractAddress) {
                try {
                    const abiResult = await fetchContractAbiWithFallback(
                        decoded.chainId,
                        decoded.contractAddress
                    );

                    abiSource = abiResult.source;

                    // Try to decode with ABI if available
                    if (abiResult.abi && decoded.data) {
                        const abiDecoded = TransactionDecoder.decodeWithAbi(decoded.data, abiResult.abi);
                        if (abiDecoded) {
                            decoded.decodedData = abiDecoded;
                        }
                    }

                    contractInfo = {
                        address: decoded.contractAddress,
                        abiAvailable: abiResult.abi !== null,
                        abiSource: abiResult.source
                    };
                } catch (error) {
                    console.warn('ABI fetch failed:', error);
                }
            }

            // Update decoded transaction with ABI source
            decoded.abiSource = abiSource;

            // Generate analysis
            const riskLevel = TransactionDecoder.getRiskLevel(
                decoded.transactionType,
                decoded.value,
                decoded.to
            );

            const description = TransactionDecoder.getTransactionDescription(
                decoded.transactionType,
                decoded.value
            );

            return {
                success: true,
                transaction: decoded,
                analysis: {
                    type: decoded.transactionType,
                    riskLevel,
                    description,
                    contractInfo
                },
                timestamp: new Date().toISOString()
            };

        } catch (error) {
            console.error('Transaction analysis error:', error);

            return {
                success: false,
                transaction: {} as DecodedTransaction,
                analysis: {
                    type: 'unknown',
                    riskLevel: 'high',
                    description: 'Analysis failed'
                },
                timestamp: new Date().toISOString(),
                error: error instanceof Error ? error.message : 'Unknown error'
            };
        }
    }

    /**
     * Creates DecodedTxWithAbi for AI prompt (internal use)
     */
    static async createDecodedTxWithAbi(rawTx: string): Promise<DecodedTxWithAbi> {
        try {
            // Validate input
            if (!TransactionDecoder.isValidRawTransaction(rawTx)) {
                return {
                    success: false,
                    transaction: {} as DecodedTransaction,
                    analysis: {
                        type: 'unknown',
                        description: 'Invalid transaction format'
                    },
                    abi: '',
                    sourceCode: '',
                    timestamp: new Date().toISOString(),
                    error: 'Invalid raw transaction format'
                };
            }

            // Decode the transaction
            const decoded = TransactionDecoder.decodeRawTransaction(rawTx);

            // Get ABI if it's a contract interaction
            let abiSource: 'etherscan' | 'fallback' | 'none' = 'none';
            let contractInfo;
            let abiString = '';
            let sourceCode = '';

            if (decoded.transactionType === 'contract_interaction' && decoded.contractAddress) {
                try {
                    const abiResult = await fetchContractAbiWithFallback(
                        decoded.chainId,
                        decoded.contractAddress
                    );

                    abiSource = abiResult.source;
                    abiString = abiResult.abi ? JSON.stringify(abiResult.abi) : '';
                    sourceCode = abiResult.sourceCode || '';

                    // Try to decode with ABI if available
                    if (abiResult.abi && decoded.data) {
                        const abiDecoded = TransactionDecoder.decodeWithAbi(decoded.data, abiResult.abi);
                        if (abiDecoded) {
                            decoded.decodedData = abiDecoded;
                        }
                    }

                    contractInfo = {
                        address: decoded.contractAddress,
                        abiAvailable: abiResult.abi !== null,
                        abiSource: abiResult.source,
                        sourceCodeAvailable: !!sourceCode
                    };
                } catch (error) {
                    console.warn('ABI fetch failed:', error);
                }
            }

            // Update decoded transaction with ABI source
            decoded.abiSource = abiSource;

            const description = TransactionDecoder.getTransactionDescription(
                decoded.transactionType,
                decoded.value
            );

            return {
                success: true,
                transaction: decoded,
                analysis: {
                    type: decoded.transactionType,
                    description,
                    contractInfo
                },
                abi: abiString,
                sourceCode: sourceCode,
                timestamp: new Date().toISOString()
            };

        } catch (error) {
            console.error('Transaction analysis error:', error);

            return {
                success: false,
                transaction: {} as DecodedTransaction,
                analysis: {
                    type: 'unknown',
                    description: 'Analysis failed'
                },
                abi: '',
                sourceCode: '',
                timestamp: new Date().toISOString(),
                error: error instanceof Error ? error.message : 'Unknown error'
            };
        }
    }

    /**
     * Analyzes transaction with AI for fraud detection
     */
    static async analyzeTransactionWithAI(payload: {
        chainId?: string;
        gas?: string;
        value?: string;
        from?: string;
        to?: string;
        data?: string;
    }): Promise<AIAnalysisResult> {
        try {

            // Determine transaction type
            const isEthTransfer = (!payload.data || payload.data === '0x') && payload.to;
            const isContractInteraction = payload.data && payload.data !== '0x' && payload.to;

            if (isEthTransfer) {
                return {
                    success: true,
                    analysis: {
                        type: 'eth_transfer',
                        riskLevel: 'low',
                        fraudScore: 5,
                        description: 'Simple ETH Transfer',
                        reasoning: 'Standard ETH transfer with no contract interaction',
                        warnings: [],
                        aiConfidence: 95
                    },
                    timestamp: new Date().toISOString()
                };
            }

            if (isContractInteraction && payload.to) {
                // Create DecodedTxWithAbi for AI analysis
                const decodedTxWithAbi = await this.createDecodedTxWithAbiFromPayload(payload);

                // Use AI to analyze the transaction
                const aiResult = await AIService.analyzeTransactionForFraud(decodedTxWithAbi);
                console.log('AI Result', aiResult);

                return aiResult;
            }

            return {
                success: false,
                analysis: {
                    type: 'unknown',
                    riskLevel: 'high',
                    fraudScore: 100,
                    description: 'Unknown transaction type',
                    reasoning: 'Unable to determine transaction type',
                    warnings: ['Unknown transaction pattern'],
                    aiConfidence: 0
                },
                timestamp: new Date().toISOString()
            };

        } catch (error) {
            return {
                success: false,
                analysis: {
                    type: 'unknown',
                    riskLevel: 'high',
                    fraudScore: 100,
                    description: 'Analysis failed',
                    reasoning: 'Technical error during analysis',
                    warnings: ['Analysis service unavailable'],
                    aiConfidence: 0
                },
                timestamp: new Date().toISOString(),
                error: error instanceof Error ? error.message : 'Unknown error'
            };
        }
    }

    /**
     * Creates DecodedTxWithAbi from payload for AI analysis
     */
    private static async createDecodedTxWithAbiFromPayload(payload: {
        chainId?: string;
        gas?: string;
        value?: string;
        from?: string;
        to?: string;
        data?: string;
    }): Promise<DecodedTxWithAbi> {
        const chainId = payload.chainId ? parseInt(payload.chainId, 16) : 1;

        // Create basic transaction structure
        const transaction: DecodedTransaction = {
            hash: '' as `0x${string}`,
            to: payload.to as `0x${string}` | null,
            value: payload.value || '0',
            gas: payload.gas || '21000',
            nonce: 0,
            data: (payload.data || '0x') as `0x${string}`,
            type: 'legacy',
            chainId,
            isContractCreation: !payload.to,
            isContractInteraction: !!(payload.data && payload.data !== '0x' && payload.to),
            transactionType: 'contract_interaction'
        };

        // Get ABI and decode
        const abiResult = await fetchContractAbiWithFallback(chainId, payload.to!);
        let abiString = '';
        let sourceCode = '';

        if (abiResult.abi) {
            abiString = JSON.stringify(abiResult.abi);
            sourceCode = abiResult.sourceCode || '';

            // Decode function call
            if (payload.data) {
                const decoded = TransactionDecoder.decodeWithAbi(payload.data, abiResult.abi);
                if (decoded) {
                    transaction.decodedData = decoded;
                }
            }
        }

        return {
            success: true,
            transaction,
            analysis: {
                type: 'contract_interaction',
                description: 'Contract Interaction',
                contractInfo: {
                    address: payload.to!,
                    abiAvailable: abiResult.abi !== null,
                    abiSource: abiResult.source,
                    sourceCodeAvailable: !!sourceCode
                }
            },
            abi: abiString,
            sourceCode: sourceCode,
            timestamp: new Date().toISOString()
        };
    }

    /**
     * Analyzes transaction directly from JSON payload
     */
    static async analyzeTransactionPayload(payload: {
        chainId?: string;
        gas?: string;
        value?: string;
        from?: string;
        to?: string;
        data?: string;
    }): Promise<TransactionAnalysisResult> {
        try {
            const chainId = payload.chainId ? parseInt(payload.chainId, 16) : 1;

            // Determine transaction type
            const isEthTransfer = (!payload.data || payload.data === '0x') && payload.to;
            const isContractInteraction = payload.data && payload.data !== '0x' && payload.to;

            if (isEthTransfer) {
                return {
                    success: true,
                    transaction: {} as DecodedTransaction,
                    analysis: {
                        type: 'eth_transfer',
                        riskLevel: 'low',
                        description: 'ETH Transfer'
                    },
                    timestamp: new Date().toISOString()
                };
            }

            if (isContractInteraction && payload.to) {
                // Get ABI and decode
                const abiResult = await fetchContractAbiWithFallback(chainId, payload.to);

                let decodedData;
                if (abiResult.abi && payload.data) {
                    decodedData = TransactionDecoder.decodeWithAbi(payload.data, abiResult.abi);
                }

                return {
                    success: true,
                    transaction: {} as DecodedTransaction,
                    analysis: {
                        type: 'contract_interaction',
                        riskLevel: 'medium',
                        description: 'Contract Interaction',
                        contractInfo: {
                            address: payload.to,
                            abiAvailable: abiResult.abi !== null,
                            abiSource: abiResult.source
                        }
                    },
                    timestamp: new Date().toISOString()
                };
            }

            return {
                success: false,
                transaction: {} as DecodedTransaction,
                analysis: {
                    type: 'unknown',
                    riskLevel: 'high',
                    description: 'Unknown transaction type'
                },
                timestamp: new Date().toISOString()
            };

        } catch (error) {
            return {
                success: false,
                transaction: {} as DecodedTransaction,
                analysis: {
                    type: 'unknown',
                    riskLevel: 'high',
                    description: 'Analysis failed'
                },
                timestamp: new Date().toISOString(),
                error: error instanceof Error ? error.message : 'Unknown error'
            };
        }
    }
}
