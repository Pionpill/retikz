/**
 * 外部数据行。
 * @description 运行时由宿主 lowering pipeline 注入的任意 JS 记录（可嵌套）；field 路径对其解析、结果须为标量。
 */
export type ExternalRow = Record<string, unknown>;

/**
 * 外部数据集表。
 * @description 数据集名 -> 行数组；data.reference 按名查此表。
 */
export type ExternalDatasets = Record<string, Array<ExternalRow>>;
