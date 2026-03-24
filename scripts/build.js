/**
 * Build script for Vercel deployment.
 * Copies UV, Epoxy, and BareMux vendor files into public/
 * so Vercel can serve everything as static files.
 */

import { cpSync, mkdirSync, existsSync } from "node:fs";
import { uvPath } from "@titaniumnetwork-dev/ultraviolet";
import { epoxyPath } from "@mercuryworkshop/epoxy-transport";
import { baremuxPath } from "@mercuryworkshop/bare-mux/node";

const distDir = "dist";

// Copy public/ to dist/
console.log("📦 Copying public/ → dist/");
cpSync("public", distDir, { recursive: true });

// Copy UV vendor files (our uv.config.js takes priority since it's already in public/uv/)
console.log("📦 Copying Ultraviolet files → dist/uv/");
const uvDist = `${distDir}/uv`;
mkdirSync(uvDist, { recursive: true });
cpSync(uvPath, uvDist, { recursive: true });
// Re-copy our custom config on top (overrides vendor default)
cpSync("public/uv/uv.config.js", `${uvDist}/uv.config.js`);

// Copy Epoxy transport
console.log("📦 Copying Epoxy transport → dist/epoxy/");
cpSync(epoxyPath, `${distDir}/epoxy`, { recursive: true });

// Copy BareMux
console.log("📦 Copying BareMux → dist/baremux/");
cpSync(baremuxPath, `${distDir}/baremux`, { recursive: true });

console.log("✅ Build complete! Output in dist/");
