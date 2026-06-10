import type {
  IR,
  IRArcStep,
  IRBendStep,
  IRChild,
  IRCirclePathStep,
  IRCoordinate,
  IREllipsePathStep,
  IRNode,
  IRPath,
  IRScope,
  IRStep,
} from '@retikz/core';

/**
 * 从 IR 生成等价的 `@retikz/vanilla` 命令式 builder 代码（纯字符串，供 ComponentPreview 的 vanilla 代码视图展示）
 * @description 与 IR 视图同源（都吃 `buildPreviewIR` 的 IR），零 per-demo 维护、永远与 demo 同步。
 *   node/coordinate/scope/figure 直接映射；draw 的 way 从 path.children steps 反推（move/line/fold/cycle/
 *   curve/cubic/bend 正常，arc/circlePath/ellipsePath/generator/rectangle 等冷门 step 降级成 unsupported 注释、
 *   不抛）。要更地道的 way / 写法用同级 `<name>.vanilla.ts` 手写覆盖。
 */

const INDENT = '  ';
const pad = (level: number): string => INDENT.repeat(level);

/** 内联阈值：单行对象 / 数组超过它就换多行 */
const INLINE_MAX = 60;

const isIdentifier = (key: string): boolean => /^[A-Za-z_$][A-Za-z0-9_$]*$/.test(key);

const formatString = (s: string): string => `'${s.replace(/\\/g, '\\\\').replace(/'/g, "\\'")}'`;

/** 去掉对象的若干 key（spread + delete，避免 destructure 留下未用变量） */
const stripKeys = (obj: Record<string, unknown>, keys: ReadonlyArray<string>): Record<string, unknown> => {
  const copy: Record<string, unknown> = { ...obj };
  for (const k of keys) delete copy[k];
  return copy;
};

/** JS 字面量格式化：对象 key 合法标识符不加引号、字符串单引号、短的内联、长的多行缩进 */
const formatValue = (value: unknown, indent: number): string => {
  if (value === null) return 'null';
  if (typeof value === 'string') return formatString(value);
  if (typeof value === 'number' || typeof value === 'boolean') return String(value);
  if (Array.isArray(value)) return formatArray(value, indent);
  if (typeof value === 'object') return formatObject(value as Record<string, unknown>, indent);
  return 'undefined';
};

const formatArray = (arr: ReadonlyArray<unknown>, indent: number): string => {
  if (arr.length === 0) return '[]';
  const items = arr.map(v => formatValue(v, indent + 1));
  const inline = `[${items.join(', ')}]`;
  if (inline.length <= INLINE_MAX && !inline.includes('\n')) return inline;
  return `[\n${items.map(it => pad(indent + 1) + it).join(',\n')},\n${pad(indent)}]`;
};

const formatObject = (obj: Record<string, unknown>, indent: number): string => {
  const keys = Object.keys(obj);
  if (keys.length === 0) return '{}';
  const entries = keys.map(k => `${isIdentifier(k) ? k : formatString(k)}: ${formatValue(obj[k], indent + 1)}`);
  const inline = `{ ${entries.join(', ')} }`;
  if (inline.length <= INLINE_MAX && !inline.includes('\n')) return inline;
  return `{\n${entries.map(e => pad(indent + 1) + e).join(',\n')},\n${pad(indent)}}`;
};

/** codegen 上下文：累积用到的 builder 函数 + 是否用到 DrawWay（决定是否加 core import） */
type Ctx = { used: Set<string>; usesDrawWay: boolean };

/** way 片段：comment=true 的项在数组里不带尾逗号（避免造成稀疏数组洞） */
type WayFrag = { text: string; comment?: boolean };

const stepsToWay = (steps: ReadonlyArray<IRStep>, ctx: Ctx, indent: number): Array<WayFrag> => {
  const frags: Array<WayFrag> = [];
  for (const step of steps) {
    if ('label' in step && step.label !== undefined) {
      frags.push({ text: `{ label: ${formatValue(step.label, indent)} }` });
    }
    switch (step.kind) {
      case 'move':
      case 'line':
        frags.push({ text: formatValue(step.to, indent) });
        break;
      case 'step': // fold（-| / |-）
        frags.push({ text: formatString(step.via) });
        frags.push({ text: formatValue(step.to, indent) });
        break;
      case 'cycle':
        ctx.usesDrawWay = true;
        frags.push({ text: 'DrawWay.Cycle' });
        break;
      case 'curve':
        frags.push({ text: `{ curve: ${formatValue(step.control, indent)} }` });
        frags.push({ text: formatValue(step.to, indent) });
        break;
      case 'cubic':
        frags.push({
          text: `{ cubic: [${formatValue(step.control1, indent)}, ${formatValue(step.control2, indent)}] }`,
        });
        frags.push({ text: formatValue(step.to, indent) });
        break;
      case 'bend':
        if (step.bendDirection !== undefined) {
          const angle = step.bendAngle !== undefined ? `, angle: ${step.bendAngle}` : '';
          frags.push({ text: `{ bend: ${formatString(step.bendDirection)}${angle} }` });
          frags.push({ text: formatValue(step.to, indent) });
        } else {
          frags.push({ text: '/* not vanilla way sugar: bend with out/in angles */', comment: true });
        }
        break;
      case 'arc':
        frags.push({
          text: `{ arc: { startAngle: ${step.startAngle}, endAngle: ${step.endAngle}, radius: ${step.radius} } }`,
        });
        break;
      case 'circlePath':
        frags.push({ text: `{ circle: { radius: ${step.radius} } }` });
        break;
      case 'ellipsePath':
        frags.push({ text: `{ ellipse: { radiusX: ${step.radiusX}, radiusY: ${step.radiusY} } }` });
        break;
      default:
        frags.push({ text: `/* not vanilla way sugar: ${step.kind} */`, comment: true });
    }
  }
  return frags;
};

/** way 数组字面量：无注释且短则内联；否则多行（comment 行不带尾逗号） */
const formatWay = (frags: ReadonlyArray<WayFrag>, indent: number): string => {
  if (frags.length === 0) return '[]';
  const hasComment = frags.some(f => f.comment === true);
  if (!hasComment) {
    const inline = `[${frags.map(f => f.text).join(', ')}]`;
    if (inline.length <= INLINE_MAX && !inline.includes('\n')) return inline;
  }
  const lines = frags.map(f => (f.comment === true ? pad(indent + 1) + f.text : `${pad(indent + 1)}${f.text},`));
  return `[\n${lines.join('\n')}\n${pad(indent)}]`;
};

const nodeCode = (node: IRNode, indent: number, ctx: Ctx): string => {
  ctx.used.add('node');
  const config = stripKeys(node, ['type', 'id']);
  const hasConfig = Object.keys(config).length > 0;
  const cfg = formatObject(config, indent);
  if (node.id !== undefined) return hasConfig ? `node(${formatString(node.id)}, ${cfg})` : `node(${formatString(node.id)})`;
  return hasConfig ? `node(${cfg})` : 'node()';
};

const coordinateCode = (coord: IRCoordinate, indent: number, ctx: Ctx): string => {
  ctx.used.add('coordinate');
  const config = stripKeys(coord, ['type', 'id']);
  return `coordinate(${formatString(coord.id)}, ${formatObject(config, indent)})`;
};

const isWayArcStep = (step: IRArcStep): boolean =>
  step.radius !== undefined && step.radiusX === undefined && step.radiusY === undefined && step.center === undefined;

const isWayCirclePathStep = (step: IRCirclePathStep): boolean =>
  step.startAngle === undefined && step.endAngle === undefined && step.closed === undefined;

const isWayEllipsePathStep = (step: IREllipsePathStep): boolean =>
  step.startAngle === undefined && step.endAngle === undefined && step.closed === undefined;

const isWayBendStep = (step: IRBendStep): boolean =>
  step.bendDirection !== undefined && step.outAngle === undefined && step.inAngle === undefined && step.looseness === undefined;

const isWayRepresentableStep = (step: IRStep): boolean => {
  switch (step.kind) {
    case 'move':
    case 'line':
    case 'step':
    case 'cycle':
    case 'curve':
    case 'cubic':
      return true;
    case 'bend':
      return isWayBendStep(step);
    case 'arc':
      return isWayArcStep(step);
    case 'circlePath':
      return isWayCirclePathStep(step);
    case 'ellipsePath':
      return isWayEllipsePathStep(step);
    case 'rectangle':
    case 'generator':
      return false;
  }
};

const rawIrChildCode = (child: IRChild, indent: number, reason: string): string =>
  `/* ${reason}; raw IR child, switch to IR view for structure. */ ${formatObject(child, indent)}`;

const drawCode = (path: IRPath, indent: number, ctx: Ctx): string => {
  if (!path.children.every(isWayRepresentableStep)) {
    return rawIrChildCode(path, indent, 'not vanilla way sugar');
  }
  ctx.used.add('draw');
  const config = stripKeys(path, ['type', 'children']);
  const wayStr = formatWay(stepsToWay(path.children, ctx, indent + 1), indent);
  const hasConfig = Object.keys(config).length > 0;
  return hasConfig ? `draw(${wayStr}, ${formatObject(config, indent)})` : `draw(${wayStr})`;
};

const scopeCode = (scope: IRScope, indent: number, ctx: Ctx): string => {
  ctx.used.add('scope');
  const config = stripKeys(scope, ['type', 'children']);
  const childrenStr = childListCode(scope.children, indent, ctx);
  return `scope(${formatObject(config, indent)}, ${childrenStr})`;
};

const childCode = (child: IRChild, indent: number, ctx: Ctx): string => {
  if ('namespace' in child) {
    // Tier 2 composite 经 IR 直喂（<Layout ir>）；命令式 composite builder 见 ADR-02
    return `null /* Tier 2 composite "${child.namespace}.${child.type}"，经 IR 直喂 */`;
  }
  switch (child.type) {
    case 'node':
      return nodeCode(child, indent, ctx);
    case 'coordinate':
      return coordinateCode(child, indent, ctx);
    case 'path':
      return drawCode(child, indent, ctx);
    case 'scope':
      return scopeCode(child, indent, ctx);
  }
};

/** 渲染一个 child 数组为 `[\n  ...,\n]`（空则 `[]`） */
const childListCode = (children: ReadonlyArray<IRChild>, indent: number, ctx: Ctx): string => {
  if (children.length === 0) return '[]';
  const lines = children.map(c => `${pad(indent + 1)}${childCode(c, indent + 1, ctx)},`);
  return `[\n${lines.join('\n')}\n${pad(indent)}]`;
};

const BUILDER_ORDER: ReadonlyArray<string> = ['figure', 'node', 'draw', 'coordinate', 'scope'];

export const irToVanillaCode = (ir: IR): string => {
  const ctx: Ctx = { used: new Set(['figure']), usesDrawWay: false };
  const childrenStr = childListCode(ir.children, 0, ctx);
  // 省略不必要的入参：无 viewBox 时不传空 config（用 figure(children) / figure() 重载）
  const configStr = ir.viewBox ? formatObject({ viewBox: ir.viewBox }, 0) : null;
  const hasChildren = ir.children.length > 0;
  const figureArgs =
    configStr !== null
      ? hasChildren
        ? `${configStr}, ${childrenStr}`
        : configStr
      : hasChildren
        ? childrenStr
        : '';

  const builders = BUILDER_ORDER.filter(name => ctx.used.has(name));
  const imports = [`import { ${builders.join(', ')} } from '@retikz/vanilla';`];
  if (ctx.usesDrawWay) imports.push("import { DrawWay } from '@retikz/core';");

  return `${imports.join('\n')}\n\nconst fig = figure(${figureArgs});\n`;
};
