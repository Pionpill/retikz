import { SidebarProvider } from '@/components/ui/sidebar';
import { FC } from 'react';
import SideContent from './_components/Sidebar/SideContent';
import SideMenu from './_components/Sidebar/SideMenu';
import { ModuleProps } from './page';

const ModuleLayout: FC<ModuleProps> = async props => {
  const { params, children } = props;
  const { lng, module } = await params;

  return (
    <SidebarProvider>
      <SideMenu lng={lng} module={module} />
      <SideContent>{children}</SideContent>
    </SidebarProvider>
  );
};

export default ModuleLayout;
