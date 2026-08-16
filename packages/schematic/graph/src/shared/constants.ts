/** Graph 复合元素的命名空间 */
export const GRAPH_NAMESPACE = 'graph' as const;

/** Graph 正式元素的稳定判别值 */
export const GraphType = {
  /** 包含分区内容的容器 */
  Container: 'container',
  /** 表示图中具有关系语义的实体 */
  Entity: 'entity',
  /** 表示图式元素间关系的路径 */
  Relation: 'relation',
} as const;
