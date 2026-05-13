import { defineConfig } from "tsup";

export default defineConfig({
  entry: ["src/index.ts"],
  format: ["esm"],
  clean: true,
  bundle: true,
  banner: {
    js: "#!/usr/bin/env node",
  },
  external: [],
  noExternal: ["peptoma-sdk", "@modelcontextprotocol/sdk"],
});
