declare const compileOwnerKeyBrand: unique symbol;
declare const compileNamespaceKeyBrand: unique symbol;

/** 仅在同次编译来源结果内可关联的实体键 */
export type CompileOwnerKey = Readonly<{ [compileOwnerKeyBrand]: never }>;
/** 仅在同次编译来源结果内可关联的命名空间键 */
export type CompileNamespaceKey = Readonly<{ [compileNamespaceKeyBrand]: never }>;

/** 一次静态编译中的输入或生成实体来源 */
export type CompileProvenanceOwner = Readonly<{
  /** 本次编译内唯一实体键 */
  key: CompileOwnerKey;
  /** 直接逻辑父来源，根节点缺省 */
  parent?: CompileOwnerKey;
  /** 实体种类，根为 root，Composite 使用完整 provider key */
  kind: string;
  /** 作者提供的有效非空 id */
  id?: string;
  /** 同层输入出现位置，根为 0 */
  index: number;
  /** 是否来自编译生成内容 */
  generated: boolean;
}>;

/** 保留注册顺序与重复项的编译名称注册 */
export type CompileProvenanceBinding = Readonly<{
  /** 注册所在命名空间 */
  namespace: CompileNamespaceKey;
  /** 注册名称 */
  name: string;
  /** 注册实体来源 */
  owner: CompileOwnerKey;
}>;

/** 最终图元出现位置及发射来源 */
export type CompileProvenanceEmission = Readonly<{
  /** 最终 Scene 中从根开始的图元下标路径 */
  primitivePath: ReadonlyArray<number>;
  /** 产生图元的实体来源 */
  owner: CompileOwnerKey;
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
  owners: ReadonlyArray<CompileProvenanceOwner>;
  /** 按登记顺序保留的名称绑定 */
  bindings: ReadonlyArray<CompileProvenanceBinding>;
  /** 与最终图元 occurrence 一一对应的发射记录 */
  emissions: ReadonlyArray<CompileProvenanceEmission>;
}>;
