import * as React from 'npm:react@18.3.1'
import {
  Body, Container, Head, Heading, Html, Preview, Text, Button, Section,
} from 'npm:@react-email/components@0.0.22'
import type { TemplateEntry } from './registry.ts'

const SITE_NAME = 'cmnt'

interface Props {
  pmName?: string
  contractorName?: string
  milestoneName?: string
  projectName?: string
  photoCount?: number
  reviewUrl?: string
}

const EvidenceSubmittedEmail = ({
  pmName,
  contractorName,
  milestoneName,
  projectName,
  photoCount,
  reviewUrl,
}: Props) => (
  <Html lang="en" dir="ltr">
    <Head />
    <Preview>{`Evidence ready for review on ${milestoneName ?? 'a milestone'}`}</Preview>
    <Body style={main}>
      <Container style={container}>
        <Text style={brand}>{SITE_NAME}</Text>
        <Heading style={h1}>
          {pmName ? `${pmName}, evidence is ready to review` : 'Evidence ready to review'}
        </Heading>
        <Text style={text}>
          {contractorName ?? 'A team member'} submitted{' '}
          {photoCount ? `${photoCount} photo${photoCount === 1 ? '' : 's'}` : 'evidence'} for{' '}
          <strong>{milestoneName ?? 'a milestone'}</strong>
          {projectName ? ` on ${projectName}` : ''}.
        </Text>
        <Text style={text}>
          The milestone is now awaiting your approval.
        </Text>
        {reviewUrl && (
          <Section style={{ margin: '28px 0' }}>
            <Button href={reviewUrl} style={button}>
              Review evidence
            </Button>
          </Section>
        )}
        <Text style={footer}>{SITE_NAME} · trust infrastructure for construction</Text>
      </Container>
    </Body>
  </Html>
)

export const template = {
  component: EvidenceSubmittedEmail,
  subject: (data: Record<string, any>) =>
    `Evidence ready: ${data.milestoneName ?? 'milestone'}`,
  displayName: 'Evidence submitted',
  previewData: {
    pmName: 'Sarah',
    contractorName: 'Marco',
    milestoneName: 'Foundations complete',
    projectName: '42 Pembroke Road',
    photoCount: 3,
    reviewUrl: 'https://cmnt-trustlayer.lovable.app/project/dashboard',
  },
} satisfies TemplateEntry

const main = { backgroundColor: '#ffffff', fontFamily: 'Helvetica, Arial, sans-serif' }
const container = { padding: '32px 28px', maxWidth: '560px' }
const brand = { fontFamily: 'Menlo, monospace', fontSize: '11px', color: '#1C1C1A', letterSpacing: '0.05em', margin: '0 0 24px' }
const h1 = { fontSize: '22px', fontWeight: 600, color: '#1C1C1A', margin: '0 0 18px', lineHeight: '1.3' }
const text = { fontSize: '14px', color: '#1C1C1A', lineHeight: '1.6', margin: '0 0 14px' }
const button = { backgroundColor: '#1C1C1A', color: '#EFEFED', padding: '12px 22px', fontSize: '14px', textDecoration: 'none', display: 'inline-block' }
const footer = { fontFamily: 'Menlo, monospace', fontSize: '10px', color: '#999', margin: '40px 0 0' }
