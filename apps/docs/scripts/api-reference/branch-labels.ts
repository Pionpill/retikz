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
