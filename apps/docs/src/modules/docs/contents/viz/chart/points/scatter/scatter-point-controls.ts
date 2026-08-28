/** 单个 Scatter 示例的图元控件 id */
export type ScatterPointControlIds = {
  /** 点大小控件 id */
  pointSize: string;
  /** 点填充控件 id */
  pointFill: string;
  /** 点填充启用控件 id */
  pointFillEnabled: string;
  /** 点描边控件 id */
  pointStroke: string;
  /** 点描边启用控件 id */
  pointStrokeEnabled: string;
  /** 点形状控件 id */
  pointShape: string;
  /** 点不透明度控件 id */
  pointOpacity: string;
};

type ScatterRangeControlOptions = {
  /** 控件标签 */
  label: string;
  /** 初始值 */
  defaultValue: number;
  /** 最小值 */
  min: number;
  /** 最大值 */
  max: number;
  /** 调整步长 */
  step: number;
};

type ScatterColorControlOptions = {
  /** 是否启用显式颜色的控件标签 */
  toggleLabel: string;
  /** 控件标签 */
  label: string;
  /** 初始颜色 */
  defaultValue: string;
};

type ScatterShapeControlOptions = {
  /** 控件标签 */
  label: string;
  /** 初始形状 */
  defaultValue: 'circle' | 'rectangle' | 'ellipse' | 'diamond';
  /** 内置形状的本地化标签 */
  labels: Readonly<Record<'circle' | 'rectangle' | 'ellipse' | 'diamond', string>>;
};

/** Scatter 公共图元控件配置 */
export type ScatterPointControlsOptions = {
  /** 当前示例独占的控件 id */
  ids: ScatterPointControlIds;
  /** 点大小控件 */
  size: ScatterRangeControlOptions;
  /** 点填充控件；存在字段 color encoding 时省略 */
  fill?: ScatterColorControlOptions;
  /** 点描边控件 */
  stroke: ScatterColorControlOptions;
  /** 点形状控件；存在字段 shape encoding 时省略 */
  shape?: ScatterShapeControlOptions;
  /** 点不透明度控件 */
  opacity: ScatterRangeControlOptions;
};

type ScatterRangeControl<TId extends string> = ScatterRangeControlOptions & {
  readonly kind: 'range';
  readonly id: TId;
};

type ScatterColorControl<TId extends string> = {
  readonly kind: 'color';
  readonly id: TId;
  readonly label: string;
  readonly defaultValue: string;
  readonly visibleWhen: Readonly<{ controlId: string; oneOf: readonly [true] }>;
};

type ScatterSwitchControl<TId extends string> = {
  readonly kind: 'switch';
  readonly id: TId;
  readonly label: string;
  readonly defaultValue: false;
};

type ScatterShapeControl<TId extends string> = {
  readonly kind: 'select';
  readonly id: TId;
  readonly label: string;
  readonly defaultValue: string;
  readonly options: ReadonlyArray<Readonly<{ value: string; label: string }>>;
};

type ScatterPointControl =
  | ScatterRangeControl<string>
  | ScatterColorControl<string>
  | ScatterSwitchControl<string>
  | ScatterShapeControl<string>;

type ScatterPointControlsBaseOptions<TIds extends ScatterPointControlIds> = Omit<
  ScatterPointControlsOptions,
  'ids' | 'fill' | 'shape'
> & {
  ids: TIds;
};

type ScatterPointControlsWithFillAndShape<TIds extends ScatterPointControlIds> =
  ScatterPointControlsBaseOptions<TIds> & {
    fill: ScatterColorControlOptions;
    shape: ScatterShapeControlOptions;
  };

type ScatterPointControlsWithShape<TIds extends ScatterPointControlIds> = ScatterPointControlsBaseOptions<TIds> & {
  fill?: never;
  shape: ScatterShapeControlOptions;
};

type ScatterPointControlsWithoutFillAndShape<TIds extends ScatterPointControlIds> =
  ScatterPointControlsBaseOptions<TIds> & {
    fill?: never;
    shape?: never;
  };

type CreateScatterPointControls = {
  /** 创建包含填充与形状的 Scatter 常量图元 controls */
  <const TIds extends ScatterPointControlIds>(
    options: ScatterPointControlsWithFillAndShape<TIds>,
  ): readonly [
    ScatterRangeControl<TIds['pointSize']>,
    ScatterSwitchControl<TIds['pointFillEnabled']>,
    ScatterColorControl<TIds['pointFill']>,
    ScatterSwitchControl<TIds['pointStrokeEnabled']>,
    ScatterColorControl<TIds['pointStroke']>,
    ScatterShapeControl<TIds['pointShape']>,
    ScatterRangeControl<TIds['pointOpacity']>,
  ];
  /** 创建由 color encoding 驱动填充的 Scatter 常量图元 controls */
  <const TIds extends ScatterPointControlIds>(
    options: ScatterPointControlsWithShape<TIds>,
  ): readonly [
    ScatterRangeControl<TIds['pointSize']>,
    ScatterSwitchControl<TIds['pointStrokeEnabled']>,
    ScatterColorControl<TIds['pointStroke']>,
    ScatterShapeControl<TIds['pointShape']>,
    ScatterRangeControl<TIds['pointOpacity']>,
  ];
  /** 创建由 color 与 shape encoding 驱动样式的 Scatter 常量图元 controls */
  <const TIds extends ScatterPointControlIds>(
    options: ScatterPointControlsWithoutFillAndShape<TIds>,
  ): readonly [
    ScatterRangeControl<TIds['pointSize']>,
    ScatterSwitchControl<TIds['pointStrokeEnabled']>,
    ScatterColorControl<TIds['pointStroke']>,
    ScatterRangeControl<TIds['pointOpacity']>,
  ];
};

const createScatterPointControlsImplementation = (
  options: ScatterPointControlsOptions,
): ReadonlyArray<ScatterPointControl> => [
  {
    kind: 'range' as const,
    id: options.ids.pointSize,
    ...options.size,
  },
  ...(options.fill === undefined
    ? []
    : [
        {
          kind: 'switch' as const,
          id: options.ids.pointFillEnabled,
          label: options.fill.toggleLabel,
          defaultValue: false as const,
        },
        {
          kind: 'color' as const,
          id: options.ids.pointFill,
          label: options.fill.label,
          defaultValue: options.fill.defaultValue,
          visibleWhen: { controlId: options.ids.pointFillEnabled, oneOf: [true] as const },
        },
      ]),
  {
    kind: 'switch' as const,
    id: options.ids.pointStrokeEnabled,
    label: options.stroke.toggleLabel,
    defaultValue: false as const,
  },
  {
    kind: 'color' as const,
    id: options.ids.pointStroke,
    label: options.stroke.label,
    defaultValue: options.stroke.defaultValue,
    visibleWhen: { controlId: options.ids.pointStrokeEnabled, oneOf: [true] as const },
  },
  ...(options.shape === undefined
    ? []
    : [
        {
          kind: 'select' as const,
          id: options.ids.pointShape,
          label: options.shape.label,
          defaultValue: options.shape.defaultValue,
          options: [
            { value: 'circle', label: options.shape.labels.circle },
            { value: 'rectangle', label: options.shape.labels.rectangle },
            { value: 'ellipse', label: options.shape.labels.ellipse },
            { value: 'diamond', label: options.shape.labels.diamond },
          ],
        },
      ]),
  {
    kind: 'range' as const,
    id: options.ids.pointOpacity,
    ...options.opacity,
  },
];

/** 创建 Scatter 示例共用的常量图元 controls */
export const createScatterPointControls = createScatterPointControlsImplementation as CreateScatterPointControls;
