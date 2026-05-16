import { Fragment } from 'react';
import type { FC } from 'react';
import { Coordinate, Draw, Node, Path, Step, TikZ } from '@retikz/react';

/** 1 TikZ cm → 100 retikz user units（替代 TikZ `\begin{tikzpicture}[scale=3]`） */
const UNIT = 100;
/** 数学坐标 → 屏幕坐标：retikz 是 SVG y-down，TikZ 教程用数学 y-up；翻 y 符号 */
const cm = (x: number, y: number): [number, number] => [x * UNIT, -y * UNIT];
/** 数学极坐标 → retikz PolarPosition：retikz angle 是 screen-down 正向，所以传 -degMath */
const polar = (degMath: number, r = 1) => ({ angle: -degMath, radius: r * UNIT });

// TikZ \colorlet 别名（IR 无 color alias 系统，常量替代）
const ANGLE_STROKE = 'oklch(0.55 0.16 145)';
const ANGLE_FILL = 'oklch(0.92 0.10 145)';
const SIN_COLOR = '#ef4444';
const COS_COLOR = '#2563eb';
const TAN_COLOR = 'oklch(0.72 0.16 60)';
const HELP_LINE = 'oklch(0.85 0.04 250)';
const INFO_BG = 'oklch(0.96 0.04 25)';
const TICK_TEXT_BG = 'white';

const COS30 = Math.cos((30 * Math.PI) / 180);
const SIN30 = Math.sin((30 * Math.PI) / 180);
const TAN30 = SIN30 / COS30;

/**
 * tikz.dev/tutorial 最终单位圆图的 retikz 复刻
 * @description 30° 角下 sin / cos / tan 的几何关系示意；网格 + 坐标轴 + 刻度 + 扇形 + 彩色线段 + 信息说明框。受限于当前 IR 没 grid / 投影 target / name path 等，部分细节手算坐标兜底
 */
const Demo: FC = () => (
  <TikZ width={720} height={420}>
    {/* 1. 背景网格（help lines）—— 当前 IR 无 grid step，手画 5 横 5 竖 */}
    {[-1, -0.5, 0, 0.5, 1].map(v => (
      <Fragment key={`grid-${v}`}>
        <Draw way={[cm(v, -1.4), cm(v, 1.4)]} stroke={HELP_LINE} strokeWidth={0.5} />
        <Draw way={[cm(-1.4, v), cm(1.4, v)]} stroke={HELP_LINE} strokeWidth={0.5} />
      </Fragment>
    ))}

    {/* 2. 单位圆 —— circlePath 圆心 = 上一 step 的 anchor */}
    <Path lineCap="round">
      <Step kind="move" to={cm(0, 0)} />
      <Step kind="circlePath" radius={UNIT} />
    </Path>

    {/* 3. x / y 轴 + 端点 label + 命名锚（拆三件：箭头 Draw + Node + Coordinate） */}
    <Draw way={[cm(-1.5, 0), cm(1.5, 0)]} arrow="->" />
    <Node position={cm(1.62, 0)} stroke="none" padding={0}>x</Node>
    <Coordinate id="x-axis" position={cm(1.5, 0)} />

    <Draw way={[cm(0, -1.5), cm(0, 1.5)]} arrow="->" />
    <Node position={cm(0, 1.62)} stroke="none" padding={0}>y</Node>
    <Coordinate id="y-axis" position={cm(0, 1.5)} />

    {/* 4. x 轴刻度（-1, -1/2, 1）—— \foreach 用 .map() 替代；inline math 用纯文本兜底 */}
    {[
      { x: -1, text: '−1' },
      { x: -0.5, text: '−1/2' },
      { x: 1, text: '1' },
    ].map(({ x, text }) => (
      <Fragment key={`tx-${x}`}>
        <Draw way={[[x * UNIT, -3], [x * UNIT, 3]]} />
        <Node position={[x * UNIT, 14]} fill={TICK_TEXT_BG} stroke="none" padding={1}>
          {text}
        </Node>
      </Fragment>
    ))}

    {/* y 轴刻度（-1, -1/2, 1/2, 1） */}
    {[
      { y: -1, text: '−1' },
      { y: -0.5, text: '−1/2' },
      { y: 0.5, text: '1/2' },
      { y: 1, text: '1' },
    ].map(({ y, text }) => (
      <Fragment key={`ty-${y}`}>
        <Draw way={[[-3, -y * UNIT], [3, -y * UNIT]]} />
        <Node position={[-18, -y * UNIT]} fill={TICK_TEXT_BG} stroke="none" padding={1}>
          {text}
        </Node>
      </Fragment>
    ))}

    {/* 5. 30° 扇形（filldraw + arc）
        ArcStep 把 prev anchor 当圆心（与 TikZ 拿 prev 当圆周起点不同）：
        move (0,0) → arc 以 (0,0) 为圆心 → 起点自动落在 (radius, 0)
        line 回 (0,0) 让 fill 隐式闭合成扇形 */}
    <Path fill={ANGLE_FILL} stroke={ANGLE_STROKE}>
      <Step kind="move" to={cm(0, 0)} />
      <Step kind="arc" startAngle={0} endAngle={-30} radius={30} />
      <Step kind="line" to={cm(0, 0)} />
    </Path>

    {/* α 文字标签 */}
    <Node position={polar(15, 0.22)} stroke="none" textColor={ANGLE_STROKE} padding={1}>
      α
    </Node>

    {/* 6. sin α 红色竖线（(30°,1) → x 轴投影点）—— 当前 IR 无投影 target，手算 (cos30, 0) */}
    <Draw
      way={[polar(30, 1), { label: { text: 'sin α', side: 'left' } }, cm(COS30, 0)]}
      stroke={SIN_COLOR}
      thickness="veryThick"
    />

    {/* 7. cos α 蓝色横线（投影点 → 原点） */}
    <Draw
      way={[cm(COS30, 0), { label: { text: 'cos α', side: 'below' } }, cm(0, 0)]}
      stroke={COS_COLOR}
      thickness="veryThick"
    />

    {/* 8. tan α 橙色竖线 + 辅助射线
        原 TikZ 用 name path + intersections 求交点 t；当前 IR 不支持，几何上 x=1 竖线
        与原点 30° 射线交于 (1, tan30)，直接喂坐标 */}
    <Draw
      way={[cm(1, 0), { label: { text: 'tan α = sin α / cos α', side: 'right' } }, cm(1, TAN30)]}
      stroke={TAN_COLOR}
      thickness="veryThick"
    />
    <Coordinate id="t" position={cm(1, TAN30)} />
    <Draw way={[cm(0, 0), 't']} />

    {/* 9. 右侧信息说明框 —— LineSpec.fill 行级换色（行内片段着色暂不支持） */}
    <Node
      position={cm(3.0, -0.1)}
      shape="rectangle"
      fill={INFO_BG}
      stroke="none"
      roundedCorners={6}
      padding={10}
      align="left"
      text={[
        { text: '角 α = 30°', fill: ANGLE_STROKE },
        '即 π/6 弧度',
        '',
        { text: 'sin α = 1/2', fill: SIN_COLOR },
        '（红线长度）',
        '',
        { text: 'cos α = √3/2', fill: COS_COLOR },
        '（蓝线长度）',
        '',
        { text: 'tan α = 1/√3', fill: TAN_COLOR },
        '（橙线长度）',
      ]}
    />
  </TikZ>
);

export default Demo;
