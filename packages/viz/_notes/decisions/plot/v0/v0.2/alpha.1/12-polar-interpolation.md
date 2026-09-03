# ADR-12：Polar2D 插值模式与继承

- 状态：Accepted（2026-09-02 按人工确认的共享模式与覆盖契约完成收口）
- 决策日期：2026-09-01
- 关联：[plot v0.2-alpha.1 roadmap](./roadmap.md) · [plot v0.1 ADR-01 Polar coordinate](../../v0.1/alpha.4/01-coordinate-polar.md) · [Plot 可视化完备设计](../../../../../architecture/plot-visualization-complete.md)

## 背景与目标

`polar2D` 同时承载连续角度图和离散雷达图。连续角度表示可在相邻角值之间取值的圆周空间：固定半径的相邻点应沿圆弧连接，半径同时变化时应沿角度与半径连续变化的极坐标曲线连接。离散角度只定义一组独立轴位，相邻顶点之间没有可解释的中间角值，默认应在投影后直接连接成雷达多边形

现有坐标帧只暴露角度 scale 是否连续，Path、Grid 和 cell 边界分别决定自己的几何。Path 又把闭合与是否进行极坐标段内采样耦合，导致默认闭合的连续 Polar Path 退化为弦；Grid 则无条件使用圆弧。相同 Plot 因而可能同时出现互相冲突的圆形与多边形语义，单个 Mark 也无法显式选择另一种表现

本决策要把“相邻极坐标位置之间如何连接”建立为 `polar2D` 的共享几何策略：坐标系解析一个统一默认，Guide 与具备坐标段边界的 Mark 继承它，Mark 仅在确有局部表现需求时覆盖。`closed` 继续只决定拓扑闭合，`curve` 继续只决定投影后的曲线算法，两者都不再代替 Polar 插值模式

## 决策：坐标系解析共享模式，Mark 按需覆盖

`polar2D.interpolation` 使用两个封闭取值：

- `polar`：先在角度与半径输出空间连续插值，再投影到屏幕空间。固定半径形成圆弧，变化半径形成连续极坐标曲线
- `chord`：先投影模式所需的顶点，再在屏幕空间连接。默认线性 curve 下相邻顶点为直线弦，闭合后形成雷达或多边形轮廓

坐标系省略 `interpolation` 时，根据有效 angular position scale 的连续性推断：连续 scale 使用 `polar`，离散 scale 使用 `chord`。解析后的模式写入 Polar coordinate frame，作为 Guide 与 Mark lowering 共同消费的单一事实源；Guide 与 Mark 不再按 scale type 或 mark topology 各自推断

具备坐标段或 cell 边界的内置 Mark 默认继承 frame 模式。Path、Interval 与 Reference 可以声明同名 `interpolation` 作局部覆盖；Relation 只有在默认 path 的 source、target 与 via 都是 coordinate-projected target 时继承 frame，并可以在 path 几何配置中覆盖。Point 与 Relation endpoint glyph 不暴露独立的 interpolation 配置；其原始数据位置仍按极坐标点投影，但离散角轴上的 role-space adjustment 产生类别之间的合成位置时，由 frame 的已解析模式决定投影路径：`polar` 沿圆周，`chord` 沿相邻结构顶点之间的直线边。anchor / node target、显式 route、routing 与 ribbon 缺少可供 Plot 连续插值的完整极坐标位置，仍由 Relation 自身契约决定，不被 coordinate interpolation 改写

有效优先级为：

```text
angular scale continuity inference
  < polar2D coordinate interpolation
  < interpolation-sensitive mark override
```

理由：

1. Grid 与 Mark 属于同一 coordinate scope，必须共享一个已经解析的空间连接策略，才能形成一致的圆形或雷达骨架
2. scale 连续性提供符合多数场景的自动默认，而 coordinate 显式值允许连续数据使用雷达弦、离散数据使用圆弧，不把用户意图锁死在字段类型上
3. Mark 覆盖只影响自身几何，不反向改变 coordinate、Grid 或同 scope 的其它 Mark，保留多图层组合能力
4. 插值空间、拓扑闭合与屏幕曲线算法是三个正交事实；分离后既能保持 JSON IR 清晰，也不会把 Polar 语义塞入 Core Path 或 renderer

## 基础数据结构与公开契约

最小 Source IR 与运行时契约为：

```ts
const PolarInterpolation = {
  Polar: 'polar',
  Chord: 'chord',
} as const;

type PolarInterpolationValue = ValueOf<typeof PolarInterpolation>;

type IRPlotPolar2DCoordinate = {
  type: 'polar2D';
  interpolation?: PolarInterpolationValue;
  // 既有 angle / radius / startAngle / endAngle / innerRadius
};

type PositionScaleDefinition = {
  family: 'position';
  continuity: 'continuous' | 'discrete';
  // 既有 schema / compatibility / resolve contract
};

type PolarCoordinateFrame = {
  type: 'polar2D';
  interpolation: PolarInterpolationValue;
  projectMappedRoles: (values: ReadonlyArray<number>) => Position | null;
  projectCell: (cell: Cell, options?: { interpolation?: PolarInterpolationValue }) => CellGeometry;
  // 既有已解析 scale、范围与点 / 极坐标投影能力
};

type IRPlotPathMark = {
  type: 'path';
  interpolation?: PolarInterpolationValue;
};

type IRPlotIntervalMark = {
  type: 'interval';
  interpolation?: PolarInterpolationValue;
};

type IRPlotReferenceMark = {
  type: 'reference';
  interpolation?: PolarInterpolationValue;
};

type IRPlotRelationPathGeometry = {
  interpolation?: PolarInterpolationValue;
  // 既有 via / route / routing / label / options
};
```

`PositionScaleDefinition.continuity` 是 position scale 的运行时拓扑事实，不进入 JSON IR。内置与自定义 position scale 使用同一字段，使 `polar2D` 的省略值推断不依赖内置 type 白名单。Polar frame 的 `projectCell` 省略 options 时使用 frame 默认，插值敏感 Mark 以可选参数传入自己的有效覆盖；覆盖按次消费，不修改共享 frame 或 Grid。`projectMappedRoles` 只在离散角轴的 scale 输出出现类别间合成位置时使用 resolved interpolation：`polar` 直接按角度与半径投影，`chord` 在包围该位置的相邻 angular skeleton 顶点间按角向比例线性插值；原始类别位置仍精确落在结构顶点，连续角轴仍按真实角度投影。`PolarInterpolation` 只描述内置 `polar2D` 的连接空间；自定义 coordinate 继续由自己的 Source schema 与 Definition 拥有几何，不在本决策中增加通用 coordinate interpolation capability

`polar` 对每个相邻角度 / 半径输出对做连续插值。全周期闭合时，最后一段按 coordinate sweep 方向跨越角度接缝，不把接缝误解为反向绕行；`chord` 只使用有效顶点。Path 的 `curve` 随后作用于这组屏幕点，默认仍为 `linear`；显式曲线可以进一步平滑结果，但不改变 interpolation 选择的坐标空间

Guide 中所有固定半径的坐标路径共享 frame 模式：`polar` 生成圆弧或圆环，`chord` 使用有效 angular ticks 的去重投影位置生成折线或多边形。angular spokes 与固定角度参考线在两种模式下都保持径向直线。起止方向不重合的 angular sweep 不强制闭合：`polar` 为开弧，`chord` 为开折线；非零 sweep 的起止投影方向重合时才闭合成环或多边形

Interval、Reference band 与 region 的固定半径边界同样继承有效模式：`polar` 保持扇区弧边，`chord` 形成由角边与径向直边围合的 contour。Mark override 只替换该 Mark 的有效模式，不改变 Grid；已有角度 padding 与径向位移先作用于 cell 参数，再按有效模式生成边界

## 行为、失败语义与兼容性

- 默认行为：连续 angular position scale 默认 `polar`，离散 angular position scale 默认 `chord`；显式 coordinate 值覆盖推断，具备插值语义的 Mark 再覆盖 coordinate
- Path 拓扑：Polar Path 既有 `closed` / `closure` 规则保持不变；闭合不再禁用 `polar` 段内插值，`closed` 只决定是否连接首尾
- Guide 行为：angular axis 的固定半径轴线与 radial grid rings 使用 coordinate interpolation；radial axis、angular ticks 与 angular grid spokes 仍是直线
- Mark 行为：Path、Interval、Reference 与完全由 coordinate-projected target 构成的默认 Relation path 继承 frame；Point 与 endpoint glyph 不提供 interpolation override，但离散角轴上的 role-space adjustment 结果经 frame 的 resolved interpolation 投影；anchor / node target、显式 Relation route / routing 和 ribbon 不消费该字段
- 失败与诊断：Polar interpolation 取值不合法由严格 schema 拒绝；Mark override 用于非 `polar2D`，Relation path override 缺少完整 projected target 或与显式 route / routing、ribbon 冲突，或 angular scale definition 无法提供连续性时 fail-loud，并定位到 coordinate / mark 与 interpolation
- registry 边界：自定义 position scale 必须声明连续性，才能参与省略值推断；自定义 coordinate 与 custom mark 不自动获得公共 interpolation 字段，其专有行为仍由各自 Definition 解析
- 兼容性 / breaking：离散 Polar Path 的默认弦连接保持不变，连续 Polar Path 从错误的默认弦修正为极坐标曲线；离散 angular scale 的固定半径 Guide 和 cell 边界从默认圆弧改为多边形边界。离散 `chord` 坐标中经 role-space adjustment 产生的类别间 Point 位置从圆周修正为多边形边，省略 placement、原始类别顶点和连续角轴保持不变。需要保留圆弧的离散 Plot 可显式设置 coordinate 或 Mark `interpolation: 'polar'`。`PositionScaleDefinition` 的自定义实现必须声明 `continuity`，不保留按 type 白名单或运行时形状猜测的 fallback
- React / Vanilla 等价性：JSON IR、Vanilla Input 与 React props 表达同一 schema-derived contract；adapter 只传递 interpolation，不推断 scale 连续性、不合并优先级、不生成几何

## 最终结果

`polar2D` 已由 coordinate frame 统一解析 interpolation，Guide 与插值敏感 Mark 消费同一默认，局部 Mark 覆盖保持隔离；JSON IR、Vanilla 与 React 暴露等价配置，最终仍下沉为既有 Core path、node 与 contour 语义

`chord` 固定半径边界依赖 position scale 提供的有序 angular ticks；自定义 position scale 因而必须同时提供稳定的 ticks 与 continuity。Relation 仍只对默认且完整 projected 的 path 应用该模式，显式 route、routing、ribbon 与非 projected target 继续由 Relation 自身契约负责
