// CI build check: confirm the inline JSX in index.html actually compiles.
import fs from "node:fs";
import { transform } from "@babel/core";

const html = fs.readFileSync(new URL("../index.html", import.meta.url), "utf8");
const m = html.match(/data-presets="react">([\s\S]*?)<\/script>\s*<\/body>/);
if (!m) {
  console.error("✗ could not find the inline <script type=text/babel> block in index.html");
  process.exit(1);
}
try {
  transform(m[1], { presets: ["@babel/preset-react"], filename: "app.jsx" });
  console.log(`✓ index.html inline JSX compiles cleanly (${m[1].length} chars)`);
} catch (e) {
  console.error("✗ index.html inline JSX failed to compile:\n" + e.message);
  process.exit(1);
}
