import * as React from 'react'
import { AuthLayout } from './auth-layout'
import type { EmailLang } from '@/lib/email-language'

export const inviteSubject = (lang: EmailLang) => lang === 'ar' ? 'دعوة للانضمام إلى Nippon Miners' : "You've been invited to Nippon Miners"

export const InviteEmail = ({ confirmationUrl, lang = 'ar' }: { siteName?: string; siteUrl?: string; confirmationUrl: string; lang?: EmailLang }) =>
  lang === 'ar' ? (
    <AuthLayout lang="ar" preview="دعوة للانضمام إلى Nippon Miners" title="تمت دعوتك" paragraphs={['تمت دعوتك لإنشاء حساب في Nippon Miners. اضغط على الزر لقبول الدعوة.']}
      buttonLabel="قبول الدعوة" buttonUrl={confirmationUrl} note="إذا لم تكن تتوقع هذه الدعوة، تجاهل الرسالة." />
  ) : (
    <AuthLayout lang="en" preview="You've been invited to Nippon Miners" title="You've been invited" paragraphs={["You've been invited to create a Nippon Miners account. Click the button to accept."]}
      buttonLabel="Accept invitation" buttonUrl={confirmationUrl} note="If you weren't expecting this invitation, ignore this email." />
  )

export default InviteEmail
