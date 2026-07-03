import type { ReactNode } from 'react';

/** 预览区平移 / 缩放状态。 */
export type Transform = { x: number; y: number; scale: number };

/** 源码视图切换：React 源码 / IR JSON / Vanilla builder 代码。 */
export type SourceView = 'react' | 'ir' | 'vanilla';

/** demo 渲染目标：SVG DOM 或 Canvas 2D。 */
export type RendererMode = 'svg' | 'canvas';

/** 预览卡动作 / 浮层共享上下文。 */
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
  /** 读取自定义 action 值（select 类工具） */
  actionValue: (id: string) => string | undefined;
  /** 写入自定义 action 值（select 类工具） */
  setActionValue: (id: string, value: string) => void;
};

/** 渲染区左上角的工具按钮。 */
export type PreviewButtonAction = {
  type?: 'button';
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

/** 渲染区左上角的选择器动作（用于 demo 参数切换）。 */
export type PreviewSelectAction = {
  type: 'select';
  /** 稳定 id（兼作 actionValues key） */
  id: string;
  /** aria-label + title */
  label: string;
  /** 初始值；运行时优先取 actionValues 中的当前值 */
  value: string;
  /** 选择项 */
  options: Array<{ value: string; label: string }>;
  /** 切换后回调；状态写入由 PreviewActionBar 统一处理 */
  onValueChange?: (value: string, ctx: PreviewActionContext) => void;
};

/** 渲染区左上角的动作定义。 */
export type PreviewAction = PreviewButtonAction | PreviewSelectAction;

/** 自定义预览动作的选择器状态。 */
export type PreviewActionState = {
  values: Record<string, string>;
  setValue: (id: string, value: string) => void;
};

/** 渲染区内的常驻浮层（角标 / 面板，如 FPS 监视器）；与 action 分离，按需渲染自身 UI。 */
export type PreviewOverlay = {
  /** 稳定 id */
  id: string;
  /** 渲染浮层节点（自管定位 / 显隐，可读 ctx 的开关态） */
  render: (ctx: PreviewActionContext) => ReactNode;
};

/** 渲染区垂直对齐档位。 */
export type AlignKey = 'center' | 'start' | 'end';

/** 预览区高度档位。 */
export type SizeKey = 'xs' | 'sm' | 'md' | 'lg' | 'xl' | 'xxl' | 'xxxl';

/** unified diff 中单行的种类：未变 / 新增 / 删除。 */
export type DiffLineKind = 'context' | 'added' | 'removed';

/** unified diff 结果。 */
export type UnifiedDiff = {
  code: string;
  lineKinds: ReadonlyArray<DiffLineKind>;
};

/** 源码文件语法高亮语言。 */
export type SourceLang = 'tsx' | 'ts' | 'json';

/** ComponentPreview 源码面板中的单个文件。 */
export type ComponentSourceFile = {
  /** 展示在文件切换条里的文件名 */
  filename: string;
  /** 当前文件的原始源码 */
  code: string;
  /** 语法高亮语言（react→tsx、vanilla→ts、ir→json） */
  lang: SourceLang;
  /** 可选的教学 diff 数据。 */
  diff?: UnifiedDiff;
  /** 是否为 demo 主文件（`name` 对应文件）；用于文件选择器区分图标，sourceFiles 引入的其他文件为 false */
  isMain?: boolean;
};

/** 单个源码视图的数据。 */
export type SourceViewData = {
  /** 该视图的源码文件（≥ 1）；> 1 时出文件分段 */
  files: Array<ComponentSourceFile>;
  /** 用对应 runtime 渲染该视图的产物；缺省则复用 React demo 渲染 */
  render?: (mode: RendererMode) => ReactNode;
};

/** 演示卡的源码视图集合。 */
export type ComponentRenderSource = Partial<Record<SourceView, SourceViewData>>;

/** Diff 展示模式。 */
export type DiffMode = 'off' | 'full' | 'added' | 'removed';
