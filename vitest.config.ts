import { defineConfig } from "vitest/config";

export default defineConfig({
	test: {
		globals: true,
		environment: "node",
		fileParallelism: false,
		env: {
			DATABASE_URL: "file:./test.db",
			JWT_SECRET: "test-secret-key-for-vitest",
			NODE_ENV: "test",
			CORS_ORIGIN: "http://localhost:5173",
		},
		globalSetup: ["./src/__tests__/globalSetup.ts"],
		setupFiles: ["./src/__tests__/setup.ts"],
		coverage: {
			provider: "v8",
			reporter: ["text", "html"],
			include: ["src/controller/**", "src/middleware/**"],
		},
	},
});
