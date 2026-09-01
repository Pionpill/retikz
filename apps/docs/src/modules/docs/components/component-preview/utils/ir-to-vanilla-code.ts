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
import type { IRBlock, IRBlockHeader, IRBlockRow, IRBlockSection, IRGraph, IRGroup } from '@retikz/graph';
import type { InputGraphChild } from '@retikz/graph-vanilla';

import {
  BlockHeaderSchema,
  BlockRowSchema,
  BlockSchema,
  BlockSectionSchema,
  EntitySchema,
  GraphSchema,
  GroupSchema,
  RelationSchema,
} from '@retikz/graph';

import {
  entityPreviewAuthoringInput,
  graphPreviewAuthoringInput,
  relationPreviewAuthoringInput,
} from './graph-authoring-input';

const INDENT = '  ';
const pad = (level: number): string => INDENT.repeat(level);

const INLINE_MAX = 60;

const isIdentifier = (key: string): boolean => /^[A-Za-z_$][A-Za-z0-9_$]*$/.test(key);

const escapeStringCharacter = (character: string): string => {
  switch (character) {
    case '\\':
      return '\\\\';
    case "'":
      return "\\'";
    case '\b':
      return '\\b';
    case '\t':
      return '\\t';
    case '\n':
      return '\\n';
    case '\v':
      return '\\v';
    case '\f':
      return '\\f';
    case '\r':
      return '\\r';
  }
  const code = character.charCodeAt(0);
  return code <= 0xff ? `\\x${code.toString(16).padStart(2, '0')}` : `\\u${code.toString(16).padStart(4, '0')}`;
};

const formatString = (value: string): string =>
  `'${Array.from(value, character => {
    const code = character.charCodeAt(0);
    return character === '\\' || character === "'" || code <= 0x1f || code === 0x2028 || code === 0x2029
      ? escapeStringCharacter(character)
      : character;
  }).join('')}'`;

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

type Ctx = {
  used: Set<string>;
  usesDrawWay: boolean;
  standardHelpers: Set<string>;
  standardAdapters: Set<string>;
  standardCounts: Map<string, number>;
  layoutHelpers: Set<string>;
  layoutAdapters: Set<string>;
  layoutCounts: Map<string, number>;
  graphHelpers: Set<string>;
  graphAdapters: Set<string>;
  graphCounts: Map<string, number>;
  generatedIds: Map<string, string>;
};

/** IR 到 docs Vanilla 源码的可选宿主上下文 */
export type IrToVanillaCodeOptions = Readonly<{
  /** 当前 ComponentPreview 选中的 Core Theme selector */
  theme?: IRScene['theme'];
}>;

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
      case 'axis-line':
        frags.push({
          text:
            step.axis === 'horizontal'
              ? `{ horizontalTo: ${formatValue(step.to, indent)} }`
              : `{ verticalTo: ${formatValue(step.to, indent)} }`,
        });
        break;
      case 'fold':
        frags.push({
          text:
            'fraction' in step && step.fraction !== undefined
              ? `{ via: ${formatString(step.via)}, fraction: ${formatValue(step.fraction, indent)} }`
              : formatString(step.via),
        });
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
    case 'axis-line':
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

const scopeCode = (scope: IRScope, indent: number, ctx: Ctx): string => {
  ctx.used.add('scope');
  const config = stripKeys(scope, ['type', 'children']);
  const childrenStr = childListCode(scope.children, indent, ctx);
  return `scope(${formatObject(config, indent)}, ${childrenStr})`;
};

const STANDARD_HELPER_ORDER: ReadonlyArray<string> = ['grid', 'axes', 'frame', 'surface', 'surfaceChild', 'legend'];
const STANDARD_ADAPTER_ORDER: ReadonlyArray<string> = [
  'GridInputEmbedAdapter',
  'AxesInputEmbedAdapter',
  'FrameInputEmbedAdapter',
  'SurfaceInputEmbedAdapter',
  'LegendInputEmbedAdapter',
];
const LAYOUT_HELPER_ORDER: ReadonlyArray<string> = ['flexLayout', 'gridLayout', 'overlayLayout'];
const LAYOUT_ADAPTER_ORDER: ReadonlyArray<string> = [
  'FlexLayoutInputEmbedAdapter',
  'GridLayoutInputEmbedAdapter',
  'OverlayLayoutInputEmbedAdapter',
];
const GRAPH_HELPER_ORDER: ReadonlyArray<string> = [
  'graph',
  'group',
  'block',
  'blockHeader',
  'blockSection',
  'blockRow',
  'entity',
  'relation',
];
const GRAPH_ADAPTER_ORDER: ReadonlyArray<string> = [
  'GraphInputEmbedAdapter',
  'GroupInputEmbedAdapter',
  'BlockInputEmbedAdapter',
  'BlockHeaderInputEmbedAdapter',
  'BlockSectionInputEmbedAdapter',
  'BlockRowInputEmbedAdapter',
  'EntityInputEmbedAdapter',
  'RelationInputEmbedAdapter',
];

/** docs 预览能够显式注入的 Standard definition 名 */
export type StandardPreviewDefinitionName =
  | 'GridDefinition'
  | 'AxesDefinition'
  | 'FrameDefinition'
  | 'SurfaceDefinition'
  | 'LegendDefinition';

/** docs 预览能够显式注入的 Layout definition 名 */
export type LayoutPreviewDefinitionName = 'FlexLayoutDefinition' | 'GridLayoutDefinition' | 'OverlayLayoutDefinition';

/** docs 预览能够显式注入的 Graph definition 名 */
export type GraphPreviewDefinitionName =
  | 'GraphDefinition'
  | 'GroupDefinition'
  | 'BlockDefinition'
  | 'BlockHeaderDefinition'
  | 'BlockSectionDefinition'
  | 'BlockRowDefinition'
  | 'EntityDefinition'
  | 'RelationDefinition';

const STANDARD_DEFINITION_BY_KIND: Readonly<Record<string, StandardPreviewDefinitionName>> = {
  grid: 'GridDefinition',
  axes: 'AxesDefinition',
  frame: 'FrameDefinition',
  surface: 'SurfaceDefinition',
  legend: 'LegendDefinition',
};

const LAYOUT_DEFINITION_BY_KIND: Readonly<Record<string, LayoutPreviewDefinitionName>> = {
  flexLayout: 'FlexLayoutDefinition',
  gridLayout: 'GridLayoutDefinition',
  overlayLayout: 'OverlayLayoutDefinition',
};

const GRAPH_DEFINITION_BY_KIND: Readonly<Record<string, GraphPreviewDefinitionName>> = {
  graph: 'GraphDefinition',
  group: 'GroupDefinition',
  block: 'BlockDefinition',
  blockHeader: 'BlockHeaderDefinition',
  blockSection: 'BlockSectionDefinition',
  blockRow: 'BlockRowDefinition',
  entity: 'EntityDefinition',
  relation: 'RelationDefinition',
};

const previewOwnedChildren = (child: IRChild & { namespace: string; type: string }): Array<IRChild> => {
  const record = child as unknown as Record<string, unknown>;
  if (
    child.namespace === 'graph' &&
    (child.type === 'graph' || child.type === 'group' || child.type === 'block' || child.type === 'blockSection')
  ) {
    return (record.children as Array<IRChild> | undefined) ?? [];
  }
  if (child.namespace === 'graph' && child.type === 'blockHeader') {
    const header = BlockHeaderSchema.parse(child);
    return [...(header.icon === undefined ? [] : [header.icon]), ...(header.trail === undefined ? [] : [header.trail])];
  }
  if (child.namespace === 'graph' && child.type === 'blockRow') {
    const row = BlockRowSchema.parse(child);
    return 'children' in row ? [...(row.children ?? [])] : [];
  }
  if (child.namespace === 'standard' && child.type === 'surface') return [record.child as IRChild];
  if (
    child.namespace === 'layout' &&
    (child.type === 'flexLayout' || child.type === 'gridLayout' || child.type === 'overlayLayout')
  ) {
    const items = record.children as ReadonlyArray<{ child: IRChild }> | undefined;
    return items?.map(item => item.child) ?? [];
  }
  if (child.namespace === 'graph' && child.type === 'graph') {
    const children = record.children as ReadonlyArray<IRChild> | undefined;
    return [...(children ?? [])];
  }
  if (child.namespace !== 'standard' || child.type !== 'legend') return [];
  const owned: Array<IRChild> = [];
  if (record.title !== undefined) owned.push(record.title as IRChild);
  const content = record.content as Record<string, unknown>;
  if (content.kind === 'items') {
    const items = content.items as ReadonlyArray<{ sample: IRChild; label?: IRChild }>;
    items.forEach(item => {
      owned.push(item.sample);
      if (item.label !== undefined) owned.push(item.label);
    });
  } else {
    owned.push(content.sample as IRChild);
    const ticks = content.ticks as ReadonlyArray<{ label?: IRChild }>;
    ticks.forEach(tick => {
      if (tick.label !== undefined) owned.push(tick.label);
    });
  }
  return owned;
};

type PreviewDefinitions = {
  standard: Array<StandardPreviewDefinitionName>;
  layout: Array<LayoutPreviewDefinitionName>;
  graph: Array<GraphPreviewDefinitionName>;
};

/** 从 Core child graph 递归收集 adapter 尚未提供的已知 definitions */
export const collectPreviewDefinitions = (
  children: ReadonlyArray<IRChild>,
  standardAdapterKinds: ReadonlySet<string>,
  layoutAdapterKinds: ReadonlySet<string>,
  graphAdapterKinds: ReadonlySet<string>,
): PreviewDefinitions => {
  const standard = new Set<StandardPreviewDefinitionName>();
  const layout = new Set<LayoutPreviewDefinitionName>();
  const graph = new Set<GraphPreviewDefinitionName>();
  const providedLayoutKinds = new Set(layoutAdapterKinds);
  if (LAYOUT_HELPER_ORDER.some(kind => layoutAdapterKinds.has(kind))) {
    LAYOUT_HELPER_ORDER.forEach(kind => providedLayoutKinds.add(kind));
  }
  const providedGraphKinds = new Set(graphAdapterKinds);
  if (graphAdapterKinds.has('graph')) {
    providedGraphKinds.add('group');
    providedGraphKinds.add('entity');
    providedGraphKinds.add('relation');
  }
  if (graphAdapterKinds.has('group')) {
    providedGraphKinds.add('entity');
    providedGraphKinds.add('relation');
  }
  const visit = (child: IRChild): void => {
    if ('namespace' in child) {
      if (child.namespace === 'standard') {
        const definitionName = (
          STANDARD_DEFINITION_BY_KIND as Readonly<Record<string, StandardPreviewDefinitionName | undefined>>
        )[child.type];
        if (definitionName === undefined) {
          throw new Error(`Cannot generate Vanilla code for Tier 2 composite "${child.namespace}.${child.type}".`);
        }
        if (!standardAdapterKinds.has(child.type)) standard.add(definitionName);
      } else if (child.namespace === 'layout') {
        const definitionName = (
          LAYOUT_DEFINITION_BY_KIND as Readonly<Record<string, LayoutPreviewDefinitionName | undefined>>
        )[child.type];
        if (definitionName === undefined) {
          throw new Error(`Cannot generate Vanilla code for Tier 2 composite "${child.namespace}.${child.type}".`);
        }
        if (!providedLayoutKinds.has(child.type)) layout.add(definitionName);
      } else if (child.namespace === 'graph') {
        const definitionName = (
          GRAPH_DEFINITION_BY_KIND as Readonly<Record<string, GraphPreviewDefinitionName | undefined>>
        )[child.type];
        if (definitionName === undefined) {
          throw new Error(`Cannot generate Vanilla code for Tier 2 composite "${child.namespace}.${child.type}".`);
        }
        if (!providedGraphKinds.has(child.type)) graph.add(definitionName);
      } else {
        throw new Error(`Cannot generate Vanilla code for Tier 2 composite "${child.namespace}.${child.type}".`);
      }
      previewOwnedChildren(child).forEach(visit);
      return;
    }
    if (child.type === 'scope') child.children.forEach(visit);
  };
  children.forEach(visit);
  return { standard: Array.from(standard), layout: Array.from(layout), graph: Array.from(graph) };
};

/** 从 Core child graph 收集 Standard definitions */
export const collectStandardPreviewDefinitions = (
  children: ReadonlyArray<IRChild>,
  adapterKinds: ReadonlySet<string>,
): Array<StandardPreviewDefinitionName> =>
  collectPreviewDefinitions(children, adapterKinds, new Set(), new Set()).standard;

/** 从 Core child graph 收集 Layout definitions */
export const collectLayoutPreviewDefinitions = (
  children: ReadonlyArray<IRChild>,
  adapterKinds: ReadonlySet<string>,
): Array<LayoutPreviewDefinitionName> => collectPreviewDefinitions(children, new Set(), adapterKinds, new Set()).layout;

const standardCanonicalId = (kind: string, embedId: string): string => {
  if (kind === 'frame') return `${embedId}/frame`;
  if (kind === 'surface') return `${embedId}/surface`;
  return embedId;
};

const reservePreviewIds = (children: ReadonlyArray<IRChild>, ctx: Ctx): void => {
  const visit = (child: IRChild): void => {
    if ('namespace' in child) {
      if (child.namespace === 'standard' && typeof (child as { id?: unknown }).id === 'string') {
        const kind = child.type;
        if (STANDARD_HELPER_ORDER.includes(kind)) {
          const authoredId = (child as unknown as { id: string }).id;
          const count = (ctx.standardCounts.get(kind) ?? 0) + 1;
          ctx.standardCounts.set(kind, count);
          const embedId = `preview-${kind}-${count}`;
          const generatedId = standardCanonicalId(kind, embedId);
          ctx.generatedIds.set(authoredId, generatedId);
          ctx.generatedIds.set(generatedId, generatedId);
          if (kind === 'frame') ctx.generatedIds.set(`${authoredId}/${kind}`, generatedId);
        }
      }
      if (child.namespace === 'layout' && typeof (child as { id?: unknown }).id === 'string') {
        const kind = child.type;
        if (LAYOUT_HELPER_ORDER.includes(kind)) {
          const authoredId = (child as unknown as { id: string }).id;
          const count = (ctx.layoutCounts.get(kind) ?? 0) + 1;
          ctx.layoutCounts.set(kind, count);
          const embedId = `preview-${kind}-${count}`;
          ctx.generatedIds.set(authoredId, embedId);
          ctx.generatedIds.set(embedId, embedId);
        }
      }
      previewOwnedChildren(child).forEach(visit);
      return;
    }
    if (child.type === 'scope') child.children.forEach(visit);
  };
  children.forEach(visit);
  // The counters are consumed again while emitting helpers.
  ctx.standardCounts.clear();
  ctx.layoutCounts.clear();
  ctx.graphCounts.clear();
};

const standardCompositeCode = (child: IRChild, indent: number, ctx: Ctx): string => {
  const record = child as IRChild & { namespace: string; type: string; id?: string };
  const adapterName = `${record.type.charAt(0).toUpperCase()}${record.type.slice(1)}InputEmbedAdapter`;
  if (!STANDARD_HELPER_ORDER.includes(record.type) || !STANDARD_ADAPTER_ORDER.includes(adapterName)) {
    throw new Error(`Cannot generate Vanilla code for Tier 2 composite "${record.namespace}.${record.type}".`);
  }

  const count = (ctx.standardCounts.get(record.type) ?? 0) + 1;
  ctx.standardCounts.set(record.type, count);
  ctx.standardHelpers.add(record.type);
  ctx.standardAdapters.add(adapterName);
  const generatedId = `preview-${record.type}-${count}`;
  if (record.type === 'surface') {
    const surface = record as typeof record & { child: IRChild };
    if ('namespace' in surface.child) {
      throw new Error('Cannot generate Vanilla Surface code for a nested Tier 2 child.');
    }
    ctx.standardHelpers.add('surfaceChild');
    const input = stripKeys(record, ['namespace', 'type', 'id', 'child']);
    const surfaceChildCode = childCode(surface.child, indent + 1, ctx);
    return `surface(${formatString(generatedId)}, ${formatObject({ ...input, child: '__SURFACE_CHILD__' }, indent).replace("'__SURFACE_CHILD__'", `surfaceChild(${surfaceChildCode})`)})`;
  }
  const input = stripKeys(record, record.type === 'frame' ? ['namespace', 'type', 'id'] : ['namespace', 'type']);
  return `${record.type}(${formatString(generatedId)}, ${formatObject(input, indent)})`;
};

const layoutCompositeCode = (child: IRChild, indent: number, ctx: Ctx): string => {
  const record = child as IRChild & { namespace: string; type: string; id?: string };
  const adapterName = `${record.type.charAt(0).toUpperCase()}${record.type.slice(1)}InputEmbedAdapter`;
  if (!LAYOUT_HELPER_ORDER.includes(record.type) || !LAYOUT_ADAPTER_ORDER.includes(adapterName)) {
    throw new Error(`Cannot generate Vanilla code for Tier 2 composite "${record.namespace}.${record.type}".`);
  }

  const count = (ctx.layoutCounts.get(record.type) ?? 0) + 1;
  ctx.layoutCounts.set(record.type, count);
  ctx.layoutHelpers.add(record.type);
  ctx.layoutAdapters.add(adapterName);
  const generatedId = `preview-${record.type}-${count}`;
  const input = stripKeys(record, ['namespace', 'type']);
  return `${record.type}(${formatString(generatedId)}, ${formatObject(input, indent)})`;
};

const graphAuthoringCode = (graph: IRGraph, indent: number, ctx: Ctx): string => {
  const input = graphPreviewAuthoringInput(graph);
  const replacements = new Map<string, string>();
  let slot = 0;
  const encodeChild = (child: IRChild): string => {
    const placeholder = `__GRAPH_CONTENT_CHILD_${slot++}__`;
    replacements.set(formatString(placeholder), childCode(child, indent + 2, ctx));
    return placeholder;
  };
  const encodeGraphChild = (child: InputGraphChild): unknown => {
    if (!('namespace' in child)) {
      if (child.type !== 'entity' && child.type !== 'relation') {
        return encodeChild(child as IRChild);
      }
      return child;
    }
    return encodeChild(child);
  };
  const children = input.children?.map(encodeGraphChild);
  const encoded: Record<string, unknown> = {
    ...input,
    ...(children === undefined ? {} : { children }),
    graphThemeStyles: '__GRAPH_THEME_STYLES__',
  };
  let code = formatObject(encoded, indent).replace("'__GRAPH_THEME_STYLES__'", 'PreviewThemeDefinitionBundle.graph');
  for (const [placeholder, child] of replacements) code = code.split(placeholder).join(child);
  return code;
};

const groupAuthoringCode = (group: IRGroup, indent: number, ctx: Ctx): string => {
  const { namespace: _namespace, type: _type, children: sourceChildren, ...input } = group;
  void _namespace;
  void _type;
  const replacements = new Map<string, string>();
  const children = sourceChildren?.map((child, index) => {
    const placeholder = `__GROUP_CONTENT_CHILD_${index}__`;
    replacements.set(formatString(placeholder), childCode(child, indent + 2, ctx));
    return placeholder;
  });
  const encoded: Record<string, unknown> = {
    ...input,
    ...(children === undefined ? {} : { children }),
    graphThemeStyles: '__GRAPH_THEME_STYLES__',
  };
  let code = formatObject(encoded, indent).replace("'__GRAPH_THEME_STYLES__'", 'PreviewThemeDefinitionBundle.graph');
  for (const [placeholder, child] of replacements) code = code.split(placeholder).join(child);
  return code;
};

const blockAuthoringCode = (block: IRBlock, indent: number, ctx: Ctx): string => {
  const { namespace: _namespace, type: _type, children: sourceChildren, ...input } = block;
  void _namespace;
  void _type;
  const replacements = new Map<string, string>();
  const children = sourceChildren?.map((child, index) => {
    const placeholder = `__BLOCK_CONTENT_CHILD_${index}__`;
    replacements.set(formatString(placeholder), childCode(child, indent + 2, ctx));
    return placeholder;
  });
  const encoded: Record<string, unknown> = {
    ...input,
    ...(children === undefined ? {} : { children }),
    graphThemeStyles: '__GRAPH_THEME_STYLES__',
  };
  let code = formatObject(encoded, indent).replace("'__GRAPH_THEME_STYLES__'", 'PreviewThemeDefinitionBundle.graph');
  for (const [placeholder, child] of replacements) code = code.split(placeholder).join(child);
  return code;
};

const blockHeaderAuthoringCode = (header: IRBlockHeader, indent: number, ctx: Ctx): string => {
  const { namespace: _namespace, type: _type, icon, trail, ...input } = header;
  void _namespace;
  void _type;
  const replacements = new Map<string, string>();
  const encodeSlot = (child: IRChild, slot: string): string => {
    const placeholder = `__BLOCK_HEADER_${slot.toUpperCase()}__`;
    replacements.set(formatString(placeholder), childCode(child, indent + 2, ctx));
    return placeholder;
  };
  const encoded = {
    ...input,
    ...(icon === undefined ? {} : { icon: encodeSlot(icon, 'icon') }),
    ...(trail === undefined ? {} : { trail: encodeSlot(trail, 'trail') }),
    graphThemeStyles: '__GRAPH_THEME_STYLES__',
  };
  let code = formatObject(encoded, indent).replace("'__GRAPH_THEME_STYLES__'", 'PreviewThemeDefinitionBundle.graph');
  for (const [placeholder, child] of replacements) code = code.split(placeholder).join(child);
  return code;
};

const blockSectionAuthoringCode = (section: IRBlockSection, indent: number, ctx: Ctx): string => {
  const { namespace: _namespace, type: _type, children: sourceChildren, ...input } = section;
  void _namespace;
  void _type;
  const replacements = new Map<string, string>();
  const children = sourceChildren?.map((child, index) => {
    const placeholder = `__BLOCK_SECTION_CHILD_${index}__`;
    replacements.set(formatString(placeholder), childCode(child, indent + 2, ctx));
    return placeholder;
  });
  const encoded = {
    ...input,
    ...(children === undefined ? {} : { children }),
    graphThemeStyles: '__GRAPH_THEME_STYLES__',
  };
  let code = formatObject(encoded, indent).replace("'__GRAPH_THEME_STYLES__'", 'PreviewThemeDefinitionBundle.graph');
  for (const [placeholder, child] of replacements) code = code.split(placeholder).join(child);
  return code;
};

const blockRowAuthoringCode = (row: IRBlockRow, indent: number, ctx: Ctx): string => {
  if ('content' in row) {
    const { namespace: _namespace, type: _type, ...input } = row;
    void _namespace;
    void _type;
    return formatObject({ ...input, graphThemeStyles: '__GRAPH_THEME_STYLES__' }, indent).replace(
      "'__GRAPH_THEME_STYLES__'",
      'PreviewThemeDefinitionBundle.graph',
    );
  }
  const { namespace: _namespace, type: _type, children: sourceChildren, ...input } = row;
  void _namespace;
  void _type;
  const replacements = new Map<string, string>();
  const children = sourceChildren?.map((child, index) => {
    const placeholder = `__BLOCK_ROW_CHILD_${index}__`;
    replacements.set(formatString(placeholder), childCode(child, indent + 2, ctx));
    return placeholder;
  });
  const encoded = {
    ...input,
    ...(children === undefined ? {} : { children }),
    graphThemeStyles: '__GRAPH_THEME_STYLES__',
  };
  let code = formatObject(encoded, indent).replace("'__GRAPH_THEME_STYLES__'", 'PreviewThemeDefinitionBundle.graph');
  for (const [placeholder, child] of replacements) code = code.split(placeholder).join(child);
  return code;
};

const graphCompositeCode = (child: IRChild, indent: number, ctx: Ctx): string => {
  const record = child as IRChild & { namespace: string; type: string };
  const helperName = record.type;
  const adapterName = `${helperName.charAt(0).toUpperCase()}${helperName.slice(1)}InputEmbedAdapter`;
  if (!GRAPH_HELPER_ORDER.includes(helperName) || !GRAPH_ADAPTER_ORDER.includes(adapterName)) {
    throw new Error(`Cannot generate Vanilla code for Tier 2 composite "${record.namespace}.${record.type}".`);
  }
  const count = (ctx.graphCounts.get(helperName) ?? 0) + 1;
  ctx.graphCounts.set(helperName, count);
  ctx.graphHelpers.add(helperName);
  ctx.graphAdapters.add(adapterName);
  const embedId = `preview-${helperName}-${count}`;
  if (helperName === 'graph') {
    return `graph(${formatString(embedId)}, ${graphAuthoringCode(GraphSchema.parse(child), indent, ctx)})`;
  }
  if (helperName === 'group') {
    return `group(${formatString(embedId)}, ${groupAuthoringCode(GroupSchema.parse(child), indent, ctx)})`;
  }
  if (helperName === 'block') {
    return `block(${formatString(embedId)}, ${blockAuthoringCode(BlockSchema.parse(child), indent, ctx)})`;
  }
  if (helperName === 'blockHeader') {
    return `blockHeader(${formatString(embedId)}, ${blockHeaderAuthoringCode(BlockHeaderSchema.parse(child), indent, ctx)})`;
  }
  if (helperName === 'blockSection') {
    return `blockSection(${formatString(embedId)}, ${blockSectionAuthoringCode(BlockSectionSchema.parse(child), indent, ctx)})`;
  }
  if (helperName === 'blockRow') {
    return `blockRow(${formatString(embedId)}, ${blockRowAuthoringCode(BlockRowSchema.parse(child), indent, ctx)})`;
  }
  if (helperName === 'entity') {
    const input = {
      ...entityPreviewAuthoringInput(EntitySchema.parse(child)),
      graphThemeStyles: '__GRAPH_THEME_STYLES__',
    };
    return `entity(${formatString(embedId)}, ${formatObject(input, indent).replace("'__GRAPH_THEME_STYLES__'", 'PreviewThemeDefinitionBundle.graph')})`;
  }
  const input = {
    ...relationPreviewAuthoringInput(RelationSchema.parse(child)),
    graphThemeStyles: '__GRAPH_THEME_STYLES__',
  };
  return `relation(${formatString(embedId)}, ${formatObject(input, indent).replace("'__GRAPH_THEME_STYLES__'", 'PreviewThemeDefinitionBundle.graph')})`;
};

const childCode = (child: IRChild, indent: number, ctx: Ctx): string => {
  if ('namespace' in child) {
    if (child.namespace === 'standard') return standardCompositeCode(child, indent, ctx);
    if (child.namespace === 'layout') return layoutCompositeCode(child, indent, ctx);
    if (child.namespace === 'graph') return graphCompositeCode(child, indent, ctx);
    throw new Error(`Cannot generate Vanilla code for Tier 2 composite "${child.namespace}.${child.type}".`);
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
  const lines = children.map(child => `${pad(indent + 1)}${childCode(child, indent + 1, ctx)},`);
  return `[\n${lines.join('\n')}\n${pad(indent)}]`;
};

const HELPER_ORDER: ReadonlyArray<string> = ['scene', 'node', 'path', 'coordinate', 'scope'];

/** 从纯 IR 生成不含运行时 authoring sidecar 的 Vanilla 示例代码 */
export const irToVanillaCode = (ir: IRScene, options: IrToVanillaCodeOptions = {}): string => {
  const ctx: Ctx = {
    used: new Set(['scene']),
    usesDrawWay: false,
    standardHelpers: new Set(),
    standardAdapters: new Set(),
    standardCounts: new Map(),
    layoutHelpers: new Set(),
    layoutAdapters: new Set(),
    layoutCounts: new Map(),
    graphHelpers: new Set(),
    graphAdapters: new Set(),
    graphCounts: new Map(),
    generatedIds: new Map(),
  };
  reservePreviewIds(ir.children, ctx);
  const childrenStr = childListCode(ir.children, 0, ctx);
  const figureConfig = {
    ...(options.theme === undefined ? {} : { theme: options.theme }),
    ...(ir.viewBox ? { viewBox: ir.viewBox } : {}),
    ...(ir.animations ? { animations: ir.animations } : {}),
    children: ir.children,
  };
  const figureArgs = formatObject({ ...figureConfig, children: '__CHILDREN__' }, 0).replace(
    "'__CHILDREN__'",
    childrenStr,
  );

  const helpers = HELPER_ORDER.filter(name => ctx.used.has(name));
  const imports = [`import { ${helpers.join(', ')} } from '@retikz/vanilla';`];
  if (ctx.usesDrawWay) imports.push("import { DrawWay } from '@retikz/core';");
  const standardHelpers = STANDARD_HELPER_ORDER.filter(name => ctx.standardHelpers.has(name));
  const standardAdapters = STANDARD_ADAPTER_ORDER.filter(name => ctx.standardAdapters.has(name));
  const layoutHelpers = LAYOUT_HELPER_ORDER.filter(name => ctx.layoutHelpers.has(name));
  const layoutAdapters = LAYOUT_ADAPTER_ORDER.filter(name => ctx.layoutAdapters.has(name));
  const graphHelpers = GRAPH_HELPER_ORDER.filter(name => ctx.graphHelpers.has(name));
  const graphAdapters = GRAPH_ADAPTER_ORDER.filter(name => ctx.graphAdapters.has(name));
  const definitions = collectPreviewDefinitions(
    ir.children,
    new Set(ctx.standardCounts.keys()),
    new Set(ctx.layoutCounts.keys()),
    new Set(ctx.graphCounts.keys()),
  );
  if (standardHelpers.length > 0) {
    imports.push(`import { ${[...standardHelpers, ...standardAdapters].join(', ')} } from '@retikz/standard-vanilla';`);
  }
  if (layoutHelpers.length > 0) {
    imports.push(`import { ${[...layoutHelpers, ...layoutAdapters].join(', ')} } from '@retikz/layout-vanilla';`);
  }
  if (graphHelpers.length > 0) {
    imports.push(`import { ${[...graphHelpers, ...graphAdapters].join(', ')} } from '@retikz/graph-vanilla';`);
    imports.push("import { PreviewThemeDefinitionBundle } from '@/modules/docs/components/component-preview/theme';");
  }
  if (definitions.standard.length > 0) {
    imports.push(`import { ${definitions.standard.join(', ')} } from '@retikz/standard';`);
  }
  if (definitions.layout.length > 0) {
    imports.push(`import { ${definitions.layout.join(', ')} } from '@retikz/layout';`);
  }
  if (definitions.graph.length > 0) {
    imports.push(`import { ${definitions.graph.join(', ')} } from '@retikz/graph';`);
  }

  const adapters = [...standardAdapters, ...layoutAdapters, ...graphAdapters];
  const adapterCode = adapters.length > 0 ? `\nconst adapters = [${adapters.join(', ')}];\n` : '';
  const definitionNames = [...definitions.standard, ...definitions.layout, ...definitions.graph];
  const compileEntries = [
    ...(graphHelpers.length > 0 ? ['themeStyles: PreviewThemeDefinitionBundle.core'] : []),
    ...(definitionNames.length > 0 ? [`composites: [${definitionNames.join(', ')}]`] : []),
  ];
  const compile = compileEntries.length > 0 ? `\nconst compile = { ${compileEntries.join(', ')} };\n` : '';
  return `${imports.join('\n')}\n\nconst input = scene(${figureArgs});\n${adapterCode}${compile}`;
};

/** 把 JSON-safe 值格式化为 Vanilla 示例使用的 TypeScript 字面量。 */
export const formatVanillaValue = (value: unknown): string => formatValue(value, 0);
