"use client";

interface SpotlightProps {
  children: React.ReactNode;
  className?: string;
}

export function Spotlight({ children, className }: SpotlightProps) {
  const handleMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    e.currentTarget.style.setProperty("--sx", `${((e.clientX - rect.left) / rect.width) * 100}%`);
    e.currentTarget.style.setProperty("--sy", `${((e.clientY - rect.top) / rect.height) * 100}%`);
  };

  return (
    <div onMouseMove={handleMove} className={`lp-spotlight ${className ?? ""}`}>
      {children}
    </div>
  );
}
