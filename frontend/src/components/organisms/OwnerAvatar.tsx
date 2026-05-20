import type { Objective } from '../../types';

interface Props {
  owner?: Objective['owner'];
  size?: number;
}

function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/);
  if (parts.length === 0) return '?';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0].charAt(0) + parts[parts.length - 1].charAt(0)).toUpperCase();
}

export function OwnerAvatar({ owner, size = 32 }: Props) {
  if (!owner) return null;
  const initials = getInitials(owner.name);
  return (
    <div
      title={`${owner.name} • ${owner.email}`}
      className="rounded-full bg-primary text-white flex items-center justify-center font-bold flex-shrink-0 cursor-default"
      style={{ width: size, height: size, fontSize: Math.max(10, size / 2.7) }}
    >
      {initials}
    </div>
  );
}
