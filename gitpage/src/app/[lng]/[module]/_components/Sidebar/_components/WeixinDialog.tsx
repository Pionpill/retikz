'use client';
import ContactDialog from '@/components/shared/contact-dialog';
import { Button } from '@/components/ui/button';
import { DropdownMenuItem } from '@/components/ui/dropdown-menu';
import { Typography } from '@/components/ui/typography';
import useClientTrans from '@/hooks/useClientTrans';
import { useToast } from '@/hooks/useToast';
import { Files } from 'lucide-react';
import { FC } from 'react';
import { BsWechat } from 'react-icons/bs';
import { RiWechat2Line } from 'react-icons/ri';

const WeixinDialog: FC = () => {
  const { t } = useClientTrans();
  const { toast } = useToast();

  const handleCopy = () => {
    navigator.clipboard.writeText('wxid_ako3myhp30ye22').then(() => {
      toast({
        description: t('copySuccess'),
      });
    });
  };

  return (
    <ContactDialog
      icon={<BsWechat className="text-green-600" />}
      label={t('wechat')}
      description={t('contactMe')}
      imgUrl="https://q2.qlogo.cn/headimg_dl?dst_uin=673486387&spec=100"
      title="小葱拌豆腐"
      content={
        <div className="flex items-center gap-2">
          <Typography>wxid_ako3myhp30ye22</Typography>
          <Button variant="ghost" icon onClick={handleCopy}>
            <Files className="opacity-60" />
          </Button>
        </div>
      }
      qrCodeUrl="https://qm.qq.com/cgi-bin/qm/qr?k=8XRx97ISM1ZGoJBXA7rgYjQYjZz-Twv6&noverify=0&personal_qrcode_source=4"
      bottomContent={t('indicatePurpose')}
      trigger={
        <DropdownMenuItem>
          <RiWechat2Line />
          <Typography className="text-sm">{t('contactAuthor')}</Typography>
        </DropdownMenuItem>
      }
    />
  );
};

export default WeixinDialog;
