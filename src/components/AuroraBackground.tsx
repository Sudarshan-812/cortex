'use client'

import dynamic from 'next/dynamic'

const SoftAurora = dynamic(() => import('@/components/SoftAurora'), {
  ssr: false,
  loading: () => null,
})

interface AuroraBackgroundProps {
  speed?: number
  scale?: number
  brightness?: number
  color1?: string
  color2?: string
  noiseFrequency?: number
  noiseAmplitude?: number
  bandHeight?: number
  bandSpread?: number
  octaveDecay?: number
  layerOffset?: number
  colorSpeed?: number
}

export function AuroraBackground(props: AuroraBackgroundProps) {
  return <SoftAurora {...props} enableMouseInteraction={false} />
}
