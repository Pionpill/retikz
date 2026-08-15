import type { IRLabelDefault, IRScope } from '../../schemas';

/** scope 级联 graphic state */
export type CascadeState = Pick<
  IRScope,
  'color' | 'stroke' | 'fill' | 'strokeWidth' | 'opacity' | 'fillOpacity' | 'strokeOpacity'
>;

/** 单层 scope 样式解析 frame */
export type StyleResolveFrame = {
  /** 级联 graphic state */
  cascade: CascadeState;
  /** node 样式通道 */
  nodeDefault?: IRScope['nodeDefault'];
  /** path 样式通道 */
  pathDefault?: IRScope['pathDefault'];
  /** label 样式通道 */
  labelDefault?: IRLabelDefault;
  /** arrow 样式通道 */
  arrowDefault?: IRScope['arrowDefault'];
  /** 继承屏障 */
  resetStyle?: IRScope['resetStyle'];
};

/** label 默认值经过级联后的有效视图 */
export type EffectiveLabelDefault = Readonly<IRLabelDefault>;
