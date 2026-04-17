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
  approverName?: string
  paymentValue?: number
}

const MilestoneApprovedEmail = ({
  recipientName,
  milestoneName,
  projectName,
  approverName,
  paymentValue,
}: Props) => (
  <Html lang="en" dir="ltr">
    <Head />
    <Preview>{`${milestoneName ?? 'Milestone'} approved`}</Preview>
    <Body style={main}>
      <Container style={container}>
        <Text style={brand}>{SITE_NAME}</Text>
        <Heading style={h1}>
          {recipientName ? `${recipientName}, milestone approved` : 'Milestone approved'}
        </Heading>
        <Text style={text}>
          <strong>{milestoneName ?? 'A milestone'}</strong>
          {projectName ? ` on ${projectName}` : ''} has been approved
          {approverName ? ` by ${approverName}` : ''}.
        </Text>
        {paymentValue != null && paymentValue > 0 && (
          <Section style={amountBox}>
            <Text style={amountLabel}>payment value</Text>
            <Text style={amountValue}>£{Number(paymentValue).toLocaleString()}</Text>
          </Section>
        )}
        <Text style={text}>
          A payment certificate will be issued once authorized by the client.
        </Text>
        <Text style={footer}>{SITE_NAME} · trust infrastructure for construction</Text>
      </Container>
    </Body>
  </Html>
)

export const template = {
  component: MilestoneApprovedEmail,
  subject: (data: Record<string, any>) =>
    `Approved: ${data.milestoneName ?? 'milestone'}`,
  displayName: 'Milestone approved',
  previewData: {
    recipientName: 'Marco',
    milestoneName: 'Foundations complete',
    projectName: '42 Pembroke Road',
    approverName: 'Sarah',
    paymentValue: 12500,
  },
} satisfies TemplateEntry

const main = { backgroundColor: '#ffffff', fontFamily: 'Helvetica, Arial, sans-serif' }
const container = { padding: '32px 28px', maxWidth: '560px' }
const brand = { fontFamily: 'Menlo, monospace', fontSize: '11px', color: '#1C1C1A', letterSpacing: '0.05em', margin: '0 0 24px' }
const h1 = { fontSize: '22px', fontWeight: 600, color: '#1C1C1A', margin: '0 0 18px', lineHeight: '1.3' }
const text = { fontSize: '14px', color: '#1C1C1A', lineHeight: '1.6', margin: '0 0 14px' }
const amountBox = { padding: '18px 20px', backgroundColor: '#F5F5F2', borderLeft: '3px solid #3D7A5A', margin: '20px 0' }
const amountLabel = { fontFamily: 'Menlo, monospace', fontSize: '10px', color: '#999', margin: '0 0 4px', letterSpacing: '0.05em' }
const amountValue = { fontFamily: 'Menlo, monospace', fontSize: '24px', color: '#1C1C1A', margin: '0', fontWeight: 600 }
const footer = { fontFamily: 'Menlo, monospace', fontSize: '10px', color: '#999', margin: '40px 0 0' }
