import { defineConfig } from "vitest/config";
import { fileURLToPath, URL } from "node:url";

// Dedicated test config so Vitest does not load the Cloudflare/React build
// plugins. Tests target the pure modules (crypto, vault logic) and run in Node,
// which provides WebCrypto, btoa/atob and Text(En|De)coder out of the box.
export default defineConfig({
	resolve: {
		alias: {
			"@": fileURLToPath(new URL("./src/react-app", import.meta.url)),
		},
	},
	test: {
		environment: "node",
		include: ["src/**/*.test.ts"],
	},
});
