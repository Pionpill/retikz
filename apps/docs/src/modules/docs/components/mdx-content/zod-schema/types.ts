/** 渲染时的类型表示（中间结构，与 Zod 解耦） */
export type TypeRepr =
  | { kind: 'primitive'; name: 'string' | 'number' | 'boolean' }
  | { kind: 'literal'; value: string | number | boolean | null }
  | { kind: 'enum'; values: ReadonlyArray<string | number> }
  | { kind: 'array'; element: TypeRepr; constraints: Array<string> }
  | { kind: 'tuple'; elements: Array<TypeRepr> }
  | { kind: 'default'; inner: TypeRepr }
  | { kind: 'nullable'; inner: TypeRepr }
  | {
      kind: 'union';
      members: Array<TypeRepr>;
      /** discriminated union 的稳定分支身份；普通 union 省略 */
      branches?: Array<DiscriminatedUnionBranch>;
    }
  | { kind: 'ref'; name: string; url: string } // 命中注册表
  | { kind: 'object'; fields: Array<ObjectField>; additionalProperties: boolean } // 匿名/未注册 object，就地展开
  | { kind: 'unknown'; note: string };

/** canonical schema path 支持的 JSON scalar */
export type SchemaPathLiteral = string | number | boolean | null;

/** 深层 schema 字段的 typed path segment */
export type SchemaPathSegment =
  | { kind: 'field'; key: string }
  | { kind: 'array' }
  | { kind: 'tuple'; index: number }
  | { kind: 'case'; discriminator: string; value: SchemaPathLiteral }
  | { kind: 'union'; index: number };

/** discriminated union option 的稳定身份与全部 literal selector */
export type DiscriminatedUnionBranch = {
  index: number;
  discriminator: string;
  values: Array<SchemaPathLiteral>;
};

export type ObjectField = {
  name: string;
  type: TypeRepr;
  optional: boolean;
  /** 来自 .describe() 的英文描述，可能为 undefined */
  description?: string;
  /** 类型签名后追加的约束 ['min 1', 'positive', '0..1', ...] */
  constraints: Array<string>;
};

/** <ZodSchema> 渲染的顶层结构 */
export type SchemaRepr =
  | { kind: 'object'; description?: string; fields: Array<ObjectField> }
  | { kind: 'alias'; description?: string; type: TypeRepr };

/** RenderTable 的行：父行 name 非空；子行 name 为空且 isChild=true */
export type TableRow = ObjectField & {
  isChild?: boolean;
  /** 子行原 field name（用于类型列前缀显示） */
  originalName?: string;
  /** expandNested 模式下的 canonical typed path */
  path?: string;
  /** 指向同一分支身份的其它合法 selector path */
  aliasPaths?: Array<string>;
  /** 深层表格的视觉缩进层级 */
  depth?: number;
  /** tuple / union / discriminated-union 的稳定分支标签 */
  branchLabel?: string;
  /** 容器分支行，不要求 description 或 required 状态 */
  isSynthetic?: boolean;
};
