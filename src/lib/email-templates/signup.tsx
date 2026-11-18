import * as React from 'react'
import { AuthLayout } from './auth-layout'
import type { EmailLang } from '@/lib/email-language'

export const signupSubject = (lang: EmailLang) => lang === 'ar' ? 'أكّد بريدك الإلكتروني — Nippon Miners' : 'Confirm your email — Nippon Miners'

export const SignupEmail = ({ confirmationUrl, recipient, lang = 'ar' }: { siteName?: string; siteUrl?: string; recipient: string; confirmationUrl: string; lang?: EmailLang }) =>
  lang === 'ar' ? (
    <AuthLayout lang="ar" preview="أكّد بريدك لتفعيل حسابك في Nippon Miners" title="مرحباً بك في Nippon Miners"
      paragraphs={[`شكراً لتسجيلك في سوق أجهزة التعدين Nippon Miners باستخدام البريد ${recipient}.`, 'اضغط على الزر أدناه لتأكيد بريدك الإلكتروني وتفعيل حسابك، ثم ابدأ بتصفح العروض في سوق دولتك والشراء بأمان مع حماية المشتري.']}
      buttonLabel="تأكيد البريد وتفعيل الحساب" buttonUrl={confirmationUrl}
      note="إذا لم تقم بإنشاء هذا الحساب، تجاهل هذه الرسالة." />
  ) : (
    <AuthLayout lang="en" preview="Confirm your email to activate your Nippon Miners account" title="Welcome to Nippon Miners"
      paragraphs={[`Thanks for signing up to the Nippon Miners mining hardware marketplace with ${recipient}.`, 'Click the button below to confirm your email and activate your account, then browse offers in your country market and buy safely with buyer protection.']}
      buttonLabel="Confirm email & activate" buttonUrl={confirmationUrl}
      note="If you didn't create this account, you can ignore this email." />
  )

export default SignupEmail
