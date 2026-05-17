import { Node, Path, Scope, Step, TikZ } from '@retikz/react';
import type { FC } from 'react';

/**
 * 空 scope.id：无子元素 + scope.id 设值 → bbox 退化为 scope 局部原点经 transform 链后的全局点（0×0 占位）
 * @description `<Scope id="anchor-point" translate(280, 70)>` 内无 children——但 scope.id 仍注册一个 0×0 占位 layout 在 (280, 70)。
 *   外部 `relative-to-empty-scope` 节点用 `{ of: 'anchor-point', offset: [40, 0] }` 引用此占位点 + 偏移；
 *   path 从 base 节点画到 anchor-point 退化点。展示"空 scope + id 仍是合法句柄"语义。
 */
const Demo: FC = () => (
  <TikZ width={560} height={180}>
    <Node id="base" position={[0, 60]}>base</Node>
    <Scope id="anchor-point" transforms={[{ kind: 'translate', x: 280, y: 70 }]}>
      {/* 无 children——bbox 退化为 (280, 70) 0×0 占位 */}
    </Scope>
    <Node
      id="relative-to-empty-scope"
      position={{ of: 'anchor-point', offset: [120, 0] }}
    >
      offset from empty
    </Node>
    <Path arrow="->">
      <Step kind="move" to="base" />
      <Step to="anchor-point" />
    </Path>
    <Path arrow="->">
      <Step kind="move" to="anchor-point" />
      <Step to="relative-to-empty-scope" />
    </Path>
  </TikZ>
);

export default Demo;
