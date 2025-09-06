import { parseTransaction, formatEther, formatGwei, isAddress, keccak256, decodeFunctionData, isHex } from 'viem';
import type { Abi } from 'viem';
import { DecodedTransaction } from './types';


export class TransactionDecoder {
    static decodeRawTransaction(rawTx: string): DecodedTransaction {
        try {
            const txHex = (rawTx.startsWith('0x') ? rawTx : `0x${rawTx}`) as `0x${string}`;
            const tx = parseTransaction(txHex);

            // Determine transaction type
            const transactionType = this.determineTransactionType(tx);

            const decoded: DecodedTransaction = {
                hash: keccak256(txHex),
                to: tx.to ?? null,
                value: (tx.value ?? 0n).toString(),
                gas: (tx.gas ?? 0n).toString(),
                gasPrice: tx.gasPrice?.toString(),
                nonce: tx.nonce ?? 0,
                data: (tx.data ?? '0x') as `0x${string}`,
                type: (tx.type ?? 'legacy') as 'legacy' | 'eip2930' | 'eip1559' | string,
                chainId: tx.chainId ?? 0,
                isContractCreation: !tx.to,
                isContractInteraction: !!tx.data && tx.data !== '0x' && tx.to !== null,
                transactionType,
                contractAddress: tx.to || undefined,
            };

            if (tx.maxFeePerGas) {
                decoded.maxFeePerGas = tx.maxFeePerGas.toString();
            }
            if (tx.maxPriorityFeePerGas) {
                decoded.maxPriorityFeePerGas = tx.maxPriorityFeePerGas.toString();
            }
            if (tx.accessList) {
                decoded.accessList = tx.accessList;
            }

            // Decode function data based on transaction type
            if (transactionType === 'contract_interaction' && tx.data && tx.data !== '0x') {
                try {
                    decoded.decodedData = this.decodeFunctionData(tx.data);
                } catch (error) {
                    console.warn('Could not decode function data:', error);
                }
            } else if (transactionType === 'eth_transfer') {
                // For ETH transfers, provide a simple transfer object
                decoded.decodedData = {
                    method: 'transfer',
                    params: []
                };
            }

            return decoded;
        } catch (error) {
            throw new Error(`Failed to decode transaction: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    }

    /**
     * Determines the type of transaction based on its properties
     */
    static determineTransactionType(tx: any): 'eth_transfer' | 'contract_creation' | 'contract_interaction' | 'unknown' {
        // Contract creation
        if (!tx.to) {
            return 'contract_creation';
        }

        // Check if it's a simple ETH transfer
        if (this.isEthTransfer(tx)) {
            return 'eth_transfer';
        }

        // Contract interaction
        if (tx.data && tx.data !== '0x' && tx.to) {
            return 'contract_interaction';
        }

        return 'unknown';
    }

    /**
     * Determines if a transaction is a simple ETH transfer
     */
    static isEthTransfer(tx: any): boolean {
        // Must have a recipient
        if (!tx.to) {
            return false;
        }

        // Must have some value (even 0 is valid)
        if (tx.value === undefined) {
            return false;
        }

        // Data should be empty or just '0x'
        if (tx.data && tx.data !== '0x') {
            return false;
        }

        // For ETH transfers, we don't need strict address validation
        // The key indicators are: has 'to' address, has value, and no data
        return true;
    }

    static decodeFunctionData(data: string): { method: string; params: unknown[] } {
        if (!data || data === '0x') {
            return { method: 'transfer', params: [] };
        }

        const methodSignature = data.slice(0, 10);

        const commonMethods: { [key: string]: string } = {
            '0xa9059cbb': 'transfer(address,uint256)',
            '0x23b872dd': 'transferFrom(address,address,uint256)',
            '0x095ea7b3': 'approve(address,uint256)',
            '0x70a08231': 'balanceOf(address)',
            '0x18160ddd': 'totalSupply()',
            '0x06fdde03': 'name()',
            '0x95d89b41': 'symbol()',
            '0x313ce567': 'decimals()',
            '0x40c10f19': 'mint(address,uint256)',
            '0x42842e0e': 'safeTransferFrom(address,address,uint256)',
            '0x8da5cb5b': 'owner()',
            '0x715018a6': 'renounceOwnership()',
            '0xf2fde38b': 'transferOwnership(address)',
            '0x3ccfd60b': 'withdraw()',
            '0x1249c58b': 'mint()',
        };

        const method = commonMethods[methodSignature] || `unknown_${methodSignature}`;

        return {
            method,
            params: []
        };
    }

    static decodeWithAbi(data: string, abi: Abi): { method: string; params: unknown[] } | undefined {
        try {
            const decoded = decodeFunctionData({ abi, data: data as `0x${string}` });
            const method = typeof decoded.functionName === 'string' ? decoded.functionName : 'unknown';
            const params = decoded.args as unknown[];
            return { method, params };
        } catch {
            return undefined;
        }
    }

    static getTransactionType(type: string): string {
        switch (type) {
            case 'legacy': return 'Legacy';
            case 'eip2930': return 'EIP-2930 (Access List)';
            case 'eip1559': return 'EIP-1559 (Fee Market)';
            default: return `Unknown (${type})`;
        }
    }

    static formatValue(weiValue: string): string {
        try {
            return formatEther(BigInt(weiValue));
        } catch {
            return weiValue;
        }
    }

    static formatGasPrice(weiValue: string): string {
        try {
            return formatGwei(BigInt(weiValue));
        } catch {
            return weiValue;
        }
    }

    static isValidAddress(address: string): boolean {
        return isAddress(address);
    }

    static getTransactionTypeNumber(type: string): number {
        switch (type) {
            case 'legacy': return 0;
            case 'eip2930': return 1;
            case 'eip1559': return 2;
            default: return 0;
        }
    }

    /**
     * Validates if a raw transaction string is valid
     */
    static isValidRawTransaction(rawTx: string): boolean {
        try {
            if (!rawTx || typeof rawTx !== 'string') {
                return false;
            }

            const txHex = (rawTx.startsWith('0x') ? rawTx : `0x${rawTx}`) as `0x${string}`;

            if (!isHex(txHex)) {
                return false;
            }

            // Try to parse it
            parseTransaction(txHex);
            return true;
        } catch {
            return false;
        }
    }

    /**
     * Gets a human-readable description of the transaction type
     */
    static getTransactionDescription(transactionType: string, value: string): string {
        const ethValue = this.formatValue(value);

        switch (transactionType) {
            case 'eth_transfer':
                return `ETH Transfer: ${ethValue} ETH`;
            case 'contract_creation':
                return `Contract Creation: ${ethValue} ETH`;
            case 'contract_interaction':
                return `Contract Interaction: ${ethValue} ETH`;
            default:
                return `Unknown Transaction: ${ethValue} ETH`;
        }
    }

    /**
     * Determines risk level based on transaction properties
     */
    static getRiskLevel(transactionType: string, value: string, to?: string | null): 'low' | 'medium' | 'high' {
        const ethValue = parseFloat(this.formatValue(value));

        // High value transactions are higher risk
        if (ethValue > 10) {
            return 'high';
        }

        // Contract interactions are medium risk
        if (transactionType === 'contract_interaction') {
            return 'medium';
        }

        // Contract creation is medium risk
        if (transactionType === 'contract_creation') {
            return 'medium';
        }

        // ETH transfers are generally low risk
        return 'low';
    }
}
