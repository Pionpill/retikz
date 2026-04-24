import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
} from '@/components/ui/sidebar';
import type { FC } from 'react';
import { Fragment, useMemo } from 'react';
import FooterActions from './FooterActions';
import FooterAuthor from './FooterAuthor';
import HeaderInfo from './HeaderInfo';
import MenuItem from './MenuItem';
import { getDocTree } from '../../content';
import useLang from '@/hooks/useLang';

const SideMenu: FC = () => {
  const { lang } = useLang();
  const rootContents = useMemo(() => getDocTree(lang), [lang]);

  const getShownLabel = (name: string) => (name.split('_')[1] || name.split('_')[0]).split('.')[0];

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader>
        <HeaderInfo />
      </SidebarHeader>
      <SidebarContent className="overflow-hidden">
        <SidebarGroup>
          {rootContents.map(rootItem => (
            <Fragment key={rootItem.path}>
              <SidebarGroupLabel>{getShownLabel(rootItem.name)}</SidebarGroupLabel>
              <SidebarMenu>
                {rootItem.children?.map(item => (
                  <MenuItem key={item.path} item={item} />
                ))}
              </SidebarMenu>
            </Fragment>
          ))}
        </SidebarGroup>
      </SidebarContent>
      <SidebarFooter>
        <FooterActions />
        <FooterAuthor />
      </SidebarFooter>
    </Sidebar>
  );
};

export default SideMenu;
