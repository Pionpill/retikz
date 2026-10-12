import { Layout, Path } from '@retikz/react';
import { Array } from '@retikz/standard-react/collection';
import type { FC } from 'react';

import type { Lang } from '@/i18n';

import { compilationSlotsI18n } from './compilation-slots.i18n';

/** 路径回填状态图的语言 */
export type CompilationSlotsProps = { lang?: Lang };

/** 数组槽位展示一次声明如何保留绘制位置 */
const CompilationSlots: FC<CompilationSlotsProps> = props => {
  const { lang = 'zh' } = props;
  const text = compilationSlotsI18n[lang];
  return (
    <Layout style={{ maxWidth: '100%', height: 'auto' }}>
      <Array
        id="source"
        position={[0, 0]}
        label={{ text: text.source, font: { size: 12 }, opacity: 0.8 }}
        items={[text.path, 'Node A', 'Node B']}
        layout={{ width: 110, height: 32 }}
        style={{ font: { size: 14 } }}
        index
      />
      <Array
        id="pending"
        position={[0, 130]}
        label={{ text: text.pending, font: { size: 12 }, opacity: 0.8 }}
        items={[{ content: text.slot, style: { color: 'dodgerblue' } }, 'Group A', 'Group B']}
        layout={{ width: 110, height: 32 }}
        style={{ font: { size: 14 } }}
        index
      />
      <Array
        id="final"
        position={[0, 260]}
        label={{ text: text.final, font: { size: 12 }, opacity: 0.8 }}
        items={[{ content: 'PathPrim', style: { color: 'dodgerblue' } }, 'Group A', 'Group B']}
        layout={{ width: 110, height: 32 }}
        style={{ font: { size: 14 } }}
        index
      />
      <Path
        way={[
          { id: 'source', anchor: 'bottom-left' },
          { id: 'pending', anchor: 'top-left' },
        ]}
        arrow="->"
        label={{ text: text.compile, font: { size: 12 }, textColor: 'gray', side: 'right' }}
      />
      <Path
        way={[
          { id: 'pending', anchor: 'bottom-left' },
          { id: 'final', anchor: 'top-left' },
        ]}
        arrow="->"
        label={{ text: text.replace, font: { size: 12 }, textColor: 'gray', side: 'right' }}
      />
    </Layout>
  );
};
export default CompilationSlots;
