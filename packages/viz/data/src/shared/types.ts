/**
 * 外部数据行
 * @description 消费侧在运行时提供的任意 JS 记录（可嵌套）；字段路径解析后的结果须为标量
 */
export type ExternalRow = Record<string, unknown>;

/**
 * 外部数据集表
 * @description 数据集名 -> 行数组；data.reference 按名查此表
 */
export type ExternalDatasets = Record<string, Array<ExternalRow>>;
