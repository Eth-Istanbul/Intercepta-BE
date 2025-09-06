import type { Abi } from 'viem';
import { isAddress } from 'viem';

// Etherscan v2 unified endpoint works for Etherscan family chains with a single key.
const ETHERSCAN_V2_BASE = 'https://api.etherscan.io/v2';

export interface AbiFetchResult {
    abi: Abi | null;
    source: 'etherscan' | 'fallback' | 'none';
    sourceCode?: string;
    error?: string;
}

export async function fetchContractAbi(chainId: number, address: string, apiKey?: string): Promise<Abi> {
    const result = await fetchContractAbiWithFallback(chainId, address, apiKey);
    if (!result.abi) {
        throw new Error(result.error || 'ABI not available');
    }
    return result.abi;
}

export async function fetchContractAbiWithFallback(chainId: number, address: string, apiKey?: string): Promise<AbiFetchResult> {
    // Validate inputs
    if (!address || !isAddress(address)) {
        return {
            abi: null,
            source: 'none',
            error: 'Invalid contract address'
        };
    }

    if (!chainId || chainId <= 0) {
        return {
            abi: null,
            source: 'none',
            error: 'Invalid chain ID'
        };
    }

    const key = apiKey ?? process.env.ETHERSCAN_API_KEY;
    if (!key) {
        return {
            abi: null,
            source: 'none',
            error: 'No Etherscan API key provided'
        };
    }

    try {
        const url = `${ETHERSCAN_V2_BASE}/api?chainid=${chainId}&module=contract&action=getabi&address=${address}&apikey=${key}`;

        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 second timeout

        const res = await fetch(url, {
            signal: controller.signal,
            headers: {
                'User-Agent': 'Anti-Fraud-BE/1.0.0'
            }
        });

        clearTimeout(timeoutId);

        if (!res.ok) {
            return {
                abi: null,
                source: 'none',
                error: `HTTP ${res.status}: ${res.statusText}`
            };
        }

        const body = await res.json() as any;

        if (body.status !== '1') {
            return {
                abi: null,
                source: 'none',
                error: body.result || 'ABI not available on Etherscan'
            };
        }

        if (!body.result || body.result === 'Contract source code not verified') {
            return {
                abi: null,
                source: 'none',
                error: 'Contract not verified on Etherscan'
            };
        }

        const abi: Abi = JSON.parse(body.result);

        // Also fetch source code
        const sourceCode = await fetchContractSourceCode(chainId, address, key);
        return {
            abi,
            source: 'etherscan',
            sourceCode
        };

    } catch (error) {
        console.warn('ABI fetch failed:', error);

        return {
            abi: null,
            source: 'none',
            error: error instanceof Error ? error.message : 'Unknown error'
        };
    }
}

/**
 * Fetches contract source code from Etherscan
 */
async function fetchContractSourceCode(chainId: number, address: string, apiKey: string): Promise<string> {
    try {
        const url = `${ETHERSCAN_V2_BASE}/api?chainid=${chainId}&module=contract&action=getsourcecode&address=${address}&apikey=${apiKey}`;

        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 10000);

        const res = await fetch(url, {
            signal: controller.signal,
            headers: {
                'User-Agent': 'Anti-Fraud-BE/1.0.0'
            }
        });

        clearTimeout(timeoutId);

        if (!res.ok) {
            console.warn(`Source code fetch failed: HTTP ${res.status}`);
            return '';
        }

        const body = await res.json() as any;

        if (body.status !== '1') {
            console.warn('Source code not available:', body.result);
            return '';
        }

        if (body.result && body.result[0] && body.result[0].SourceCode) {
            return body.result[0].SourceCode;
        }

        return '';

    } catch (error) {
        console.warn('Source code fetch failed:', error);
        return '';
    }
}


