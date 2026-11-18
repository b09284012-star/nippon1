import * as React from 'react'
import { AuthLayout } from './auth-layout'
import type { EmailLang } from '@/lib/email-language'

export const magicLinkSubject = (lang: EmailLang) => lang === 'ar' ? 'رابط الدخول — Nippon Miners' : 'Your login link — Nippon Miners'

export const MagicLinkEmail = ({ confirmationUrl, lang = 'ar' }: { siteName?: string; confirmationUrl: string; lang?: EmailLang }) =>
  lang === 'ar' ? (
    <AuthLayout lang="ar" preview="رابط الدخول إلى حسابك" title="رابط الدخول" paragraphs={['اضغط على الزر للدخول إلى حسابك في Nippon Miners. الرابط صالح لفترة قصيرة.']}
      buttonLabel="الدخول" buttonUrl={confirmationUrl} note="إذا لم تطلب هذا الرابط، تجاهل الرسالة." />
  ) : (
    <AuthLayout lang="en" preview="Your login link" title="Your login link" paragraphs={['Click the button to sign in to your Nippon Miners account. The link expires shortly.']}
      buttonLabel="Sign in" buttonUrl={confirmationUrl} note="If you didn't request this link, ignore this email." />
  )

export default MagicLinkEmail
