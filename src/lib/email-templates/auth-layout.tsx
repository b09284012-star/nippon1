import * as React from 'react'
import { Body, Button, Container, Head, Heading, Hr, Html, Link, Preview, Section, Text } from '@react-email/components'
import type { EmailLang } from '@/lib/email-language'

interface Props {
  lang: EmailLang
  preview: string
  title: string
  paragraphs: string[]
  buttonLabel?: string
  buttonUrl?: string
  code?: string
  note: string
}

export const AuthLayout = ({ lang, preview, title, paragraphs, buttonLabel, buttonUrl, code, note }: Props) => {
  const rtl = lang === 'ar'
  const align = rtl ? ('right' as const) : ('left' as const)
  return (
    <Html lang={lang} dir={rtl ? 'rtl' : 'ltr'}>
      <Head />
      <Preview>{preview}</Preview>
      <Body style={main}>
        <Container style={container}>
          <Section style={brandBar}>
            <Text style={brand}>NIPPON MINERS</Text>
          </Section>
          <Section style={{ padding: '28px 28px 8px', textAlign: align }}>
            <Heading style={h1}>{title}</Heading>
            {paragraphs.map((p, i) => (
              <Text key={i} style={text}>{p}</Text>
            ))}
            {code ? <Text style={codeStyle}>{code}</Text> : null}
            {buttonLabel && buttonUrl ? (
              <Section style={{ textAlign: 'center', margin: '8px 0 24px' }}>
                <Button style={button} href={buttonUrl}>{buttonLabel}</Button>
              </Section>
            ) : null}
            {buttonUrl ? (
              <Text style={small}>
                {rtl ? 'إذا لم يعمل الزر، انسخ هذا الرابط في المتصفح:' : "If the button doesn't work, copy this link into your browser:"}
                <br />
                <Link href={buttonUrl} style={link}>{buttonUrl}</Link>
              </Text>
            ) : null}
            <Hr style={hr} />
            <Text style={small}>{note}</Text>
            <Text style={small}>
              {rtl ? 'فريق Nippon Miners — ' : 'Nippon Miners team — '}
              <Link href="https://nipponminers.com" style={link}>nipponminers.com</Link>
            </Text>
          </Section>
        </Container>
      </Body>
    </Html>
  )
}

const main = { backgroundColor: '#ffffff', fontFamily: 'Tahoma, Arial, sans-serif', padding: '24px 0' }
const container = { maxWidth: '560px', margin: '0 auto', border: '1px solid #e5e7eb', borderRadius: '16px', overflow: 'hidden' as const }
const brandBar = { backgroundColor: '#0f1424', padding: '18px 28px', textAlign: 'center' as const }
const brand = { color: '#2fd4e6', fontSize: '18px', fontWeight: 'bold' as const, letterSpacing: '3px', margin: 0 }
const h1 = { fontSize: '22px', fontWeight: 'bold' as const, color: '#0f1424', margin: '0 0 16px' }
const text = { fontSize: '15px', color: '#374151', lineHeight: '1.7', margin: '0 0 14px' }
const button = { backgroundColor: '#2fd4e6', color: '#0f1424', fontSize: '15px', fontWeight: 'bold' as const, borderRadius: '10px', padding: '13px 26px', textDecoration: 'none' }
const codeStyle = { fontSize: '28px', fontWeight: 'bold' as const, letterSpacing: '6px', color: '#0f1424', textAlign: 'center' as const, backgroundColor: '#ecfeff', borderRadius: '10px', padding: '14px', margin: '8px 0 20px' }
const small = { fontSize: '12px', color: '#6b7280', lineHeight: '1.6', margin: '0 0 10px', wordBreak: 'break-all' as const }
const link = { color: '#0891b2' }
const hr = { borderColor: '#e5e7eb', margin: '20px 0' }
