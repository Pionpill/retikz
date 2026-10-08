import type { IRRibbonPathOptions } from '@retikz/extension';
import { RibbonPathKindDefinition } from '@retikz/extension';
import type { CubicBezierCurveSegment } from '@retikz/math';
import { curve } from '@retikz/math';
import { Draw, Layout, Node, Path, Scope, Step } from '@retikz/react';
import type { FC } from 'react';

import type { Lang } from '@/i18n';

import { ribbonBoundaryGeometryI18n } from './ribbon-boundary-geometry.i18n';

/** 已有边界闭合示意图的语言 */
export type RibbonBoundaryGeometryProps = { lang?: Lang };

/** 同向输入、反转遍历与最终闭合保持相同边界几何 */
const RibbonBoundaryGeometry: FC<RibbonBoundaryGeometryProps> = props => {
  const { lang = 'zh' } = props;
  const t = ribbonBoundaryGeometryI18n[lang];
  const sides: Array<CubicBezierCurveSegment & { color: string }> = [
    { kind: 'cubicBezier', from: [0, 35], control1: [55, 35], control2: [100, 0], to: [155, 0], color: 'dodgerblue' },
    {
      kind: 'cubicBezier',
      from: [0, 80],
      control1: [45, 100],
      control2: [110, 45],
      to: [155, 60],
      color: 'darkorange',
    },
  ];
  const options: IRRibbonPathOptions = {
    mode: 'boundary',
    upper: [
      { type: 'step', kind: 'move', to: sides[0].from },
      { type: 'step', kind: 'cubic', control1: sides[0].control1, control2: sides[0].control2, to: sides[0].to },
    ],
    lower: [
      { type: 'step', kind: 'move', to: sides[1].from },
      { type: 'step', kind: 'cubic', control1: sides[1].control1, control2: sides[1].control2, to: sides[1].to },
    ],
  };

  return (
    <Layout style={{ maxWidth: '100%', height: 'auto' }} extensions={{ pathKinds: [RibbonPathKindDefinition] }}>
      {t.stages.map((title, stage) => (
        <Scope key={title} position={[stage * 235, 0]}>
          <Node position={[77, -30]} text={title} style={{ stroke: 'none', font: { size: 14 } }} />
          {stage === 2 && (
            <Path
              kind="ribbon"
              kindOptions={options}
              style={{ fill: 'dodgerblue', fillOpacity: 0.12, stroke: 'none' }}
            />
          )}
          {sides.map((side, index) => {
            const reverse = stage > 0 && index === 1;
            const sliced = curve.slice(side, 0.3, 0.65);

            // slice 保留输入曲线阶数，箭头沿真实边界而非手绘近似切线
            if (sliced.kind !== 'cubicBezier') return null;

            return (
              <Scope key={index}>
                <Path style={{ stroke: side.color, strokeWidth: 2 }}>
                  <Step kind="move" to={side.from} />
                  <Step kind="cubic" control1={side.control1} control2={side.control2} to={side.to} />
                </Path>
                <Path arrow="->" style={{ stroke: side.color, strokeWidth: 2 }}>
                  <Step kind="move" to={reverse ? sliced.to : sliced.from} />
                  <Step
                    kind="cubic"
                    control1={reverse ? sliced.control2 : sliced.control1}
                    control2={reverse ? sliced.control1 : sliced.control2}
                    to={reverse ? sliced.from : sliced.to}
                  />
                </Path>
              </Scope>
            );
          })}
          {stage === 2 && (
            <>
              <Draw way={[sides[0].to, sides[1].to]} arrow="->" />
              <Draw way={[sides[1].from, sides[0].from]} arrow="->" />
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

export default RibbonBoundaryGeometry;
