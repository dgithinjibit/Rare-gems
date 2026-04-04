import { useEffect } from 'react'
import { usePortalStore } from '../stores/portalStore'

/**
 * Hook for parsing and managing portal URL parameters
 */
export function usePortalParams() {
  const inboundParams = usePortalStore(state => state.inboundParams)
  const hasInboundPortal = usePortalStore(state => state.hasInboundPortal)
  const parseInboundParams = usePortalStore(state => state.parseInboundParams)
  const clearInboundParams = usePortalStore(state => state.clearInboundParams)
  const triggerGlobalPortal = usePortalStore(state => state.triggerGlobalPortal)
  const buildOutboundUrl = usePortalStore(state => state.buildOutboundUrl)
  
  // Parse URL params on mount
  useEffect(() => {
    parseInboundParams()
  }, [parseInboundParams])
  
  return {
    inboundParams,
    hasInboundPortal,
    clearInboundParams,
    triggerGlobalPortal,
    buildOutboundUrl,
  }
}

export default usePortalParams
