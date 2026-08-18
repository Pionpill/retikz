import type { LoweredTex, LoweredTexPaint, LoweredTexPath, PathCommand } from '@retikz/core';
import type { ValueOf } from '@retikz/foundation';
import type { AffineMatrix } from '@retikz/math';

import { RetikzError } from '@retikz/foundation';
import { AFFINE_IDENTITY, multiplyAffine } from '@retikz/math';

import type { TexLoweringDiagnostic, TexLoweringResult } from '../lower/internal';
import type { PointMapper } from './path-d';

import {
  isFiniteNonSingular,
  parseTransform,
  RetikzSvgTransformError,
  RetikzSvgTransformErrorCode,
  similarityScale,
} from './matrix';
import { parsePathD, transformCommands } from './path-d';

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

const RetikzSvgLoweringErrorCode = {
  Unsupported: 'unsupported-svg',
  Malformed: 'malformed-svg',
} as const satisfies Readonly<Record<string, TexLoweringDiagnostic['kind']>>;

type RetikzSvgLoweringErrorCodeValue = ValueOf<typeof RetikzSvgLoweringErrorCode>;

class RetikzSvgLoweringError extends RetikzError<
  RetikzSvgLoweringErrorCodeValue,
  Readonly<{ kind: RetikzSvgLoweringErrorCodeValue }>
> {
  readonly kind: RetikzSvgLoweringErrorCodeValue;

  constructor(kind: RetikzSvgLoweringErrorCodeValue, message: string) {
    super({ code: kind, message, details: { kind } });
    this.kind = kind;
  }
}

const unsupported = (message: string): never => {
  throw new RetikzSvgLoweringError(RetikzSvgLoweringErrorCode.Unsupported, message);
};

const malformed = (message: string): never => {
  throw new RetikzSvgLoweringError(RetikzSvgLoweringErrorCode.Malformed, message);
};

const attribute = (node: SvgNode, name: string): string | undefined => node.attributes.get(name);

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
      if (!current || current.name !== name) malformed(`Mismatched closing element: ${name}`);
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
  if (stack.length !== 1) malformed(`Unclosed SVG element: ${stack.at(-1)?.name ?? 'unknown'}`);
  return root;
};

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

const finiteNumber = (value: string | undefined, fallback?: number): number => {
  if (value === undefined && fallback !== undefined) return fallback;
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) malformed(`Invalid SVG number: ${String(value)}`);
  return parsed;
};

const unitInterval = (value: string | undefined): number | undefined => {
  if (value === undefined) return undefined;
  const parsed = finiteNumber(value);
  if (parsed < 0 || parsed > 1) malformed(`SVG opacity must be within 0..1: ${value}`);
  return parsed;
};

const parseStyle = (value: string | undefined): ParsedStyle => {
  const style: ParsedStyle = {};
  if (!value) return style;
  for (const declaration of value.split(';')) {
    const trimmed = declaration.trim();
    if (!trimmed) continue;
    const separator = trimmed.indexOf(':');
    if (separator < 1) malformed(`Malformed SVG style declaration: ${trimmed}`);
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
      unsupported(`Unsupported SVG style property: ${property}`);
    }
    style[property] = propertyValue;
  }
  return style;
};

const presentationValue = (node: SvgNode, style: ParsedStyle, name: string): string | undefined =>
  style[name] ?? attribute(node, name);

const resolvePaintContext = (
  parent: PaintContext,
  node: SvgNode,
): { paint: PaintContext; opacity?: number; hasOpacity: boolean } => {
  if (attribute(node, 'clip-path') !== undefined) {
    unsupported('SVG clip-path is not supported');
  }
  const style = parseStyle(attribute(node, 'style'));
  const colorValue = presentationValue(node, style, 'color');
  let color = parent.color;
  if (colorValue !== undefined && colorValue !== 'currentColor') color = colorValue;
  const fill = presentationValue(node, style, 'fill') ?? parent.fill;
  const stroke = presentationValue(node, style, 'stroke') ?? parent.stroke;
  const fillOpacity = unitInterval(presentationValue(node, style, 'fill-opacity')) ?? parent.fillOpacity;
  const strokeOpacity = unitInterval(presentationValue(node, style, 'stroke-opacity')) ?? parent.strokeOpacity;
  const strokeWidthValue = presentationValue(node, style, 'stroke-width');
  const strokeWidth = strokeWidthValue === undefined ? parent.strokeWidth : finiteNumber(strokeWidthValue);
  if (strokeWidth !== undefined && strokeWidth < 0) malformed(`SVG stroke-width must be non-negative: ${strokeWidth}`);
  const fillRuleValue = presentationValue(node, style, 'fill-rule') ?? parent.fillRule;
  if (fillRuleValue !== undefined && fillRuleValue !== 'nonzero' && fillRuleValue !== 'evenodd') {
    unsupported(`Unsupported SVG fill-rule: ${fillRuleValue}`);
  }
  const fillRule = fillRuleValue as PaintContext['fillRule'];
  const opacityValue = presentationValue(node, style, 'opacity');
  return {
    paint: { color, fill, stroke, fillOpacity, strokeOpacity, strokeWidth, fillRule },
    opacity: unitInterval(opacityValue),
    hasOpacity: opacityValue !== undefined,
  };
};

const materializePaint = (value: string, color: EffectiveColor): LoweredTexPaint => {
  if (value === 'none') return { kind: 'none' };
  if (value !== 'currentColor') return { kind: 'color', value };
  return color === HOST_COLOR ? { kind: 'currentColor' } : { kind: 'color', value: color };
};

const drawableCount = (node: SvgNode, insideDefs = false): number => {
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
  return node.children.reduce((count, child) => count + drawableCount(child, false), 0);
};

const collectDefinitionPaths = (
  node: SvgNode,
  insideDefs = false,
  output = new Map<string, SvgNode>(),
): Map<string, SvgNode> => {
  const defs = insideDefs || node.name === 'defs';
  if (defs && node.name === 'path') {
    const id = attribute(node, 'id');
    if (id) output.set(id, node);
  }
  for (const child of node.children) collectDefinitionPaths(child, defs, output);
  return output;
};

const rectCommands = (node: SvgNode): Array<PathCommand> => {
  const x = finiteNumber(attribute(node, 'x'), 0);
  const y = finiteNumber(attribute(node, 'y'), 0);
  const width = finiteNumber(attribute(node, 'width'), 0);
  const height = finiteNumber(attribute(node, 'height'), 0);
  if (width < 0 || height < 0) malformed('SVG rect dimensions must be non-negative');
  return [
    { kind: 'move', to: [x, y] },
    { kind: 'line', to: [x + width, y] },
    { kind: 'line', to: [x + width, y + height] },
    { kind: 'line', to: [x, y + height] },
    { kind: 'close' },
  ];
};

const lineCommands = (node: SvgNode): Array<PathCommand> => [
  { kind: 'move', to: [finiteNumber(attribute(node, 'x1'), 0), finiteNumber(attribute(node, 'y1'), 0)] },
  { kind: 'line', to: [finiteNumber(attribute(node, 'x2'), 0), finiteNumber(attribute(node, 'y2'), 0)] },
];

const polygonCommands = (node: SvgNode): Array<PathCommand> => {
  const numbers = (attribute(node, 'points') ?? '')
    .trim()
    .split(/[\s,]+/)
    .filter(Boolean)
    .map(Number);
  if (numbers.length < 4 || numbers.length % 2 !== 0 || numbers.some(value => !Number.isFinite(value))) {
    malformed('Invalid SVG polygon points');
  }
  const commands: Array<PathCommand> = [{ kind: 'move', to: [numbers[0], numbers[1]] }];
  for (let index = 2; index < numbers.length; index += 2) {
    commands.push({ kind: 'line', to: [numbers[index], numbers[index + 1]] });
  }
  commands.push({ kind: 'close' });
  return commands;
};

const multiplyOpacity = (parent: number | undefined, own: number | undefined): number | undefined => {
  if (own === undefined) return parent;
  return parent === undefined ? own : parent * own;
};

type EmitContext = {
  matrix: AffineMatrix;
  paint: PaintContext;
  opacity?: number;
  normalize: PointMapper;
  fontScale: number;
  definitions: Map<string, SvgNode>;
  rootSvg: SvgNode;
  paths: Array<LoweredTexPath>;
};

const emitDrawable = (
  node: SvgNode,
  context: EmitContext,
  matrix: AffineMatrix,
  paint: PaintContext,
  opacity: number | undefined,
): void => {
  let commands: Array<PathCommand> = [];
  let effectiveNode = node;
  let effectiveOpacity = opacity;
  matrix = multiplyAffine(matrix, parseTransform(attribute(node, 'transform')));
  if (node.name === 'use') {
    const href = attribute(node, 'href') ?? attribute(node, 'xlink:href');
    const definition = href ? context.definitions.get(href.replace(/^#/, '')) : undefined;
    if (definition === undefined)
      throw new RetikzSvgLoweringError(
        RetikzSvgLoweringErrorCode.Malformed,
        `Unknown SVG use reference: ${String(href)}`,
      );
    effectiveNode = definition;
    const x = finiteNumber(attribute(node, 'x'), 0);
    const y = finiteNumber(attribute(node, 'y'), 0);
    matrix = multiplyAffine(matrix, [1, 0, 0, 1, x, y]);
    matrix = multiplyAffine(matrix, parseTransform(attribute(effectiveNode, 'transform')));
  }
  if (!isFiniteNonSingular(matrix)) unsupported('SVG drawable transform must be finite and non-singular');
  if (effectiveNode.name === 'path') {
    const data = attribute(effectiveNode, 'd');
    if (data === undefined)
      throw new RetikzSvgLoweringError(RetikzSvgLoweringErrorCode.Malformed, 'SVG path is missing d');
    commands = parsePathD(data);
  } else if (effectiveNode.name === 'rect') {
    commands = rectCommands(effectiveNode);
  } else if (effectiveNode.name === 'line') {
    commands = lineCommands(effectiveNode);
  } else if (effectiveNode.name === 'polygon') {
    commands = polygonCommands(effectiveNode);
  } else {
    unsupported(`Unsupported SVG drawable: ${effectiveNode.name}`);
  }
  let definitionPaint = paint;
  if (effectiveNode !== node) {
    const definition = resolvePaintContext(paint, effectiveNode);
    definitionPaint = definition.paint;
    effectiveOpacity = multiplyOpacity(effectiveOpacity, definition.opacity);
  }
  const fill =
    effectiveNode.name === 'line'
      ? { kind: 'none' as const }
      : materializePaint(definitionPaint.fill, definitionPaint.color);
  let stroke = materializePaint(definitionPaint.stroke, definitionPaint.color);
  if (definitionPaint.strokeWidth === 0) stroke = { kind: 'none' };
  const path: LoweredTexPath = {
    commands: transformCommands(commands, matrix, context.normalize),
    fill,
    stroke,
  };
  if (fill.kind !== 'none' && definitionPaint.fillOpacity !== undefined) path.fillOpacity = definitionPaint.fillOpacity;
  if (stroke.kind !== 'none') {
    const scale = similarityScale(matrix);
    if (scale === undefined)
      throw new RetikzSvgLoweringError(
        RetikzSvgLoweringErrorCode.Unsupported,
        'Visible SVG stroke requires a similarity transform',
      );
    path.strokeWidth = (definitionPaint.strokeWidth ?? 1) * scale * context.fontScale;
    if (definitionPaint.strokeOpacity !== undefined) path.strokeOpacity = definitionPaint.strokeOpacity;
  }
  if (effectiveOpacity !== undefined) path.opacity = effectiveOpacity;
  if (definitionPaint.fillRule !== undefined) path.fillRule = definitionPaint.fillRule;
  context.paths.push(path);
};

const emitNode = (node: SvgNode, context: EmitContext): void => {
  if (node.name === 'defs') return;
  if (node.name === 'svg' && node !== context.rootSvg) unsupported('Nested SVG viewport is not supported');
  if (node.name === 'text' || node.name === 'foreignObject') unsupported(`Unsupported SVG element: ${node.name}`);
  const supportedContainer = node.name === 'svg' || node.name === 'g' || node.name === 'mjx-container';
  const supportedDrawable =
    node.name === 'path' ||
    node.name === 'use' ||
    node.name === 'rect' ||
    node.name === 'line' ||
    node.name === 'polygon';
  if (!supportedContainer && !supportedDrawable) unsupported(`Unsupported SVG element: ${node.name}`);

  const resolved = resolvePaintContext(context.paint, node);
  if (resolved.hasOpacity && drawableCount(node) > 1) {
    unsupported('Container opacity with multiple drawables is not supported');
  }
  const opacity = multiplyOpacity(context.opacity, resolved.opacity);
  const matrix = multiplyAffine(context.matrix, parseTransform(attribute(node, 'transform')));
  if (supportedDrawable) {
    emitDrawable(node, context, context.matrix, resolved.paint, opacity);
    return;
  }
  const childContext = { ...context, matrix, paint: resolved.paint, opacity };
  for (const child of node.children) emitNode(child, childContext);
};

/** 解析 MathJax SVG，并保留失败分类 */
export const parseMathJaxSvgResult = (svg: string, fontSize: number, source = ''): TexLoweringResult<LoweredTex> => {
  try {
    if (!Number.isFinite(fontSize) || fontSize <= 0) malformed(`Invalid font size: ${fontSize}`);
    const document = parseXml(svg);
    const rootSvg = findRootSvg(document);
    if (!rootSvg) throw new RetikzSvgLoweringError(RetikzSvgLoweringErrorCode.Malformed, 'MathJax SVG root is missing');
    const viewBox = (attribute(rootSvg, 'viewBox') ?? '')
      .trim()
      .split(/[\s,]+/)
      .map(Number);
    if (viewBox.length !== 4 || viewBox.some(value => !Number.isFinite(value)) || viewBox[2] <= 0 || viewBox[3] <= 0) {
      malformed('MathJax SVG requires a positive finite viewBox');
    }
    const [viewBoxX, viewBoxY, viewBoxWidth, viewBoxHeight] = viewBox;
    const fontScale = fontSize / 1000;
    const normalize: PointMapper = (x, y) => [(x - viewBoxX) * fontScale, (y - viewBoxY) * fontScale];
    const paths: Array<LoweredTexPath> = [];
    const initialPaint: PaintContext = {
      color: HOST_COLOR,
      fill: 'currentColor',
      stroke: 'none',
    };
    emitNode(rootSvg, {
      matrix: AFFINE_IDENTITY,
      paint: initialPaint,
      normalize,
      fontScale,
      definitions: collectDefinitionPaths(rootSvg),
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
      error instanceof RetikzSvgLoweringError
        ? error.kind
        : error instanceof RetikzSvgTransformError && error.kind === RetikzSvgTransformErrorCode.Unsupported
          ? RetikzSvgLoweringErrorCode.Unsupported
          : RetikzSvgLoweringErrorCode.Malformed;
    return {
      ok: false,
      diagnostic: {
        kind,
        source,
        message: error instanceof Error ? error.message : String(error),
      },
      cacheable: true,
    };
  }
};

/** 把 MathJax SVG 降解为 renderer-agnostic 多路径结果 */
export const parseMathJaxSvg = (svg: string, fontSize: number): LoweredTex | null => {
  const result = parseMathJaxSvgResult(svg, fontSize);
  return result.ok ? result.value : null;
};
