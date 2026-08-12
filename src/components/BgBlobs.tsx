import type { DeviceTier } from '../hooks/useDeviceTier';

export default function BgBlobs({ tier }: { tier: DeviceTier }) {
  return (
    <div className={`bg-blobs${tier === 'low' ? ' bg-blobs--low' : ''}`} aria-hidden="true">
      <div className="blob blob1" />
      <div className="blob blob2" />
      {tier === 'high' && <div className="blob blob3" />}
    </div>
  );
}
