import { render, screen, fireEvent } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { Dashboard } from './dashboard'
import { useWallet } from '@/hooks/use-wallet'
import { useNavigate } from 'react-router-dom'
import { MOCK_WORKSPACES } from '@/lib/mock-data'

// Mock the hooks
vi.mock('@/hooks/use-wallet', () => ({
  useWallet: vi.fn()
}))

vi.mock('react-router-dom', () => ({
  useNavigate: vi.fn()
}))

describe('Dashboard Component - Ownership Filtering', () => {
  const mockNavigate = vi.fn()
  
  beforeEach(() => {
    vi.clearAllMocks()
    ;(useNavigate as any).mockReturnValue(mockNavigate)
  })

  it('renders connect wallet view when not connected', () => {
    ;(useWallet as any).mockReturnValue({
      connected: false,
      connect: vi.fn(),
      address: null,
      shortAddress: null
    })

    render(<Dashboard />)
    expect(screen.getByText(/Connect your wallet/i)).toBeInTheDocument()
  })

  it('shows all quests by default when connected as owner', () => {
    const OWNER_ADDRESS = "GBXR...K2YQ" // Matches first two mock workspaces
    ;(useWallet as any).mockReturnValue({
      connected: true,
      connect: vi.fn(),
      address: OWNER_ADDRESS,
      shortAddress: 'GBXR...K2YQ'
    })

    render(<Dashboard />)
    
    // Should show all mock workspaces (3 by default)
    expect(screen.getAllByText(/Quest/i, { selector: 'button' })).toBeDefined()
    // Verify specific quests are present
    expect(screen.getByText(MOCK_WORKSPACES[0].name)).toBeInTheDocument()
    expect(screen.getByText(MOCK_WORKSPACES[2].name)).toBeInTheDocument()
  })

  it('filters "Owned" quests correctly for the connected owner', () => {
    const OWNER_ADDRESS = "GBXR...K2YQ"
    ;(useWallet as any).mockReturnValue({
      connected: true,
      address: OWNER_ADDRESS,
      shortAddress: 'GBXR...K2YQ'
    })

    render(<Dashboard />)
    
    // Click "Owned" filter
    const ownedFilter = screen.getByRole('button', { name: /owned/i })
    fireEvent.click(ownedFilter)

    // Should show quests owned by GBXR...K2YQ (Quest 0 and 1)
    expect(screen.getByText(MOCK_WORKSPACES[0].name)).toBeInTheDocument()
    expect(screen.getByText(MOCK_WORKSPACES[1].name)).toBeInTheDocument()
    
    // Should NOT show quest owned by someone else (Quest 2)
    expect(screen.queryByText(MOCK_WORKSPACES[2].name)).not.toBeInTheDocument()
  })

  it('filters "Enrolled" quests correctly for a regular user (non-owner)', () => {
    const USER_ADDRESS = "GUSER...123" // Does not match any mock owner
    ;(useWallet as any).mockReturnValue({
      connected: true,
      address: USER_ADDRESS,
      shortAddress: 'GUSE...123'
    })

    render(<Dashboard />)
    
    // Click "Owned" filter - should show none
    fireEvent.click(screen.getByRole('button', { name: /owned/i }))
    expect(screen.getByText(/No owned quests/i)).toBeInTheDocument()

    // Click "Enrolled" filter - should show all (since they don't own any, everything is "enrolled")
    fireEvent.click(screen.getByRole('button', { name: /enrolled/i }))
    expect(screen.getByText(MOCK_WORKSPACES[0].name)).toBeInTheDocument()
    expect(screen.getByText(MOCK_WORKSPACES[2].name)).toBeInTheDocument()
  })
})
