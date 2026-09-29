export default function Logo({ light }: { light?: boolean }) {
  return (
    <span className="flex items-center gap-2">
      <svg width="34" height="34" viewBox="0 0 64 64" aria-hidden="true">
        <rect width="64" height="64" rx="18" fill="#6C47FF" />
        <path d="M36 10 20 36h11l-3 18 16-26H33z" fill="#D4FF3A" />
      </svg>
      <span className={`text-lg font-extrabold tracking-tight ${light ? "text-white" : "text-ink"}`}>
        Smart<span className="text-brand">Life</span>
      </span>
    </span>
  );
}
