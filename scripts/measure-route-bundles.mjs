import { readFileSync, statSync } from "node:fs";
import { gzipSync } from "node:zlib";

const stats = JSON.parse(readFileSync(".next/diagnostics/route-bundle-stats.json", "utf8"));
const rows = stats.map(({ route, firstLoadChunkPaths }) => {
  const paths = [...new Set(firstLoadChunkPaths)];
  return {
    route,
    raw: paths.reduce((total, path) => total + statSync(path).size, 0),
    gzip: paths.reduce((total, path) => total + gzipSync(readFileSync(path), { level: 9 }).length, 0),
  };
});
console.log(JSON.stringify(rows, null, 2));
