/**
 * DitheredCircle — SVG dotted ring with slow rotation animation,
 * matching the brutalist reference aesthetic.
 */
export function DitheredCircle({
  size = 200,
  label,
  value,
  sublabel,
  className = "",
}: {
  size?: number;
  label?: string;
  value?: string;
  sublabel?: string;
  className?: string;
}) {
  const r = size / 2 - 12;
  const circumference = 2 * Math.PI * r;
  const dotCount = 48;
  const dotSpacing = circumference / dotCount;

  return (
    <div className={`relative inline-flex items-center justify-center ${className}`}>
      <svg
        width={size}
        height={size}
        viewBox={`0 0 ${size} ${size}`}
        className="animate-dither-spin"
        style={{ animationDuration: "60s" }}
      >
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeDasharray={`3 ${dotSpacing - 3}`}
          strokeLinecap="round"
          opacity="0.6"
        />
      </svg>

      {/* Static inner ring */}
      <svg
        width={size}
        height={size}
        viewBox={`0 0 ${size} ${size}`}
        className="absolute inset-0"
      >
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r - 16}
          fill="none"
          stroke="currentColor"
          strokeWidth="1"
          opacity="0.2"
        />
      </svg>

      {/* Center content */}
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        {label && (
          <span className="font-mono text-[10px] uppercase tracking-wider opacity-60">
            {label}
          </span>
        )}
        {value && (
          <span className="font-mono text-[32px] leading-none tracking-tight mt-1">
            {value}
          </span>
        )}
        {sublabel && (
          <span className="font-mono text-[10px] uppercase tracking-wider opacity-60 mt-2">
            {sublabel}
          </span>
        )}
      </div>
    </div>
  );
}
