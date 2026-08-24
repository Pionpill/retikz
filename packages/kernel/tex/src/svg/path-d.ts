import type { PathCommand } from '@retikz/core';
import type { AffineMatrix } from '@retikz/math';

import { applyAffine } from '@retikz/math';

import { RetikzTexError, RetikzTexErrorCode } from '../error';

/** 把一个点经矩阵变换 + 归一化函数（viewBox 平移 + 缩放）映射成最终用户坐标 */
export type PointMapper = (x: number, y: number) => [number, number];

/** MathJax SVG 字形解析实际支持的 Core 路径命令 */
export type SvgPathCommand = Extract<PathCommand, { kind: 'move' | 'line' | 'quad' | 'cubic' | 'close' }>;

const throwMalformedPathError = (message: string): never => {
  throw new RetikzTexError(RetikzTexErrorCode.SvgMalformed, message);
};

const throwUnsupportedPathError = (message: string): never => {
  throw new RetikzTexError(RetikzTexErrorCode.SvgUnsupported, message);
};

const tokenizePathData = (source: string): Array<string> => {
  const tokens: Array<string> = [];
  const tokenPattern = /[a-zA-Z]|[-+]?(?:\d+\.?\d*|\.\d+)(?:[eE][-+]?\d+)?/g;
  let cursor = 0;
  let match: RegExpExecArray | null;
  while ((match = tokenPattern.exec(source)) !== null) {
    const separator = source.slice(cursor, match.index);
    if (!/^[\s,]*$/.test(separator)) throwMalformedPathError(`Malformed path d near: ${separator.trim()}`);
    tokens.push(match[0]);
    cursor = tokenPattern.lastIndex;
  }
  const trailing = source.slice(cursor);
  if (!/^\s*$/.test(trailing)) throwMalformedPathError(`Malformed path d near: ${trailing.trim()}`);
  return tokens;
};

/**
 * 解析 SVG path `d` 字符串为绝对坐标 `PathCommand[]`
 * @description 支持 M/m L/l H/h V/v C/c S/s Q/q T/t Z/z（字体字形常用集）；S/T 按 SVG 规范做控制点反射。
 *   不支持椭圆弧 A/a（字体字形不产生）——遇到则抛错（caller 据此降级）。坐标先在本地系产出，再由 caller 经
 *   `transformSvgPathCommands` 应用矩阵 + viewBox 归一
 */
export const parsePathD = (d: string): Array<SvgPathCommand> => {
  const tokens = tokenizePathData(d);
  const commands: Array<SvgPathCommand> = [];
  let tokenIndex = 0;
  let currentCommand = '';
  let currentX = 0;
  let currentY = 0;
  let startX = 0;
  let startY = 0;
  let lastControlX = 0;
  let lastControlY = 0;
  let lastCommand = '';
  const readNumber = (): number => {
    const token = tokens[tokenIndex++];
    const numberValue = Number(token);
    if (!Number.isFinite(numberValue)) throwMalformedPathError(`Invalid number in path d: ${String(token)}`);
    return numberValue;
  };
  while (tokenIndex < tokens.length) {
    const token = tokens[tokenIndex];
    if (/[a-zA-Z]/.test(token)) {
      currentCommand = token;
      tokenIndex++;
    } else if (currentCommand === '') {
      throwMalformedPathError('Path d starts with a number');
    } else if (currentCommand === 'M' || currentCommand === 'm') {
      // 隐式后续坐标对在 M 后视作 L
      currentCommand = currentCommand === 'M' ? 'M' : 'm';
    }
    const activeCommand = currentCommand;
    const isRelative = activeCommand === activeCommand.toLowerCase();
    switch (activeCommand.toUpperCase()) {
      case 'M': {
        let x = readNumber();
        let y = readNumber();
        if (isRelative) {
          x += currentX;
          y += currentY;
        }
        currentX = x;
        currentY = y;
        startX = x;
        startY = y;
        commands.push({ kind: 'move', to: [x, y] });
        currentCommand = isRelative ? 'l' : 'L'; // 后续坐标对作为 line
        break;
      }
      case 'L': {
        let x = readNumber();
        let y = readNumber();
        if (isRelative) {
          x += currentX;
          y += currentY;
        }
        currentX = x;
        currentY = y;
        commands.push({ kind: 'line', to: [x, y] });
        break;
      }
      case 'H': {
        let x = readNumber();
        if (isRelative) x += currentX;
        currentX = x;
        commands.push({ kind: 'line', to: [x, currentY] });
        break;
      }
      case 'V': {
        let y = readNumber();
        if (isRelative) y += currentY;
        currentY = y;
        commands.push({ kind: 'line', to: [currentX, y] });
        break;
      }
      case 'C': {
        let x1 = readNumber();
        let y1 = readNumber();
        let x2 = readNumber();
        let y2 = readNumber();
        let x = readNumber();
        let y = readNumber();
        if (isRelative) {
          x1 += currentX;
          y1 += currentY;
          x2 += currentX;
          y2 += currentY;
          x += currentX;
          y += currentY;
        }
        commands.push({ kind: 'cubic', control1: [x1, y1], control2: [x2, y2], to: [x, y] });
        lastControlX = x2;
        lastControlY = y2;
        currentX = x;
        currentY = y;
        break;
      }
      case 'S': {
        const shouldReflectControl = lastCommand.toUpperCase() === 'C' || lastCommand.toUpperCase() === 'S';
        const x1 = shouldReflectControl ? 2 * currentX - lastControlX : currentX;
        const y1 = shouldReflectControl ? 2 * currentY - lastControlY : currentY;
        let x2 = readNumber();
        let y2 = readNumber();
        let x = readNumber();
        let y = readNumber();
        if (isRelative) {
          x2 += currentX;
          y2 += currentY;
          x += currentX;
          y += currentY;
        }
        commands.push({ kind: 'cubic', control1: [x1, y1], control2: [x2, y2], to: [x, y] });
        lastControlX = x2;
        lastControlY = y2;
        currentX = x;
        currentY = y;
        break;
      }
      case 'Q': {
        let x1 = readNumber();
        let y1 = readNumber();
        let x = readNumber();
        let y = readNumber();
        if (isRelative) {
          x1 += currentX;
          y1 += currentY;
          x += currentX;
          y += currentY;
        }
        commands.push({ kind: 'quad', control: [x1, y1], to: [x, y] });
        lastControlX = x1;
        lastControlY = y1;
        currentX = x;
        currentY = y;
        break;
      }
      case 'T': {
        const shouldReflectControl = lastCommand.toUpperCase() === 'Q' || lastCommand.toUpperCase() === 'T';
        const x1 = shouldReflectControl ? 2 * currentX - lastControlX : currentX;
        const y1 = shouldReflectControl ? 2 * currentY - lastControlY : currentY;
        let x = readNumber();
        let y = readNumber();
        if (isRelative) {
          x += currentX;
          y += currentY;
        }
        commands.push({ kind: 'quad', control: [x1, y1], to: [x, y] });
        lastControlX = x1;
        lastControlY = y1;
        currentX = x;
        currentY = y;
        break;
      }
      case 'Z': {
        commands.push({ kind: 'close' });
        currentX = startX;
        currentY = startY;
        currentCommand = '';
        break;
      }
      default:
        throwUnsupportedPathError(`Unsupported path command: ${activeCommand}`);
    }
    lastCommand = activeCommand;
  }
  return commands;
};

/** 把命令里所有坐标点经 mapper 映射（矩阵变换 + viewBox 归一），返回新命令数组 */
export const transformSvgPathCommands = (
  commands: ReadonlyArray<SvgPathCommand>,
  matrix: AffineMatrix,
  pointMapper: PointMapper,
): Array<SvgPathCommand> => {
  const mapPoint = (x: number, y: number): [number, number] => {
    const [worldX, worldY] = applyAffine(matrix, [x, y]);
    return pointMapper(worldX, worldY);
  };
  return commands.map(command => {
    switch (command.kind) {
      case 'move':
        return { kind: 'move', to: mapPoint(command.to[0], command.to[1]) };
      case 'line':
        return { kind: 'line', to: mapPoint(command.to[0], command.to[1]) };
      case 'quad':
        return {
          kind: 'quad',
          control: mapPoint(command.control[0], command.control[1]),
          to: mapPoint(command.to[0], command.to[1]),
        };
      case 'cubic':
        return {
          kind: 'cubic',
          control1: mapPoint(command.control1[0], command.control1[1]),
          control2: mapPoint(command.control2[0], command.control2[1]),
          to: mapPoint(command.to[0], command.to[1]),
        };
      case 'close':
        return { kind: 'close' };
    }
  });
};
