"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const dotenv_1 = __importDefault(require("dotenv"));
const routes_1 = __importDefault(require("./routes"));
// Load environment variables
dotenv_1.default.config();
const app = (0, express_1.default)();
const PORT = process.env.PORT || 3000;
// Middleware
app.use((0, cors_1.default)());
app.use(express_1.default.json());
// Routes
app.use('/', routes_1.default);
// Start server
app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
    console.log(`Ping endpoint: http://localhost:${PORT}/ping`);
    console.log(`Health endpoint: http://localhost:${PORT}/health`);
    console.log(`AI Chat endpoint: http://localhost:${PORT}/ai/chat`);
    console.log(`Transaction decode endpoint: http://localhost:${PORT}/tx/decode`);
    console.log(`Transaction types endpoint: http://localhost:${PORT}/tx/types`);
    console.log(`OpenAI API Key configured: ${process.env.OPENAI_API_KEY ? 'Yes' : 'No'}`);
});
//# sourceMappingURL=index.js.map