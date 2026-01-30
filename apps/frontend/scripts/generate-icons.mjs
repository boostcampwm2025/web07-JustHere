import fs from "node:fs";
import path from "node:path";
import { optimize } from "svgo";

const projectRoot = process.cwd();

const ICON_DIR = path.join(projectRoot, "src/shared/assets/icons");
const IMPORT_PREFIX = "@/shared/assets/icons";

const ICONS_INDEX = path.join(ICON_DIR, "index.ts");

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

function optimizeSvg(filePath) {
  const svgContent = fs.readFileSync(filePath, "utf8");
  const result = optimize(svgContent, {
    path: filePath,
    plugins: [
      "preset-default",
      {
        name: "removeViewBox",
        active: false, // React에서 사용할 때 필요한 속성 보존
      },
      "removeDimensions", // width, height 제거 (viewBox만 사용)
    ],
  });

  if (result.data) {
    fs.writeFileSync(filePath, result.data, "utf8");
    return true;
  }
  return false;
}

function main() {
  ensureDir(ICON_DIR);

  const files = readSvgFiles(ICON_DIR);

  console.log("SVG 파일 최적화 중...");
  files.forEach((file) => {
    const filePath = path.join(ICON_DIR, file);
    optimizeSvg(filePath);
  });
  console.log(`총 ${files.length}개 파일 최적화 완료\n`);

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

  console.log(`아이콘 인덱스 파일 생성 완료:\n${ICONS_INDEX}`);
}

main();
