import { Router, Request, Response } from 'express';
import { TransactionDecoder } from '../utils/txDecoder';
import { TransactionAnalyzer } from '../utils/transactionAnalyzer';
import { fetchContractAbi } from '../utils/abi';
import { DecodedTransaction } from '../utils/types';

const router = Router();

function jsonSafe<T>(value: T): T {
    return JSON.parse(
        JSON.stringify(value, (_k, v) => (typeof v === 'bigint' ? v.toString() : v))
    );
}

/**
 * Analyze a raw transaction
 * POST /tx/analyze
 * Body: { rawTx: "0x..." }
 */
router.post('/tx/analyze', async (req: Request, res: Response) => {
    try {
        const { rawTx } = req.body;

        // Input validation
        if (!rawTx) {
            return res.status(400).json({
                success: false,
                error: 'rawTx is required',
                timestamp: new Date().toISOString()
            });
        }

        if (typeof rawTx !== 'string') {
            return res.status(400).json({
                success: false,
                error: 'rawTx must be a string',
                timestamp: new Date().toISOString()
            });
        }

        if (!TransactionDecoder.isValidRawTransaction(rawTx)) {
            return res.status(400).json({
                success: false,
                error: 'Invalid raw transaction format',
                timestamp: new Date().toISOString()
            });
        }

        console.log('Analyzing transaction:', rawTx.slice(0, 20) + '...');

        // Use the new analyzer
        const result = await TransactionAnalyzer.analyzeTransaction(rawTx);

        if (!result.success) {
            return res.status(500).json(result);
        }

        // Add formatted values for better readability
        const formattedTransaction = {
            ...result.transaction,
            valueFormatted: TransactionDecoder.formatValue(result.transaction.value),
            gasPriceFormatted: result.transaction.gasPrice ? TransactionDecoder.formatGasPrice(result.transaction.gasPrice) : undefined,
            maxFeePerGasFormatted: result.transaction.maxFeePerGas ? TransactionDecoder.formatGasPrice(result.transaction.maxFeePerGas) : undefined,
            maxPriorityFeePerGasFormatted: result.transaction.maxPriorityFeePerGas ? TransactionDecoder.formatGasPrice(result.transaction.maxPriorityFeePerGas) : undefined,
            transactionTypeFormatted: TransactionDecoder.getTransactionType(result.transaction.type),
            transactionTypeNumber: TransactionDecoder.getTransactionTypeNumber(result.transaction.type),
        };

        console.log('Transaction analyzed successfully:', result.analysis.type);

        res.json({
            ...result,
            transaction: formattedTransaction
        });

    } catch (error) {
        console.error('Transaction analysis error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to analyze transaction',
            details: error instanceof Error ? error.message : 'Unknown error',
            timestamp: new Date().toISOString()
        });
    }
});

/**
 * Decode a raw transaction (legacy endpoint for backward compatibility)
 * POST /tx/decode
 * Body: { rawTx: "0x..." }
 */
router.post('/tx/decode', async (req: Request, res: Response) => {
    try {
        const { rawTx } = req.body;

        if (!rawTx) {
            return res.status(400).json({ error: 'rawTx is required' });
        }

        if (typeof rawTx !== 'string') {
            return res.status(400).json({ error: 'rawTx must be a string' });
        }

        console.log('Decoding transaction:', rawTx.slice(0, 20) + '...');

        const decoded = TransactionDecoder.decodeRawTransaction(rawTx);

        // Get the abi from the to address
        const abi = await fetchContractAbi(decoded.chainId, decoded.to ?? '');
        decoded.decodedData = TransactionDecoder.decodeWithAbi(decoded.data, abi);
        console.log('Decoded data:', decoded.decodedData);

        // Add formatted values for better readability
        const formattedDecoded = {
            ...decoded,
            valueFormatted: TransactionDecoder.formatValue(decoded.value),
            gasPriceFormatted: decoded.gasPrice ? TransactionDecoder.formatGasPrice(decoded.gasPrice) : undefined,
            maxFeePerGasFormatted: decoded.maxFeePerGas ? TransactionDecoder.formatGasPrice(decoded.maxFeePerGas) : undefined,
            maxPriorityFeePerGasFormatted: decoded.maxPriorityFeePerGas ? TransactionDecoder.formatGasPrice(decoded.maxPriorityFeePerGas) : undefined,
            transactionType: TransactionDecoder.getTransactionType(decoded.type),
            transactionTypeNumber: TransactionDecoder.getTransactionTypeNumber(decoded.type),
        };

        console.log('Transaction decoded successfully');

        res.json({
            success: true,
            transaction: formattedDecoded,
            timestamp: new Date().toISOString()
        });

    } catch (error) {
        console.error('Transaction decode error:', error);
        res.status(500).json({
            error: 'Failed to decode transaction',
            details: error instanceof Error ? error.message : 'Unknown error'
        });
    }
});

/**
 * Get supported transaction types
 * GET /tx/types
 */
router.get('/tx/types', (req: Request, res: Response) => {
    const types = [
        { type: 'legacy', typeNumber: 0, name: 'Legacy', description: 'Original transaction format' },
        { type: 'eip2930', typeNumber: 1, name: 'EIP-2930', description: 'Access List transactions' },
        { type: 'eip1559', typeNumber: 2, name: 'EIP-1559', description: 'Fee Market transactions' }
    ];

    res.json({
        supportedTypes: types,
        timestamp: new Date().toISOString()
    });
});

router.post('/tx/rpc', async (req: Request, res: Response) => {
    try {
        const payload = req.body as {
            id?: string;
            method?: string;
            params?: Array<{
                chainId?: string;
                gas?: string;
                value?: string;
                from?: string;
                to?: string;
                data?: string;
            }>;
        };

        const tx = payload?.params && payload.params[0] ? payload.params[0] : undefined;
        if (!tx) {
            return res.status(400).json({
                success: false,
                error: 'Missing params[0] transaction object',
                timestamp: new Date().toISOString()
            });
        }

        console.log('Analyzing RPC transaction:', tx.to ? `${tx.to.slice(0, 10)}...` : 'contract creation');

        // Use the new analyzer for transaction payload
        const result = await TransactionAnalyzer.analyzeTransactionPayload(tx);

        if (!result.success) {
            return res.status(500).json({
                id: payload.id,
                method: payload.method,
                success: false,
                error: result.error,
                timestamp: result.timestamp
            });
        }

        // Add formatted values for better readability
        const formattedTransaction = {
            ...result.transaction,
            valueFormatted: TransactionDecoder.formatValue(result.transaction.value),
            gasPriceFormatted: result.transaction.gasPrice ? TransactionDecoder.formatGasPrice(result.transaction.gasPrice) : undefined,
            maxFeePerGasFormatted: result.transaction.maxFeePerGas ? TransactionDecoder.formatGasPrice(result.transaction.maxFeePerGas) : undefined,
            maxPriorityFeePerGasFormatted: result.transaction.maxPriorityFeePerGas ? TransactionDecoder.formatGasPrice(result.transaction.maxPriorityFeePerGas) : undefined,
            transactionTypeFormatted: TransactionDecoder.getTransactionType(result.transaction.type),
            transactionTypeNumber: TransactionDecoder.getTransactionTypeNumber(result.transaction.type),
        };

        console.log('RPC transaction analyzed successfully:', result.analysis.type);

        return res.json(jsonSafe({
            id: payload.id,
            method: payload.method,
            success: true,
            transaction: formattedTransaction,
            analysis: result.analysis,
            timestamp: result.timestamp
        }));

    } catch (error) {
        console.error('RPC payload parse error:', error);
        return res.status(400).json({
            success: false,
            error: 'Invalid JSON-RPC payload',
            details: error instanceof Error ? error.message : 'Unknown error',
            timestamp: new Date().toISOString()
        });
    }
});

export default router;

