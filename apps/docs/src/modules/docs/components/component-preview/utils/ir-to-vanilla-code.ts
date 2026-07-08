import type {
  IRArcStep,
  IRBendStep,
  IRChild,
  IRCirclePathStep,
  IRCoordinate,
  IREllipsePathStep,
  IRNode,
  IRPathBase,
  IRScene,
  IRScope,
  IRStep,
} from '@retikz/core';

const INDENT = '  ';
const pad = (level: number): string => INDENT.repeat(level);

const INLINE_MAX = 60;

const isIdentifier = (key: string): boolean => /^[A-Za-z_$][A-Za-z0-9_$]*$/.test(key);

const formatString = (s: string): string => `'${s.replace(/\\/g, '\\\\').replace(/'/g, "\\'")}'`;

const stripKeys = (obj: Record<string, unknown>, keys: ReadonlyArray<string>): Record<string, unknown> => {
  const copy: Record<string, unknown> = { ...obj };
  for (const k of keys) delete copy[k];
  return copy;
};

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

type Ctx = { used: Set<string>; usesDrawWay: boolean };

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
      case 'fold': // -| / |-
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
          text: `{ arc: { startAngle: ${step.startAngle}, endAngle: ${step.endAngle}, radius: ${formatValue(step.radius, indent)} } }`,
        });
        break;
      case 'circlePath':
        frags.push({ text: `{ circle: { radius: ${step.radius} } }` });
        break;
      case 'ellipsePath':
        frags.push({ text: `{ ellipse: { radius: ${formatValue(step.radius, indent)} } }` });
        break;
      default:
        frags.push({ text: `/* not vanilla way sugar: ${step.kind} */`, comment: true });
    }
  }
  return frags;
};

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
  if (node.id !== undefined)
    return hasConfig ? `node(${formatString(node.id)}, ${cfg})` : `node(${formatString(node.id)})`;
  return hasConfig ? `node(${cfg})` : 'node({})';
};

const coordinateCode = (coord: IRCoordinate, indent: number, ctx: Ctx): string => {
  ctx.used.add('coordinate');
  const config = stripKeys(coord, ['type', 'id']);
  return `coordinate(${formatString(coord.id)}, ${formatObject(config, indent)})`;
};

const isWayArcStep = (step: IRArcStep): boolean => step.center === undefined;

const isWayCirclePathStep = (step: IRCirclePathStep): boolean =>
  step.startAngle === undefined && step.endAngle === undefined && step.closed === undefined;

const isWayEllipsePathStep = (step: IREllipsePathStep): boolean =>
  step.startAngle === undefined && step.endAngle === undefined && step.closed === undefined;

const isWayBendStep = (step: IRBendStep): boolean =>
  step.bendDirection !== undefined &&
  step.outAngle === undefined &&
  step.inAngle === undefined &&
  step.looseness === undefined;

const isWayRepresentableStep = (step: IRStep): boolean => {
  switch (step.kind) {
    case 'move':
    case 'line':
    case 'fold':
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
    case 'smooth':
    case 'rectangle':
    case 'generator':
      return false;
  }
};

const rawIrChildCode = (child: IRChild, indent: number, reason: string): string =>
  `/* ${reason}; raw IR child, switch to IR view for structure. */ ${formatObject(child, indent)}`;

const pathCode = (path: IRPathBase, indent: number, ctx: Ctx): string => {
  if (path.kind === 'ribbon') return ribbonCode(path, indent, ctx);
  if (path.children === undefined) {
    return rawIrChildCode(path, indent, 'missing path steps');
  }
  if (!path.children.every(isWayRepresentableStep)) {
    return rawIrChildCode(path, indent, 'not vanilla way sugar');
  }
  ctx.used.add('path');
  const id = path.id;
  const config = stripKeys(path, ['type', 'children', 'id']);
  const wayStr = formatWay(stepsToWay(path.children, ctx, indent + 1), indent);
  const pathConfig = formatObject({ way: path.children.length === 0 ? [] : `__WAY__`, ...config }, indent).replace(
    "'__WAY__'",
    wayStr,
  );
  return id !== undefined ? `path(${formatString(id)}, ${pathConfig})` : `path(${pathConfig})`;
};

const ribbonCode = (path: IRPathBase, indent: number, ctx: Ctx): string => {
  const ribbon = path.ribbon;
  if (ribbon === undefined) return rawIrChildCode(path, indent, 'missing ribbon options');

  if (ribbon.mode === 'boundary') {
    return rawIrChildCode(path, indent, 'boundary ribbon has no vanilla plain spec shorthand');
  }
  if (path.children === undefined) {
    return rawIrChildCode(path, indent, 'missing ribbon centerline');
  }
  if (!path.children.every(isWayRepresentableStep)) {
    return rawIrChildCode(path, indent, 'not vanilla way sugar');
  }
  ctx.used.add('path');
  const id = path.id;
  const config = stripKeys(path, ['type', 'children', 'id']);
  const wayStr = formatWay(stepsToWay(path.children, ctx, indent + 1), indent);
  const pathConfig = formatObject({ way: path.children.length === 0 ? [] : `__WAY__`, ...config }, indent).replace(
    "'__WAY__'",
    wayStr,
  );
  return id !== undefined ? `path(${formatString(id)}, ${pathConfig})` : `path(${pathConfig})`;
};

const scopeCode = (scope: IRScope, indent: number, ctx: Ctx): string => {
  ctx.used.add('scope');
  const config = stripKeys(scope, ['type', 'children']);
  const childrenStr = childListCode(scope.children, indent, ctx);
  return `scope(${formatObject(config, indent)}, ${childrenStr})`;
};

const childCode = (child: IRChild, indent: number, ctx: Ctx): string => {
  if ('namespace' in child) {
    return `null /* Tier 2 composite "${child.namespace}.${child.type}"，经 IR 直喂 */`;
  }
  switch (child.type) {
    case 'node':
      return nodeCode(child, indent, ctx);
    case 'coordinate':
      return coordinateCode(child, indent, ctx);
    case 'path':
      return pathCode(child, indent, ctx);
    case 'scope':
      return scopeCode(child, indent, ctx);
  }
};

const childListCode = (children: ReadonlyArray<IRChild>, indent: number, ctx: Ctx): string => {
  if (children.length === 0) return '[]';
  const lines = children.map(c => `${pad(indent + 1)}${childCode(c, indent + 1, ctx)},`);
  return `[\n${lines.join('\n')}\n${pad(indent)}]`;
};

const HELPER_ORDER: ReadonlyArray<string> = ['figure', 'node', 'path', 'coordinate', 'scope'];

export const irToVanillaCode = (ir: IRScene): string => {
  const ctx: Ctx = { used: new Set(['figure']), usesDrawWay: false };
  const childrenStr = childListCode(ir.children, 0, ctx);
  const figureConfig = {
    ...(ir.viewBox ? { viewBox: ir.viewBox } : {}),
    children: ir.children,
  };
  const figureArgs = formatObject({ ...figureConfig, children: '__CHILDREN__' }, 0).replace(
    "'__CHILDREN__'",
    childrenStr,
  );

  const helpers = HELPER_ORDER.filter(name => ctx.used.has(name));
  const imports = [`import { ${helpers.join(', ')} } from '@retikz/vanilla';`];
  if (ctx.usesDrawWay) imports.push("import { DrawWay } from '@retikz/core';");

  return `${imports.join('\n')}\n\nconst fig = figure(${figureArgs});\n`;
};
