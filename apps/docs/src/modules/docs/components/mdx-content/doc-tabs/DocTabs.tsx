import type { FC, ReactElement } from 'react';
import { Children, isValidElement, useState } from 'react';

import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';

import { useDocHostContext } from './context';
import type { DocTabProps } from './DocTab';

/** 组合式方案切换属性 */
export type DocTabsProps = {
  /** 独立方案的初始项；文档内 React / Vanilla 双选项使用文档接入状态 */
  defaultValue: string;
  /** 按显示顺序直接放置 DocTab，正文由所在 MDX 页面编译 */
  children: ReactElement<DocTabProps> | Array<ReactElement<DocTabProps>>;
};

/** React / Vanilla 在文档内同步，其他方案独立切换 */
export const DocTabs: FC<DocTabsProps> = props => {
  const { defaultValue, children } = props;
  const tabs = Children.toArray(children).filter(isValidElement<DocTabProps>);
  const docHost = useDocHostContext();
  const [localValue, setLocalValue] = useState(defaultValue);
  const isHostTabs =
    tabs.length === 2 &&
    tabs.some(tab => tab.props.value === 'react') &&
    tabs.some(tab => tab.props.value === 'vanilla');
  const handleValueChange = (value: string) => {
    if (isHostTabs && docHost && (value === 'react' || value === 'vanilla')) {
      docHost.setHost(value);
    } else {
      setLocalValue(value);
    }
  };
  return (
    <Tabs
      value={isHostTabs && docHost ? docHost.host : localValue}
      onValueChange={handleValueChange}
      className="my-6 min-w-0 gap-0"
    >
      <div className="overflow-x-auto">
        <TabsList>
          {tabs.map(tab => (
            <TabsTrigger key={tab.props.value} value={tab.props.value}>
              {tab.props.label}
            </TabsTrigger>
          ))}
        </TabsList>
      </div>
      {children}
    </Tabs>
  );
};
