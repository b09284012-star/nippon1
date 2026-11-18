import * as React from 'react'
import { createAuthEmailHandler } from '@lovable.dev/email-js'
import { createFileRoute } from '@tanstack/react-router'
import { SignupEmail, signupSubject } from '@/lib/email-templates/signup'
import { InviteEmail, inviteSubject } from '@/lib/email-templates/invite'
import { MagicLinkEmail, magicLinkSubject } from '@/lib/email-templates/magic-link'
import { RecoveryEmail, recoverySubject } from '@/lib/email-templates/recovery'
import { EmailChangeEmail, emailChangeSubject } from '@/lib/email-templates/email-change'
import { langFromAuthUrl } from '@/lib/email-language'
import { ReauthenticationEmail } from '@/lib/email-templates/reauthentication'

// Configuration
const SITE_NAME = "Nippon Miners"
const SENDER_DOMAIN = "nipponminers.com"
const ROOT_DOMAIN = "nipponminers.com"
const FROM_DOMAIN = "nipponminers.com"
const SITE_URL = `https://${ROOT_DOMAIN}`

// The SDK handler owns verification, dispatch, and retry semantics; this file
// owns only the email decisions: subjects, templates, and per-type props.
export const Route = createFileRoute("/lovable/email/auth/webhook")({
  staticData: { sitemap: false },
  server: {
    handlers: {
      POST: ({ request }) => {
        const handler = createAuthEmailHandler({
          apiKey: process.env['LOVABLE_API_KEY']!,
          from: { name: SITE_NAME, address: `noreply@${FROM_DOMAIN}` },
          senderDomain: SENDER_DOMAIN,
          sendUrl: process.env['LOVABLE_SEND_URL'],
          emails: {
            signup: (data) => ({
              subject: signupSubject(langFromAuthUrl(data.url)),
              element: React.createElement(SignupEmail, {
                  lang: langFromAuthUrl(data.url),
                  siteName: SITE_NAME,
                  siteUrl: SITE_URL,
                  recipient: data.email,
                  confirmationUrl: data.url,
                }),
            }),
            invite: (data) => ({
              subject: inviteSubject(langFromAuthUrl(data.url)),
              element: React.createElement(InviteEmail, {
                  lang: langFromAuthUrl(data.url),
                  siteName: SITE_NAME,
                  siteUrl: SITE_URL,
                  confirmationUrl: data.url,
                }),
            }),
            magiclink: (data) => ({
              subject: magicLinkSubject(langFromAuthUrl(data.url)),
              element: React.createElement(MagicLinkEmail, {
                  lang: langFromAuthUrl(data.url),
                  siteName: SITE_NAME,
                  confirmationUrl: data.url,
                }),
            }),
            recovery: (data) => ({
              subject: recoverySubject(langFromAuthUrl(data.url)),
              element: React.createElement(RecoveryEmail, {
                  lang: langFromAuthUrl(data.url),
                  siteName: SITE_NAME,
                  confirmationUrl: data.url,
                }),
            }),
            email_change: (data) => ({
              subject: emailChangeSubject(langFromAuthUrl(data.url)),
              element: React.createElement(EmailChangeEmail, {
                  lang: langFromAuthUrl(data.url),
                  siteName: SITE_NAME,
                  oldEmail: data.old_email ?? '',
                  email: data.email,
                  newEmail: data.new_email ?? '',
                  confirmationUrl: data.url,
                }),
            }),
            reauthentication: {
              subject: 'رمز التحقق / Verification code — Nippon Miners',
              render: (data) => React.createElement(ReauthenticationEmail, { token: data.token ?? '' }),
            },
          },
        })
        return handler(request)
      },
    },
  },
})
