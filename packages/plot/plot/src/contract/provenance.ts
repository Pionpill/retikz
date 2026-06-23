import type { ExternalRow } from '../schemas';

/**
 * provenance 下沉上下文：贯穿 expand -> mark -> guide，承载 plotId / dataReference / 各开关。
 * @description provenance 关时不构造此对象（传 undefined），mark / guide 据此决定是否写 id / meta，保默认逐字节等价。
 */
export type ProvenanceContext = {
  /** root.id；存在时作为 plot-local id 前缀，缺省则内部元素匿名。 */
  plotId?: string;
  /** 数据集引用名，写入 root / per-datum meta。 */
  dataReference: string;
  /** 是否给每个 datum node 写 per-datum meta。 */
  datumProvenance: boolean;
  /** 数据属性名：把该字段值绑定成 `<plotId>.datum.<value>` 的 Node.id。 */
  datumIdField?: string;
};

/** datum id 登记器：行 -> `<plotId>.datum.<slug>`，由 expand 构造一次并跨 mark 共享。 */
export type DatumIdRegistrar = (row: ExternalRow) => string;

/**
 * 单个 mark 下沉时的 provenance 上下文。
 * @description contract 层定义该形状，provider 只消费它，避免 contract 反向依赖 provider 实现。
 */
export type MarkProvenance = {
  /** plot 级 provenance 上下文。 */
  context: ProvenanceContext;
  /** 当前 mark 在 spec.marks 的序号。 */
  markIndex: number;
  /** plot 级 datum id 登记器；无 datumIdField 或无 plotId 时省略。 */
  registerDatumId?: DatumIdRegistrar;
};
