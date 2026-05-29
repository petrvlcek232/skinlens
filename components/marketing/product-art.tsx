/**
 * Original SVG product silhouettes (no stock photography — keeps the demo
 * copyright-clean and intentional). A frosted-glass bottle/jar in translucent
 * white, meant to sit over a tinted gradient background.
 */
export type BottleShape = "jar" | "dropper" | "pump" | "tube";

export function shapeForCategory(category: string): BottleShape {
  switch (category) {
    case "cleanser":
      return "tube";
    case "moisturizer":
      return "jar";
    case "spf":
      return "pump";
    case "serum":
    case "exfoliant":
    case "eye":
    default:
      return "dropper";
  }
}

export function gradientForCategory(category: string): [string, string] {
  switch (category) {
    case "cleanser":
      return ["#f3dce4", "#e8b9cf"];
    case "serum":
      return ["#e7dcef", "#cdb6de"];
    case "exfoliant":
      return ["#fbeede", "#f4d8b0"];
    case "moisturizer":
      return ["#efe7df", "#e3cdbb"];
    case "eye":
      return ["#dfeaf0", "#bcd4e2"];
    case "spf":
      return ["#fbeede", "#f4d8b0"];
    default:
      return ["#f7e6ea", "#f0c9cf"];
  }
}

const FILL = "rgba(255,255,255,0.6)";
const STROKE = "rgba(255,255,255,0.55)";
const SHINE = "rgba(255,255,255,0.85)";

function ShapePaths({ shape }: { shape: BottleShape }) {
  switch (shape) {
    case "jar":
      return (
        <g fill={FILL} stroke={STROKE} strokeWidth={1.5}>
          <rect x={29} y={42} width={42} height={20} rx={7} />
          <rect x={31} y={60} width={38} height={52} rx={11} />
          <rect x={37} y={66} width={5} height={40} rx={2.5} fill={SHINE} stroke="none" />
        </g>
      );
    case "pump":
      return (
        <g fill={FILL} stroke={STROKE} strokeWidth={1.5}>
          <rect x={45} y={12} width={17} height={6} rx={2} />
          <rect x={52} y={16} width={6} height={13} rx={2} />
          <rect x={40} y={28} width={20} height={10} rx={4} />
          <rect x={33} y={37} width={34} height={78} rx={10} />
          <rect x={39} y={45} width={5} height={60} rx={2.5} fill={SHINE} stroke="none" />
        </g>
      );
    case "tube":
      return (
        <g fill={FILL} stroke={STROKE} strokeWidth={1.5}>
          <rect x={37} y={28} width={26} height={82} rx={13} />
          <rect x={39} y={108} width={22} height={11} rx={3} />
          <rect x={43} y={36} width={5} height={64} rx={2.5} fill={SHINE} stroke="none" />
        </g>
      );
    case "dropper":
    default:
      return (
        <g fill={FILL} stroke={STROKE} strokeWidth={1.5}>
          <rect x={40} y={13} width={20} height={23} rx={7} />
          <rect x={44} y={34} width={12} height={9} />
          <rect x={34} y={42} width={32} height={76} rx={9} />
          <rect x={40} y={50} width={5} height={58} rx={2.5} fill={SHINE} stroke="none" />
        </g>
      );
  }
}

export function ProductArt({
  shape,
  className,
}: {
  shape: BottleShape;
  className?: string;
}) {
  return (
    <svg
      viewBox="0 0 100 133"
      className={className}
      role="img"
      aria-hidden="true"
      preserveAspectRatio="xMidYMid meet"
    >
      <ShapePaths shape={shape} />
    </svg>
  );
}
