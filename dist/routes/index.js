"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const health_1 = __importDefault(require("./health"));
const transaction_1 = __importDefault(require("./transaction"));
const router = (0, express_1.Router)();
// Mount route modules
router.use('/', health_1.default);
router.use('/', transaction_1.default);
exports.default = router;
//# sourceMappingURL=index.js.map