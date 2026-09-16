'use client';

import LegacyPatrolMode from '@/components/patrol-mode';

/**
 * Landing/report shell only.
 * Active Plantão gameplay is intentionally mounted by app/plantao/page.tsx
 * through the same game-runtime-pro-v4 used by Campanha.
 */
export default function PatrolModeV4(props:any){
  return <LegacyPatrolMode {...props}/>;
}
