import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
} from '@/components/ui/sidebar';
import { LocaleTypes } from '@/config';
import useTrans from '@/hooks/useTrans';
import { FC } from 'react';
import FooterActions from './_components/FooterActions';
import FooterAuthor from './_components/FooterAuthor';
import HeaderInfo from './_components/HeaderInfo';

export type SideMenuProps = {
  lng: LocaleTypes;
  module: string;
};

const SideMenu: FC<SideMenuProps> = async props => {
  const { lng, module } = props;
  const { t } = await useTrans(lng);

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader>
        <HeaderInfo lng={lng} module={module} />
      </SidebarHeader>
      <SidebarContent className="overflow-hidden">
        <SidebarGroup>
          <SidebarGroupLabel>{t('component')}</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu></SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
      <SidebarFooter>
        <FooterActions />
        <FooterAuthor lng={lng} />
      </SidebarFooter>
    </Sidebar>
  );
};

export default SideMenu;
