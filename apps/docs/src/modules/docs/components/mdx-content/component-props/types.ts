/** 组件成员在文档中的分类 */
export type ComponentPropKind = 'property' | 'function' | 'constant' | 'type';

/** 单个组件成员的文档信息 */
export type ComponentPropItem = {
  /** 公开成员名 */
  name: string;
  /** 成员分类 */
  kind: ComponentPropKind;
  /** TypeScript 类型、函数签名或常量类型 */
  type: string;
  /** 属性是否必填 */
  required?: boolean;
  /** 属性的缺省值或缺省规则 */
  defaultValue?: string;
  /** 常量的实际值 */
  value?: string;
  /** 作为 MDX 渲染的说明文本 */
  description: string;
};
