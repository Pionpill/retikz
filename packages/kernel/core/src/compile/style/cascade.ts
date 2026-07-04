import type {
  IRArrowDetail,
  IRArrowEndDetail,
  IRArrowMark,
  IRDrawableStyle,
  IRFont,
  IRGeometryLabel,
  IRLabelDefault,
  IRNode,
  IRPathBase,
  IRScope,
  IRStep,
  StyleChannel,
} from '../../schemas';

/**
 * scope 级联 graphic state——主色 color + 跨类共享分项
 * @description 级联到 scope 内全部元素（= TikZ scope option / current color）
 */
type CascadeState = Pick<
  IRScope,
  'color' | 'stroke' | 'fill' | 'strokeWidth' | 'opacity' | 'fillOpacity' | 'drawOpacity'
>;

/**
 * 单层 scope 的样式 frame——compile 维护 frame 栈做 inside-out per-field 解析
 * @description 级联 graphic state + 四通道 every-X 默认 + resetStyle 屏障；从 IRScope 抽取（createStyleFrame）
 */
export type StyleFrame = {
  /** 级联 graphic state（主色 + 跨类共享分项） */
  cascade: CascadeState;
  /** every node 默认 */
  nodeDefault?: IRScope['nodeDefault'];
  /** every path 默认 */
  pathDefault?: IRScope['pathDefault'];
  /** every label 默认（node label + step label 共享） */
  labelDefault?: IRLabelDefault;
  /** every arrow 默认 */
  arrowDefault?: IRArrowDetail;
  /** 朝外的继承屏障：切外层对应通道 */
  resetStyle?: IRScope['resetStyle'];
};

/** 拷贝源对象中 `!== undefined` 的字段（per-field 合并按存在性，不按真假值） */
const pickDefinedKeys = <T extends object>(src: T): Partial<T> => {
  const out: Partial<T> = {};
  for (const key of Object.keys(src) as Array<keyof T>) {
    const value = src[key];
    if (value !== undefined) out[key] = value;
  }
  return out;
};

const DRAWABLE_STYLE_KEYS = [
  'color',
  'fill',
  'fillOpacity',
  'stroke',
  'strokeWidth',
  'drawOpacity',
  'opacity',
  'shadow',
  'blendMode',
] as const satisfies ReadonlyArray<keyof IRDrawableStyle>;

const pickDrawableStyle = (src: Partial<IRDrawableStyle>): Partial<IRDrawableStyle> => {
  const entries = DRAWABLE_STYLE_KEYS.flatMap(key => {
    const value = src[key];
    return value === undefined ? [] : ([[key, value]] as const);
  });
  return Object.fromEntries(entries);
};

/**
 * 从 IRScope 抽取样式 frame
 * @description 只摘样式相关字段（级联 graphic state + 四通道 + resetStyle）；transforms / id / localNamespace 与样式正交，不进 frame
 */
export const createStyleFrame = (scope: IRScope): StyleFrame => {
  const cascade: CascadeState = {};
  if (scope.color !== undefined) cascade.color = scope.color;
  if (scope.stroke !== undefined) cascade.stroke = scope.stroke;
  if (scope.fill !== undefined) cascade.fill = scope.fill;
  if (scope.strokeWidth !== undefined) cascade.strokeWidth = scope.strokeWidth;
  if (scope.opacity !== undefined) cascade.opacity = scope.opacity;
  if (scope.fillOpacity !== undefined) cascade.fillOpacity = scope.fillOpacity;
  if (scope.drawOpacity !== undefined) cascade.drawOpacity = scope.drawOpacity;
  const frame: StyleFrame = { cascade };
  if (scope.nodeDefault) frame.nodeDefault = scope.nodeDefault;
  if (scope.pathDefault) frame.pathDefault = scope.pathDefault;
  if (scope.labelDefault) frame.labelDefault = scope.labelDefault;
  if (scope.arrowDefault) frame.arrowDefault = scope.arrowDefault;
  if (scope.resetStyle !== undefined) frame.resetStyle = scope.resetStyle;
  return frame;
};

/** resetStyle 是否切某通道 */
const cuts = (reset: StyleFrame['resetStyle'], channel: StyleChannel): boolean => {
  if (reset === undefined || reset === false) return false;
  if (reset === true) return true;
  return reset.includes(channel);
};

// ===========================================================================
// 主色展开（同源内分项覆盖主色）
// ===========================================================================

/** 级联 graphic state 投影到 node 样式字段（主色展开：stroke / fill / textColor 默认随 color） */
const cascadeToNode = (c: CascadeState): Partial<IRNode> => {
  const out: Partial<IRNode> = {};
  const master = c.color;
  const stroke = c.stroke ?? master;
  if (stroke !== undefined) out.stroke = stroke;
  const fill = c.fill ?? master;
  if (fill !== undefined) out.fill = fill;
  if (master !== undefined) out.textColor = master;
  if (c.strokeWidth !== undefined) out.strokeWidth = c.strokeWidth;
  if (c.opacity !== undefined) out.opacity = c.opacity;
  if (c.fillOpacity !== undefined) out.fillOpacity = c.fillOpacity;
  if (c.drawOpacity !== undefined) out.drawOpacity = c.drawOpacity;
  return out;
};

/** 级联 graphic state 投影到 path 样式字段（主色展开 stroke；path fill 不随主色——与 TikZ 一致） */
const cascadeToPath = (c: CascadeState): Partial<IRPathBase> => {
  const out: Partial<IRPathBase> = {};
  const stroke = c.stroke ?? c.color;
  if (stroke !== undefined) out.stroke = stroke;
  if (c.fill !== undefined) out.fill = c.fill;
  if (c.strokeWidth !== undefined) out.strokeWidth = c.strokeWidth;
  if (c.opacity !== undefined) out.opacity = c.opacity;
  if (c.fillOpacity !== undefined) out.fillOpacity = c.fillOpacity;
  if (c.drawOpacity !== undefined) out.drawOpacity = c.drawOpacity;
  return out;
};

/** Cascaded graphic state projected to ribbon style. Ribbon is a filled path-like area. */
const cascadeToRibbon = (c: CascadeState): Partial<IRPathBase> => {
  const out: Partial<IRPathBase> = {};
  const fill = c.fill ?? c.color;
  if (fill !== undefined) out.fill = fill;
  if (c.stroke !== undefined) out.stroke = c.stroke;
  if (c.strokeWidth !== undefined) out.strokeWidth = c.strokeWidth;
  if (c.opacity !== undefined) out.opacity = c.opacity;
  if (c.fillOpacity !== undefined) out.fillOpacity = c.fillOpacity;
  if (c.drawOpacity !== undefined) out.drawOpacity = c.drawOpacity;
  return out;
};

/** node 源同源主色展开：未显式给的 stroke / fill / textColor 取该源 color */
const expandNodeColor = (src: Partial<IRNode>): Partial<IRNode> => {
  const out: Partial<IRNode> = { ...src };
  const master = src.color;
  if (master !== undefined) {
    if (out.stroke === undefined) out.stroke = master;
    if (out.fill === undefined) out.fill = master;
    if (out.textColor === undefined) out.textColor = master;
  }
  return out;
};

/** path 源同源主色展开：未显式给的 stroke 取该源 color（fill 不随主色） */
const expandPathColor = (src: Partial<IRPathBase>): Partial<IRPathBase> => {
  const out: Partial<IRPathBase> = { ...src };
  if (src.color !== undefined && out.stroke === undefined) out.stroke = src.color;
  return out;
};

const expandRibbonColor = (src: Partial<IRPathBase>): Partial<IRPathBase> => {
  const out: Partial<IRPathBase> = { ...src };
  if (src.color !== undefined && out.fill === undefined) out.fill = src.color;
  return out;
};

// ===========================================================================
// 元素样式解析（fold style frame 栈 + 元素显式）
// ===========================================================================

/** 解析 node 的最终样式，元素显式字段优先于 scope 默认样式。 */
export const resolveNodeStyle = (node: IRNode, stack: ReadonlyArray<StyleFrame>): IRNode => {
  let acc: Partial<IRNode> = {};
  for (const frame of stack) {
    if (cuts(frame.resetStyle, 'node')) acc = {};
    acc = { ...acc, ...pickDefinedKeys(cascadeToNode(frame.cascade)) };
    if (frame.nodeDefault) {
      acc = { ...acc, ...pickDefinedKeys(expandNodeColor(frame.nodeDefault)) };
    }
  }
  // 元素源含 type / position / id / text / label —— 让位置 / 文本 / 标签随元素，不被外层污染
  acc = { ...acc, ...pickDefinedKeys(expandNodeColor(node)) };
  return acc as IRNode;
};

/** fold labelDefault 通道（node label + step label 共享）；resetStyle('label') 丢外层 */
export const resolveLabelDefault = (stack: ReadonlyArray<StyleFrame>): IRLabelDefault => {
  let acc: IRLabelDefault = {};
  for (const frame of stack) {
    if (cuts(frame.resetStyle, 'label')) acc = {};
    if (frame.labelDefault) acc = { ...acc, ...pickDefinedKeys(frame.labelDefault) };
  }
  return acc;
};

/** 逐字段合并字体（a 优先，缺字段回退 b）；都空返回 undefined */
const mergeFont = (a: IRFont | undefined, b: IRFont | undefined): IRFont | undefined => {
  if (a === undefined) return b;
  if (b === undefined) return a;
  const out: IRFont = {};
  const family = a.family ?? b.family;
  if (family !== undefined) out.family = family;
  const size = a.size ?? b.size;
  if (size !== undefined) out.size = size;
  const weight = a.weight ?? b.weight;
  if (weight !== undefined) out.weight = weight;
  const style = a.style ?? b.style;
  if (style !== undefined) out.style = style;
  return out;
};

/** 解析 path label 的最终样式，并让缺省文字色跟随宿主 path 主色。 */
const resolveGeometryLabel = (
  label: IRGeometryLabel,
  labelDefault: IRLabelDefault,
  masterColor: string | undefined,
): IRGeometryLabel => {
  const out: IRGeometryLabel = { ...label };
  const textColor = label.textColor ?? labelDefault.textColor ?? labelDefault.color ?? masterColor;
  if (textColor !== undefined) out.textColor = textColor;
  else delete out.textColor;
  const font = mergeFont(label.font, labelDefault.font);
  if (font !== undefined) out.font = font;
  const opacity = label.opacity ?? labelDefault.opacity;
  if (opacity !== undefined) out.opacity = opacity;
  return out;
};

/** per-field 合并 arrow 端点 spec（b 覆盖 a 的 defined 字段；返回新对象，不共享引用） */
const mergeArrowEnd = (
  a: IRArrowEndDetail | undefined,
  b: IRArrowEndDetail | undefined,
): IRArrowEndDetail | undefined => {
  if (a === undefined) return b === undefined ? undefined : { ...b };
  if (b === undefined) return { ...a };
  return { ...a, ...pickDefinedKeys(b) };
};

/** per-field 合并 arrow detail：顶层 + start / end 各自 nested per-field merge（返回新对象，不共享引用） */
const mergeArrowDetail = (a: IRArrowDetail, b: IRArrowDetail): IRArrowDetail => {
  const { start: aStart, end: aEnd, ...aTop } = a;
  const { start: bStart, end: bEnd, ...bTop } = b;
  const out: IRArrowDetail = { ...aTop, ...pickDefinedKeys(bTop) };
  const start = mergeArrowEnd(aStart, bStart);
  if (start !== undefined) out.start = start;
  const end = mergeArrowEnd(aEnd, bEnd);
  if (end !== undefined) out.end = end;
  return out;
};

/** 去掉端点 spec 的 color（让端点 color 回退到顶层主色）；返回新对象 */
const dropArrowEndColor = (end: IRArrowEndDetail): IRArrowEndDetail => {
  const next = { ...end };
  delete next.color;
  return next;
};

/** 解析 arrow detail，并让缺省箭头色跟随宿主 path 主色。 */
const resolveArrowDetail = (
  explicit: IRArrowDetail | undefined,
  stack: ReadonlyArray<StyleFrame>,
  masterColor: string | undefined,
): IRArrowDetail | undefined => {
  let acc: IRArrowDetail = {};
  let touched = false;
  for (const frame of stack) {
    if (cuts(frame.resetStyle, 'arrow')) {
      acc = {};
      touched = false;
    }
    if (frame.arrowDefault) {
      acc = mergeArrowDetail(acc, frame.arrowDefault);
      touched = true;
    }
  }
  // host 轴：箭头跟宿主 path 已解析主色——覆盖 arrowDefault 来源的 color（顶层 + start / end 端点），
  // 让端点 color 回退到顶层主色；仍低于元素显式 arrowDetail（下面 merge 覆盖）
  if (masterColor !== undefined) {
    acc.color = masterColor;
    if (acc.start !== undefined) acc.start = dropArrowEndColor(acc.start);
    if (acc.end !== undefined) acc.end = dropArrowEndColor(acc.end);
    touched = true;
  }
  if (explicit) {
    acc = mergeArrowDetail(acc, explicit);
    touched = true;
  }
  return touched ? acc : undefined;
};

const arrowMarkFromDetail = (detail: IRArrowEndDetail | undefined): Omit<IRArrowMark, 'kind'> => {
  if (detail === undefined) return {};
  return pickDefinedKeys(detail);
};

const resolveArrowMark = (
  mark: IRArrowMark,
  pos: number,
  stack: ReadonlyArray<StyleFrame>,
  masterColor: string | undefined,
): IRArrowMark => {
  const detail = resolveArrowDetail(undefined, stack, masterColor);
  if (detail === undefined) return mark;
  const { start, end, ...top } = detail;
  const side = pos === 0 ? start : pos === 1 ? end : undefined;
  return {
    kind: 'arrow',
    ...arrowMarkFromDetail(top),
    ...arrowMarkFromDetail(side),
    ...pickDefinedKeys(mark),
  };
};

const resolvePathMarks = (
  marks: IRPathBase['marks'] | undefined,
  stack: ReadonlyArray<StyleFrame>,
  masterColor: string | undefined,
): IRPathBase['marks'] | undefined => {
  if (marks === undefined) return undefined;
  return marks.map(item => ({ ...item, mark: resolveArrowMark(item.mark, item.pos, stack, masterColor) }));
};

/** 替换 path children 中各 step 的 label 为已解析 effective label */
const resolveStepLabels = (
  children: ReadonlyArray<IRStep>,
  labelDefault: IRLabelDefault,
  masterColor: string | undefined,
): Array<IRStep> =>
  children.map(step => {
    if ('label' in step && step.label !== undefined) {
      return { ...step, label: resolveGeometryLabel(step.label, labelDefault, masterColor) };
    }
    return step;
  });

const resolveGeometryLabelField = (
  label: IRGeometryLabel | Array<IRGeometryLabel> | undefined,
  labelDefault: IRLabelDefault,
  masterColor: string | undefined,
): IRGeometryLabel | Array<IRGeometryLabel> | undefined => {
  if (label === undefined) return undefined;
  if (Array.isArray(label)) {
    return label.map(item => resolveGeometryLabel(item, labelDefault, masterColor));
  }
  return resolveGeometryLabel(label, labelDefault, masterColor);
};

/**
 * 解析 path 的最终样式。
 * @description arrow 和 step label 的缺省颜色跟随宿主 path 主色。
 */
export const resolveEffectivePath = (path: IRPathBase, stack: ReadonlyArray<StyleFrame>): IRPathBase => {
  let acc: Partial<IRPathBase> = {};
  let masterColor: string | undefined;
  const pathKind = path.kind ?? 'stroke';
  const isRibbon = pathKind === 'ribbon';
  for (const frame of stack) {
    if (cuts(frame.resetStyle, 'path')) {
      acc = {};
      masterColor = undefined;
    }
    if (frame.cascade.color !== undefined) masterColor = frame.cascade.color;
    acc = {
      ...acc,
      ...pickDefinedKeys(isRibbon ? cascadeToRibbon(frame.cascade) : cascadeToPath(frame.cascade)),
    };
    if (frame.pathDefault) {
      if (frame.pathDefault.color !== undefined) masterColor = frame.pathDefault.color;
      acc = {
        ...acc,
        ...pickDefinedKeys(
          isRibbon ? expandRibbonColor(pickDrawableStyle(frame.pathDefault)) : expandPathColor(frame.pathDefault),
        ),
      };
    }
  }
  if (path.color !== undefined) masterColor = path.color;
  // 元素源含 type / children / arrow / arrowDetail —— 后续覆盖 arrowDetail / children
  acc = {
    ...acc,
    ...pickDefinedKeys(isRibbon ? expandRibbonColor(path) : expandPathColor(path)),
  };
  const effective = acc as IRPathBase;

  const labelDefault = resolveLabelDefault(stack);
  if (isRibbon) delete effective.marks;
  else effective.marks = resolvePathMarks(path.marks, stack, masterColor);
  if (path.children !== undefined) {
    effective.children = resolveStepLabels(path.children, labelDefault, masterColor);
  } else {
    delete effective.children;
  }
  const label = resolveGeometryLabelField(path.label, labelDefault, masterColor);
  if (label !== undefined) effective.label = label;
  return effective;
};
