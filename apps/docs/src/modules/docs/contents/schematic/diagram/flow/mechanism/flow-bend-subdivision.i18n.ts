/** 碰撞判定示意图的双语文案 */
export const copy = {
  zh: {
    stages: ['整段：t ∈ [0, 1]', '二分：每段 Δt = 1/2', '继续细分：Δt = 1/8'],
    notes: ['大盒重叠不等于曲线碰撞', '子段仍是曲线，不是直线', 'B 排除；A 附近继续细分'],
    legend: '蓝：参考曲线　橙色虚线：仍需检查的 AABB　灰色点线：已排除',
    detail: '图示仅展开到第 3 层；橙色区间尚不是最终碰撞跨度',
  },
  en: {
    stages: ['Whole: t ∈ [0, 1]', 'Halves: Δt = 1/2', 'Refine: Δt = 1/8'],
    notes: ['Box overlap is not contact', 'Subcurves remain curved', 'Skip B; refine around A'],
    legend: 'Blue: curve · Orange dashed: unresolved AABB · Gray dotted: excluded',
    detail: 'Only depth 3 is shown; orange intervals are not final collision spans',
  },
} as const;
