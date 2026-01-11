import fs from "node:fs";
import path from "node:path";

const projectRoot = process.cwd();

const ICON_DIR = path.join(projectRoot, "src/assets/icons");
const IMPORT_PREFIX = "@/assets/icons";

const ICONS_DIR = path.join(projectRoot, "src/components/icons");
const ICONS_INDEX = path.join(ICONS_DIR, "index.ts");

function banner() {
  return `/**
 * 해당 파일은 자동으로 생성됩니다. 수동으로 수정하지 마세요.
 * /assets/icons에서 SVG 파일을 추가/삭제한 후 'pnpm generate:icons'를 실행하세요.
 */
`;
}

function toKebab(file) {
  return file.replace(/\.svg$/i, "");
}

function toPascal(kebab) {
  return kebab
    .split("-")
    .map((s) => s.charAt(0).toUpperCase() + s.slice(1))
    .join("");
}

function readSvgFiles(dir) {
  return fs
    .readdirSync(dir)
    .filter((f) => f.endsWith(".svg"))
    .sort((a, b) => a.localeCompare(b));
}

function ensureDir(dir) {
  fs.mkdirSync(dir, { recursive: true });
}

function main() {
  ensureDir(ICONS_DIR);

  const files = readSvgFiles(ICON_DIR);
  const iconImports = files
    .map((f) => {
      const pascal = toPascal(toKebab(f));
      return `import ${pascal}Icon from "${IMPORT_PREFIX}/${f}?react";`;
    })
    .join("\n");

  const iconExports = files
    .map((f) => `  ${toPascal(toKebab(f))}Icon,`)
    .join("\n");

  fs.writeFileSync(
    ICONS_INDEX,
    `${banner()}
${iconImports}

export {
${iconExports}
};
`,
    "utf8"
  );
}

main();
