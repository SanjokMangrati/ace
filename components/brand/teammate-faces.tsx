import { cn } from "@/lib/utils"

export function TeammateFaces({
  className,
  ...props
}: React.ComponentProps<"svg">) {
  return (
    <svg
      viewBox="0 0 520 420"
      role="img"
      aria-label="A group of friendly teammate faces"
      className={cn("fill-on-sun stroke-on-sun", className)}
      {...props}
    >
      <g transform="rotate(-6 160 190)">
        <rect
          x="60"
          y="90"
          width="200"
          height="200"
          rx="34"
          strokeWidth="4"
          className="fill-candy-grape"
        />
        <circle cx="128" cy="172" r="12" stroke="none" />
        <circle cx="192" cy="172" r="12" stroke="none" />
        <path
          d="M126 210 q34 28 68 0"
          fill="none"
          strokeWidth="12"
          strokeLinecap="round"
        />
      </g>
      <g transform="rotate(7 365 115)">
        <rect
          x="290"
          y="40"
          width="150"
          height="150"
          rx="28"
          strokeWidth="4"
          className="fill-candy-mint"
        />
        <circle cx="338" cy="104" r="9" stroke="none" />
        <circle cx="392" cy="104" r="9" stroke="none" />
        <path
          d="M346 133 q19 16 38 0"
          fill="none"
          strokeWidth="9"
          strokeLinecap="round"
        />
      </g>
      <g transform="rotate(-4 370 300)">
        <rect
          x="300"
          y="230"
          width="140"
          height="140"
          rx="26"
          strokeWidth="4"
          className="fill-candy-bubblegum"
        />
        <circle cx="346" cy="290" r="9" stroke="none" />
        <circle cx="394" cy="290" r="9" stroke="none" />
        <circle cx="370" cy="326" r="10" stroke="none" />
      </g>
      <g transform="rotate(9 205 345)">
        <rect
          x="150"
          y="290"
          width="110"
          height="110"
          rx="22"
          strokeWidth="4"
          className="fill-candy-sky"
        />
        <circle cx="188" cy="338" r="8" stroke="none" />
        <circle cx="222" cy="338" r="8" stroke="none" />
        <path
          d="M188 361 q17 14 34 0"
          fill="none"
          strokeWidth="8"
          strokeLinecap="round"
        />
      </g>
      <g transform="translate(-34 0) rotate(-10 485 215)">
        <rect
          x="440"
          y="170"
          width="90"
          height="90"
          rx="20"
          strokeWidth="4"
          className="fill-candy-lime"
        />
        <circle cx="472" cy="208" r="7" stroke="none" />
        <circle cx="498" cy="208" r="7" stroke="none" />
        <path
          d="M472 227 q13 11 26 0"
          fill="none"
          strokeWidth="7"
          strokeLinecap="round"
        />
      </g>
    </svg>
  )
}
