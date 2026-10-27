import type {
  IRArrowDetail,
  IRNodeLabelDefault,
  IRPathLabelDefault,
  IRNodeDefault,
  IRNodeLayout,
  IRNodeStyle,
  IRPathDefault,
  IRPathStyle,
} from '../../schemas';

/** 当前作用域合并后的默认配置，子元素解析时不得修改这份共享数据 */
export type EffectiveScopeDefaults = Readonly<{
  /** 节点默认配置，已合入各层共同样式，颜色将在元素解析时确定 */
  node?: Readonly<{
    /** 形状、边界与变换等几何默认值 */
    geometry: Readonly<Omit<IRNodeDefault, 'style' | 'layout' | 'label'>>;
    /** 尚未应用元素主色的外观默认值 */
    style: Readonly<IRNodeStyle>;
    /** 节点布局默认值 */
    layout: Readonly<IRNodeLayout>;
    /** 已有节点标签的有效默认值 */
    label?: Readonly<IRNodeLabelDefault>;
  }>;
  /** 路径默认配置，已合入各层共同样式 */
  path?: Readonly<{
    /** 路径整体几何默认值 */
    geometry: Readonly<Omit<IRPathDefault, 'style' | 'label' | 'arrow'>>;
    /** 路径外观默认值 */
    style: Readonly<IRPathStyle>;
    /** 已有路径与步骤标签的有效默认值 */
    label?: Readonly<IRPathLabelDefault>;
    /** 已声明箭头的有效默认值 */
    arrow?: Readonly<IRArrowDetail>;
  }>;
}>;

/** 整体、填充和描边各自的不透明度，缺省字段保持省略 */
export type GraphicOpacityResolution = {
  /** 主体整体不透明度 */
  opacity?: number;
  /** 填充区域不透明度 */
  fillOpacity?: number;
  /** 描边区域不透明度 */
  strokeOpacity?: number;
};
