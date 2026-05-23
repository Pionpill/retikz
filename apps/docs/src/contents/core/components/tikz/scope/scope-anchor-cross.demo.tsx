import { Layout, Node, Path, Scope, Step } from '@retikz/react';
import type { FC } from 'react';

/**
 * 跨 scope anchor 引用：外层 path 取 scope 内 node 的命名 anchor 端点
 * @description ext 在最左侧 baseline；右侧 `<Scope translate(260, 0)>` 内含 hub 节点。两条外层 path：
 *   一条用 `'hub.north'`、一条用 `'hub.south-west'`——anchor 落在 scope translate 后的全局坐标上（hub 投影到 (260, 0)），
 *   path 端点贴 hub 视觉边界而非中心。演示 anchor 字符串穿过 scope 边界仍能解析到正确的世界系点。
 */
const Demo: FC = () => (
  <Layout width={560} height={140}>
    <Node id="ext" position={[0, 0]}>ext</Node>
    <Scope transforms={[{ kind: 'translate', x: 260, y: 0 }]}>
      <Node id="hub" position={[0, 0]} shape="circle" padding={8}>hub</Node>
    </Scope>
    <Path arrow="->">
      <Step kind="move" to="ext" />
      <Step to="hub.north" />
    </Path>
    <Path arrow="->">
      <Step kind="move" to="ext" />
      <Step to="hub.south-west" />
    </Path>
  </Layout>
);

export default Demo;
