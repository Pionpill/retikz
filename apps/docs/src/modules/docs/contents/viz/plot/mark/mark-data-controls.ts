import type { PreviewControlContract, PreviewTableColumn } from '@/modules/docs/preview';

import { definePreviewControls } from '@/modules/docs/preview';

/** Mark 数据面板中的一张只读表格 */
export type MarkDataControlTable = {
  /** 表格控件 id，同一面板内必须唯一 */
  id: string;
  /** 展示给读者的表格标题 */
  label: string;
  /** 按行组织的源数据 */
  rows: ReadonlyArray<Readonly<object>>;
  /** 可选的列顺序与本地化标题 */
  columns?: ReadonlyArray<PreviewTableColumn>;
};

/** 创建 mark demo 共用的只读数据面板与稳定文档契约 */
export const createMarkDataControls = (options: {
  /** 面板标题 */
  title: string;
  /** 数据分组标题 */
  sectionLabel: string;
  /** 当前 demo 使用的一张或多张数据表 */
  tables: ReadonlyArray<MarkDataControlTable>;
  /** 数据只是背景时默认收起 */
  defaultCollapsed?: boolean;
  /** 当前数据直接帮助理解的 API */
  relatedApis: ReadonlyArray<string>;
}) => {
  const controls = definePreviewControls({
    presentation: 'panel',
    title: options.title,
    sections: [
      {
        label: options.sectionLabel,
        ...(options.defaultCollapsed ? { defaultCollapsed: true } : {}),
        controls: options.tables.map(table => ({
          kind: 'table' as const,
          id: table.id,
          label: table.label,
          rows: table.rows,
          ...(table.columns === undefined ? {} : { columns: table.columns }),
        })),
      },
    ],
  });

  const contract = {
    controls,
    canonicalValues: {},
    relatedApis: options.relatedApis,
  } satisfies PreviewControlContract;

  return { controls, contract } as const;
};
