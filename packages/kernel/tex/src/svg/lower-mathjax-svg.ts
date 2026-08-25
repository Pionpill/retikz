import type { LoweredTex, LoweredTexPaint, LoweredTexPath } from '@retikz/core';
import type { AffineMatrix } from '@retikz/math';

import { assertPositiveNumber } from '@retikz/foundation';
import { AFFINE_IDENTITY, getAffineSimilarityScale, isFiniteNonSingularAffine, multiplyAffine } from '@retikz/math';

import type { TexLoweringResult } from '../lower';
import type { PointMapper, SvgPathCommand } from './path-d';

import { RetikzTexError, RetikzTexErrorCode } from '../error';
import { parseSvgTransform } from './matrix';
import { parsePathD, transformSvgPathCommands } from './path-d';

type SvgNode = {
  name: string;
  attributes: Map<string, string>;
  children: Array<SvgNode>;
};

const HOST_COLOR = Symbol('host-color');
type EffectiveColor = string | typeof HOST_COLOR;

type PaintContext = {
  color: EffectiveColor;
  fill: string;
  stroke: string;
  fillOpacity?: number;
  strokeOpacity?: number;
  strokeWidth?: number;
  fillRule?: 'nonzero' | 'evenodd';
};

type ParsedStyle = Partial<Record<string, string>>;

const throwUnsupportedSvgError = (message: string): never => {
  throw new RetikzTexError(RetikzTexErrorCode.SvgUnsupported, message);
};

const throwMalformedSvgError = (message: string): never => {
  throw new RetikzTexError(RetikzTexErrorCode.SvgMalformed, message);
};

const readSvgAttribute = (node: SvgNode, name: string): string | undefined => node.attributes.get(name);

/** 把 MathJax SVG 字符串解析为供 lowering 使用的轻量节点树 */
const parseXml = (source: string): SvgNode => {
  const root: SvgNode = { name: '#root', attributes: new Map(), children: [] };
  const stack = [root];
  const tagPattern = /<!--[\s\S]*?-->|<\/?([a-zA-Z][\w:-]*)([^<>]*?)\/?>/g;
  let match: RegExpExecArray | null;
  while ((match = tagPattern.exec(source)) !== null) {
    if (match[0].startsWith('<!--')) continue;
    const closing = match[0].startsWith('</');
    const name = match[1];
    if (closing) {
      const current = stack.pop();
      if (!current || current.name !== name) throwMalformedSvgError(`Mismatched closing element: ${name}`);
      continue;
    }
    const attributes = new Map<string, string>();
    const rawAttributes = match[2];
    const attributePattern = /([:\w-]+)\s*=\s*(["'])(.*?)\2/g;
    let attributeMatch: RegExpExecArray | null;
    while ((attributeMatch = attributePattern.exec(rawAttributes)) !== null) {
      attributes.set(attributeMatch[1], attributeMatch[3]);
    }
    const node: SvgNode = { name, attributes, children: [] };
    stack.at(-1)?.children.push(node);
    if (!match[0].endsWith('/>')) stack.push(node);
  }
  if (stack.length !== 1) throwMalformedSvgError(`Unclosed SVG element: ${stack.at(-1)?.name ?? 'unknown'}`);
  return root;
};

/** 从解析后的节点树中查找 SVG 根节点 */
const findRootSvg = (root: SvgNode): SvgNode | undefined => {
  const queue = [...root.children];
  while (queue.length > 0) {
    const node = queue.shift();
    if (!node) continue;
    if (node.name === 'svg') return node;
    queue.push(...node.children);
  }
  return undefined;
};

/** 解析 SVG 数字属性，并在属性缺省时使用默认值 */
const parseFiniteSvgNumber = (value: string | undefined, fallback?: number): number => {
  if (value === undefined && fallback !== undefined) return fallback;
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) throwMalformedSvgError(`Invalid SVG number: ${String(value)}`);
  return parsed;
};

/** 解析限制在 `0..1` 区间内的 SVG 透明度属性 */
const parseSvgUnitInterval = (value: string | undefined): number | undefined => {
  if (value === undefined) return undefined;
  const parsed = parseFiniteSvgNumber(value);
  if (parsed < 0 || parsed > 1) throwMalformedSvgError(`SVG opacity must be within 0..1: ${value}`);
  return parsed;
};

/** 解析 inline style，并保留当前 SVG lowering 支持的样式属性 */
const parseStyle = (value: string | undefined): ParsedStyle => {
  const style: ParsedStyle = {};
  if (!value) return style;
  for (const declaration of value.split(';')) {
    const trimmed = declaration.trim();
    if (!trimmed) continue;
    const separator = trimmed.indexOf(':');
    if (separator < 1) throwMalformedSvgError(`Malformed SVG style declaration: ${trimmed}`);
    const property = trimmed.slice(0, separator).trim();
    const propertyValue = trimmed.slice(separator + 1).trim();
    if (property === 'vertical-align' || property === 'border') continue;
    if (
      property !== 'color' &&
      property !== 'fill' &&
      property !== 'stroke' &&
      property !== 'fill-opacity' &&
      property !== 'stroke-opacity' &&
      property !== 'stroke-width' &&
      property !== 'fill-rule' &&
      property !== 'opacity'
    ) {
      throwUnsupportedSvgError(`Unsupported SVG style property: ${property}`);
    }
    style[property] = propertyValue;
  }
  return style;
};

const readPresentationValue = (node: SvgNode, style: ParsedStyle, name: string): string | undefined =>
  style[name] ?? readSvgAttribute(node, name);

/** 将节点自身的 paint、透明度和填充规则与父级上下文合并 */
const resolvePaintContext = (
  parent: PaintContext,
  node: SvgNode,
): { paint: PaintContext; opacity?: number; hasOpacity: boolean } => {
  if (readSvgAttribute(node, 'clip-path') !== undefined) {
    throwUnsupportedSvgError('SVG clip-path is not supported');
  }
  const style = parseStyle(readSvgAttribute(node, 'style'));
  const colorValue = readPresentationValue(node, style, 'color');
  let color = parent.color;
  if (colorValue !== undefined && colorValue !== 'currentColor') color = colorValue;
  const fill = readPresentationValue(node, style, 'fill') ?? parent.fill;
  const stroke = readPresentationValue(node, style, 'stroke') ?? parent.stroke;
  const fillOpacity = parseSvgUnitInterval(readPresentationValue(node, style, 'fill-opacity')) ?? parent.fillOpacity;
  const strokeOpacity =
    parseSvgUnitInterval(readPresentationValue(node, style, 'stroke-opacity')) ?? parent.strokeOpacity;
  const strokeWidthValue = readPresentationValue(node, style, 'stroke-width');
  const strokeWidth = strokeWidthValue === undefined ? parent.strokeWidth : parseFiniteSvgNumber(strokeWidthValue);
  if (strokeWidth !== undefined && strokeWidth < 0)
    throwMalformedSvgError(`SVG stroke-width must be non-negative: ${strokeWidth}`);
  const fillRuleValue = readPresentationValue(node, style, 'fill-rule') ?? parent.fillRule;
  if (fillRuleValue !== undefined && fillRuleValue !== 'nonzero' && fillRuleValue !== 'evenodd') {
    throwUnsupportedSvgError(`Unsupported SVG fill-rule: ${fillRuleValue}`);
  }
  const fillRule = fillRuleValue as PaintContext['fillRule'];
  const opacityValue = readPresentationValue(node, style, 'opacity');
  return {
    paint: { color, fill, stroke, fillOpacity, strokeOpacity, strokeWidth, fillRule },
    opacity: parseSvgUnitInterval(opacityValue),
    hasOpacity: opacityValue !== undefined,
  };
};

/** 把 SVG paint 值转换为 Core 可消费的填充或描边对象 */
const materializePaint = (value: string, color: EffectiveColor): LoweredTexPaint => {
  if (value === 'none') return { kind: 'none' };
  if (value !== 'currentColor') return { kind: 'color', value };
  return color === HOST_COLOR ? { kind: 'currentColor' } : { kind: 'color', value: color };
};

/** 统计节点树中的可绘制节点，用于判断容器透明度是否可安全表达 */
const countDrawableNodes = (node: SvgNode, insideDefs = false): number => {
  const defs = insideDefs || node.name === 'defs';
  if (defs) return 0;
  if (
    node.name === 'path' ||
    node.name === 'use' ||
    node.name === 'rect' ||
    node.name === 'line' ||
    node.name === 'polygon'
  ) {
    return 1;
  }
  return node.children.reduce((count, child) => count + countDrawableNodes(child, false), 0);
};

/** 为 `defs` 中带 id 的路径建立索引，供 `<use>` 解析引用 */
const indexPathDefinitions = (
  node: SvgNode,
  insideDefs = false,
  output = new Map<string, SvgNode>(),
): Map<string, SvgNode> => {
  const defs = insideDefs || node.name === 'defs';
  if (defs && node.name === 'path') {
    const id = readSvgAttribute(node, 'id');
    if (id) output.set(id, node);
  }
  for (const child of node.children) indexPathDefinitions(child, defs, output);
  return output;
};

/** 根据 `<use>` 引用解析对应的路径定义 */
const resolveUseTarget = (node: SvgNode, definitions: Map<string, SvgNode>): SvgNode => {
  const href = readSvgAttribute(node, 'href') ?? readSvgAttribute(node, 'xlink:href');
  const definition = href ? definitions.get(href.replace(/^#/, '')) : undefined;
  if (definition === undefined)
    throw new RetikzTexError(RetikzTexErrorCode.SvgMalformed, `Unknown SVG use reference: ${String(href)}`);
  return definition;
};

/** 把 SVG `rect` 元素转换为闭合矩形路径命令 */
const convertRectToPathCommands = (node: SvgNode): Array<SvgPathCommand> => {
  const x = parseFiniteSvgNumber(readSvgAttribute(node, 'x'), 0);
  const y = parseFiniteSvgNumber(readSvgAttribute(node, 'y'), 0);
  const width = parseFiniteSvgNumber(readSvgAttribute(node, 'width'), 0);
  const height = parseFiniteSvgNumber(readSvgAttribute(node, 'height'), 0);
  if (width < 0 || height < 0) throwMalformedSvgError('SVG rect dimensions must be non-negative');
  return [
    { kind: 'move', to: [x, y] },
    { kind: 'line', to: [x + width, y] },
    { kind: 'line', to: [x + width, y + height] },
    { kind: 'line', to: [x, y + height] },
    { kind: 'close' },
  ];
};

/** 把 SVG `line` 元素转换为线段路径命令 */
const convertLineToPathCommands = (node: SvgNode): Array<SvgPathCommand> => [
  {
    kind: 'move',
    to: [parseFiniteSvgNumber(readSvgAttribute(node, 'x1'), 0), parseFiniteSvgNumber(readSvgAttribute(node, 'y1'), 0)],
  },
  {
    kind: 'line',
    to: [parseFiniteSvgNumber(readSvgAttribute(node, 'x2'), 0), parseFiniteSvgNumber(readSvgAttribute(node, 'y2'), 0)],
  },
];

/** 把 SVG `polygon` 元素转换为闭合折线路径命令 */
const convertPolygonToPathCommands = (node: SvgNode): Array<SvgPathCommand> => {
  const numbers = (readSvgAttribute(node, 'points') ?? '')
    .trim()
    .split(/[\s,]+/)
    .filter(Boolean)
    .map(Number);
  if (numbers.length < 4 || numbers.length % 2 !== 0 || numbers.some(value => !Number.isFinite(value))) {
    throwMalformedSvgError('Invalid SVG polygon points');
  }
  const commands: Array<SvgPathCommand> = [{ kind: 'move', to: [numbers[0], numbers[1]] }];
  for (let index = 2; index < numbers.length; index += 2) {
    commands.push({ kind: 'line', to: [numbers[index], numbers[index + 1]] });
  }
  commands.push({ kind: 'close' });
  return commands;
};

/** 合并父级与当前节点的透明度，保持缺省值语义 */
const multiplyOpacity = (parent: number | undefined, own: number | undefined): number | undefined => {
  if (own === undefined) return parent;
  return parent === undefined ? own : parent * own;
};

type SvgLoweringContext = {
  paint: PaintContext;
  opacity?: number;
  pointMapper: PointMapper;
  fontScale: number;
  definitions: Map<string, SvgNode>;
  rootSvg: SvgNode;
  paths: Array<LoweredTexPath>;
};

/** 将单个可绘制 SVG 节点降解为一条带几何与 paint 的 Core 路径 */
const lowerSvgDrawable = (
  node: SvgNode,
  context: SvgLoweringContext,
  matrix: AffineMatrix,
  paint: PaintContext,
  opacity: number | undefined,
): void => {
  let commands: Array<SvgPathCommand> = [];
  let effectiveNode = node;
  let effectiveOpacity = opacity;
  matrix = multiplyAffine(matrix, parseSvgTransform(readSvgAttribute(node, 'transform')));
  if (node.name === 'use') {
    effectiveNode = resolveUseTarget(node, context.definitions);
    const x = parseFiniteSvgNumber(readSvgAttribute(node, 'x'), 0);
    const y = parseFiniteSvgNumber(readSvgAttribute(node, 'y'), 0);
    matrix = multiplyAffine(matrix, [1, 0, 0, 1, x, y]);
    matrix = multiplyAffine(matrix, parseSvgTransform(readSvgAttribute(effectiveNode, 'transform')));
  }
  if (!isFiniteNonSingularAffine(matrix))
    throwUnsupportedSvgError('SVG drawable transform must be finite and non-singular');
  if (effectiveNode.name === 'path') {
    const pathData = readSvgAttribute(effectiveNode, 'd');
    if (pathData === undefined) throw new RetikzTexError(RetikzTexErrorCode.SvgMalformed, 'SVG path is missing d');
    commands = parsePathD(pathData);
  } else if (effectiveNode.name === 'rect') {
    commands = convertRectToPathCommands(effectiveNode);
  } else if (effectiveNode.name === 'line') {
    commands = convertLineToPathCommands(effectiveNode);
  } else if (effectiveNode.name === 'polygon') {
    commands = convertPolygonToPathCommands(effectiveNode);
  } else {
    throwUnsupportedSvgError(`Unsupported SVG drawable: ${effectiveNode.name}`);
  }
  let definitionPaint = paint;
  if (effectiveNode !== node) {
    const resolvedPaintContext = resolvePaintContext(paint, effectiveNode);
    definitionPaint = resolvedPaintContext.paint;
    effectiveOpacity = multiplyOpacity(effectiveOpacity, resolvedPaintContext.opacity);
  }
  const fill =
    effectiveNode.name === 'line'
      ? { kind: 'none' as const }
      : materializePaint(definitionPaint.fill, definitionPaint.color);
  let stroke = materializePaint(definitionPaint.stroke, definitionPaint.color);
  if (definitionPaint.strokeWidth === 0) stroke = { kind: 'none' };
  const path: LoweredTexPath = {
    commands: transformSvgPathCommands(commands, matrix, context.pointMapper),
    fill,
    stroke,
  };
  if (fill.kind !== 'none' && definitionPaint.fillOpacity !== undefined) path.fillOpacity = definitionPaint.fillOpacity;
  if (stroke.kind !== 'none') {
    const scale = getAffineSimilarityScale(matrix);
    if (scale === undefined)
      throw new RetikzTexError(RetikzTexErrorCode.SvgUnsupported, 'Visible SVG stroke requires a similarity transform');
    path.strokeWidth = (definitionPaint.strokeWidth ?? 1) * scale * context.fontScale;
    if (definitionPaint.strokeOpacity !== undefined) path.strokeOpacity = definitionPaint.strokeOpacity;
  }
  if (effectiveOpacity !== undefined) path.opacity = effectiveOpacity;
  if (definitionPaint.fillRule !== undefined) path.fillRule = definitionPaint.fillRule;
  context.paths.push(path);
};

/** 遍历受支持的 SVG 容器并向子节点传递矩阵、paint 与透明度上下文 */
const lowerSvgNode = (node: SvgNode, context: SvgLoweringContext, matrix: AffineMatrix = AFFINE_IDENTITY): void => {
  if (node.name === 'defs') return;
  if (node.name === 'svg' && node !== context.rootSvg) throwUnsupportedSvgError('Nested SVG viewport is not supported');
  if (node.name === 'text' || node.name === 'foreignObject')
    throwUnsupportedSvgError(`Unsupported SVG element: ${node.name}`);
  const supportedContainer = node.name === 'svg' || node.name === 'g' || node.name === 'mjx-container';
  const supportedDrawable =
    node.name === 'path' ||
    node.name === 'use' ||
    node.name === 'rect' ||
    node.name === 'line' ||
    node.name === 'polygon';
  if (!supportedContainer && !supportedDrawable) throwUnsupportedSvgError(`Unsupported SVG element: ${node.name}`);

  const resolvedPaintContext = resolvePaintContext(context.paint, node);
  if (resolvedPaintContext.hasOpacity && countDrawableNodes(node) > 1) {
    throwUnsupportedSvgError('Container opacity with multiple drawables is not supported');
  }
  const opacity = multiplyOpacity(context.opacity, resolvedPaintContext.opacity);
  const currentMatrix = multiplyAffine(matrix, parseSvgTransform(readSvgAttribute(node, 'transform')));
  if (supportedDrawable) {
    lowerSvgDrawable(node, context, matrix, resolvedPaintContext.paint, opacity);
    return;
  }
  const childContext = { ...context, paint: resolvedPaintContext.paint, opacity };
  for (const child of node.children) lowerSvgNode(child, childContext, currentMatrix);
};

/** 将 MathJax SVG 降解为 LoweredTex，并保留失败分类 */
export const lowerMathJaxSvg = (svg: string, fontSize: number, texSource = ''): TexLoweringResult<LoweredTex> => {
  try {
    assertPositiveNumber(fontSize, 'SVG font size');
    const document = parseXml(svg);
    const rootSvg = findRootSvg(document);
    if (!rootSvg) throw new RetikzTexError(RetikzTexErrorCode.SvgMalformed, 'MathJax SVG root is missing');
    const viewBox = (readSvgAttribute(rootSvg, 'viewBox') ?? '')
      .trim()
      .split(/[\s,]+/)
      .map(Number);
    if (viewBox.length !== 4 || viewBox.some(value => !Number.isFinite(value)) || viewBox[2] <= 0 || viewBox[3] <= 0) {
      throwMalformedSvgError('MathJax SVG requires a positive finite viewBox');
    }
    const [viewBoxX, viewBoxY, viewBoxWidth, viewBoxHeight] = viewBox;
    const fontScale = fontSize / 1000;
    const pointMapper: PointMapper = (x, y) => [(x - viewBoxX) * fontScale, (y - viewBoxY) * fontScale];
    const paths: Array<LoweredTexPath> = [];
    const initialPaint: PaintContext = {
      color: HOST_COLOR,
      fill: 'currentColor',
      stroke: 'none',
    };
    lowerSvgNode(rootSvg, {
      paint: initialPaint,
      pointMapper,
      fontScale,
      definitions: indexPathDefinitions(rootSvg),
      rootSvg,
      paths,
    });
    return {
      ok: true,
      value: {
        paths,
        width: viewBoxWidth * fontScale,
        height: viewBoxHeight * fontScale,
        depth: (viewBoxY + viewBoxHeight) * fontScale,
      },
    };
  } catch (error) {
    const kind =
      error instanceof RetikzTexError && error.code === RetikzTexErrorCode.SvgUnsupported
        ? 'unsupported-svg'
        : 'malformed-svg';
    return {
      ok: false,
      diagnostic: {
        kind,
        source: texSource,
        message: error instanceof Error ? error.message : String(error),
      },
      cacheable: true,
    };
  }
};
