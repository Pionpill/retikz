import { RibbonPathKindDefinition } from '@retikz/extension';
import { Draw, Layout, Node, Path, Scope, Step } from '@retikz/react';

/** 三个宽度节点及其插值方式 */
export type RibbonNonlinearWidthPreviewValues = {
  startWidth: number;
  middleWidth: number;
  endWidth: number;
  interpolation: 'linear' | 'smooth';
};

/** 直线中心线隔离宽度变化，圆点标出中心线与两侧边界的采样位置 */
export const renderRibbonNonlinearWidthPreview = (values: RibbonNonlinearWidthPreviewValues) => {
  const sampleCount = 16;
  // 单段直线的弧长比例就是横坐标比例；与 Ribbon 一样额外合入宽度节点并去重
  const offsets = [
    ...new Set([...Array.from({ length: sampleCount }, (_, index) => index / (sampleCount - 1)), 0, 0.5, 1]),
  ].sort((a, b) => a - b);
  const samples = offsets.map(offset => {
    const local = offset <= 0.5 ? offset * 2 : (offset - 0.5) * 2;
    const from = offset <= 0.5 ? values.startWidth : values.middleWidth;
    const to = offset <= 0.5 ? values.middleWidth : values.endWidth;
    const ratio = values.interpolation === 'smooth' ? local * local * (3 - 2 * local) : local;
    return { x: offset * 360, width: from + (to - from) * ratio };
  });
  return (
    <Layout
      width={470}
      height={190}
      viewBox={{ x: -55, y: -80, width: 470, height: 190 }}
      style={{ maxWidth: '100%', height: 'auto' }}
      extensions={{ pathKinds: [RibbonPathKindDefinition] }}
    >
      <Path
        kind="ribbon"
        kindOptions={{
          width: {
            kind: 'stops',
            stops: [
              { offset: 0, value: values.startWidth },
              { offset: 0.5, value: values.middleWidth },
              { offset: 1, value: values.endWidth },
            ],
            interpolation: values.interpolation,
          },
          sampling: { kind: 'fixed', samples: sampleCount },
        }}
        style={{ fill: 'dodgerblue', fillOpacity: 0.22, stroke: 'dodgerblue', strokeWidth: 2 }}
      >
        <Step kind="move" to={[0, 0]} />
        <Step to={[360, 0]} />
      </Path>
      {[values.startWidth, values.middleWidth, values.endWidth].map((width, index) => (
        <Scope key={index}>
          <Draw
            way={[
              [index * 180, -width / 2],
              [index * 180, width / 2],
            ]}
            style={{ stroke: 'gray', dashPattern: [1, 4], lineCap: 'round' }}
          />
          <Node
            position={[index * 180, 70]}
            text={[
              { text: `offset = ${index / 2}`, fill: 'gray', font: { size: 12 } },
              { text: `w = ${width}`, font: { size: 14 } },
            ]}
            style={{ stroke: 'none' }}
          />
        </Scope>
      ))}
      {samples.map((sample, index) => (
        <Scope key={index}>
          <Node
            position={[sample.x, 0]}
            shape="circle"
            layout={{ minimumSize: 3.5, padding: 0 }}
            style={{ stroke: 'none', fill: 'darkorange' }}
          />
          {[-1, 1].map(side => (
            <Node
              key={side}
              position={[sample.x, (side * sample.width) / 2]}
              shape="circle"
              layout={{ minimumSize: 3.5, padding: 0 }}
              style={{ stroke: 'none', fill: 'darkorange' }}
            />
          ))}
        </Scope>
      ))}
    </Layout>
  );
};
