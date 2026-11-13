import { Layout, Node, Path, Scope, Step } from '@retikz/react';
import type { FC } from 'react';

import type { Lang } from '@/i18n';

import { pathLabelMarksI18n } from './path-label-marks.i18n';

/** 示意图语言 */
export type PathLabelMarksProps = { lang?: Lang };

/** 用同一对象对照本节的几何与状态变化 */
const PathLabelMarks: FC<PathLabelMarksProps> = props => {
  const { lang = 'zh' } = props;
  const text = pathLabelMarksI18n[lang];
  return (
    <Layout style={{ maxWidth: '100%', height: 'auto' }}>
      {text.titles.map((title, i) => (
        <Scope key={title} position={[0, i * 125]}>
          <Node position={[120, -48]} style={{ fill: 'none', stroke: 'none', font: { size: 14 } }}>
            {title}
          </Node>
          <Path style={{ stroke: 'gray', dashPattern: [1, 4], lineCap: 'round' }}>
            <Step kind="move" to={[0, 0]} />
            <Step kind="line" to={[240, 0]} />
          </Path>
          <Path
            style={{ stroke: 'dodgerblue', strokeWidth: 2 }}
            label={i === 1 ? { text: text.label, position: 0.5, side: 'center', interrupt: true, gap: 8 } : undefined}
            marks={i === 1 ? [{ pos: 0.2 }, { pos: 0.8 }] : undefined}
          >
            <Step kind="move" to={[0, 0]} />
            <Step kind="line" to={[240, 0]} />
          </Path>
          {i === 0 && (
            <>
              <Node
                position={[120, 0]}
                shape="circle"
                layout={{ minimumSize: 6, padding: 0 }}
                style={{ fill: 'darkorange', stroke: 'none' }}
              />
              <Path
                style={{ stroke: 'darkorange' }}
                marks={[{ pos: 1 }]}
                label={{ text: text.tangent, font: { size: 12 } }}
              >
                <Step kind="move" to={[120, -16]} />
                <Step kind="line" to={[180, -16]} />
              </Path>
              <Node position={[120, 25]} style={{ fill: 'none', stroke: 'none', font: { size: 12 } }}>
                {text.sample}
              </Node>
            </>
          )}
        </Scope>
      ))}
      <Node position={[120, 167]} style={{ fill: 'none', stroke: 'none', textColor: 'gray', font: { size: 12 } }}>
        {text.note}
      </Node>
    </Layout>
  );
};
export default PathLabelMarks;
