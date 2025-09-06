import type { Abi } from 'viem';
export interface AbiFetchResult {
    abi: Abi | null;
    source: 'etherscan' | 'fallback' | 'none';
    error?: string;
}
export declare function fetchContractAbi(chainId: number, address: string, apiKey?: string): Promise<Abi>;
export declare function fetchContractAbiWithFallback(chainId: number, address: string, apiKey?: string): Promise<AbiFetchResult>;
//# sourceMappingURL=abi.d.ts.map