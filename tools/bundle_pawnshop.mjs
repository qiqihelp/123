#!/usr/bin/env node
// 生成单文件自包含版 game/deepspace-pawnshop-standalone.html
// 无论在 GitHub Pages、htmlpreview.github.io、raw.githack.com 还是直接双击打开本地 HTML 均可完美运行！

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '..');
const gameDir = path.join(root, 'game');

const htmlRaw = fs.readFileSync(path.join(gameDir, 'index.html'), 'utf8');
const cssRaw = fs.readFileSync(path.join(gameDir, 'css/style.css'), 'utf8');

function stripModuleSyntax(code) {
  return code
    // 移除多行或单行 import 语句
    .replace(/import\s+[\s\S]*?from\s+['"][^'"]+['"];?\s*/g, '')
    // 移除 export 关键字保留声明
    .replace(/\bexport\s+(const|let|var|function|class)\b/g, '$1');
}

const dataJs = stripModuleSyntax(fs.readFileSync(path.join(gameDir, 'js/data.js'), 'utf8'));
const audioArtJs = stripModuleSyntax(fs.readFileSync(path.join(gameDir, 'js/audio_art.js'), 'utf8'));
const engineJs = stripModuleSyntax(fs.readFileSync(path.join(gameDir, 'js/engine.js'), 'utf8'));
const mainJs = stripModuleSyntax(fs.readFileSync(path.join(gameDir, 'js/main.js'), 'utf8'));

const combinedJs = `(function() {\n"use strict";\n\n${dataJs}\n\n${audioArtJs}\n\n${engineJs}\n\n${mainJs}\n\n})();`;

const standaloneHtml = htmlRaw
  .replace(/<link\s+rel="stylesheet"\s+href="\.\/css\/style\.css"\s*\/?>/, `<style>\n${cssRaw}\n</style>`)
  .replace(/<script\s+type="module"\s+src="\.\/js\/main\.js"><\/script>/, `<script>\n${combinedJs}\n</script>`);

const outPath = path.join(gameDir, 'standalone.html');
fs.writeFileSync(outPath, standaloneHtml, 'utf8');
console.log(`✅ Built standalone HTML: ${outPath} (${(standaloneHtml.length / 1024).toFixed(1)} KB)`);
