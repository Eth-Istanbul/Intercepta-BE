# Anti-Fraud Backend

AI-powered blockchain transaction fraud detection system that analyzes Ethereum transactions in real-time.

## Features

- **Transaction Analysis**: Decodes raw transactions and RPC payloads
- **Multi-Chain Support**: Ethereum, BSC, Polygon, Arbitrum, Optimism
- **ABI Fetching**: Automatic contract ABI and source code retrieval from block explorers
- **AI-Powered Detection**: GPT-4 based fraud analysis with risk scoring
- **Function Decoding**: Decodes contract function calls with parameters
- **Risk Assessment**: Provides fraud scores (0-100) and risk levels

## API Endpoints

### Transaction Analysis
```bash
POST /tx/ai-analyze
```

**Request:**
```json
{
  "id": "tx_123",
  "method": "eth_sendTransaction",
  "params": [{
    "chainId": "0x38",
    "gas": "0x5208",
    "value": "0xde0b6b3a7640000",
    "from": "0x...",
    "to": "0x...",
    "data": "0x..."
  }]
}
```

**Response:**
```json
{
  "success": true,
  "analysis": {
    "type": "contract_interaction",
    "riskLevel": "medium",
    "fraudScore": 65,
    "description": "Contract interaction with potential risks",
    "reasoning": "Detailed AI analysis...",
    "warnings": ["Unverified contract", "High value transfer"],
    "contractInfo": {
      "address": "0x...",
      "abiAvailable": true,
      "sourceCodeAvailable": true
    },
    "aiConfidence": 85
  }
}
```

## Setup

1. **Install dependencies:**
```bash
npm install
```

2. **Environment variables:**
```bash
OPENAI_API_KEY=your_openai_key
ETHERSCAN_API_KEY=your_etherscan_key
```

3. **Run:**
```bash
npm run dev
```

## Transaction Types

- **ETH Transfer**: Simple ETH transfers (low risk)
- **Contract Interaction**: Smart contract function calls (analyzed by AI)
- **Contract Creation**: New contract deployments (medium risk)

## Tech Stack

- **Node.js + TypeScript**
- **Express.js** - REST API
- **Viem** - Ethereum utilities
- **OpenAI GPT-4** - AI fraud analysis
- **Etherscan APIs** - Contract data fetching

## Architecture

1. **Transaction Input** → JSON payload with transaction data
2. **Chain Detection** → Identifies blockchain and selects appropriate APIs
3. **ABI Fetching** → Retrieves contract ABI and source code
4. **Function Decoding** → Decodes contract calls with parameters
5. **AI Analysis** → GPT-4 analyzes for fraud patterns
6. **Risk Assessment** → Returns detailed fraud analysis

Built for hackathon - production ready fraud detection system.
