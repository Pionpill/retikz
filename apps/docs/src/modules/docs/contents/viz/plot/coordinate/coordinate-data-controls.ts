import type { PreviewControlContract, PreviewTableColumn } from '@/modules/docs/preview';

import { definePreviewControls } from '@/modules/docs/preview';

/** 坐标系数据面板的本地化文案 */
export type CoordinateDataControlCopy = {
  /** 面板标题 */
  title: string;
  /** 数据分组标题 */
  sectionLabel: string;
  /** 数据表标题 */
  tableLabel: string;
};

/** 创建坐标系文档的只读数据面板 */
export const createCoordinateDataControls = (options: {
  copy: CoordinateDataControlCopy;
  rows: ReadonlyArray<Readonly<object>>;
  columns: ReadonlyArray<PreviewTableColumn>;
  defaultCollapsed?: boolean;
  relatedApis: ReadonlyArray<string>;
}) => {
  const controls = definePreviewControls({
    presentation: 'panel',
    title: options.copy.title,
    sections: [
      {
        label: options.copy.sectionLabel,
        ...(options.defaultCollapsed ? { defaultCollapsed: true } : {}),
        controls: [
          {
            kind: 'table',
            id: 'rows',
            label: options.copy.tableLabel,
            rows: options.rows,
            columns: options.columns,
          },
        ],
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
