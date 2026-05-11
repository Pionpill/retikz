/** 渲染时的类型表示（中间结构，与 Zod 解耦） */
export type TypeRepr =
  | { kind: 'primitive'; name: 'string' | 'number' | 'boolean' }
  | { kind: 'literal'; value: string | number | boolean }
  | { kind: 'enum'; values: ReadonlyArray<string | number> }
  | { kind: 'array'; element: TypeRepr; constraints: Array<string> }
  | { kind: 'tuple'; elements: Array<TypeRepr> }
  | { kind: 'union'; members: Array<TypeRepr> }
  | { kind: 'ref'; name: string; url: string }       // 命中注册表
  | { kind: 'object'; fields: Array<ObjectField> }   // 匿名/未注册 object，就地展开
  | { kind: 'unknown'; note: string };

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
