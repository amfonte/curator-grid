/**
 * Silences the "[baseline-browser-mapping] The data in this module is over two months old" warning.
 * The warning is emitted by Next.js's bundled browserslist and by baseline-browser-mapping;
 * env vars don't reach the bundled code, so we patch the files after install.
 */
const fs = require("fs");
const path = require("path");

const root = path.resolve(__dirname, "..");
const warnStart =
  'console.warn("[baseline-browser-mapping] The data in this module is over two months old';

const files = [
  "node_modules/next/dist/compiled/browserslist/index.js",
  "node_modules/baseline-browser-mapping/dist/index.js",
  "node_modules/baseline-browser-mapping/dist/index.cjs",
];

const replace = (content) => {
  if (!content.includes(warnStart)) return null;
  return content.replace(
    'console.warn("[baseline-browser-mapping] The data in this module is over two months old',
    '(function(){})( "[baseline-browser-mapping] The data in this module is over two months old'
  );
};

let patched = 0;
for (const file of files) {
  const fullPath = path.join(root, file);
  if (!fs.existsSync(fullPath)) continue;
  let content = fs.readFileSync(fullPath, "utf8");
  const next = replace(content);
  if (next !== null) {
    fs.writeFileSync(fullPath, next);
    patched++;
  }
}
if (patched > 0) {
  console.log("[patch-baseline-warning] Silenced baseline-browser-mapping warning in", patched, "file(s).");
}
