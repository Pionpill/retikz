import type { ReactNode } from 'react';

import type { PreviewThemeStyleValue } from './theme';

/** 预览区平移 / 缩放状态。 */
export type Transform = { x: number; y: number; scale: number };

/** 源码视图切换：React 源码 / IR JSON / Vanilla Input 代码 */
export type SourceView = 'react' | 'ir' | 'vanilla';

/** demo 渲染目标：SVG DOM 或 Canvas 2D。 */
export type RendererMode = 'svg' | 'canvas';

/** 单张预览的局部主题环境。 */
export type PreviewThemeMode = 'inherit' | 'light' | 'dark';

/** 单张预览的主题风格选择；inherit 表示跟随 docs 全局设置。 */
export type PreviewThemeStyleSelection = 'inherit' | PreviewThemeStyleValue;

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

/** 预览控制插槽的可见策略。 */
export type PreviewControlVisibility = 'hover' | 'always';

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
  value: (id: string) => PreviewControlValue | undefined;
  /** 写入 slot 共享值。 */
  setValue: (id: string, value: PreviewControlValue) => void;
  /** 当前正在播放的范围控件 id。 */
  rangePlaybackId?: string;
  /** 从范围最小值开始播放。 */
  startRangePlayback?: (field: PreviewRangeControlField) => void;
  /** 停止当前范围播放。 */
  stopRangePlayback?: () => void;
};

/** 预览区控制插槽。 */
export type PreviewControlSlot = {
  /** 稳定 id。 */
  id: string;
  /** 插槽在预览区九宫格中的位置。 */
  placement?: PreviewControlPlacement;
  /** 插槽可见策略。 */
  visibility: PreviewControlVisibility;
  /** 根据当前预览上下文渲染插槽内容。 */
  render: (runtime: PreviewControlRuntime) => ReactNode;
};

/** ComponentPreview 的预览控制配置。 */
export type PreviewControlsOptions = {
  /** controls 定义名；缺省使用主 demo 名，false 禁用内容 controls。 */
  name?: string | false;
  /** 动画 controls 覆盖；缺省时根据可用 IR 自动判定。 */
  animation?: boolean;
  /** 在共享与 demo controls 后追加的局部插槽。 */
  slots?: Array<PreviewControlSlot>;
};

/** 预览动作插槽。 */
export type PreviewActionSlot = {
  /** 稳定 id。 */
  id: string;
  /** 根据当前预览运行时渲染动作内容。 */
  render: (runtime: PreviewControlRuntime) => ReactNode;
};

/** 二维点预览控件的坐标值 */
export type PreviewControlPoint = [number, number];

/** 可用于显示条件比较的标量预览值 */
export type PreviewControlScalarValue = string | number | boolean;

/** 声明式预览控件支持的值 */
export type PreviewControlValue = PreviewControlScalarValue | PreviewControlPoint;

/** 根据另一控件当前值判断可见性的声明式条件 */
export type PreviewControlCondition = {
  /** 作为条件来源的控件 id */
  controlId: string;
  /** 任一匹配即显示的值集合 */
  oneOf: ReadonlyArray<PreviewControlScalarValue>;
};

/** 预览控件选项 */
export type PreviewControlOption = {
  /** 写入预览状态的值 */
  value: string;
  /** 展示给用户的文本 */
  label: string;
};

/** 文本预览控件字段 */
export type PreviewTextControlField = {
  kind: 'text';
  id: string;
  label: string;
  defaultValue: string;
  placeholder?: string;
  /** 使用支持换行的文本域
   * @default false
   */
  multiline?: boolean;
};

/** 数值预览控件字段 */
export type PreviewNumberControlField = {
  kind: 'number';
  id: string;
  label: string;
  defaultValue: number;
  min?: number;
  max?: number;
  step?: number;
};

/** 下拉选择预览控件字段 */
export type PreviewSelectControlField = {
  kind: 'select';
  id: string;
  label: string;
  defaultValue: string;
  options: ReadonlyArray<PreviewControlOption>;
};

/** 布尔开关预览控件字段 */
export type PreviewSwitchControlField = {
  kind: 'switch';
  id: string;
  label: string;
  defaultValue: boolean;
};

/** 颜色预览控件字段 */
export type PreviewColorControlField = {
  kind: 'color';
  id: string;
  label: string;
  defaultValue: string;
  /** 是否在颜色 toggle 中展示 Node 的自动对比色选项
   * @default false
   */
  contrast?: boolean;
};

/** 范围预览控件字段 */
export type PreviewRangeControlField = {
  kind: 'range';
  id: string;
  label: string;
  defaultValue: number;
  min: number;
  max: number;
  step?: number;
  /** 从最小值播放到最大值的时长（毫秒）
   * @default 2000
   */
  playDuration?: number;
};

/** 二维点预览控件字段 */
export type PreviewPointControlField = {
  kind: 'point';
  id: string;
  label: string;
  defaultValue: PreviewControlPoint;
  min: readonly [number, number];
  max: readonly [number, number];
  step?: number;
};

/** 只读二维表格的列定义 */
export type PreviewTableColumn = {
  /** 从每一行读取的字段名 */
  key: string;
};

/** 只读二维表格的行集合 */
export type PreviewTableRows = ReadonlyArray<Readonly<object>>;

/** 根据实时控件值解析只读二维表格行 */
export type PreviewTableRowsResolver = (values: Readonly<PreviewControlValues>) => PreviewTableRows;

/** 只读二维表格的一个可切换数据视图 */
export type PreviewTableView = {
  /** 单个 table 内唯一的稳定标识 */
  id: string;
  /** 展示给用户的视图名称 */
  label: string;
  /** 静态行或按实时控件值计算的行 */
  rows: PreviewTableRows | PreviewTableRowsResolver;
};

type PreviewTableDataSource =
  | {
      /** 单视图静态行 */
      rows: PreviewTableRows;
      views?: never;
    }
  | {
      rows?: never;
      /** 至少两个可切换的数据视图 */
      views: ReadonlyArray<PreviewTableView>;
    };

/** 只读二维表格预览字段 */
export type PreviewTableControlField = {
  kind: 'table';
  id: string;
  label: string;
  /** 可选的显式字段筛选与列顺序 */
  columns?: ReadonlyArray<PreviewTableColumn>;
  /** 字段的可选显示条件 */
  visibleWhen?: PreviewControlCondition;
} & PreviewTableDataSource;

/** 进入共享值状态的声明式预览控件字段 */
export type PreviewControlField = (
  | PreviewTextControlField
  | PreviewNumberControlField
  | PreviewSelectControlField
  | PreviewSwitchControlField
  | PreviewColorControlField
  | PreviewRangeControlField
  | PreviewPointControlField
) & {
  /** 字段的可选显示条件 */
  visibleWhen?: PreviewControlCondition;
};

/** 进入共享值状态的声明式预览控件字段 */
export type PreviewStateControlField = PreviewControlField;

/** 属性面板支持的可写字段或只读展示项 */
export type PreviewPanelControlItem = PreviewControlField | PreviewTableControlField;

/** 可放置在预览浮层中的声明式字段 */
export type PreviewOverlayControlField = PreviewStateControlField & {
  /** 字段在预览区九宫格中的位置 */
  placement?: PreviewControlPlacement;
  /** 字段生成的 slot 可见策略
   * @default always
   */
  visibility?: PreviewControlVisibility;
};

/** 属性面板中的预览控件分组 */
export type PreviewControlSection = {
  /** 分组标题 */
  label?: string;
  /** 初始是否收起；仅带标题的分组可启用
   * @default false
   */
  defaultCollapsed?: boolean;
  /** 整个分组的可选显示条件 */
  visibleWhen?: PreviewControlCondition;
  /** 分组内字段 */
  controls: ReadonlyArray<PreviewPanelControlItem>;
};

/** 浮层形式的预览控件定义 */
export type PreviewOverlayControlsDefinition = {
  presentation: 'overlay';
  /** 浮层字段 */
  controls: ReadonlyArray<PreviewOverlayControlField>;
  /** 在字段后追加的自定义 slot */
  slots?: ReadonlyArray<PreviewControlSlot>;
};

/** 左侧属性面板形式的预览控件定义 */
export type PreviewPanelControlsDefinition = {
  presentation: 'panel';
  /** 面板标题 */
  title?: string;
  /** 桌面端控制面板的初始宽度百分比
   * @default 25
   */
  defaultSize?: number;
  /** 面板字段分组 */
  sections: ReadonlyArray<PreviewControlSection>;
  /** 在预览区追加的自定义 slot */
  slots?: ReadonlyArray<PreviewControlSlot>;
};

/** ComponentPreview 支持的声明式控件定义 */
export type PreviewControlsDefinition = PreviewOverlayControlsDefinition | PreviewPanelControlsDefinition;

type PreviewControlFieldOf<TDefinition extends PreviewControlsDefinition> =
  TDefinition extends PreviewOverlayControlsDefinition
    ? TDefinition['controls'][number]
    : TDefinition extends PreviewPanelControlsDefinition
      ? TDefinition['sections'][number]['controls'][number]
      : never;

type PreviewControlValueForField<TField extends PreviewPanelControlItem> = TField extends PreviewSelectControlField
  ? TField['options'][number]['value']
  : TField extends PreviewTextControlField | PreviewColorControlField
    ? string
    : TField extends PreviewNumberControlField | PreviewRangeControlField
      ? number
      : TField extends PreviewPointControlField
        ? PreviewControlPoint
        : TField extends PreviewSwitchControlField
          ? boolean
          : never;

/** 从声明式定义推导出的控件值对象 */
export type PreviewControlValuesFor<TDefinition extends PreviewControlsDefinition> = {
  [TField in PreviewControlFieldOf<TDefinition> as TField extends PreviewTableControlField
    ? never
    : TField['id']]: PreviewControlValueForField<TField>;
};

/** 预览控件运行时值集合 */
export type PreviewControlValues = Record<string, PreviewControlValue>;

/** 一组可复用的预览控件状态 */
export type PreviewControlPreset = {
  /** preset 的稳定 id */
  id: string;
  /** 展示给用户的文本 */
  label: string;
  /** 按可见 control id 或 stateOnlyIds 声明 id 写入的值 */
  values: Readonly<PreviewControlValues>;
  /** 应用 preset 时从 canonical 替换，或只合并到当前值
   * @default replace
   */
  applyMode?: 'replace' | 'merge-current';
};

/** preset 下拉框的本地化文案 */
export type PreviewPresetSelectorConfig = {
  /** 下拉框字段名 */
  label: string;
  /** 当前状态不匹配任何 preset 时显示的文本 */
  customLabel: string;
};

/** 可交互 demo 的稳定文档契约 */
export type PreviewControlContract = {
  /** 声明式控件定义 */
  controls: PreviewControlsDefinition;
  /** 参与 canonical 与 preset 状态但不渲染为控件的 id
   * @default []
   */
  stateOnlyIds?: ReadonlyArray<string>;
  /** 无交互环境、截图与测试使用的 canonical 状态 */
  canonicalValues: Readonly<PreviewControlValues>;
  /** 可选的语义化状态组合 */
  presets?: ReadonlyArray<PreviewControlPreset>;
  /** 显式启用 preset 下拉框 */
  presetSelector?: PreviewPresetSelectorConfig;
  /** 这些控件直接解释的公开 API */
  relatedApis: ReadonlyArray<string>;
};

/** 自定义预览控件的共享值状态 */
export type PreviewControlState = {
  /** definition 默认值与 contract canonical values 合并后的稳定基线 */
  canonicalValues: PreviewControlValues;
  /** 当前字段值 */
  values: PreviewControlValues;
  /** 更新单个字段值 */
  setValue: (id: string, value: PreviewControlValue) => void;
  /** 以 canonical values 为基线原子应用一组值 */
  applyValues: (values: Readonly<PreviewControlValues>) => void;
  /** 恢复 canonical values */
  reset: () => void;
  /** 当前正在播放的范围控件 id。 */
  rangePlaybackId?: string;
  /** 从范围最小值开始播放。 */
  startRangePlayback?: (field: PreviewRangeControlField) => void;
  /** 停止当前范围播放。 */
  stopRangePlayback?: () => void;
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

/** Vanilla 源码复用附属数据文件时使用的 named import。 */
export type PreviewDatasetImport = {
  /** Vanilla 源码中的模块导入路径。 */
  from: string;
  /** 数据文件提供的 named export。 */
  name: string;
};

/** demo 模块声明的源码派生能力。 */
export type PreviewSourceConfig = {
  /** 是否允许直接执行 demo 以自动派生 IR。 @default true */
  deriveIR?: boolean;
  /** 使用稳定默认状态渲染源码视图，不参与可见 demo 的交互状态 */
  canonicalRender?: () => ReactNode;
  /** 按外部数据引用名声明 Vanilla 源码复用的附属数据导入。 */
  datasetImports?: Readonly<Record<string, PreviewDatasetImport>>;
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
