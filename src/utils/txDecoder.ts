import { parseTransaction, formatEther, formatGwei, isAddress, keccak256, decodeFunctionData } from 'viem';
import type { Abi } from 'viem';
import { DecodedTransaction } from './types';


export class TransactionDecoder {
    static decodeRawTransaction(rawTx: string): DecodedTransaction {
        try {
            const txHex = (rawTx.startsWith('0x') ? rawTx : `0x${rawTx}`) as `0x${string}`;
            const tx = parseTransaction(txHex);

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

            if (decoded.isContractInteraction && tx.data && tx.data !== '0x') {
                try {
                    decoded.decodedData = this.decodeFunctionData(tx.data);
                } catch (error) {
                    console.warn('Could not decode function data:', error);
                }
            }

            return decoded;
        } catch (error) {
            throw new Error(`Failed to decode transaction: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
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
}
