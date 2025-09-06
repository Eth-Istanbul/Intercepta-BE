import type { Abi } from 'viem';

// Etherscan v2 unified endpoint works for Etherscan family chains with a single key.
const ETHERSCAN_V2_BASE = 'https://api.etherscan.io/v2';

export async function fetchContractAbi(chainId: number, address: string, apiKey?: string): Promise<Abi> {
    const key = apiKey ?? process.env.ETHERSCAN_API_KEY ?? '';
    const url = `${ETHERSCAN_V2_BASE}/api?chainid=${chainId}&module=contract&action=getabi&address=${address}&apikey=${key}`;
    const res = await (globalThis as any).fetch(url);
    if (!res?.ok) {
        throw new Error(`ABI fetch failed with status ${res?.status}`);
    }
    const body = await res.json();
    if (body.status !== '1') {
        throw new Error(body.result || 'ABI not available');
    }
    const abi: Abi = JSON.parse(body.result);
    return abi;
}


