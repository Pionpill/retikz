import type { ReactNode } from 'react';

/** 预览区平移 / 缩放状态。 */
export type Transform = { x: number; y: number; scale: number };

/** 源码视图切换：React 源码 / IR JSON / Vanilla builder 代码。 */
export type SourceView = 'react' | 'ir' | 'vanilla';

/** demo 渲染目标：SVG DOM 或 Canvas 2D。 */
export type RendererMode = 'svg' | 'canvas';

/** 预览区控制插槽位置。 */
export type PreviewControlPlacement =
  | 'top-start'
  | 'top-center'
  | 'top-end'
  | 'center-start'
  | 'center'
  | 'center-end'
  | 'bottom-start'
  | 'bottom-center'
  | 'bottom-end';

/** 预览区控制插槽共享上下文。 */
export type PreviewControlContext = {
  /** 重挂载渲染子树，用于重播 CSS / Canvas / WAAPI 动画。 */
  replay: () => void;
  /** 当前渲染目标。 */
  rendererMode: RendererMode;
  /** 渲染区 DOM，用于读取 svg / canvas / animation。 */
  renderPane: HTMLElement | null;
  /** 预览区是否处于 hover 状态。 */
  hovered: boolean;
  /** 控制层是否被移动端点击固定。 */
  pinned: boolean;
  /** 是否处于详情弹窗放大视图。 */
  expanded: boolean;
  /** 读取 per-card toggle 状态。 */
  active: (id: string) => boolean;
  /** 写入或翻转 per-card toggle 状态。 */
  setActive: (id: string, on?: boolean) => void;
  /** 读取 slot 共享值。 */
  value: (id: string) => string | undefined;
  /** 写入 slot 共享值。 */
  setValue: (id: string, value: string) => void;
};

/** 预览区控制插槽。 */
export type PreviewControlSlot = {
  /** 稳定 id。 */
  id: string;
  /** 插槽在预览区九宫格中的位置。 */
  placement?: PreviewControlPlacement;
  /** 根据当前预览上下文渲染插槽内容。 */
  render: (ctx: PreviewControlContext) => ReactNode;
};

/** 兼容旧 previewActions 命名，后续可单独重命名。 */
export type PreviewActionContext = PreviewControlContext;
export type PreviewAction = PreviewControlSlot;

/** 自定义预览插槽共享值状态。 */
export type PreviewActionState = {
  values: Record<string, string>;
  setValue: (id: string, value: string) => void;
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
  /** 展示在文件切换条里的文件名。 */
  filename: string;
  /** 当前文件的原始源码。 */
  code: string;
  /** 语法高亮语言。 */
  lang: SourceLang;
  /** 可选的教学 diff 数据。 */
  diff?: UnifiedDiff;
  /** 是否为 demo 主文件。 */
  isMain?: boolean;
};

/** 单个源码视图的数据。 */
export type SourceViewData = {
  /** 该视图的源码文件。 */
  files: Array<ComponentSourceFile>;
  /** 用对应 runtime 渲染该视图的产物；缺省则复用 React demo 渲染。 */
  render?: (mode: RendererMode) => ReactNode;
};

/** 演示卡的源码视图集合。 */
export type ComponentRenderSource = Partial<Record<SourceView, SourceViewData>>;

/** Diff 展示模式。 */
export type DiffMode = 'off' | 'full' | 'added' | 'removed';
