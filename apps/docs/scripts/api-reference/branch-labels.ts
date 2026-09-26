/** LLM 审阅的分支名称，以判别字段类型匹配，避免依赖 TypeScript 分支顺序 */
export const apiReferenceBranchLabels: Readonly<
  Partial<
    Record<
      string,
      ReadonlyArray<{
        value: string;
        field: string;
        type: string;
        label: { zh: string; en: string };
      }>
    >
  >
> = {
  '@retikz/standard/presentation#LegendArtifact': [
    { value: 'items', field: 'kind', type: '"items"', label: { zh: '离散条目', en: 'Discrete items' } },
    { value: 'ramp', field: 'kind', type: '"ramp"', label: { zh: '连续样本', en: 'Continuous sample' } },
  ],
  '@retikz/standard-vanilla/shape#InputStar': [
    { value: 'radius', field: 'innerRadius', type: 'number', label: { zh: '内半径', en: 'Inner radius' } },
    { value: 'ratio', field: 'innerRatio', type: 'number', label: { zh: '内半径比例', en: 'Inner radius ratio' } },
  ],
  '@retikz/standard/shape#IRStar': [
    { value: 'radius', field: 'innerRadius', type: 'number', label: { zh: '内半径', en: 'Inner radius' } },
    { value: 'ratio', field: 'innerRatio', type: 'number', label: { zh: '内半径比例', en: 'Inner radius ratio' } },
  ],
  '@retikz/standard-vanilla/shape#InputRegularPolygon': [
    { value: 'radius', field: 'radius', type: 'number', label: { zh: '外接半径', en: 'Circumradius' } },
    { value: 'side-length', field: 'sideLength', type: 'number', label: { zh: '边长', en: 'Side length' } },
  ],
  '@retikz/standard/shape#IRRegularPolygon': [
    { value: 'radius', field: 'radius', type: 'number', label: { zh: '外接半径', en: 'Circumradius' } },
    { value: 'side-length', field: 'sideLength', type: 'number', label: { zh: '边长', en: 'Side length' } },
  ],
  '@retikz/standard/container#IRMap': [
    { value: 'entries', field: 'data', type: 'never', label: { zh: '显式键值记录', en: 'Explicit entries' } },
    { value: 'data', field: 'entries', type: 'never', label: { zh: 'JSON 数据', en: 'JSON data' } },
  ],
  '@retikz/standard-vanilla/container#InputMap': [
    { value: 'entries', field: 'data', type: 'never', label: { zh: '显式键值记录', en: 'Explicit entries' } },
    { value: 'data', field: 'entries', type: 'never', label: { zh: 'JSON 数据', en: 'JSON data' } },
  ],
  '@retikz/standard-react/container#MapKeyProps': [
    { value: 'text', field: 'text', type: 'string', label: { zh: '文本', en: 'Text' } },
    { value: 'drawable', field: 'text', type: 'never', label: { zh: '图形内容', en: 'Drawable content' } },
  ],
  '@retikz/standard-react/container#MapValueProps': [
    { value: 'text', field: 'text', type: 'string', label: { zh: '文本', en: 'Text' } },
    { value: 'drawable', field: 'text', type: 'never', label: { zh: '图形内容', en: 'Drawable content' } },
  ],
  '@retikz/standard-vanilla/container#InputList': [
    { value: 'items', field: 'data', type: 'never', label: { zh: '显式单元格', en: 'Explicit cells' } },
    { value: 'data', field: 'items', type: 'never', label: { zh: 'JSON 数据', en: 'JSON data' } },
  ],
  '@retikz/standard-react/container#ListItemProps': [
    { value: 'text', field: 'text', type: 'string', label: { zh: '文本', en: 'Text' } },
    { value: 'drawable', field: 'text', type: 'never', label: { zh: '图形内容', en: 'Drawable content' } },
  ],
  '@retikz/tex#MathJaxLowerTexState': [
    { value: 'loading', field: 'status', type: "'loading'", label: { zh: '初始化中', en: 'Loading' } },
    { value: 'ready', field: 'status', type: "'ready'", label: { zh: '就绪', en: 'Ready' } },
    { value: 'error', field: 'status', type: "'error'", label: { zh: '初始化失败', en: 'Initialization failure' } },
  ],
  '@retikz/tex#TexLoweringDiagnostic': [
    { value: 'engine-error', field: 'kind', type: "'engine-error'", label: { zh: '引擎失败', en: 'Engine failure' } },
    {
      value: 'mathjax-error',
      field: 'kind',
      type: "'mathjax-error'",
      label: { zh: '公式解析失败', en: 'Formula parsing failure' },
    },
    {
      value: 'unsupported-svg',
      field: 'kind',
      type: "'unsupported-svg'",
      label: { zh: '不支持的 SVG', en: 'Unsupported SVG' },
    },
    { value: 'malformed-svg', field: 'kind', type: "'malformed-svg'", label: { zh: '无效 SVG', en: 'Malformed SVG' } },
  ],
  '@retikz/inspect#InspectionSelectionRule': [
    { value: 'request', field: 'kind', type: "'request'", label: { zh: '请求', en: 'Request' } },
    { value: 'barrier', field: 'kind', type: "'barrier'", label: { zh: '封锁', en: 'Barrier' } },
  ],
  '@retikz/inspect#InspectionSelectionTarget': [
    { value: 'scene', field: 'kind', type: "'scene'", label: { zh: '整图', en: 'Scene' } },
    { value: 'subtree', field: 'kind', type: "'subtree'", label: { zh: '子树', en: 'Subtree' } },
    { value: 'self', field: 'kind', type: "'self'", label: { zh: '实例', en: 'Occurrence' } },
  ],
  '@retikz/inspect#InspectionDiagnosticOrigin': [
    { value: 'selection', field: 'stage', type: "'selection'", label: { zh: '选择规则', en: 'Selection' } },
    {
      value: 'inspect',
      field: 'stage',
      type: "'subject' | 'inspect'",
      label: { zh: '对象与回调', en: 'Subject and callback' },
    },
    {
      value: 'output',
      field: 'stage',
      type: "'output' | 'fragment'",
      label: { zh: '输出与片段', en: 'Output and fragment' },
    },
    { value: 'complete', field: 'stage', type: "'complete'", label: { zh: '结果汇总', en: 'Completion' } },
  ],

  '@retikz/vanilla#InputScene': [
    { value: 'children', field: 'layers', type: 'never', label: { zh: '子节点', en: 'Children' } },
    { value: 'layers', field: 'layers', type: 'ReadonlyArray<InputLayer>', label: { zh: '分层', en: 'Layers' } },
  ],
  '@retikz/math#CurveSegment': [
    { value: 'line', field: 'kind', type: "'line'", label: { zh: '直线', en: 'Line' } },
    {
      value: 'quadratic',
      field: 'kind',
      type: "'quadraticBezier'",
      label: { zh: '二次贝塞尔', en: 'Quadratic Bézier' },
    },
    { value: 'cubic', field: 'kind', type: "'cubicBezier'", label: { zh: '三次贝塞尔', en: 'Cubic Bézier' } },
    { value: 'arc', field: 'kind', type: "'arc'", label: { zh: '圆弧', en: 'Circular arc' } },
    { value: 'ellipse-arc', field: 'kind', type: "'ellipseArc'", label: { zh: '椭圆弧', en: 'Elliptical arc' } },
  ],
  '@retikz/react#FoldStepProps': [
    { value: 'two-segments', field: 'via', type: "'-|' | '|-'", label: { zh: '两段折线', en: 'Two segments' } },
    { value: 'three-segments', field: 'via', type: "'-|-' | '|-|'", label: { zh: '三段折线', en: 'Three segments' } },
  ],
  '@retikz/react#LayoutRuntimeOptions': [
    {
      value: 'retained',
      field: 'mode',
      type: 'typeof LayoutRuntimeMode.Retained',
      label: { zh: '保留模式', en: 'Retained' },
    },
    {
      value: 'static',
      field: 'mode',
      type: 'typeof LayoutRuntimeMode.Static',
      label: { zh: '静态模式', en: 'Static' },
    },
  ],
};
