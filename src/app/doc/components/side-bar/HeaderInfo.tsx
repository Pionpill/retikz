import { SidebarMenu, SidebarMenuButton } from '@/components/ui/sidebar';
import { Typography } from '@/components/ui/typography';
import useModule from '@/hooks/useModule';
import { BookMarked } from 'lucide-react';
import { FC } from 'react';
import { moduleConfig } from '../../config/module';

const HeaderInfo: FC = () => {
  const module = useModule();
  const { npm, version } = moduleConfig[module];

  return (
    <SidebarMenu>
      <SidebarMenuButton size="lg">
        <div className="size-8 rounded-md p-1 bg-primary text-primary-foreground hover:bg-primary/80">
          <BookMarked />
        </div>
        <div className="flex flex-col flex-1 text-left">
          <Typography className="font-semibold">{npm}</Typography>
          <Typography className="text-xs">{version}</Typography>
        </div>
      </SidebarMenuButton>
    </SidebarMenu>
  );
};

export default HeaderInfo;
