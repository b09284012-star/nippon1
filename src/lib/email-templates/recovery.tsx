import * as React from 'react'
import { AuthLayout } from './auth-layout'
import type { EmailLang } from '@/lib/email-language'

export const recoverySubject = (lang: EmailLang) => lang === 'ar' ? 'استعادة كلمة المرور — Nippon Miners' : 'Reset your password — Nippon Miners'

export const RecoveryEmail = ({ confirmationUrl, lang = 'ar' }: { siteName?: string; confirmationUrl: string; lang?: EmailLang }) =>
  lang === 'ar' ? (
    <AuthLayout lang="ar" preview="رابط إعادة تعيين كلمة المرور لحسابك في Nippon Miners" title="إعادة تعيين كلمة المرور"
      paragraphs={['وصلنا طلب لإعادة تعيين كلمة المرور لحسابك في Nippon Miners.', 'اضغط على الزر أدناه لاختيار كلمة مرور جديدة. الرابط صالح لفترة محدودة ويُستخدم مرة واحدة فقط.']}
      buttonLabel="إعادة تعيين كلمة المرور" buttonUrl={confirmationUrl}
      note="إذا لم تطلب ذلك، تجاهل هذه الرسالة بأمان؛ لن تتغير كلمة المرور. لا تشارك هذا الرابط مع أي شخص." />
  ) : (
    <AuthLayout lang="en" preview="Your Nippon Miners password reset link" title="Reset your password"
      paragraphs={['We received a request to reset the password for your Nippon Miners account.', 'Click the button below to choose a new password. The link is valid for a limited time and can be used once.']}
      buttonLabel="Reset password" buttonUrl={confirmationUrl}
      note="If you didn't request this, you can safely ignore this email; your password won't change. Never share this link." />
  )

export default RecoveryEmail
