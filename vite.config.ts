// @lovable.dev/vite-tanstack-config already includes the following — do NOT add them manually
// or the app will break with duplicate plugins:
//   - TanStack devtools (dev-only, first), tanstackStart, viteReact, tailwindcss, tsConfigPaths,
//     nitro (build-only using cloudflare as a default target), VITE_* env injection, @ path alias,
//     React/TanStack dedupe, error logger plugins, and sandbox detection (port/host/strictPort).
// You can pass additional config via defineConfig({ vite: { ... }, etc... }) if needed.
import { defineConfig } from "@lovable.dev/vite-tanstack-config";
import { loadEnv, type ConfigEnv } from "vite";
import { fileURLToPath } from "node:url";

const config = defineConfig({
  vite: {
    resolve: {
      // Exact matches keep legacy imports compatible without rewriting modern
      // subpaths (entities/decode) into nonexistent files under entities v4.
      alias: [
        {
          find: /^entities\/lib\/decode\.js$/,
          replacement: fileURLToPath(new URL("./node_modules/entities/lib/esm/decode.js", import.meta.url)),
        },
        {
          find: /^entities\/lib\/encode\.js$/,
          replacement: fileURLToPath(new URL("./node_modules/entities/lib/esm/encode.js", import.meta.url)),
        },
        {
          find: /^entities$/,
          replacement: fileURLToPath(new URL("./node_modules/entities/lib/esm/index.js", import.meta.url)),
        },
      ],
    },
  },
  tanstackStart: {
    // Redirect TanStack Start's bundled server entry to src/server.ts (our SSR error wrapper).
    // nitro/vite builds from this
    server: { entry: "server" },
  },
});

export default (env: ConfigEnv) => {
  // Server secrets remain in process.env; the shared config still defines only VITE_* client values.
  Object.assign(process.env, loadEnv(env.mode, process.cwd(), ""));
  return config(env);
};
