import { Draw, Layout, Node, Path, Scope, Step } from '@retikz/react';
import { List, Map } from '@retikz/standard-react/container';
import type { FC } from 'react';

import type { Lang } from '@/i18n';

import { cutCurve, cutLength, cutNumber } from './path-cut.data';
import { pathResolutionI18n } from './path-resolution.i18n';
/** 路径解析示意图的语言 */
export type PathResolutionProps = { lang?: Lang };
/** 从作者步骤到具体命令，再展开绘制段的来源与距离 */
const PathResolution: FC<PathResolutionProps> = props => {
  const { lang = 'zh' } = props;
  const t = pathResolutionI18n[lang];
  return (
    <Layout style={{ maxWidth: '100%', height: 'auto' }}>
      <List
        id="steps"
        label={{
          text: t.steps,
          position: { boundary: 'bottom', fraction: 0 },
          align: 'start',
          distance: 6,
          opacity: 0.8,
          font: { size: 12 },
        }}
        layout={{ width: 275, padding: 2 }}
        style={{ font: { size: 13 } }}
        data={[
          { kind: 'move', to: [0, 0] },
          { kind: 'curve', control: [90, -100], to: [180, 0] },
        ]}
        showIndex
      />
      <List
        id="commands"
        transforms={[{ kind: 'translate', x: 0, y: 180 }]}
        label={{
          text: t.commands,
          position: { boundary: 'bottom', fraction: 0 },
          align: 'start',
          distance: 6,
          opacity: 0.8,
          font: { size: 12 },
        }}
        layout={{ width: 275, padding: 2 }}
        style={{ font: { size: 13 } }}
        data={[
          { kind: 'move', to: [0, 0] },
          { kind: 'quad', control: [90, -100], to: [180, 0] },
        ]}
        showIndex
      />
      <Draw
        way={[
          'steps.bottom',
          { label: { text: t.resolve, position: 0.5, side: 'right', textColor: 'gray', font: { size: 12 } } },
          { verticalTo: 'commands.top' },
        ]}
        arrow="->"
      />
      <Map
        id="occurrence"
        transforms={[{ kind: 'translate', x: 300, y: 375 }]}
        label={{
          text: t.record,
          position: { boundary: 'bottom', fraction: 0 },
          align: 'start',
          distance: 6,
          opacity: 0.8,
          font: { size: 12 },
        }}
        style={{ font: { size: 13 } }}
        layout={{ height: 28, key: { width: 160 }, value: { width: 90 } }}
        data={{
          commandIndex: 1,
          sourceStepIndex: 1,
          subPathIndex: 0,
          logicalStart: 0,
          logicalEnd: Number(cutNumber(cutLength)),
        }}
      />
      <Draw way={['commands.bottom', '|-', 'occurrence.left']} arrow="->" />
      <Scope transforms={[{ kind: 'translate', x: 40, y: 455 }]}>
        <Path style={{ stroke: 'dodgerblue', strokeWidth: 2 }}>
          <Step kind="move" to={cutCurve.from} />
          <Step kind="curve" control={cutCurve.control} to={cutCurve.to} />
        </Path>
      </Scope>
      <Node position={[40, 478]} text="A · s = 0" style={{ stroke: 'none', textColor: 'gray', font: { size: 12 } }} />
      <Node
        position={[220, 478]}
        text={`B · s ≈ ${cutNumber(cutLength)}`}
        style={{ stroke: 'none', textColor: 'gray', font: { size: 12 } }}
      />
    </Layout>
  );
};
export default PathResolution;
