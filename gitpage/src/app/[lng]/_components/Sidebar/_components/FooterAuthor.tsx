'use client';
import { Avatar } from '@/components/ui/avatar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { SidebarMenu, SidebarMenuButton, SidebarMenuItem, useSidebar } from '@/components/ui/sidebar';
import { Typography } from '@/components/ui/typography';
import useClientTrans from '@/hooks/useClientTrans';
import { AvatarFallback, AvatarImage } from '@radix-ui/react-avatar';
import { ChevronsUpDown } from 'lucide-react';
import { FC, ReactNode } from 'react';
import { CgNpm } from 'react-icons/cg';
import { RiGithubLine } from 'react-icons/ri';
import { BiStar } from 'react-icons/bi';
import ContactDialog from './ContactDialog';

const FooterAuthor: FC<{ lng: 'zh' | 'en' }> = props => {
  const { lng } = props;
  const { isMobile } = useSidebar();
  const { t } = useClientTrans();

  const AuthorInfo: FC<{ icon?: ReactNode }> = ({ icon }) => (
    <>
      <Avatar className="h-8 w-8 rounded-lg">
        <AvatarImage
          src={
            lng === 'en'
              ? 'https://github.com/pionpill.png'
              : 'https://q2.qlogo.cn/headimg_dl?dst_uin=673486387&spec=100'
          }
        />
        <AvatarFallback>{lng === 'en' ? 'PP' : '小葱'}</AvatarFallback>
      </Avatar>
      <div className="grid flex-1 text-left text-sm leading-tight">
        <Typography className="font-semibold">{lng === 'en' ? 'pionpill' : '小葱拌豆腐'}</Typography>
        <Typography className="text-xs">673486387@qq.com</Typography>
      </div>
      {icon}
    </>
  );

  return (
    <SidebarMenu>
      <SidebarMenuItem>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <SidebarMenuButton size="lg">
              <AuthorInfo icon={<ChevronsUpDown className="ml-auto size-4" />} />
            </SidebarMenuButton>
          </DropdownMenuTrigger>
          <DropdownMenuContent
            className="w-[--radix-dropdown-menu-trigger-width] min-w-56"
            side={isMobile ? 'bottom' : 'right'}
          >
            <DropdownMenuLabel className="flex items-center gap-2 font-normal">
              <AuthorInfo />
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <ContactDialog />
            <DropdownMenuItem>
              <RiGithubLine />
              <Typography className="text-sm" onClick={() => window.open('https://github.com/Pionpill', '_blank')}>
                {t('followAuthor')}
              </Typography>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem>
              <CgNpm />
              <Typography
                className="text-sm"
                onClick={() => window.open('https://www.npmjs.com/package/@retikz/core', '_blank')}
              >
                {t('seeOnNpm')}
              </Typography>
            </DropdownMenuItem>
            <DropdownMenuItem>
              <BiStar />
              <Typography
                className="text-sm"
                onClick={() => window.open('https://github.com/Pionpill/retikz', '_blank')}
              >
                {t('starRetikZ')}
              </Typography>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </SidebarMenuItem>
    </SidebarMenu>
  );
};

export default FooterAuthor;
