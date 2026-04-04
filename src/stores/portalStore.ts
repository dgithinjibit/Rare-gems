import { create } from 'zustand'

export interface InboundPortalParams {
  portal: boolean
  username?: string
  color?: string
  speed?: number
  hp?: number
  ref?: string
}

export interface PortalStore {
  // Inbound params from URL
  inboundParams: InboundPortalParams | null
  hasInboundPortal: boolean
  
  // Outbound configuration
  jamBaseUrl: string
  currentGameUrl: string
  
  // Actions
  parseInboundParams: () => void
  setInboundParams: (params: InboundPortalParams) => void
  clearInboundParams: () => void
  
  // Portal navigation
  triggerGlobalPortal: (playerState: {
    username: string
    hp: number
    beads: number
  }) => void
  
  buildOutboundUrl: (playerState: {
    username: string
    hp: number
    beads: number
  }) => string
}

export const usePortalStore = create<PortalStore>()((set, get) => ({
  // Initial state
  inboundParams: null,
  hasInboundPortal: false,
  jamBaseUrl: 'https://jam.pieter.com/portal/2026',
  currentGameUrl: typeof window !== 'undefined' ? window.location.origin : '',
  
  // Actions
  parseInboundParams: () => {
    if (typeof window === 'undefined') return
    
    const urlParams = new URLSearchParams(window.location.search)
    
    const portal = urlParams.get('portal') === 'true'
    
    if (!portal) {
      set({ inboundParams: null, hasInboundPortal: false })
      return
    }
    
    const params: InboundPortalParams = {
      portal: true,
      username: urlParams.get('username') || undefined,
      color: urlParams.get('color') || undefined,
      speed: urlParams.get('speed') ? parseFloat(urlParams.get('speed')!) : undefined,
      hp: urlParams.get('hp') ? parseFloat(urlParams.get('hp')!) : undefined,
      ref: urlParams.get('ref') || undefined,
    }
    
    set({ inboundParams: params, hasInboundPortal: true })
  },
  
  setInboundParams: (params) => {
    set({ inboundParams: params, hasInboundPortal: true })
  },
  
  clearInboundParams: () => {
    set({ inboundParams: null, hasInboundPortal: false })
    
    // Clear URL params without reload
    if (typeof window !== 'undefined') {
      const url = new URL(window.location.href)
      url.search = ''
      window.history.replaceState({}, '', url.toString())
    }
  },
  
  triggerGlobalPortal: (playerState) => {
    const url = get().buildOutboundUrl(playerState)
    
    if (typeof window !== 'undefined') {
      window.location.href = url
    }
  },
  
  buildOutboundUrl: (playerState) => {
    const { jamBaseUrl, currentGameUrl } = get()
    
    const params = new URLSearchParams({
      username: playerState.username || 'DungBeetle',
      hp: playerState.hp.toString(),
      ref: currentGameUrl,
    })
    
    return `${jamBaseUrl}?${params.toString()}`
  },
}))

// Hook to initialize portal params on app load
export function initializePortalParams() {
  usePortalStore.getState().parseInboundParams()
}
