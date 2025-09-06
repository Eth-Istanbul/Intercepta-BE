export interface DecodedTransaction {
    hash: `0x${string}` | ''
    from?: `0x${string}` | null
    to: `0x${string}` | null
    value: string
    gas: string
    gasPrice?: string
    nonce: number
    data: `0x${string}`
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
}
