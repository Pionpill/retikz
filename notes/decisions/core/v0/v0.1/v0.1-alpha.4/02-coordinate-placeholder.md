# ADR-02：`<Coordinate>` 占位节点的 IR 表达

- 状态：Accepted
- 决策日期：2026-05-10
- 关联：[v0 roadmap §v0.1.0-alpha.4](../../../plans/v0/roadmap.md) · [tikz-gap-analysis §3](../../../analysis/2026-05-07-tikz-gap-analysis.md)

## 背景

TikZ 提供 `\coordinate (m) at (3, 2);` 命名一个点不画任何图形——给后续 path / node 的相对定位作锚点：

```tex
\coordinate (m) at (3, 2);
\node[circle, draw, right=1cm of m] (A) {A};
\draw (A) -- (m);
```

retikz alpha.3 没有占位概念。要"在某处放一个引用点"必须 fake 一个空 Node：

```tsx
{/* alpha.3 的将就办法 */}
<Node id="m" position={[3, 2]} stroke="transparent" fill="transparent" />
```

问题：

1. 视觉上仍占空间——空 Node 走 layoutNode，文本为 undefined 时仍按最小 padding 撑出一个不可见的矩形 layout，但仍参与 viewBox 扩展
2. AI 生成 / TikZ codec 反推时无法区分"用户写的真 Node 还是 fake 占位"
3. 用户心智负担——本来想说"这是个点"得绕到"这是个不可见的矩形"

alpha.4 必须把它升级为一等 IR 概念。

## 选项

### A. 新增 `IRChild` discriminator kind `'coordinate'`（**推荐**）

```ts
type IRChild = IRNode | IRPath | IRCoordinate;
type IRCoordinate = {
  type: 'coordinate';
  id: string;       // 必填——无 id 的占位无意义
  position: Position | PolarPosition | AtPosition;
};
```

- IR 字段最少（id + position），与 Node 的 30+ 字段对比一目了然
- ChildSchema 用 `discriminatedUnion('type', [Node, Path, Coordinate])`，AI 生成 / 校验都按 type 分发
- 编译期单独 case：`child.type === 'coordinate'` → 不发 primitive、不扩 bbox，但注册到 nodeIndex 让 path / `at.of` 引用能命中

### B. Node + `invisible: true` 标记

```ts
type Node = {
  // ... 30+ 字段
  invisible?: boolean;  // 新增
};
```

- 复用 Node schema，编译期检查 invisible 跳过 emit
- 缺点：Node 是给"有形状的实体"用的；invisible 让一堆字段（fill / stroke / text / padding / shape）在该模式下无意义，schema 无法表达这种"模式互斥"
- AI 生成 IR 时分辨"哪些 Node 字段在 invisible 时该填、哪些不该"反而更难

### C. 仅 React DSL，不进 IR

- builder 把 `<Coordinate>` 同步翻译成"在 builder 局部维护的 id → position map"，编译时不传给 core
- 缺点：和 ADR-01 选项 B 一样的问题——丢失意图，codec 反推失败；core 无法独立知道占位语义

## 决策：A（独立 IR kind）

理由：

1. **Schema 字段最少**——只有 id + position 两个字段，AI 生成 / IR 校验最简单
2. **discriminator 正交**——`type` 字段一眼分辨 node / path / coordinate，三类各管自己
3. **编译期处理一处**——Pass 1 加一个 `else if (child.type === 'coordinate')` 分支即可
4. **与现有体系对称**——polar `origin` / Step `to` / `at.of` 全部通过 nodeIndex 字符串引用，coordinate 加进 nodeIndex 即可

## nodeIndex 中如何表示 coordinate

nodeIndex 类型现状：`Map<string, NodeLayout>`。给 coordinate 也走 NodeLayout，构造一个最小 layout：

```ts
{
  id,
  shape: 'rectangle',
  rect: { x: cx, y: cy, width: 0, height: 0, rotate: 0 },
  rotateDeg: 0,
  margin: 0,
  textWidth: 0, textHeight: 0,
  align: 'middle', lineHeight: 0, fontSize: 0,
}
```

- shape='rectangle' + 0×0 矩形：`boundaryPoint` 在 0×0 rect 上恒返回中心，正好符合"占位无形状边界"的语义（path 端点引用 coordinate 时贴在中心，不需要外扩）
- 不污染 NodeLayout 类型——零尺寸是它本来就允许的合法值
- 未来如果 NodeLayout 加新字段，coordinate 也能跟着默认；不需要拆 union

## 不进 viewBox

allPoints（视觉边界点集合）只在 Pass 1 的 `child.type === 'node'` 分支里 push 4 角；coordinate 分支不 push。

测试验证：

```ts
const farIR = { type: 'scene', children: [{ type: 'coordinate', id: 'far', position: [9999, 9999] }] };
const emptyIR = { type: 'scene', children: [] };
expect(compileToScene(farIR).viewBox).toEqual(compileToScene(emptyIR).viewBox);
```

——两个场景 viewBox 完全一致（都走 `view-box.ts` 空点集兜底 100×100）。

## DSL 表面

```tsx
<Tikz nodeDistance={1.5}>
  <Coordinate id="m" position={[3, 2]} />
  <Node id="A" position={{ direction: 'right', of: 'm' }}>A</Node>
  <Path>
    <Step to="A" />
    <Step to="m" />
  </Path>
</Tikz>
```

- `<Coordinate>` 是 kernel 第三个组件（与 `<Node>` / `<Path>` 平级）
- 接受 position 的三种形态（笛卡尔 / 极坐标 / `at`）——与 `<Node>` 完全一致
- displayName: `@retikz/Coordinate`

## 测试

`packages/core/tests/compile/node-coordinate.test.ts` 覆盖：

- coordinate 不发 primitive
- coordinate 不进 viewBox（与无 child 等价兜底）
- path target 可命中 coordinate id
- node `at.of` 可引用 coordinate id
- coordinate position 支持 polar / at（链式占位）
- 引用未定义 / 前向引用都抛错

7 个 case 全过。

## 影响

- 新文件 `packages/core/src/ir/coordinate.ts`
- `IRChild` discriminator union 从 2 项变成 3 项（type='node' | 'path' | 'coordinate'）
- `compileToScene` Pass 1 新增 coordinate 分支
- React 新增 `kernel/Coordinate.tsx` + `TIKZ_COORDINATE` displayName
- `_builder.ts` / `_unbuilder.ts` 增加 coordinate 分支
- 现有测试与功能完全不受影响（addition-only）

## 不在本 ADR 范围

- coordinate 自身的 anchor 概念（`m.north` 等）：占位无形状边界，所有 anchor 都退化为中心点；显式 anchor 语法不为 coordinate 提供
- `\path[name path=...]` / `\path coordinate (...);` 等其它 TikZ 占位变体——超出本版需求，留到 v0.2+
