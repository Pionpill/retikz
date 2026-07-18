import type { LoweredTex, PathCommand } from '@retikz/core';

import type { Matrix } from './matrix';
import type { PointMapper } from './path-d';

import { IDENTITY, multiply, parseTransform } from './matrix';
import { parsePathD, transformCommands } from './path-d';

/**
 * 从标签属性串里取某属性值（双 / 单引号；MathJax 属性值不含引号字符）
 * @description 名字前要求行首或空白边界——否则 `d` 会误命中 `id=`、`href` 会误命中 `xlink:href=`
 */
const attr = (attrs: string, name: string): string | undefined => {
  const m = new RegExp(`(?:^|\\s)${name}\\s*=\\s*['"]([^'"]*)['"]`).exec(attrs);
  return m ? m[1] : undefined;
};

/** `<rect x y width height>` → 矩形子路径（move + 3 line + close），本地坐标 */
const rectToCommands = (attrs: string): Array<PathCommand> => {
  const x = Number(attr(attrs, 'x') ?? 0);
  const y = Number(attr(attrs, 'y') ?? 0);
  const w = Number(attr(attrs, 'width') ?? 0);
  const h = Number(attr(attrs, 'height') ?? 0);
  return [
    { kind: 'move', to: [x, y] },
    { kind: 'line', to: [x + w, y] },
    { kind: 'line', to: [x + w, y + h] },
    { kind: 'line', to: [x, y + h] },
    { kind: 'close' },
  ];
};

/** 预扫描所有带 id 的 `<path id d>`（`<defs>` 模板字形），供 `<use>` 解引用 */
const collectDefsPaths = (svg: string): Map<string, string> => {
  const map = new Map<string, string>();
  const re = /<path\b([^>]*?)\/?>/g;
  let hit: RegExpExecArray | null;
  while ((hit = re.exec(svg)) !== null) {
    const id = attr(hit[1], 'id');
    const d = attr(hit[1], 'd');
    if (id !== undefined && d !== undefined) map.set(id, d);
  }
  return map;
};

/**
 * 解析 MathJax SVG 为 renderer-agnostic 字形 `LoweredTex`（支持内联字形与 `<defs>`/`<use>` 两种 fontCache）
 * @description 读 viewBox（字体单位，1000/em）；累积嵌套 `<g transform>`（含全局 `scale(1,-1)` y 翻转 + 字形
 *   `translate`）到每个 `<path>` / `<rect>` / `<use>`；坐标经矩阵变换后归一到「左上角原点、y-down、user 单位」：
 *   `(p - viewBoxOrigin) × fontSize/1000`。`fontCache:'none'`：字形 `<path>` 内联（直接 emit）；`'local'`/`'global'`：
 *   字形在 `<defs><path id>`、由 `<use xlink:href="#id">` 引用——`<defs>` 内 path 不直接 emit，经 `<use>` 解引用 emit。
 *   width/height = viewBox × scale；depth = `(viewBox.y + viewBox.height) × scale`。无 viewBox / 解析失败 → null
 */
export const parseMathJaxSvg = (svg: string, fontSize: number): LoweredTex | null => {
  const vbMatch = /viewBox\s*=\s*"([^"]+)"/.exec(svg);
  if (!vbMatch) return null;
  const vb = vbMatch[1].split(/[\s,]+/).map(Number);
  if (vb.length < 4 || vb.some(Number.isNaN)) return null;
  const [vbX, vbY, vbW, vbH] = vb;
  const scale = fontSize / 1000;
  const normalize: PointMapper = (x, y) => [(x - vbX) * scale, (y - vbY) * scale];

  const defsPaths = collectDefsPaths(svg);
  const stack: Array<Matrix> = [IDENTITY];
  const top = (): Matrix => stack[stack.length - 1] ?? IDENTITY;
  const commands: Array<PathCommand> = [];
  let defsDepth = 0;

  const tagRe = /<(\/?)([a-zA-Z][\w-]*)((?:[^>"']|"[^"]*"|'[^']*')*?)(\/?)>/g;
  let hit: RegExpExecArray | null;
  try {
    while ((hit = tagRe.exec(svg)) !== null) {
      const isClose = hit[1] === '/';
      const name = hit[2];
      const attrs = hit[3];
      const selfClose = hit[4] === '/';
      if (isClose) {
        if (name === 'defs' && defsDepth > 0) defsDepth--;
        if (stack.length > 1) stack.pop();
        continue;
      }
      if (name === 'path') {
        // `<defs>` 内的 id 模板不直接 emit（经 `<use>` 解引用）；内联字形（非 defs）直接 emit
        const d = attr(attrs, 'd');
        if (d !== undefined && defsDepth === 0) {
          const m = multiply(top(), parseTransform(attr(attrs, 'transform')));
          commands.push(...transformCommands(parsePathD(d), m, normalize));
        }
        if (!selfClose) stack.push(top());
      } else if (name === 'use') {
        const href = attr(attrs, 'xlink:href') ?? attr(attrs, 'href');
        const d = href !== undefined ? defsPaths.get(href.replace(/^#/, '')) : undefined;
        if (d !== undefined) {
          let m = multiply(top(), parseTransform(attr(attrs, 'transform')));
          const ux = Number(attr(attrs, 'x') ?? 0);
          const uy = Number(attr(attrs, 'y') ?? 0);
          if (ux !== 0 || uy !== 0) m = multiply(m, [1, 0, 0, 1, ux, uy]);
          commands.push(...transformCommands(parsePathD(d), m, normalize));
        }
        if (!selfClose) stack.push(top());
      } else if (name === 'rect') {
        const m = multiply(top(), parseTransform(attr(attrs, 'transform')));
        commands.push(...transformCommands(rectToCommands(attrs), m, normalize));
        if (!selfClose) stack.push(top());
      } else if (!selfClose) {
        if (name === 'defs') defsDepth++;
        // g / svg / mjx-container / defs：组合 transform（无则不变）压栈，供子节点累积
        stack.push(multiply(top(), parseTransform(attr(attrs, 'transform'))));
      }
    }
  } catch {
    return null;
  }

  return {
    commands,
    width: vbW * scale,
    height: vbH * scale,
    depth: (vbY + vbH) * scale,
  };
};
