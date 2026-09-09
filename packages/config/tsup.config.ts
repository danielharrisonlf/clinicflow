import { defineConfig } from "tsup";
import fs from "node:fs/promises";
import path from "node:path";

export default defineConfig({
  dts: true,
  clean: true,
  format: ["cjs", "esm"],
  treeshake: "recommended",
  entry: ["base/*.{ts,js}"],
  onSuccess: async () => {
    const baseDir = path.resolve(__dirname, "base");
    const distDir = path.resolve(__dirname, "dist");
    await fs.mkdir(distDir, { recursive: true });
    const files = await fs.readdir(baseDir);
    for (const file of files) {
      if (file.endsWith(".json")) {
        await fs.copyFile(path.join(baseDir, file), path.join(distDir, file));
      }
    }
  },
});
