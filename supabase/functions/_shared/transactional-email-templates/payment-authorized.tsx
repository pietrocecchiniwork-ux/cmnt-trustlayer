import * as React from 'npm:react@18.3.1'
import {
  Body, Container, Head, Heading, Html, Preview, Text, Section,
} from 'npm:@react-email/components@0.0.22'
import type { TemplateEntry } from './registry.ts'

const SITE_NAME = 'cmnt'

interface Props {
  recipientName?: string
  milestoneName?: string
  projectName?: string
  amount?: number
  certificateRef?: string
  authorizedBy?: string
}

const PaymentAuthorizedEmail = ({
  recipientName,
  milestoneName,
  projectName,
  amount,
  certificateRef,
  authorizedBy,
}: Props) => (
  <Html lang="en" dir="ltr">
    <Head />
    <Preview>{`Payment authorized for ${milestoneName ?? 'milestone'}`}</Preview>
    <Body style={main}>
      <Container style={container}>
        <Text style={brand}>{SITE_NAME}</Text>
        <Heading style={h1}>
          {recipientName ? `${recipientName}, payment authorized` : 'Payment authorized'}
        </Heading>
        <Text style={text}>
          The payment certificate for{' '}
          <strong>{milestoneName ?? 'a milestone'}</strong>
          {projectName ? ` on ${projectName}` : ''} has been authorized
          {authorizedBy ? ` by ${authorizedBy}` : ''}.
        </Text>
        {amount != null && (
          <Section style={amountBox}>
            <Text style={amountLabel}>amount released</Text>
            <Text style={amountValue}>£{Number(amount).toLocaleString()}</Text>
            {certificateRef && <Text style={refText}>{certificateRef}</Text>}
          </Section>
        )}
        <Text style={text}>
          Funds will be released according to your standard payment terms.
        </Text>
        <Text style={footer}>{SITE_NAME} · trust infrastructure for construction</Text>
      </Container>
    </Body>
  </Html>
)

export const template = {
  component: PaymentAuthorizedEmail,
  subject: (data: Record<string, any>) =>
    `Payment authorized: ${data.milestoneName ?? 'milestone'}`,
  displayName: 'Payment authorized',
  previewData: {
    recipientName: 'Marco',
    milestoneName: 'Foundations complete',
    projectName: '42 Pembroke Road',
    amount: 12500,
    certificateRef: 'CMT-2026-0417-A1B',
    authorizedBy: 'Owen (client)',
  },
} satisfies TemplateEntry

const main = { backgroundColor: '#ffffff', fontFamily: 'Helvetica, Arial, sans-serif' }
const container = { padding: '32px 28px', maxWidth: '560px' }
const brand = { fontFamily: 'Menlo, monospace', fontSize: '11px', color: '#1C1C1A', letterSpacing: '0.05em', margin: '0 0 24px' }
const h1 = { fontSize: '22px', fontWeight: 600, color: '#1C1C1A', margin: '0 0 18px', lineHeight: '1.3' }
const text = { fontSize: '14px', color: '#1C1C1A', lineHeight: '1.6', margin: '0 0 14px' }
const amountBox = { padding: '18px 20px', backgroundColor: '#F5F5F2', borderLeft: '3px solid #3D7A5A', margin: '20px 0' }
const amountLabel = { fontFamily: 'Menlo, monospace', fontSize: '10px', color: '#999', margin: '0 0 4px', letterSpacing: '0.05em' }
const amountValue = { fontFamily: 'Menlo, monospace', fontSize: '24px', color: '#1C1C1A', margin: '0 0 6px', fontWeight: 600 }
const refText = { fontFamily: 'Menlo, monospace', fontSize: '10px', color: '#999', margin: '0' }
const footer = { fontFamily: 'Menlo, monospace', fontSize: '10px', color: '#999', margin: '40px 0 0' }
