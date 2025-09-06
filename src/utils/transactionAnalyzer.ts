import { TransactionDecoder } from './txDecoder';
import { fetchContractAbiWithFallback } from './abi';
import { DecodedTransaction, TransactionAnalysisResult } from './types';

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

            // Get ABI if it's a contract interaction
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
     * Analyzes a transaction from RPC payload format
     */
    static async analyzeRpcTransaction(payload: {
        chainId?: string | number;
        gas?: string;
        value?: string;
        from?: string;
        to?: string;
        data?: string;
    }): Promise<TransactionAnalysisResult> {
        try {
            // Convert RPC format to raw transaction format
            const chainId = typeof payload.chainId === 'string' && payload.chainId.startsWith('0x')
                ? parseInt(payload.chainId, 16)
                : Number(payload.chainId) || 1;

            // Create a mock transaction object for analysis
            const mockTx = {
                to: payload.to || null,
                value: payload.value ? BigInt(payload.value) : 0n,
                data: (payload.data || '0x') as `0x${string}`,
                gas: payload.gas ? BigInt(payload.gas) : 21000n,
                chainId,
                type: 'legacy' as const
            };

            // Determine transaction type
            const transactionType = TransactionDecoder.determineTransactionType(mockTx);

            const decoded: DecodedTransaction = {
                hash: '' as `0x${string}`,
                to: mockTx.to as `0x${string}` | null,
                value: mockTx.value.toString(),
                gas: mockTx.gas.toString(),
                nonce: 0,
                data: mockTx.data,
                type: mockTx.type,
                chainId: mockTx.chainId,
                isContractCreation: !mockTx.to,
                isContractInteraction: !!mockTx.data && mockTx.data !== '0x' && mockTx.to !== null,
                transactionType,
                contractAddress: mockTx.to || undefined,
            };

            // Get ABI if it's a contract interaction
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
            } else if (decoded.transactionType === 'eth_transfer') {
                decoded.decodedData = {
                    method: 'transfer',
                    params: []
                };
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
            console.error('RPC transaction analysis error:', error);

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
