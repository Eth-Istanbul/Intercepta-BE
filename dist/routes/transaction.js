"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const txDecoder_1 = require("../utils/txDecoder");
const transactionAnalyzer_1 = require("../utils/transactionAnalyzer");
const abi_1 = require("../utils/abi");
const router = (0, express_1.Router)();
function jsonSafe(value) {
    return JSON.parse(JSON.stringify(value, (_k, v) => (typeof v === 'bigint' ? v.toString() : v)));
}
/**
 * Analyze a raw transaction
 * POST /tx/analyze
 * Body: { rawTx: "0x..." }
 */
router.post('/tx/analyze', async (req, res) => {
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
        if (!txDecoder_1.TransactionDecoder.isValidRawTransaction(rawTx)) {
            return res.status(400).json({
                success: false,
                error: 'Invalid raw transaction format',
                timestamp: new Date().toISOString()
            });
        }
        console.log('Analyzing transaction:', rawTx.slice(0, 20) + '...');
        // Use the new analyzer
        const result = await transactionAnalyzer_1.TransactionAnalyzer.analyzeTransaction(rawTx);
        if (!result.success) {
            return res.status(500).json(result);
        }
        // Add formatted values for better readability
        const formattedTransaction = {
            ...result.transaction,
            valueFormatted: txDecoder_1.TransactionDecoder.formatValue(result.transaction.value),
            gasPriceFormatted: result.transaction.gasPrice ? txDecoder_1.TransactionDecoder.formatGasPrice(result.transaction.gasPrice) : undefined,
            maxFeePerGasFormatted: result.transaction.maxFeePerGas ? txDecoder_1.TransactionDecoder.formatGasPrice(result.transaction.maxFeePerGas) : undefined,
            maxPriorityFeePerGasFormatted: result.transaction.maxPriorityFeePerGas ? txDecoder_1.TransactionDecoder.formatGasPrice(result.transaction.maxPriorityFeePerGas) : undefined,
            transactionTypeFormatted: txDecoder_1.TransactionDecoder.getTransactionType(result.transaction.type),
            transactionTypeNumber: txDecoder_1.TransactionDecoder.getTransactionTypeNumber(result.transaction.type),
        };
        console.log('Transaction analyzed successfully:', result.analysis.type);
        res.json({
            ...result,
            transaction: formattedTransaction
        });
    }
    catch (error) {
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
router.post('/tx/decode', async (req, res) => {
    try {
        const { rawTx } = req.body;
        if (!rawTx) {
            return res.status(400).json({ error: 'rawTx is required' });
        }
        if (typeof rawTx !== 'string') {
            return res.status(400).json({ error: 'rawTx must be a string' });
        }
        console.log('Decoding transaction:', rawTx.slice(0, 20) + '...');
        const decoded = txDecoder_1.TransactionDecoder.decodeRawTransaction(rawTx);
        // Get the abi from the to address
        const abi = await (0, abi_1.fetchContractAbi)(decoded.chainId, decoded.to ?? '');
        decoded.decodedData = txDecoder_1.TransactionDecoder.decodeWithAbi(decoded.data, abi);
        console.log('Decoded data:', decoded.decodedData);
        // Add formatted values for better readability
        const formattedDecoded = {
            ...decoded,
            valueFormatted: txDecoder_1.TransactionDecoder.formatValue(decoded.value),
            gasPriceFormatted: decoded.gasPrice ? txDecoder_1.TransactionDecoder.formatGasPrice(decoded.gasPrice) : undefined,
            maxFeePerGasFormatted: decoded.maxFeePerGas ? txDecoder_1.TransactionDecoder.formatGasPrice(decoded.maxFeePerGas) : undefined,
            maxPriorityFeePerGasFormatted: decoded.maxPriorityFeePerGas ? txDecoder_1.TransactionDecoder.formatGasPrice(decoded.maxPriorityFeePerGas) : undefined,
            transactionType: txDecoder_1.TransactionDecoder.getTransactionType(decoded.type),
            transactionTypeNumber: txDecoder_1.TransactionDecoder.getTransactionTypeNumber(decoded.type),
        };
        console.log('Transaction decoded successfully');
        res.json({
            success: true,
            transaction: formattedDecoded,
            timestamp: new Date().toISOString()
        });
    }
    catch (error) {
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
router.get('/tx/types', (req, res) => {
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
router.post('/tx/ai-analyze', async (req, res) => {
    try {
        const payload = req.body;
        const tx = payload?.params && payload.params[0] ? payload.params[0] : undefined;
        if (!tx) {
            return res.status(400).json({
                success: false,
                error: 'Missing params[0] transaction object',
                timestamp: new Date().toISOString()
            });
        }
        console.log('AI analyzing transaction:', tx.to ? `${tx.to.slice(0, 10)}...` : 'contract creation');
        // Use AI analyzer
        const result = await transactionAnalyzer_1.TransactionAnalyzer.analyzeTransactionWithAI(tx);
        console.log('AI analysis completed:', result.analysis.type, 'Score:', result.analysis.fraudScore);
        return res.json({
            id: payload.id,
            method: payload.method,
            ...result
        });
    }
    catch (error) {
        console.error('AI analysis error:', error);
        return res.status(500).json({
            success: false,
            error: 'AI analysis failed',
            details: error instanceof Error ? error.message : 'Unknown error',
            timestamp: new Date().toISOString()
        });
    }
});
router.post('/tx/rpc', async (req, res) => {
    try {
        const payload = req.body;
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
        const result = await transactionAnalyzer_1.TransactionAnalyzer.analyzeTransactionPayload(tx);
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
            valueFormatted: txDecoder_1.TransactionDecoder.formatValue(result.transaction.value),
            gasPriceFormatted: result.transaction.gasPrice ? txDecoder_1.TransactionDecoder.formatGasPrice(result.transaction.gasPrice) : undefined,
            maxFeePerGasFormatted: result.transaction.maxFeePerGas ? txDecoder_1.TransactionDecoder.formatGasPrice(result.transaction.maxFeePerGas) : undefined,
            maxPriorityFeePerGasFormatted: result.transaction.maxPriorityFeePerGas ? txDecoder_1.TransactionDecoder.formatGasPrice(result.transaction.maxPriorityFeePerGas) : undefined,
            transactionTypeFormatted: txDecoder_1.TransactionDecoder.getTransactionType(result.transaction.type),
            transactionTypeNumber: txDecoder_1.TransactionDecoder.getTransactionTypeNumber(result.transaction.type),
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
    }
    catch (error) {
        console.error('RPC payload parse error:', error);
        return res.status(400).json({
            success: false,
            error: 'Invalid JSON-RPC payload',
            details: error instanceof Error ? error.message : 'Unknown error',
            timestamp: new Date().toISOString()
        });
    }
});
exports.default = router;
//# sourceMappingURL=transaction.js.map