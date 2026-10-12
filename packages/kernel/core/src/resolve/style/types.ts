import type {
  IRArrowDetail,
  IRLabelDefault,
  IRNodeDefault,
  IRNodeLayout,
  IRNodeStyle,
  IRPathDefault,
  IRPathStyle,
} from '../../schemas';

/** 当前 Scope 已合并的默认配置，元素解析只能派生新值，不能修改共享配置 */
export type EffectiveScopeDefaults = Readonly<{
  /** 节点默认值，style 已按层合入共同样式，颜色尚未展开 */
  node?: Readonly<{
    /** 形状、边界与变换等几何默认值 */
    geometry: Readonly<Omit<IRNodeDefault, 'style' | 'layout'>>;
    /** 尚未应用元素主色的外观默认值 */
    style: Readonly<IRNodeStyle>;
    /** 节点布局默认值 */
    layout: Readonly<IRNodeLayout>;
  }>;
  /** 路径默认值，style 已按层合入共同样式 */
  path?: Readonly<{
    /** 路径整体几何默认值 */
    geometry: Readonly<Omit<IRPathDefault, 'style'>>;
    /** 路径外观默认值 */
    style: Readonly<IRPathStyle>;
  }>;
  /** 标签默认值，宿主颜色在元素解析时应用 */
  label?: EffectiveLabelDefault;
  /** 箭头默认值，undefined 与显式空配置保持区别 */
  arrow?: Readonly<IRArrowDetail>;
  /** 外框继承的共同主色，不受元素通道的 reset 影响 */
  scopeColor?: string;
}>;

/** label 默认值经过级联后的有效视图 */
export type EffectiveLabelDefault = Readonly<IRLabelDefault>;
