import { Draw, Layout, Node, Path, Scope, Step } from '@retikz/react';
import type { FC } from 'react';

import type { Lang } from '@/i18n';

import { cutCenter, cutCurve, cutDistance, cutEnd, cutLength, cutNumber, cutRemoved, cutStart } from './path-cut.data';
import { pathLabelIntervalI18n } from './path-label-interval.i18n';
/** 标签截断区间图的语言 */
export type PathLabelIntervalProps = { lang?: Lang };
/** 展示文字边界沿切线的投影与路径距离区间 */
const PathLabelInterval: FC<PathLabelIntervalProps> = props => {
  const { lang = 'zh' } = props;
  const t = pathLabelIntervalI18n[lang];
  return (
    <Layout style={{ maxWidth: '100%', height: 'auto' }}>
      {[t.bounds, t.interval].map((title, index) => (
        <Scope key={title} localNamespace transforms={[{ kind: 'translate', x: index * 340, y: 0 }]}>
          <Node position={[90, -110]} text={title} style={{ stroke: 'none', font: { size: 13 } }} />
          <Path style={{ stroke: 'gray', strokeWidth: 2 }}>
            <Step kind="move" to={cutCurve.from} />
            <Step kind="curve" control={cutCurve.control} to={cutCurve.to} />
          </Path>
          {index === 0 ? (
            <>
              <Path
                way={[
                  [45, -50],
                  [145, -50],
                ]}
                arrow="->"
                label={{ text: t.tangent, side: 'bottom', distance: 25, textColor: 'gray', font: { size: 12 } }}
                style={{ stroke: 'gray', dashPattern: [1, 4], lineCap: 'round' }}
              />
              <Draw
                way={[
                  [66, -60],
                  [114, -60],
                  [114, -40],
                  [66, -40],
                  [66, -60],
                ]}
                style={{ stroke: 'gray', dashPattern: [1, 4], lineCap: 'round' }}
              />
              <Node position={cutCenter} text="label" style={{ stroke: 'none', font: { size: 13 } }} />
              <Path
                way={[
                  [66, -65],
                  [114, -65],
                ]}
                label={{ text: '48', textColor: 'gray', font: { size: 12 } }}
              />
              <Node
                position={[90, 40]}
                text={t.padding}
                style={{ stroke: 'none', textColor: 'gray', font: { size: 12 } }}
              />
            </>
          ) : (
            <>
              {cutRemoved.kind === 'quadraticBezier' && (
                <Path style={{ stroke: 'dodgerblue', strokeWidth: 4 }}>
                  <Step kind="move" to={cutRemoved.from} />
                  <Step kind="curve" control={cutRemoved.control} to={cutRemoved.to} />
                </Path>
              )}
              <Node position={[90, -78]} text="label" style={{ stroke: 'none', font: { size: 13 } }} />
              <Node
                position={[90, 40]}
                text={`s: ${cutNumber(cutStart)} → ${cutNumber(cutEnd)}`}
                style={{ stroke: 'none', textColor: 'gray', font: { size: 12 } }}
              />
            </>
          )}
        </Scope>
      ))}
      <Path
        way={[
          [0, 110],
          [600, 110],
        ]}
        arrow="->"
        label={{ text: t.distance, side: 'bottom', distance: 55, textColor: 'gray', font: { size: 12 } }}
      />
      <Path
        way={[
          [(cutStart / cutLength) * 560, 110],
          [(cutEnd / cutLength) * 560, 110],
        ]}
        style={{ stroke: 'dodgerblue', strokeWidth: 5 }}
        label={{ text: t.removed, textColor: 'gray', font: { size: 12 } }}
      />
      {[0, cutStart, cutDistance, cutEnd, cutLength].map(s => (
        <Node
          key={s}
          position={[(s / cutLength) * 560, 135]}
          text={cutNumber(s)}
          style={{ stroke: 'none', font: { size: 12 } }}
        />
      ))}
      <Node position={[280, 190]} text={t.note} style={{ stroke: 'none', textColor: 'gray', font: { size: 12 } }} />
    </Layout>
  );
};
export default PathLabelInterval;
