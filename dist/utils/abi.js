"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.fetchContractAbi = fetchContractAbi;
exports.fetchContractAbiWithFallback = fetchContractAbiWithFallback;
const viem_1 = require("viem");
// Etherscan v2 unified endpoint works for Etherscan family chains with a single key.
const ETHERSCAN_V2_BASE = 'https://api.etherscan.io/v2';
async function fetchContractAbi(chainId, address, apiKey) {
    const result = await fetchContractAbiWithFallback(chainId, address, apiKey);
    if (!result.abi) {
        throw new Error(result.error || 'ABI not available');
    }
    return result.abi;
}
async function fetchContractAbiWithFallback(chainId, address, apiKey) {
    // Validate inputs
    if (!address || !(0, viem_1.isAddress)(address)) {
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
        const body = await res.json();
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
        const abi = JSON.parse(body.result);
        return {
            abi,
            source: 'etherscan',
        };
    }
    catch (error) {
        console.warn('ABI fetch failed:', error);
        // Try fallback for common contracts
        const fallbackAbi = getFallbackAbi(address);
        if (fallbackAbi) {
            return {
                abi: fallbackAbi,
                source: 'fallback'
            };
        }
        return {
            abi: null,
            source: 'none',
            error: error instanceof Error ? error.message : 'Unknown error'
        };
    }
}
/**
 * Provides fallback ABI for well-known contracts
 */
function getFallbackAbi(address) {
    const lowerAddress = address.toLowerCase();
    // ERC-20 Token standard ABI (minimal)
    const erc20Abi = [
        {
            "inputs": [{ "name": "_owner", "type": "address" }],
            "name": "balanceOf",
            "outputs": [{ "name": "balance", "type": "uint256" }],
            "stateMutability": "view",
            "type": "function"
        },
        {
            "inputs": [
                { "name": "_to", "type": "address" },
                { "name": "_value", "type": "uint256" }
            ],
            "name": "transfer",
            "outputs": [{ "name": "", "type": "bool" }],
            "stateMutability": "nonpayable",
            "type": "function"
        },
        {
            "inputs": [
                { "name": "_from", "type": "address" },
                { "name": "_to", "type": "address" },
                { "name": "_value", "type": "uint256" }
            ],
            "name": "transferFrom",
            "outputs": [{ "name": "", "type": "bool" }],
            "stateMutability": "nonpayable",
            "type": "function"
        },
        {
            "inputs": [
                { "name": "_spender", "type": "address" },
                { "name": "_value", "type": "uint256" }
            ],
            "name": "approve",
            "outputs": [{ "name": "", "type": "bool" }],
            "stateMutability": "nonpayable",
            "type": "function"
        }
    ];
    // For now, we'll assume any contract could be ERC-20
    // In a real implementation, you might want to check against known contract addresses
    return erc20Abi;
}
//# sourceMappingURL=abi.js.map