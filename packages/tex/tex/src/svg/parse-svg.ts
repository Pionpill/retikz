import type { LoweredMath, PathCommand } from '@retikz/core';
import { IDENTITY, type Matrix, multiply, parseTransform } from './matrix';
import { type PointMapper, parsePathD, transformCommands } from './path-d';

/** 从标签属性串里取某属性值（双 / 单引号；MathJax 属性值不含引号字符） */
const attr = (attrs: string, name: string): string | undefined => {
  const m = new RegExp(`${name}\\s*=\\s*['"]([^'"]*)['"]`).exec(attrs);
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

/**
 * 解析 MathJax SVG（`fontCache:'none'` 内联字形）为 renderer-agnostic 字形 `LoweredMath`
 * @description 读 viewBox（字体单位，1000/em）；累积嵌套 `<g transform>`（含全局 `scale(1,-1)` y 翻转 + 字形
 *   `translate`）到每个 `<path>` / `<rect>`；坐标经矩阵变换后归一到「左上角原点、y-down、user 单位」：
 *   `(p - viewBoxOrigin) × fontSize/1000`（1000 字体单位 = 1em = fontSize）。
 *   width/height = viewBox × scale；depth = `(viewBox.y + viewBox.height) × scale`（基线以下深度，行内对齐用）。
 *   无 viewBox / path 解析失败 → null（caller 降级）。空公式（无 path）→ 合法零尺寸结果。
 */
export const parseMathJaxSvg = (svg: string, fontSize: number): LoweredMath | null => {
  const vbMatch = /viewBox\s*=\s*"([^"]+)"/.exec(svg);
  if (!vbMatch) return null;
  const vb = vbMatch[1].split(/[\s,]+/).map(Number);
  if (vb.length < 4 || vb.some(Number.isNaN)) return null;
  const [vbX, vbY, vbW, vbH] = vb;
  const scale = fontSize / 1000;
  const normalize: PointMapper = (x, y) => [(x - vbX) * scale, (y - vbY) * scale];

  const stack: Array<Matrix> = [IDENTITY];
  const top = (): Matrix => stack[stack.length - 1] ?? IDENTITY;
  const commands: Array<PathCommand> = [];

  const tagRe = /<(\/?)([a-zA-Z][\w-]*)((?:[^>"']|"[^"]*"|'[^']*')*?)(\/?)>/g;
  let hit: RegExpExecArray | null;
  try {
    while ((hit = tagRe.exec(svg)) !== null) {
      const isClose = hit[1] === '/';
      const name = hit[2];
      const attrs = hit[3];
      const selfClose = hit[4] === '/';
      if (isClose) {
        if (stack.length > 1) stack.pop();
        continue;
      }
      if (name === 'path') {
        const d = attr(attrs, 'd');
        if (d) {
          const m = multiply(top(), parseTransform(attr(attrs, 'transform')));
          commands.push(...transformCommands(parsePathD(d), m, normalize));
        }
        if (!selfClose) stack.push(top());
      } else if (name === 'rect') {
        const m = multiply(top(), parseTransform(attr(attrs, 'transform')));
        commands.push(...transformCommands(rectToCommands(attrs), m, normalize));
        if (!selfClose) stack.push(top());
      } else if (!selfClose) {
        // g / svg / mjx-container 等：组合 transform（无 transform → 不变）压栈，供子节点累积
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
