/** ComponentPreview 套件内部共享：类型、对齐 class 表、IR 格式化 */

import type { ReactNode } from 'react';

export type Transform = { x: number; y: number; scale: number };

/** 源码视图切换：React 源码 / IR JSON / Vanilla builder 代码 */
export type SourceView = 'react' | 'ir' | 'vanilla';

/** 视图展示顺序（toggle 按这个顺序渲染可用视图）：vanilla 夹在 react 与 ir 之间 */
export const SOURCE_VIEW_ORDER: ReadonlyArray<SourceView> = ['react', 'vanilla', 'ir'];

/**
 * 从 source 算出可用视图列表（固定顺序）
 * @description 一个视图「可用」= 它有至少一个源码文件。≥ 2 个可用视图才出视图切换；单视图直接展示、零视图不渲染代码面板。
 */
export const availableSourceViews = (source: ComponentRenderSource): Array<SourceView> =>
  SOURCE_VIEW_ORDER.filter(v => (source[v]?.files.length ?? 0) > 0);

/** demo 渲染目标：SVG DOM 或 Canvas 2D */
export type RendererMode = 'svg' | 'canvas';

/**
 * 预览卡的动作 / 浮层共享上下文：工具从中按需取能力
 * @description 设计成「只增不破」——未来加字段（如 subscribeFrame / metrics 供性能监视器）不影响已有 action / overlay。
 */
export type PreviewActionContext = {
  /** 重挂渲染子树（重播：CSS @keyframes / Canvas rAF / WAAPI 全部从头） */
  replay: () => void;
  /** 当前渲染目标 */
  rendererMode: RendererMode;
  /** 渲染区 DOM（拿 svg / canvas、`getAnimations({subtree})` 等） */
  renderPane: HTMLElement | null;
  /** 读 per-card 工具开关态（toggle 类工具，如播放/暂停、性能监视器） */
  active: (id: string) => boolean;
  /** 写 / 翻转 per-card 工具开关态（`on` 省略 = 翻转） */
  setActive: (id: string, on?: boolean) => void;
};

/** 渲染区左上角的工具按钮（重播 / 播放暂停 / 停止 / 未来性能监视器开关 …） */
export type PreviewAction = {
  /** 稳定 id（兼作 toolState key） */
  id: string;
  /** 图标元素 */
  icon: ReactNode;
  /** aria-label + title */
  label: string;
  /** 受控按下态（toggle 类工具高亮）；one-shot 工具省略 */
  active?: boolean;
  /** 点击：从 ctx 取能力执行 */
  onClick: (ctx: PreviewActionContext) => void;
};

/** 渲染区内的常驻浮层（角标 / 面板，如 FPS 监视器）；与 action 分离，按需渲染自身 UI */
export type PreviewOverlay = {
  /** 稳定 id */
  id: string;
  /** 渲染浮层节点（自管定位 / 显隐，可读 ctx 的开关态） */
  render: (ctx: PreviewActionContext) => ReactNode;
};

export const alignClass = {
  center: 'items-center',
  start: 'items-start',
  end: 'items-end',
} as const;

export type AlignKey = keyof typeof alignClass;

/**
 * 预览区高度档位
 * @description mobile / sm 双断点；`md` 是默认值；叙述性插图用 xs / sm，带交互的大型 demo 用 lg / xl / xxl / xxxl。
 * 高度 class 一律写字面量（不动态拼字符串），保证 Tailwind JIT 能静态扫到
 */
export const sizeClass = {
  xs: 'h-32 sm:h-40',
  sm: 'h-44 sm:h-56',
  md: 'h-56 sm:h-72',
  lg: 'h-72 sm:h-96',
  xl: 'h-96 sm:h-[28rem]',
  xxl: 'h-[28rem] sm:h-[32rem]',
  xxxl: 'h-[32rem] sm:h-[40rem]',
} as const;

export type SizeKey = keyof typeof sizeClass;

/** size 档位的展示顺序（从小到大）；切换 UI 按这个数组渲染 */
export const SIZE_KEYS: ReadonlyArray<SizeKey> = ['xs', 'sm', 'md', 'lg', 'xl', 'xxl', 'xxxl'];

/**
 * 格式化 IR JSON
 * @description `JSON.stringify(_, null, 2)` 会把 `[0, 0]` 这种短数组拆 4 行；post-process 把不含嵌套的纯标量短数组压回单行（限 60 字符内，避免长数组内联反而难读）
 */
export const formatIR = (ir: unknown): string =>
  JSON.stringify(ir, null, 2).replace(/\[\s*([^[\]{}]+?)\s*\]/g, (match, contents: string) => {
    const inlined = `[${contents
      .replace(/\s+/g, ' ')
      .replace(/\s*,\s*/g, ', ')
      .trim()}]`;
    return inlined.length <= 60 ? inlined : match;
  });

/** unified diff 中单行的种类：未变 / 新增 / 删除 */
export type DiffLineKind = 'context' | 'added' | 'removed';

/**
 * unified diff 结果
 * @description `code` 是展示用的拼接源码（baseline 删除行交织进 current 后逐行 join '\n'），`lineKinds` 与 `code.split('\n')` 长度严格对齐；调用方按下标染色 + 加 `+`/`-` 行首字符
 */
export type UnifiedDiff = {
  code: string;
  lineKinds: ReadonlyArray<DiffLineKind>;
};

/** 源码文件语法高亮语言 */
export type SourceLang = 'tsx' | 'ts' | 'json';

/** ComponentPreview 源码面板中的单个文件 */
export type ComponentSourceFile = {
  /** 展示在文件切换条里的文件名 */
  filename: string;
  /** 当前文件的原始源码 */
  code: string;
  /** 语法高亮语言（react→tsx、vanilla→ts、ir→json） */
  lang: SourceLang;
  /** 可选的教学 diff 数据（任意视图、任意文件都可带——不再限 React 主文件） */
  diff?: UnifiedDiff;
  /** 是否为 demo 主文件（`name` 对应文件）；用于文件选择器区分图标，sourceFiles 引入的其他文件为 false */
  isMain?: boolean;
};

/**
 * 单个源码视图的数据：一组源码文件 + 可选的「用对应 runtime 渲染」实现
 * @description react / ir / vanilla 三视图同构——每个都是一组文件（各自可带 diff），统一支持多文件 + 文件级 diff。
 *   `render` 缺省时该视图复用 React demo 的渲染（如 Tier 2 的 IR 视图无外部数据、无法独立渲染）；
 *   提供时切到该视图即用对应 runtime 真渲染（vanilla→renderPlot 出的 SVG 串、Tier 1 IR→`<Layout ir>`）。
 */
export type SourceViewData = {
  /** 该视图的源码文件（≥ 1）；> 1 时出文件分段 */
  files: Array<ComponentSourceFile>;
  /** 用对应 runtime 渲染该视图的产物；缺省则复用 React demo 渲染 */
  render?: (mode: RendererMode) => ReactNode;
};

/**
 * 演示卡的源码视图集合
 * @description 三视图全可选，每个视图是一组文件（统一模型）。任一视图有文件即该视图可用；全空 / 缺省则不渲染代码面板。
 */
export type ComponentRenderSource = Partial<Record<SourceView, SourceViewData>>;

/**
 * Diff 展示模式
 * @description off = 不显示 diff（展示真实 current 源码）；full = 完整 unified（current + removed 交织）；added = 只显示新增 + context（≈ current 源码 + 新增行染色）；removed = 只显示删除 + context（≈ baseline 视角 + 删除行染色）
 */
export type DiffMode = 'off' | 'full' | 'added' | 'removed';

/**
 * 按 mode 过滤 unified diff
 * @description added → 丢掉 removed 行（剩 added + context）；removed → 丢掉 added 行（剩 removed + context）；full → 原样返回。'off' 不走这里，调用方应直接用 current 源码
 */
export const filterDiffByMode = (diff: UnifiedDiff, mode: Exclude<DiffMode, 'off'>): UnifiedDiff => {
  if (mode === 'full') return diff;
  const lines = diff.code.split('\n');
  const skipKind: DiffLineKind = mode === 'added' ? 'removed' : 'added';
  const outLines: Array<string> = [];
  const outKinds: Array<DiffLineKind> = [];
  for (let i = 0; i < lines.length; i++) {
    if (diff.lineKinds[i] === skipKind) continue;
    outLines.push(lines[i]);
    outKinds.push(diff.lineKinds[i]);
  }
  return { code: outLines.join('\n'), lineKinds: outKinds };
};

/**
 * 按行对比两段源码，生成 unified diff（current + baseline 删除行）
 * @description 走标准 LCS 动态规划（demo 通常 < 150 行，O(m·n) 完全够用）。回溯阶段：a/b 同行 → context；a 独占 → removed（取自 baseline）；b 独占 → added（取自 current）。a/b 都耗尽前的串尾处理保持顺序稳定
 */
export const computeUnifiedDiff = (baseline: string, current: string): UnifiedDiff => {
  const a = baseline.split('\n');
  const b = current.split('\n');
  const m = a.length;
  const n = b.length;

  const lcs: Array<Array<number>> = Array.from({ length: m + 1 }, () => new Array<number>(n + 1).fill(0));
  for (let i = m - 1; i >= 0; i--) {
    for (let j = n - 1; j >= 0; j--) {
      lcs[i][j] = a[i] === b[j] ? lcs[i + 1][j + 1] + 1 : Math.max(lcs[i + 1][j], lcs[i][j + 1]);
    }
  }

  const outLines: Array<string> = [];
  const outKinds: Array<DiffLineKind> = [];
  let i = 0;
  let j = 0;
  while (i < m && j < n) {
    if (a[i] === b[j]) {
      outLines.push(b[j]);
      outKinds.push('context');
      i++;
      j++;
    } else if (lcs[i + 1][j] >= lcs[i][j + 1]) {
      outLines.push(a[i]);
      outKinds.push('removed');
      i++;
    } else {
      outLines.push(b[j]);
      outKinds.push('added');
      j++;
    }
  }
  while (i < m) {
    outLines.push(a[i]);
    outKinds.push('removed');
    i++;
  }
  while (j < n) {
    outLines.push(b[j]);
    outKinds.push('added');
    j++;
  }

  return { code: outLines.join('\n'), lineKinds: outKinds };
};
