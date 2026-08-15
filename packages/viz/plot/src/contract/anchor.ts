import type { IRCoordinate } from '@retikz/core';
import type { ExternalRow } from '@retikz/data';

import type { IRPlotAnchorIdSpec } from '../schemas';
import type { MarkProvenance } from './provenance';

/** 自定义锚点 id 生成器可读取的图元与数据行上下文 */
export type AnchorIdGeneratorContext = {
  plotId?: string;
  markId?: string;
  markIndex: number;
  transformedIndex: number;
  prefix: string;
  role?: string;
};

/** 按图元和数据行生成稳定锚点 id 的扩展函数 */
export type AnchorIdGenerator = (row: ExternalRow, context: AnchorIdGeneratorContext) => string;

/** 锚点注册表记录的图元归属信息 */
export type AnchorOwner = {
  markType: string;
  markId?: string;
  markIndex: number;
  transformedIndex: number;
  role?: string;
};

/** 图元下沉期间注册、解析并校验锚点引用的运行时接口 */
export type AnchorRegistry = {
  makeId: (spec: IRPlotAnchorIdSpec, row: ExternalRow, owner: AnchorOwner) => string;
  register: (id: string, owner: AnchorOwner) => void;
  reference: (id: string, owner: AnchorOwner) => void;
  coordinate: (id: string, position: [number, number], owner: AnchorOwner) => IRCoordinate;
  assertResolved: () => void;
};

/** 单个图元下沉时可用的 provenance 与锚点能力 */
export type MarkLoweringContext = {
  markIndex: number;
  plotId?: string;
  provenance?: MarkProvenance;
  anchors?: AnchorRegistry;
};
