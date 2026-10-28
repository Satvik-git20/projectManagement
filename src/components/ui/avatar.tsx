import { cn, initials } from "@/lib/utils";

const sizes = {
  xs: "size-5 text-[9px]",
  sm: "size-6 text-[10px]",
  md: "size-8 text-[11px]",
  lg: "size-10 text-[13px]",
  xl: "size-14 text-lg",
} as const;

type AvatarProps = {
  name: string;
  color?: string;
  size?: keyof typeof sizes;
  className?: string;
  ring?: boolean;
};

export function Avatar({
  name,
  color = "#6366f1",
  size = "md",
  className,
  ring = false,
}: AvatarProps) {
  return (
    <span
      title={name}
      aria-label={name}
      className={cn(
        "inline-grid select-none place-items-center rounded-full font-semibold uppercase tracking-wide",
        sizes[size],
        ring && "ring-2 ring-surface",
        className,
      )}
      style={{
        backgroundColor: `${color}26`,
        color,
        boxShadow: `inset 0 0 0 1px ${color}55`,
      }}
    >
      {initials(name)}
    </span>
  );
}

export function AvatarStack({
  users,
  max = 4,
  size = "sm",
}: {
  users: { id: string; name: string; avatarColor: string }[];
  max?: number;
  size?: keyof typeof sizes;
}) {
  const visible = users.slice(0, max);
  const overflow = users.length - visible.length;

  return (
    <div className="flex items-center -space-x-1.5">
      {visible.map((user) => (
        <Avatar
          key={user.id}
          name={user.name}
          color={user.avatarColor}
          size={size}
          ring
        />
      ))}
      {overflow > 0 ? (
        <span
          className={cn(
            "inline-grid place-items-center rounded-full bg-elevated font-semibold text-muted ring-2 ring-surface",
            sizes[size],
          )}
        >
          +{overflow}
        </span>
      ) : null}
    </div>
  );
}
