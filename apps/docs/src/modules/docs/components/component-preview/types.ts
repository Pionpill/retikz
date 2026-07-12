import type { ReactNode } from 'react';

/** 预览区平移 / 缩放状态。 */
export type Transform = { x: number; y: number; scale: number };

/** 源码视图切换：React 源码 / IR JSON / Vanilla plain spec 代码。 */
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

/** 预览控制运行时，由宿主卡片或弹窗提供给控制插槽。 */
export type PreviewControlRuntime = {
  /** 重新挂载演示子树。 */
  remount: () => void;
  /** 当前渲染目标。 */
  rendererMode: RendererMode;
  /** 渲染区 DOM，用于读取 svg / canvas / animation 状态。 */
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
  render: (runtime: PreviewControlRuntime) => ReactNode;
};

/** 预览动作插槽。 */
export type PreviewActionSlot = {
  /** 稳定 id。 */
  id: string;
  /** 根据当前预览运行时渲染动作内容。 */
  render: (runtime: PreviewControlRuntime) => ReactNode;
};

/** 预览控件选项。 */
export type PreviewControlOption = {
  /** 写入预览状态的值。 */
  value: string;
  /** 展示给用户的文本。 */
  label: string;
};

/** 下拉选择类预览控件。 */
export type PreviewSelectControlConfig = {
  kind: 'select';
  id: string;
  label: string;
  defaultValue: string;
  options: Array<PreviewControlOption>;
  placement?: PreviewControlPlacement;
};

/** 文本输入类预览控件。 */
export type PreviewInputControlConfig = {
  kind: 'input';
  id: string;
  label: string;
  defaultValue: string;
  placeholder?: string;
  placement?: PreviewControlPlacement;
};

/** 常见预览控件的声明式配置。 */
export type PreviewControlConfig = PreviewSelectControlConfig | PreviewInputControlConfig;

/** 自定义预览控件的共享值状态。 */
export type PreviewControlState = {
  values: Record<string, string>;
  setValue: (id: string, value: string) => void;
};

/** 演示区垂直对齐档位。 */
export type AlignKey = 'center' | 'start' | 'end';

/** 预览区高度档位。 */
export type SizeKey = 'xs' | 'sm' | 'md' | 'lg' | 'xl' | 'xxl' | 'xxxl';

/** ComponentPreview 使用的单个源码文件对象配置。 */
export type ComponentPreviewFileConfig = {
  /** 主 demo id 或相对当前页面目录的附加源码文件名。 */
  file: string;
  /** 当前文件使用的 diff baseline。 */
  diffFrom?: string;
};

/** ComponentPreview 使用的单个源码文件输入。 */
export type ComponentPreviewFile = string | ComponentPreviewFileConfig;

/** ComponentPreview 的主 demo 与附加源码文件配置。 */
export type ComponentPreviewFiles =
  | ComponentPreviewFile
  | readonly [ComponentPreviewFile, ...Array<ComponentPreviewFile>];

/** demo 模块声明的源码派生能力。 */
export type PreviewSourceConfig = {
  /** 是否允许直接执行 demo 以自动派生 IR。 @default true */
  deriveIR?: boolean;
};

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
  /** 该视图固定使用的渲染目标；缺省时跟随预览面板的局部选择。 */
  rendererMode?: RendererMode;
  /** 用对应 runtime 渲染该视图的产物；缺省则复用 React demo 渲染。 */
  render?: (mode: RendererMode) => ReactNode;
};

/** 演示卡的源码视图集合。 */
export type ComponentRenderSource = Partial<Record<SourceView, SourceViewData>>;

/** Diff 展示模式。 */
export type DiffMode = 'off' | 'full' | 'added' | 'removed';
