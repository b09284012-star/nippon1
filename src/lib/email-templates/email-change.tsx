import * as React from 'react'
import { AuthLayout } from './auth-layout'
import type { EmailLang } from '@/lib/email-language'

export const emailChangeSubject = (lang: EmailLang) => lang === 'ar' ? 'تأكيد تغيير البريد — Nippon Miners' : 'Confirm your new email — Nippon Miners'

export const EmailChangeEmail = ({ email, newEmail, confirmationUrl, lang = 'ar' }: { siteName?: string; oldEmail?: string; email: string; newEmail: string; confirmationUrl: string; lang?: EmailLang }) =>
  lang === 'ar' ? (
    <AuthLayout lang="ar" preview="تأكيد تغيير بريدك الإلكتروني" title="تأكيد تغيير البريد" paragraphs={[`طلبت تغيير بريد حسابك من ${email} إلى ${newEmail}.`, 'اضغط على الزر لتأكيد التغيير.']}
      buttonLabel="تأكيد التغيير" buttonUrl={confirmationUrl} note="إذا لم تطلب هذا التغيير، غيّر كلمة المرور فوراً وتواصل مع الدعم." />
  ) : (
    <AuthLayout lang="en" preview="Confirm your email change" title="Confirm your email change" paragraphs={[`You requested to change your account email from ${email} to ${newEmail}.`, 'Click the button to confirm.']}
      buttonLabel="Confirm change" buttonUrl={confirmationUrl} note="If you didn't request this, change your password now and contact support." />
  )

export default EmailChangeEmail
