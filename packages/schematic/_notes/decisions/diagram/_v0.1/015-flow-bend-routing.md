---
description: Flow bend 常规曲线路由、自动选侧、完整切线参数与曲线结果契约
keywords: Flow、bend、routing、bendDirection、bendAngle、outAngle、inAngle、looseness、GeometryLabel
---

# ADR-015：Flow bend 曲线路由

- 状态：Accepted
- 决策日期：2026-10-02
- 关联：[Diagram v0.1 roadmap](./roadmap.md) · [Flow Source](./003-flow-source-model.md) · [Layout Definition](./004-flow-layout-definition-registry.md) · [结果交付](./005-flow-orchestration-result-artifact.md) · [单折角路由](./011-flow-elbow-routing.md)

## 背景与决策

Flow 增加与 straight、orthogonal、`-|`、`|-` 并列的常规 `bend` 路由：仅指定模式即可自动选择方向和角度，也可逐级指定方向、角度和完整切线参数。它服务简单曲线、分支和回边，不保证复杂避障；贝塞尔与过点曲线由独立决策定义。

Diagram 拥有方向选择、继承和几何交付，Graph 拥有 Relation，Core 拥有 bend 几何、节点边界、标签和箭头缩短。内置与自定义布局共用 Layout Definition / registry / capability，不新增 routing registry。根、Group、Relation 及 React、Vanilla、direct JSON 共享同一契约，不增加 Step children 或 adapter 专属入口。

## 参数与继承

Flow 完整保留 Core BendStep 的曲线字段和值域：

| 模式      | 触发条件                         | 生效参数与默认值                                                                |
| --------- | -------------------------------- | ------------------------------------------------------------------------------- |
| 对称 bend | 无切线角                         | `bendDirection` 省略时自动选侧；`bendAngle` 省略时比较 `30 / 45 / 60` 度        |
| 切线      | 任一 `outAngle` / `inAngle` 存在 | `outAngle: 0`、`inAngle: 180`、`looseness: 1`；忽略方向和 bend 角度，不自动选侧 |

切线角是屏幕坐标系绝对角度，正向朝 y 增大的方向旋转。`bendAngle` 属于 `(-180, 180)`，负值翻转几何弯曲侧，`0` 为直线形状但保留 bend 身份；`looseness > 0` 且仅用于切线模式。角度与坐标必须有限。

- 省略整项 routing 沿用作用域继承；显式 bend 的缺失字段继承最近有效 bend 祖先，不跨路由种类继承曲线参数
- 局部切线角触发或覆盖切线模式；局部仅指定 `bendDirection` / `bendAngle` 则选择对称模式，不继承祖先切线角，缺失的侧和角度仍取祖先对称配置，否则保留自动选择
- 未生效字段保留在 authored Source，但有效 route 只保留一个参数族；Source 解析不得提前补入方向或角度
- Core 拥有切线参数默认与曲线几何；Flow 拥有对称 bend 的候选选择。`FlowLayoutRouting` 的方向、角度均可省略，Definition 不再声明单一 `defaults.routing.bendAngle`，避免提前锁定自动候选

## 自动选择方向与角度

未指定且未继承角度时比较 `30° / 45° / 60°`，未指定方向时比较左右，最多六条候选。显式或继承角度锁定该值（包括负值与 `0`）；显式或继承方向只搜索该侧。两者均指定或采用切线模式时不自动搜索。不得移动节点、改变 routing kind 或搜索任意控制点。

按字典序比较节点冲突数、节点内曲线参数区间总跨度、标签冲突数；节点优先，标签只在节点评分相同时决胜。不检测或评分边重叠、边交叉，以避免曲线两两细分比较的成本；同分优先小角度，再选 `left`。平行边可能重叠，不承诺自动分离。

节点检测采用连续曲线的保守几何近似，不仅检查中点或控制点。端点合法出入不算障碍；祖先 Group 内部及相关跨作用域边界可穿过，非相关 Group 及内容仍参与评价。标签比较包含候选曲线与已有标签、候选标签与节点及已有标签。

相同 Source、definitions、Theme 与测量结果必须得到相同路线。内置 layered 按关系 Source 顺序选择，标签比较包含先前选定的自动路线与全部非自动路线，不包含尚未选择的自动路线。反向 source/target 或 `direction: 'reverse'` 不改变 authored source → target 的侧向约定。

所有候选均穿越节点时仍选评分最好的一条，保留绘制，并在关系 Source 路径发出 `FlowBendObstacleConflict` warning。显式配置、切线与自定义 provider 的节点冲突同样告警，不覆盖作者参数或自动切换路由。该能力不保证全局避障、回边绕到图外或平行边分离；自环仍由 Definition 的 `selfLoops` capability 决定，内置 layered 不新增支持。

LLM schema guidance 必须说明 bend 是优先于手写曲线控制的常规路由、自动候选与节点优先/标签次级策略、不评估边交叉，并说明切线优先、绝对角度和 looseness 的适用模式。

## 公开结果契约

以下为最小公开形态，Source 类型由权威 schema 派生：

```ts
type FlowBendRouting = {
  kind: 'bend';
  bendDirection?: 'left' | 'right';
  bendAngle?: number;
  outAngle?: number;
  inAngle?: number;
  looseness?: number;
};

type FlowBendRoute = Readonly<{
  kind: 'bend';
  points: readonly [Readonly<Position>, Readonly<Position>];
}> &
  (
    | Readonly<{ bendDirection: 'left' | 'right'; bendAngle: number }>
    | Readonly<{ outAngle: number; inAngle: number; looseness: number }>
  );

type FlowLayoutRoute =
  | Readonly<{ kind: 'straight'; points: ReadonlyArray<Readonly<Position>> }>
  | Readonly<{
      kind: 'orthogonal' | '-|' | '|-';
      points: ReadonlyArray<Readonly<Position>>;
      cornerRadius: number;
    }>
  | FlowBendRoute;

type FlowLayoutRelationOutput = Readonly<{
  route: FlowLayoutRoute;
  labelBounds?: Readonly<BoundsRect>;
}>;

type FlowRelationLabel = IRTextBlock | IRGeometryLabel;
type FlowLayoutLabelPlacement = Readonly<Omit<IRGeometryLabel, 'text' | 'textColor' | 'font' | 'opacity'>>;
```

`capabilities.routingKinds` 增加 `bend`，内置 layered 声明支持。provider 输入 `FlowLayoutRouting` 携带有效参数，对称模式允许省略方向和角度；自定义 provider 同样在允许的候选中选择、保留显式参数并返回统一 route / label contract。自动角度输出必须属于 `30 / 45 / 60`，不能换成切线参数族。

bend 输出两个 Flow 根坐标系参考端点，保持 source / target bounds 中心；不重复保存控制点或采样点。artifact 使用同一 route，坐标转换只平移端点与标签预留盒，不改角度、方向或 looseness。参考路线不代表 Core 边界裁剪、箭头缩短后的最终描边；artifact / drawing 的视觉包络必须包含曲线真实极值。

## 完整标签

Relation 的唯一 `label` 入口接受原有紧凑 `IRTextBlock` 或完整 `IRGeometryLabel`，routing 不另存标签。完整形式保留 `text`、`textColor`、`font`、`opacity`、`position`、`side`、`sloped`、`interrupt`、`gap`、`placement`、`distance` 及 Core 默认；其外观优先于关系级 `labelTextForeground`、`labelFont`、`labelOpacity`，缺失值沿 Graph/Core 级联。

`position` 沿 bend 贝塞尔参数采样，不表示弧长比例；sloped 使用切线，interrupt / gap 复用 Core 曲线断线语义，`placement: 'inside'` 沿用 Core 开放路径语义。

provider 保留 `labelSize`，完整标签另传 `labelPlacement` 几何投影（即使为空），不传文本、Graph appearance 或 Scene；缺失几何字段使用 Core 默认。紧凑 TextBlock 省略该投影并保留原自动预留策略，预留盒不得覆盖显式几何配置。

`labelBounds` 是预留盒：非倾斜时使用测量尺寸，倾斜时使用切线旋转文字盒的 AABB。它不是最终 glyph bounds，边界裁剪、箭头缩短、断线与文字绘制仍可能改变最终结果。

## 失败语义与兼容性

- 不支持 bend 的 Definition 在 callback 前以 capability 错误拒绝，不 fallback；输出模式、参考端点或显式参数不匹配使用 `FlowLayoutOutputInvalid`
- 有限但过大的参数导致非有限几何时，Diagram materialization 错误定位关系并保留 Core cause，不 clamp 作者值；合法几何的节点冲突只 warning 并保留绘制
- 两种标签形式均要求非空白文本
- 现有四种 routing 的选择、点链、圆角与默认 straight 不变，紧凑 TextBlock 继续有效
- **Breaking：** Definition 输出由 `{ points, labelBounds? }` 改为 `{ route, labelBounds? }`，所有消费方同步迁移，不保留双轨、旧名 alias 或 migration
- 本文覆盖 ADR-003 的标签、ADR-004 的 routing/defaults/output、ADR-005 的曲线 artifact / materialization 对应决策
