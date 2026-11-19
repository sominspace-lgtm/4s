'use client'

import { useState } from 'react'
import type { SectionConfig } from '@/components/ui/CustomizePanel'
import HouseholdHub from './HouseholdHub'
import ControlPanel from './ControlPanel'
import { useSharedSpaces } from '@/lib/hooks/useSharedSpaces'

// Smart Home as a page in Home (2026-11-19), next to Calendar and Chores. The
// same control panel the Village cottage opens as a sheet; setting things up
// (devices, scenes, Home Assistant) is one tap away, as it is there.
export default function SmartHomePage({ userId, userEmail, homeBlocks, onChangeHomeBlocks, sharedMode, onLockedNavigate }: {
  userId: string
  userEmail: string
  homeBlocks: SectionConfig[]
  onChangeHomeBlocks: (next: SectionConfig[]) => void
  sharedMode?: boolean
  onLockedNavigate?: (reason: string) => void
}) {
  const [setup, setSetup] = useState(false)
  const { spaces } = useSharedSpaces(userId)
  if (!setup) return <ControlPanel spaceId={spaces[0]?.id ?? null} onSetup={() => setSetup(true)} />
  return (
    <div>
      <button onClick={() => setSetup(false)} className="press" style={{ background: 'none', border: 'none', color: 'var(--muted)', cursor: 'pointer', fontSize: '0.8rem', fontFamily: 'var(--font-body)', marginBottom: '0.6rem', padding: 0 }}>‹ Back to controls</button>
      <HouseholdHub
        userId={userId} userEmail={userEmail}
        homeBlocks={homeBlocks} onChangeHomeBlocks={onChangeHomeBlocks}
        sharedMode={sharedMode} onLockedNavigate={onLockedNavigate}
        forcedTab="smarthome"
      />
    </div>
  )
}
