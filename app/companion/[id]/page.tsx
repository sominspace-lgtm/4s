import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import CompanionViewClient from './CompanionViewClient'

interface Props {
  params: Promise<{ id: string }>
}

export default async function CompanionViewPage({ params }: Props) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  // Verify viewer is a companion of this person
  const { data: rel } = await supabase
    .from('companions')
    .select('*')
    .eq('id', id)
    .eq('status', 'accepted')
    .single()

  if (!rel) redirect('/dashboard')

  // Viewer must be either inviter or invitee
  const isInviter  = rel.inviter_id  === user.id
  const isInvitee  = rel.invitee_id  === user.id
  if (!isInviter && !isInvitee) redirect('/dashboard')

  // The "other person" is the one who shared with us
  const ownerId    = isInvitee ? rel.inviter_id : rel.invitee_id
  const ownerEmail = rel.invitee_email
  const sections: string[] = rel.shared_sections ?? []

  return (
    <CompanionViewClient
      ownerId={ownerId}
      ownerEmail={ownerEmail}
      sections={sections}
      viewerId={user.id}
    />
  )
}
