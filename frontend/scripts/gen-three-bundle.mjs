// Gera src/utils/three-bundle.ts: three.js + OrbitControls num único script CLÁSSICO,
// embutido no app. A maquete não depende mais de CDN nem de import map — funciona
// offline e não pode falhar por rede, que era o que travava a tela.
//
// Rode de novo só ao trocar a versão do three:  node scripts/gen-three-bundle.mjs
import { execFileSync } from "node:child_process";
import { writeFileSync, mkdtempSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

const dir = mkdtempSync(join(tmpdir(), "three-"));
const entry = join(dir, "entry.js");
// Importa NOMINALMENTE só o que a cena usa, para o esbuild poder descartar o resto do
// three. A lista sai do próprio código da cena, então nunca fica defasada.
const used = new Set();
for (const f of ["src/utils/scene3d.ts", "src/utils/furniture3d.ts"]) {
  const src = readFileSync(f, "utf8");
  for (const m of src.matchAll(/THREE\.([A-Za-z_$][\w$]*)/g)) used.add(m[1]);
}
used.delete("OrbitControls"); // vem do addon, não do core
const names = [...used].sort();
writeFileSync(entry, `
import { ${names.join(", ")} } from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
window.THREE = { ${names.join(", ")}, OrbitControls };
`);
console.log("APIs usadas pela cena:", names.length);

const out = join(dir, "bundle.js");
// resolve "three" a partir do node_modules do projeto, não da pasta temporária
execFileSync("npx", ["--yes", "esbuild@0.21.5", entry, "--bundle", "--minify", "--format=iife",
  "--target=es2019", "--resolve-extensions=.js", "--outfile=" + out,
  "--alias:three=" + process.cwd() + "/node_modules/three"], { stdio: "inherit" });

const code = readFileSync(out, "utf8");
const version = JSON.parse(readFileSync("node_modules/three/package.json", "utf8")).version;

writeFileSync("src/utils/three-bundle.ts",
`// GERADO AUTOMATICAMENTE por scripts/gen-three-bundle.mjs — não edite à mão.
// three.js ${version} + OrbitControls, como script clássico embutido.
export const THREE_BUNDLE_JS = ${JSON.stringify(code)};
`);
console.log("three-bundle.ts gerado ·", (code.length / 1024).toFixed(0), "KB · three", version);
