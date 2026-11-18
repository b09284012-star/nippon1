import * as React from 'react'
import { AuthLayout } from './auth-layout'

// No link is available here, so this code email is bilingual in one message.
export const ReauthenticationEmail = ({ token }: { token: string }) => (
  <AuthLayout lang="ar" preview="رمز التحقق / Verification code" title="رمز التحقق — Verification code"
    paragraphs={['استخدم الرمز التالي لتأكيد هويتك. / Use the code below to confirm your identity.']}
    code={token} note="الرمز صالح لفترة قصيرة. إذا لم تطلبه تجاهل الرسالة. / The code expires shortly; ignore this email if you didn't request it." />
)

export default ReauthenticationEmail
