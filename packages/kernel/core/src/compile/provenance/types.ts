import type { PropertyPath } from '@retikz/foundation';

declare const compileOwnerKeyBrand: unique symbol;
declare const compileNamespaceKeyBrand: unique symbol;

/** 仅在同次编译来源结果内可关联的实体键 */
export type CompileOwnerKey = Readonly<{ [compileOwnerKeyBrand]: never }>;
/** 仅在同次编译来源结果内可关联的命名空间键 */
export type CompileNamespaceKey = Readonly<{ [compileNamespaceKeyBrand]: never }>;

/** 一次静态编译中的输入或生成实体来源 */
export type CompileProvenanceOwner = Readonly<{
  /** 直接逻辑父来源，根节点缺省 */
  parent?: CompileOwnerKey;
  /** 实体种类，根为 root，Composite 使用完整 provider key */
  kind: string;
  /** 作者提供的有效非空 id */
  id?: string;
  /** 实体名称所属的命名空间；匿名实体和根保留所在空间，供来源迁移使用 */
  namespace: CompileNamespaceKey;
  /** 同层输入出现位置，根为 0 */
  index: number;
  /** 是否来自编译生成内容 */
  generated: boolean;
  /** 该实体直接产生的最终图元记录 */
  emissions: ReadonlyArray<CompileProvenanceEmission>;
}>;

/** 最终图元出现位置及发射来源 */
export type CompileProvenanceEmission = Readonly<{
  /** 相对最终 Scene 的完整图元属性路径 */
  primitivePath: PropertyPath;
  /** 编译发射角色及图元种类 */
  role: string;
  /** 同 owner/role 的发射序号 */
  ordinal: number;
}>;

/** 与单次编译结果配对的来源 sidecar，不包含跨 revision 身份 */
export type CompileProvenance = Readonly<{
  /** 文档根实体键 */
  root: CompileOwnerKey;
  /** 输入和生成实体来源 */
  ownerMap: ReadonlyMap<CompileOwnerKey, CompileProvenanceOwner>;
}>;
