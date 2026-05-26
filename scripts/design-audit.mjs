#!/usr/bin/env node
/**
 * Design system drift audit for rpg_frontend.
 * Fails when raw palette classes, invalid utilities, or off-token styling appear in src/.
 *
 * Usage: npm run design:audit
 */

import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");
const SRC = path.join(ROOT, "src");

const SCAN_EXTENSIONS = new Set([".tsx", ".ts", ".jsx", ".js", ".css"]);
const SKIP_DIRS = new Set(["node_modules", ".next", "test"]);

/** Files allowed to declare font-family or theme hex fallbacks */
const FONT_FAMILY_ALLOWLIST = new Set([
  path.normalize("src/app/globals.css"),
]);

/** Only scan styling in these extensions for hex (CSS has its own rules) */
const HEX_SCAN_EXTENSIONS = new Set([".tsx", ".ts", ".jsx", ".js"]);

const RULES = [
  {
    id: "raw-palette",
    label: "Raw Tailwind palette utility",
    extensions: SCAN_EXTENSIONS,
    pattern:
      /\b(?:bg|text|border|ring|from|to|via|divide|outline|decoration|fill|stroke|shadow)-(?:gray|slate|emerald|green|yellow|blue|red|orange|zinc|amber|neutral|stone|lime|teal|cyan|sky|indigo|violet|purple|fuchsia|pink|rose)-(?:\d+|50)\b/g,
    allowLine: () => false,
  },
  {
    id: "invalid-text-md",
    label: "Invalid Tailwind size text-md (use text-base)",
    extensions: new Set([".tsx", ".ts", ".jsx", ".js"]),
    pattern: /\btext-md\b/g,
    allowLine: () => false,
  },
  {
    id: "arbitrary-caption-size",
    label: "Arbitrary text-[Npx] (use text-caption, text-body-sm, or label-caps)",
    extensions: new Set([".tsx", ".ts", ".jsx", ".js"]),
    pattern: /text-\[(?:8|9|10|11)px\]/g,
    allowLine: () => false,
  },
  {
    id: "inline-font-family",
    label: "Inline font-family / fontFamily",
    extensions: new Set([".tsx", ".ts", ".jsx", ".js"]),
    pattern: /font-family|fontFamily/g,
    allowLine: () => false,
    fileAllowlist: FONT_FAMILY_ALLOWLIST,
  },
  {
    id: "hex-in-component",
    label: "Hardcoded hex color in component",
    extensions: HEX_SCAN_EXTENSIONS,
    pattern: /#[0-9a-fA-F]{3,8}\b/g,
    allowLine: (line) =>
      /html2canvas|pdf-capture|jspdf|backgroundColor\s*:/i.test(line) ||
      /\/\/\s*design-audit:ignore/i.test(line),
  },
  {
    id: "google-fonts-import",
    label: "External Google Fonts import (use next/font)",
    extensions: SCAN_EXTENSIONS,
    pattern: /fonts\.googleapis\.com|@import\s+url\([^)]*fonts/i,
    allowLine: () => false,
    fileAllowlist: new Set(),
  },
  {
    id: "raw-bg-white",
    label: "Raw bg-white (use bg-surface-container-lowest)",
    extensions: new Set([".tsx", ".ts", ".jsx", ".js"]),
    pattern: /\bbg-white\b/g,
    allowLine: (line, file) =>
      file.includes("components/ui/ImageUpload") ||
      /pdf-capture|print|html2canvas|<body|design-audit:ignore/i.test(line),
  },
  {
    id: "raw-text-white",
    label: "Raw text-white (use text-on-primary on filled buttons)",
    extensions: new Set([".tsx", ".ts", ".jsx", ".js"]),
    pattern: /\btext-white\b/g,
    allowLine: (line, file) =>
      file.includes("components/ui/ImageUpload") ||
      /border-white|bg-black|design-audit:ignore/i.test(line),
  },
];

async function walk(dir) {
  const entries = await readdir(dir, { withFileTypes: true });
  const files = [];

  for (const entry of entries) {
    if (entry.isDirectory()) {
      if (SKIP_DIRS.has(entry.name)) continue;
      files.push(...(await walk(path.join(dir, entry.name))));
      continue;
    }

    const ext = path.extname(entry.name);
    if (SCAN_EXTENSIONS.has(ext)) {
      files.push(path.join(dir, entry.name));
    }
  }

  return files;
}

function rel(filePath) {
  return path.relative(ROOT, filePath).split(path.sep).join("/");
}

function scanFile(filePath, content, violations) {
  const normalizedRel = rel(filePath);
  const ext = path.extname(filePath);
  const lines = content.split(/\r?\n/);

  for (const rule of RULES) {
    if (!rule.extensions.has(ext)) continue;
    if (rule.fileAllowlist?.has(path.normalize(normalizedRel))) continue;

    lines.forEach((line, index) => {
      if (rule.allowLine(line, normalizedRel)) return;

      const pattern = new RegExp(rule.pattern.source, rule.pattern.flags);
      let match;
      while ((match = pattern.exec(line)) !== null) {
        violations.push({
          rule: rule.id,
          label: rule.label,
          file: normalizedRel,
          line: index + 1,
          column: match.index + 1,
          match: match[0],
          excerpt: line.trim().slice(0, 120),
        });
      }
    });
  }
}

function groupByRule(violations) {
  return violations.reduce((acc, v) => {
    acc[v.rule] = (acc[v.rule] ?? 0) + 1;
    return acc;
  }, {});
}

async function main() {
  const files = await walk(SRC);
  const violations = [];

  for (const filePath of files) {
    const content = await readFile(filePath, "utf8");
    scanFile(filePath, content, violations);
  }

  if (violations.length === 0) {
    console.log(`design:audit passed (${files.length} files scanned)`);
    process.exit(0);
  }

  const grouped = groupByRule(violations);
  console.error(`design:audit failed — ${violations.length} violation(s) in ${files.length} files:\n`);

  for (const [rule, count] of Object.entries(grouped).sort((a, b) => b[1] - a[1])) {
    console.error(`  ${rule}: ${count}`);
  }

  console.error("");
  const preview = violations.slice(0, 50);
  for (const v of preview) {
    console.error(`  ${v.file}:${v.line}:${v.column} [${v.rule}] ${v.match}`);
    console.error(`    ${v.excerpt}`);
  }

  if (violations.length > preview.length) {
    console.error(`\n  … and ${violations.length - preview.length} more`);
  }

  console.error("\nFix: use semantic tokens from src/app/globals.css — see docs/design-tokens.md");
  process.exit(1);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
