import type { ExternalDatasets } from '@retikz/data';
import type { IRTableSpec, LowerTablesOptions, TableLayoutManifest } from '@retikz/table';
import type { RenderToStringOptions } from '@retikz/vanilla';

/** renderTable 共享选项 */
export type RenderTableCommonOptions = Pick<RenderToStringOptions, 'output' | 'compile' | 'animation'> & {
  /** Table lowering 消费的外部 datasets */
  data?: ExternalDatasets;
  /** Table definitions 与其它 lowering 选项 */
  lowerOptions?: LowerTablesOptions;
};

/** renderTable 普通 SVG string 模式 */
export type RenderTableOptions = RenderTableCommonOptions & {
  /** 省略或 false 时只返回 SVG string */
  artifacts?: false;
};

/** renderTable artifact 模式 */
export type RenderTableArtifactOptions = RenderTableCommonOptions & {
  /** 返回 SVG 与 Table manifest sidecar */
  artifacts: true;
};

/** renderTable artifact 模式结果 */
export type RenderTableArtifactResult = Readonly<{
  /** SSR SVG 字符串 */
  svg: string;
  /** 与 SVG 同源的 Table layout manifest */
  manifest: TableLayoutManifest;
}>;

/** renderTable overload 合同 */
export type RenderTable = {
  (spec: IRTableSpec, options: RenderTableArtifactOptions): RenderTableArtifactResult;
  (spec: IRTableSpec, options?: RenderTableOptions): string;
};
