import type { PathCommand } from '@retikz/core';
import type { AffineMatrix } from '@retikz/math';

import { applyAffine } from '@retikz/math';

/** 把一个点经矩阵变换 + 归一化函数（viewBox 平移 + 缩放）映射成最终用户坐标 */
export type PointMapper = (x: number, y: number) => [number, number];

/**
 * 解析 SVG path `d` 字符串为绝对坐标 `PathCommand[]`
 * @description 支持 M/m L/l H/h V/v C/c S/s Q/q T/t Z/z（字体字形常用集）；S/T 按 SVG 规范做控制点反射。
 *   不支持椭圆弧 A/a（字体字形不产生）——遇到则抛错（caller 据此降级）。坐标先在本地系产出，再由 caller 经
 *   `transformCommands` 应用矩阵 + viewBox 归一
 */
export const parsePathD = (d: string): Array<PathCommand> => {
  const tokens = d.match(/[a-zA-Z]|-?\d*\.?\d+(?:[eE][-+]?\d+)?/g);
  if (!tokens) return [];
  const out: Array<PathCommand> = [];
  let i = 0;
  let cmd = '';
  let cx = 0;
  let cy = 0;
  let startX = 0;
  let startY = 0;
  let lastCtrlX = 0;
  let lastCtrlY = 0;
  let lastCmd = '';
  const num = (): number => {
    const t = tokens[i++];
    const n = Number(t);
    if (Number.isNaN(n)) throw new Error(`Invalid number in path d: ${t}`);
    return n;
  };
  while (i < tokens.length) {
    const t = tokens[i];
    if (/[a-zA-Z]/.test(t)) {
      cmd = t;
      i++;
    } else if (cmd === '') {
      throw new Error('Path d starts with a number');
    } else if (cmd === 'M' || cmd === 'm') {
      // 隐式后续坐标对在 M 后视作 L
      cmd = cmd === 'M' ? 'M' : 'm';
    }
    const rel = cmd === cmd.toLowerCase();
    switch (cmd.toUpperCase()) {
      case 'M': {
        let x = num();
        let y = num();
        if (rel) {
          x += cx;
          y += cy;
        }
        cx = x;
        cy = y;
        startX = x;
        startY = y;
        out.push({ kind: 'move', to: [x, y] });
        cmd = rel ? 'l' : 'L'; // 后续坐标对作为 line
        break;
      }
      case 'L': {
        let x = num();
        let y = num();
        if (rel) {
          x += cx;
          y += cy;
        }
        cx = x;
        cy = y;
        out.push({ kind: 'line', to: [x, y] });
        break;
      }
      case 'H': {
        let x = num();
        if (rel) x += cx;
        cx = x;
        out.push({ kind: 'line', to: [x, cy] });
        break;
      }
      case 'V': {
        let y = num();
        if (rel) y += cy;
        cy = y;
        out.push({ kind: 'line', to: [cx, y] });
        break;
      }
      case 'C': {
        let x1 = num();
        let y1 = num();
        let x2 = num();
        let y2 = num();
        let x = num();
        let y = num();
        if (rel) {
          x1 += cx;
          y1 += cy;
          x2 += cx;
          y2 += cy;
          x += cx;
          y += cy;
        }
        out.push({ kind: 'cubic', control1: [x1, y1], control2: [x2, y2], to: [x, y] });
        lastCtrlX = x2;
        lastCtrlY = y2;
        cx = x;
        cy = y;
        break;
      }
      case 'S': {
        const reflect = lastCmd.toUpperCase() === 'C' || lastCmd.toUpperCase() === 'S';
        const x1 = reflect ? 2 * cx - lastCtrlX : cx;
        const y1 = reflect ? 2 * cy - lastCtrlY : cy;
        let x2 = num();
        let y2 = num();
        let x = num();
        let y = num();
        if (rel) {
          x2 += cx;
          y2 += cy;
          x += cx;
          y += cy;
        }
        out.push({ kind: 'cubic', control1: [x1, y1], control2: [x2, y2], to: [x, y] });
        lastCtrlX = x2;
        lastCtrlY = y2;
        cx = x;
        cy = y;
        break;
      }
      case 'Q': {
        let x1 = num();
        let y1 = num();
        let x = num();
        let y = num();
        if (rel) {
          x1 += cx;
          y1 += cy;
          x += cx;
          y += cy;
        }
        out.push({ kind: 'quad', control: [x1, y1], to: [x, y] });
        lastCtrlX = x1;
        lastCtrlY = y1;
        cx = x;
        cy = y;
        break;
      }
      case 'T': {
        const reflect = lastCmd.toUpperCase() === 'Q' || lastCmd.toUpperCase() === 'T';
        const x1 = reflect ? 2 * cx - lastCtrlX : cx;
        const y1 = reflect ? 2 * cy - lastCtrlY : cy;
        let x = num();
        let y = num();
        if (rel) {
          x += cx;
          y += cy;
        }
        out.push({ kind: 'quad', control: [x1, y1], to: [x, y] });
        lastCtrlX = x1;
        lastCtrlY = y1;
        cx = x;
        cy = y;
        break;
      }
      case 'Z': {
        out.push({ kind: 'close' });
        cx = startX;
        cy = startY;
        break;
      }
      default:
        throw new Error(`Unsupported path command: ${cmd}`);
    }
    lastCmd = cmd;
  }
  return out;
};

/** 把命令里所有坐标点经 mapper 映射（矩阵变换 + viewBox 归一），返回新命令数组 */
export const transformCommands = (
  commands: ReadonlyArray<PathCommand>,
  matrix: AffineMatrix,
  normalize: PointMapper,
): Array<PathCommand> => {
  const map = (x: number, y: number): [number, number] => {
    const [wx, wy] = applyAffine(matrix, [x, y]);
    return normalize(wx, wy);
  };
  return commands.map(c => {
    switch (c.kind) {
      case 'move':
        return { kind: 'move', to: map(c.to[0], c.to[1]) };
      case 'line':
        return { kind: 'line', to: map(c.to[0], c.to[1]) };
      case 'quad':
        return { kind: 'quad', control: map(c.control[0], c.control[1]), to: map(c.to[0], c.to[1]) };
      case 'cubic':
        return {
          kind: 'cubic',
          control1: map(c.control1[0], c.control1[1]),
          control2: map(c.control2[0], c.control2[1]),
          to: map(c.to[0], c.to[1]),
        };
      default:
        return { kind: 'close' };
    }
  });
};
