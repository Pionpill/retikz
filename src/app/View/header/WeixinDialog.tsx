'use client';
import ContactDialog from '@/components/shared/contact-dialog';
import { Button } from '@/components/ui/button';
import { Typography } from '@/components/ui/typography';
import { Files } from 'lucide-react';
import { FC } from 'react';
import { useTranslation } from 'react-i18next';
import { BsWechat } from 'react-icons/bs';
import { toast } from 'sonner';

const WeixinDialog: FC = () => {
  const { t } = useTranslation();

  const handleCopy = () => {
    navigator.clipboard.writeText('wxid_ako3myhp30ye22').then(() => {
      toast(t('common.copySuccess'));
    });
  };

  return (
    <ContactDialog
      icon={<BsWechat className="text-green-600" />}
      label={t('header.wechat')}
      description={t('header.contactMe')}
      imgUrl="https://q2.qlogo.cn/headimg_dl?dst_uin=673486387&spec=100"
      title="小葱拌豆腐"
      content={
        <div className="flex items-center gap-2">
          <Typography>wxid_ako3myhp30ye22</Typography>
          <Button variant="ghost" onClick={handleCopy}>
            <Files className="opacity-60" />
          </Button>
        </div>
      }
      qrCodeUrl="https://qm.qq.com/cgi-bin/qm/qr?k=8XRx97ISM1ZGoJBXA7rgYjQYjZz-Twv6&noverify=0&personal_qrcode_source=4"
      bottomContent={t('header.indicatePurpose')}
      trigger={
        <Button variant="ghost" size="icon" className="cursor-pointer">
          <BsWechat />
        </Button>
      }
    />
  );
};

export default WeixinDialog;
