import type { Lang } from '@/i18n';

/** 自定义拟合流程图的双语文案 */
export const regressionFittingFlowI18n: Record<
  Lang,
  { stages: Array<{ title: string; detail: string }>; edges: Array<string> }
> = {
  zh: {
    stages: [
      { title: '@retikz/chart', detail: '回归图集成：观测点、主趋势与额外趋势' },
      { title: '@retikz/plot · Smooth', detail: '支持曲线拟合：按分面与序列组织观测' },
      { title: '@retikz/data', detail: '定义与执行拟合算法，返回 predict(x) 模型' },
      { title: '@retikz/plot · Smooth / Path', detail: '采样预测值，投影后按 trend.curve 连接' },
      { title: '@retikz/math', detail: 'Core 调用过点曲线算法，计算三次贝塞尔段' },
      { title: 'Core Scene → Renderer', detail: '将路径交给 SVG / Canvas 渲染' },
    ],
    edges: ['展开图元', '调用已注册方法', '返回模型并采样', '默认 catmullRom', '生成路径几何'],
  },
  en: {
    stages: [
      { title: '@retikz/chart', detail: 'Integrate observations and fitted trends' },
      { title: '@retikz/plot · Smooth', detail: 'Support curve fitting by facet and series' },
      { title: '@retikz/data', detail: 'Define and run fitting; return predict(x)' },
      { title: '@retikz/plot · Smooth / Path', detail: 'Sample, project and connect with trend.curve' },
      { title: '@retikz/math', detail: 'Core calls interpolation to compute cubic segments' },
      { title: 'Core Scene → Renderer', detail: 'Render the paths with SVG / Canvas' },
    ],
    edges: ['expand marks', 'call registered fit', 'return model; sample', 'default catmullRom', 'build path geometry'],
  },
};
