import { defineConfig } from "tsup";

export default defineConfig({
  entry: ["src/index.ts", "src/agents/index.ts"],
  format: ["esm"],
  dts: true,
  sourcemap: true,
  clean: true,
  splitting: true,
  treeshake: true,
  minify: false,
  target: "es2022",
});
