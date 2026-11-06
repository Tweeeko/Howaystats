/** HOWAYSTATS mark: black-and-white stripes that double as a rising bar chart. Original artwork. */
export function LogoMark({ size = 36, className = "" }: { size?: number; className?: string }) {
  const bars = [14, 20, 26, 32, 38];
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" className={className} aria-hidden="true">
      <rect x="1" y="1" width="46" height="46" fill="#050607" stroke="#f4f4f0" strokeWidth="2" />
      {bars.map((h, i) => (
        <rect key={i} x={6 + i * 7.6} y={43 - h} width="6.4" height={h} fill={i % 2 === 0 ? "#f4f4f0" : "#5b636c"} />
      ))}
    </svg>
  );
}

export function Wordmark({ className = "" }: { className?: string }) {
  return (
    <span className={`display-i inline-flex items-baseline gap-0 text-[1.6rem] leading-none tracking-tight ${className}`}>
      <span>HOWAY</span>
      <span className="text-silver">STATS</span>
    </span>
  );
}

export function Logo() {
  return (
    <span className="inline-flex items-center gap-2.5">
      <LogoMark />
      <Wordmark />
    </span>
  );
}
