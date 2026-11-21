import React from 'react'
import { Body, Button, Container, Head, Heading, Hr, Html, Preview, Text } from '@react-email/components'
import type { TemplateEntry } from './registry'

interface Props { title?: string; body?: string; url?: string }

const Email = ({ title, body, url = 'https://nipponminers.com/notifications' }: Props) => (
  <Html lang="ar" dir="rtl">
    <Head />
    <Preview>لديك إشعار جديد في Nippon — You have a new notification</Preview>
    <Body style={main}>
      <Container style={container}>
        <Text style={brand}>NIPPON</Text>
        <Heading style={h1}>لديك إشعار جديد</Heading>
        {title ? <Text style={card}><strong>{title}</strong>{body ? <><br />{body}</> : null}</Text> : null}
        <Button href={url} style={button}>عرض الإشعار</Button>
        <Hr style={hr} />
        <Text style={en} dir="ltr">You have a new notification on Nippon. Open the site to view it.</Text>
      </Container>
    </Body>
  </Html>
)

export const template = {
  component: Email,
  subject: 'لديك إشعار جديد في Nippon',
  displayName: 'إشعار جديد',
  previewData: { title: 'رسالة جديدة', body: 'وصلتك رسالة جديدة من البائع.' },
} satisfies TemplateEntry

const main = { backgroundColor: '#ffffff', fontFamily: 'Tahoma, Arial, sans-serif' }
const container = { padding: '28px 24px', maxWidth: '520px' }
const brand = { color: '#0891b2', fontWeight: 800, letterSpacing: '3px', fontSize: '14px' }
const h1 = { fontSize: '22px', color: '#0f172a', margin: '8px 0 16px' }
const card = { backgroundColor: '#f1f5f9', borderRadius: '12px', padding: '14px 16px', color: '#334155', lineHeight: '24px', whiteSpace: 'pre-line' as const }
const button = { backgroundColor: '#0891b2', color: '#ffffff', borderRadius: '10px', padding: '12px 22px', fontWeight: 700, textDecoration: 'none' }
const hr = { borderColor: '#e2e8f0', margin: '24px 0 12px' }
const en = { color: '#64748b', fontSize: '13px', textAlign: 'left' as const }
