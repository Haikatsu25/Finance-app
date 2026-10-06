// Resolutor mínimo para correr los tests con el ejecutor nativo de Node:
// entiende el alias "@/" de tsconfig y los imports relativos sin extensión.
import { existsSync } from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";

const root = path.resolve(import.meta.dirname, "..");
const EXTS = [".ts", ".tsx", "/index.ts"];

function tryResolve(base) {
  if (path.extname(base)) return null;
  for (const ext of EXTS) if (existsSync(base + ext)) return pathToFileURL(base + ext).href;
  return null;
}

export async function resolve(specifier, context, nextResolve) {
  let hit = null;
  if (specifier.startsWith("@/")) hit = tryResolve(path.join(root, specifier.slice(2)));
  else if ((specifier.startsWith("./") || specifier.startsWith("../")) && context.parentURL?.startsWith("file:")) {
    hit = tryResolve(path.resolve(path.dirname(new URL(context.parentURL).pathname.replace(/^\/([A-Za-z]:)/, "$1")), specifier));
  }
  return nextResolve(hit ?? specifier, context);
}
