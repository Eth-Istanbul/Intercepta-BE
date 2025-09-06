import type { Abi } from 'viem';
import { DecodedTransaction } from './types';
export declare class TransactionDecoder {
    static decodeRawTransaction(rawTx: string): DecodedTransaction;
    /**
     * Determines the type of transaction based on its properties
     */
    static determineTransactionType(tx: any): 'eth_transfer' | 'contract_creation' | 'contract_interaction' | 'unknown';
    /**
     * Determines if a transaction is a simple ETH transfer
     */
    static isEthTransfer(tx: any): boolean;
    static decodeFunctionData(data: string): {
        method: string;
        params: unknown[];
    };
    static decodeWithAbi(data: string, abi: Abi): {
        method: string;
        params: unknown[];
    } | undefined;
    static getTransactionType(type: string): string;
    static formatValue(weiValue: string): string;
    static formatGasPrice(weiValue: string): string;
    static isValidAddress(address: string): boolean;
    static getTransactionTypeNumber(type: string): number;
    /**
     * Validates if a raw transaction string is valid
     */
    static isValidRawTransaction(rawTx: string): boolean;
    /**
     * Gets a human-readable description of the transaction type
     */
    static getTransactionDescription(transactionType: string, value: string): string;
    /**
     * Determines risk level based on transaction properties
     */
    static getRiskLevel(transactionType: string, value: string, to?: string | null): 'low' | 'medium' | 'high';
}
//# sourceMappingURL=txDecoder.d.ts.map