"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const poolBuild_1 = require("../lib/poolBuild");
(async () => {
    await poolBuild_1.poolBuild();
    process.exit(0);
})();
