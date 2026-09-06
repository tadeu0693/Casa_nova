// Gera src/utils/three-bundle.ts: three.js + OrbitControls num único script CLÁSSICO,
// embutido no app. A maquete não depende mais de CDN nem de import map — funciona
// offline e não pode falhar por rede, que era o que travava a tela.
//
// Rode de novo só ao trocar a versão do three:  node scripts/gen-three-bundle.mjs
import { execFileSync } from "node:child_process";
import { writeFileSync, mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

const dir = mkdtempSync(join(tmpdir(), "three-"));
const entry = join(dir, "entry.js");
// O namespace importado é imutável, então copiamos para um objeto próprio antes de
// pendurar o OrbitControls nele.
writeFileSync(entry, `
import * as THREE_NS from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
const THREE = Object.assign({}, THREE_NS, { OrbitControls });
window.THREE = THREE;
`);

const out = join(dir, "bundle.js");
// resolve "three" a partir do node_modules do projeto, não da pasta temporária
execFileSync("npx", ["--yes", "esbuild@0.21.5", entry, "--bundle", "--minify", "--format=iife",
  "--target=es2019", "--resolve-extensions=.js", "--outfile=" + out,
  "--alias:three=" + process.cwd() + "/node_modules/three"], { stdio: "inherit" });

const { readFileSync } = await import("node:fs");
const code = readFileSync(out, "utf8");
const version = JSON.parse(readFileSync("node_modules/three/package.json", "utf8")).version;

writeFileSync("src/utils/three-bundle.ts",
`// GERADO AUTOMATICAMENTE por scripts/gen-three-bundle.mjs — não edite à mão.
// three.js ${version} + OrbitControls, como script clássico embutido.
export const THREE_BUNDLE_JS = ${JSON.stringify(code)};
`);
console.log("three-bundle.ts gerado ·", (code.length / 1024).toFixed(0), "KB · three", version);
