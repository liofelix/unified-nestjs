/**
 * 项目测试配置。
 * 统一使用 Node 环境运行源码单元测试和 NestJS HTTP E2E 测试，并在每个测试文件前加载装饰器运行时。
 */
import { defineConfig } from "vitest/config";

/** Vitest 的项目级测试配置。 */
export default defineConfig({
  test: {
    environment: "node",
    include: ["src/**/*.spec.ts", "test/**/*.e2e-spec.ts"],
    setupFiles: ["./test/setup.ts"],
    clearMocks: true,
    restoreMocks: true,
    unstubEnvs: true,
    unstubGlobals: true,
    testTimeout: 15_000,
    hookTimeout: 15_000,
  },
});
