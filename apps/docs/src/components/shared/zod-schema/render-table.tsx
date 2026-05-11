import type { FC } from 'react';

import { cn } from '@/lib/utils';

import type { ObjectField } from './types';
import { RenderType } from './render-type';

type Props = {
  fields: Array<ObjectField>;
  /** 给嵌套匿名子表用：是否带边框 / 缩进 */
  nested?: boolean;
};

const td = 'border-b border-border align-top py-2 pr-4';

/** ObjectField 列表 → 表格；object kind 的字段同 td 内递归嵌套子表 */
export const RenderTable: FC<Props> = ({ fields, nested = false }) => {
  return (
    <div className={cn('my-4 overflow-x-auto', nested && 'ml-4 mt-2 border-l-2 border-muted pl-3')}>
      <table className="w-full border-collapse text-sm">
        <thead>
          <tr className="border-b-2 border-border text-left">
            <th className="py-2 pr-4 font-semibold">字段</th>
            <th className="py-2 pr-4 font-semibold">类型</th>
            <th className="py-2 pr-4 font-semibold">必填</th>
            <th className="py-2 pr-4 font-semibold">描述</th>
          </tr>
        </thead>
        <tbody>
          {fields.map(f => (
            <tr key={f.name}>
              <td className={cn(td, 'font-mono whitespace-nowrap')}>{f.name}</td>
              <td className={td}>
                <RenderType repr={f.type} />
                {f.constraints.length > 0 && (
                  <span className="ml-2 text-xs text-muted-foreground">
                    ({f.constraints.join(', ')})
                  </span>
                )}
                {f.type.kind === 'object' && (
                  <RenderTable fields={f.type.fields} nested />
                )}
              </td>
              <td className={cn(td, 'whitespace-nowrap text-center')}>
                {f.optional ? <span className="text-muted-foreground">—</span> : '✓'}
              </td>
              <td className={cn(td, 'text-muted-foreground')}>{f.description ?? ''}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};
