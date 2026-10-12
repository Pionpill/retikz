import type { IRLabelDefault, IRScope, IRScopeDefaults } from '../../schemas';

/** scope 级联 graphic state */
export type CascadeState = NonNullable<IRScope['style']>;

/** 单层 scope 样式解析 frame */
export type StyleResolveFrame = {
  /** 级联 graphic state */
  cascade: CascadeState;
  /** node 样式通道 */
  nodeDefault?: IRScopeDefaults['node'];
  /** path 样式通道 */
  pathDefault?: IRScopeDefaults['path'];
  /** label 样式通道 */
  labelDefault?: IRLabelDefault;
  /** arrow 样式通道 */
  arrowDefault?: IRScopeDefaults['arrow'];
  /** 继承屏障 */
  resetStyle?: IRScopeDefaults['reset'];
};

/** label 默认值经过级联后的有效视图 */
export type EffectiveLabelDefault = Readonly<IRLabelDefault>;

/** Scene 与几何消费的独立不透明度因子 */
export type GraphicOpacityResolution = {
  /** 主体整体不透明度 */
  opacity?: number;
  /** 填充区域不透明度 */
  fillOpacity?: number;
  /** 描边区域不透明度 */
  strokeOpacity?: number;
};
