import { Router, Request, Response } from 'express';
import { TransactionDecoder } from '../utils/txDecoder';
import { fetchContractAbi } from '../utils/abi';
import { DecodedTransaction } from '../utils/types';

const router = Router();

function jsonSafe<T>(value: T): T {
    return JSON.parse(
        JSON.stringify(value, (_k, v) => (typeof v === 'bigint' ? v.toString() : v))
    );
}

/**
 * Decode a raw transaction
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

router.post('/tx/rpc', (req: Request, res: Response) => {
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
            return res.status(400).json({ error: 'Missing params[0] transaction object' });
        }

        let methodInfo = tx.data ? TransactionDecoder.decodeFunctionData(tx.data) : undefined;
        try {
            if (tx.data && tx.to && tx.chainId) {
                const chainIdNum = typeof tx.chainId === 'string' && tx.chainId.startsWith('0x')
                    ? parseInt(tx.chainId, 16)
                    : Number(tx.chainId);
                const apiKey = process.env.ETHERSCAN_API_KEY;
                if (apiKey) {
                    fetchContractAbi(chainIdNum, tx.to, apiKey)
                        .then((abi) => {
                            const viaAbi = TransactionDecoder.decodeWithAbi(tx.data as string, abi);
                            if (viaAbi) {
                                methodInfo = viaAbi;
                            }
                            return res.json(jsonSafe({
                                id: payload.id,
                                method: payload.method,
                                transaction: {
                                    chainId: tx.chainId,
                                    gas: tx.gas,
                                    value: tx.value,
                                    from: tx.from,
                                    to: tx.to,
                                    data: tx.data,
                                    decodedData: methodInfo,
                                    valueFormatted: tx.value ? TransactionDecoder.formatValue(tx.value) : undefined,
                                },
                                timestamp: new Date().toISOString()
                            }));
                        })
                        .catch((e) => {
                            console.warn('ABI fetch failed:', e);
                            return res.json(jsonSafe({
                                id: payload.id,
                                method: payload.method,
                                transaction: {
                                    chainId: tx.chainId,
                                    gas: tx.gas,
                                    value: tx.value,
                                    from: tx.from,
                                    to: tx.to,
                                    data: tx.data,
                                    decodedData: methodInfo,
                                    valueFormatted: tx.value ? TransactionDecoder.formatValue(tx.value) : undefined,
                                },
                                timestamp: new Date().toISOString()
                            }));
                        });
                    return; // response will be sent in promise handlers
                }
            }
        } catch { }

        return res.json(jsonSafe({
            id: payload.id,
            method: payload.method,
            transaction: {
                chainId: tx.chainId,
                gas: tx.gas,
                value: tx.value,
                from: tx.from,
                to: tx.to,
                data: tx.data,
                decodedData: methodInfo,
                valueFormatted: tx.value ? TransactionDecoder.formatValue(tx.value) : undefined,
            },
            timestamp: new Date().toISOString()
        }));
    } catch (error) {
        console.error('RPC payload parse error:', error);
        return res.status(400).json({ error: 'Invalid JSON-RPC payload', details: error instanceof Error ? error.message : 'Unknown error' });
    }
});

export default router;

