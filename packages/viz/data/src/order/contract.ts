/** 分类顺序比较器共享的当前类别集合 */
export type FieldOrderContext = Readonly<{
  /** 去重后的有效类别，保留首次出现顺序 */
  values: ReadonlyArray<string | number>;
}>;

/** 运行时分类顺序定义；比较函数不进入 JSON IR */
export type FieldOrderDefinition = Readonly<{
  /** 内置或自定义排序名称 */
  name: string;
  /** 返回有限数值；零表示排序等价，不合并类别 */
  compare: (a: string | number, b: string | number, context: FieldOrderContext) => number;
}>;

/**
 * 定义可注册的纯分类比较规则
 * @param definition 具名比较器；必须保持纯计算并返回有限数值
 * @returns 原样返回定义对象；不会自动注册
 */
export const defineFieldOrder = (definition: FieldOrderDefinition): FieldOrderDefinition => definition;
