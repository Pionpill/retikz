import type { FC } from 'react';

import { useTranslation } from 'react-i18next';

import { cn } from '@/lib/utils';

import type { TableRow } from './types';
import { RenderType } from './render-type';

type Props = {
  rows: Array<TableRow>;
};

const td = 'border-b border-border align-top py-2 pr-4';

/** TableRow 列表 → 表格；嵌套 object 字段已被 ZodSchema 平铺为相邻子行（name=''） */
export const RenderTable: FC<Props> = ({ rows }) => {
  const { t } = useTranslation();
  return (
    <div className="my-4 overflow-x-auto">
      <table className="w-full border-collapse text-sm">
        <thead>
          <tr className="border-b-2 border-border text-left">
            <th className="py-2 pr-4 font-semibold">{t('zodSchema.field')}</th>
            <th className="py-2 pr-4 font-semibold">{t('zodSchema.type')}</th>
            <th className="py-2 pr-4 font-semibold">{t('zodSchema.required')}</th>
            <th className="py-2 pr-4 font-semibold">{t('zodSchema.description')}</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r, i) => (
            <tr key={`${r.originalName ?? r.name}-${i}`}>
              <td className={cn(td, 'font-mono whitespace-nowrap')}>
                {r.isChild ? '' : r.name}
              </td>
              <td className={td}>
                {r.isChild && r.originalName != null && (
                  <span className="font-mono text-muted-foreground">{`${r.originalName}: `}</span>
                )}
                <RenderType repr={r.type} />
                {r.constraints.length > 0 && (
                  <span className="ml-2 text-xs text-muted-foreground">
                    ({r.constraints.join(', ')})
                  </span>
                )}
              </td>
              <td className={cn(td, 'whitespace-nowrap text-center')}>
                {r.optional ? <span className="text-muted-foreground">—</span> : '✓'}
              </td>
              <td className={cn(td, 'text-muted-foreground')}>{r.description ?? ''}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};
