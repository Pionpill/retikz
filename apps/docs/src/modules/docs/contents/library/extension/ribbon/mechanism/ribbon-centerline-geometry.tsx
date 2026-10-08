import { RibbonPathKindDefinition } from '@retikz/extension';
import type { CubicBezierCurveSegment } from '@retikz/math';
import { curve, vector2 } from '@retikz/math';
import { Draw, Layout, Node, Path, Scope, Step } from '@retikz/react';
import type { FC } from 'react';

import type { Lang } from '@/i18n';

import { ribbonCenterlineGeometryI18n } from './ribbon-centerline-geometry.i18n';

/** 中心线轮廓示意图的语言 */
export type RibbonCenterlineGeometryProps = { lang?: Lang };

/** 用同一条曲线对照弧长采样、横截面偏移与最终 Ribbon */
const RibbonCenterlineGeometry: FC<RibbonCenterlineGeometryProps> = props => {
  const { lang = 'zh' } = props;
  const t = ribbonCenterlineGeometryI18n[lang];
  const geometry: CubicBezierCurveSegment = {
    kind: 'cubicBezier',
    from: [0, 70],
    control1: [55, 70],
    control2: [100, 10],
    to: [155, 10],
  };
  const totalLength = curve.approximateLength(geometry);
  const samples = Array.from({ length: 7 }, (_, index) => {
    const sample = curve.sampleAt(
      geometry,
      curve.parameterAtDistance(geometry, (index / 6) * totalLength, { totalLength }),
    );
    const normal = vector2.normal(sample.tangent);

    return {
      center: sample.point,
      left: vector2.add(sample.point, vector2.scale(normal, 12)),
      right: vector2.add(sample.point, vector2.scale(normal, -12)),
    };
  });

  return (
    <Layout style={{ maxWidth: '100%', height: 'auto' }} extensions={{ pathKinds: [RibbonPathKindDefinition] }}>
      {t.stages.map((title, stage) => (
        <Scope key={title} position={[stage * 235, 0]}>
          <Node position={[77, -30]} text={title} style={{ stroke: 'none', font: { size: 14 } }} />
          {stage === 2 && (
            <Path
              kind="ribbon"
              kindOptions={{ width: { kind: 'fixed', value: 24 }, sampling: { kind: 'fixed', samples: 7 } }}
              style={{ fill: 'dodgerblue', fillOpacity: 0.12 }}
            >
              <Step kind="move" to={geometry.from} />
              <Step kind="cubic" control1={geometry.control1} control2={geometry.control2} to={geometry.to} />
            </Path>
          )}
          <Path style={{ stroke: 'gray', dashPattern: [1, 4], lineCap: 'round' }}>
            <Step kind="move" to={geometry.from} />
            <Step kind="cubic" control1={geometry.control1} control2={geometry.control2} to={geometry.to} />
          </Path>
          {stage === 1 &&
            samples.map((sample, index) => (
              <Draw
                key={index}
                way={[sample.left, sample.right]}
                style={{ stroke: 'gray', dashPattern: [1, 4], lineCap: 'round' }}
              />
            ))}
          {stage === 2 &&
            (['left', 'right'] as const).map(side => (
              <Path key={side} style={{ stroke: side === 'left' ? 'dodgerblue' : 'darkorange', strokeWidth: 2 }}>
                <Step kind="move" to={samples[0][side]} />
                {curve
                  .catmullRomToCubic(
                    samples.map(sample => sample[side]),
                    1,
                  )
                  .map((segment, index) => (
                    <Step key={index} kind="cubic" {...segment} />
                  ))}
              </Path>
            ))}
          {stage === 2 &&
            [samples[0], samples[6]].map((sample, index) => <Draw key={index} way={[sample.left, sample.right]} />)}
          {samples.map((sample, index) => (
            <Scope key={index}>
              <Node
                position={sample.center}
                shape="circle"
                layout={{ minimumSize: 4, padding: 0 }}
                style={{ stroke: 'none', fill: 'gray' }}
              />
              {stage > 0 &&
                (['left', 'right'] as const).map(side => (
                  <Node
                    key={side}
                    position={sample[side]}
                    shape="circle"
                    layout={{ minimumSize: 5, padding: 0 }}
                    style={{ stroke: 'none', fill: side === 'left' ? 'dodgerblue' : 'darkorange' }}
                  />
                ))}
            </Scope>
          ))}
          {stage === 0 && (
            <>
              <Draw
                way={[samples[3].center, [77, 80]]}
                style={{ stroke: 'gray', dashPattern: [1, 4], lineCap: 'round' }}
              />
              <Node
                position={[77, 91]}
                text={t.offset}
                style={{ stroke: 'none', textColor: 'gray', font: { size: 12 } }}
              />
            </>
          )}
          <Node
            position={[77, 122]}
            text={t.notes[stage]}
            style={{ stroke: 'none', textColor: 'gray', font: { size: 12 } }}
          />
        </Scope>
      ))}
      {[0, 1].map(index => (
        <Draw
          key={index}
          way={[
            [178 + index * 235, 40],
            [208 + index * 235, 40],
          ]}
          arrow="->"
        />
      ))}
    </Layout>
  );
};

export default RibbonCenterlineGeometry;
