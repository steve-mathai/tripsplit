import type { ReactNode, SVGProps } from "react";

type IconProps = SVGProps<SVGSVGElement>;

// All icons are 24x24 stroke icons drawn inline so there is no icon font to load.
function Icon({ children, ...props }: IconProps & { children: ReactNode }) {
  return (
    <svg
      viewBox="0 0 24 24"
      width="22"
      height="22"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      {...props}
    >
      {children}
    </svg>
  );
}

export const MapIcon = (p: IconProps) => (
  <Icon {...p}>
    <path d="M9 4 3 6.5v13L9 17l6 3 6-2.5v-13L15 7 9 4Z" />
    <path d="M9 4v13M15 7v13" />
  </Icon>
);

export const WalletIcon = (p: IconProps) => (
  <Icon {...p}>
    <path d="M4 7.5A2.5 2.5 0 0 1 6.5 5H18a1 1 0 0 1 1 1v2" />
    <path d="M4 7.5V17a2 2 0 0 0 2 2h12a1 1 0 0 0 1-1v-9a1 1 0 0 0-1-1H6.5A2.5 2.5 0 0 1 4 7.5Z" />
    <circle cx="15.5" cy="13.5" r="1" fill="currentColor" />
  </Icon>
);

export const ScaleIcon = (p: IconProps) => (
  <Icon {...p}>
    <path d="M12 4v16M7 20h10M5 8h14" />
    <path d="m5 8-3 6a3.5 3.5 0 0 0 6 0L5 8ZM19 8l-3 6a3.5 3.5 0 0 0 6 0l-3-6Z" />
  </Icon>
);

export const ChartIcon = (p: IconProps) => (
  <Icon {...p}>
    <path d="M4 20V10M10 20V4M16 20v-7M22 20H2" />
  </Icon>
);

export const UsersIcon = (p: IconProps) => (
  <Icon {...p}>
    <circle cx="9" cy="8" r="3.2" />
    <path d="M3 19c0-3.2 2.7-5 6-5s6 1.8 6 5" />
    <path d="M16 5.2a3 3 0 0 1 0 5.6M18.5 14.3c1.5.7 2.5 2.2 2.5 4.7" />
  </Icon>
);

export const ShareIcon = (p: IconProps) => (
  <Icon {...p}>
    <circle cx="6" cy="12" r="2.4" />
    <circle cx="18" cy="6" r="2.4" />
    <circle cx="18" cy="18" r="2.4" />
    <path d="m8.2 10.8 7.6-3.6M8.2 13.2l7.6 3.6" />
  </Icon>
);

export const PlusIcon = (p: IconProps) => (
  <Icon {...p}>
    <path d="M12 5v14M5 12h14" />
  </Icon>
);

export const MinusIcon = (p: IconProps) => (
  <Icon {...p}>
    <path d="M5 12h14" />
  </Icon>
);

export const CheckIcon = (p: IconProps) => (
  <Icon {...p}>
    <path d="m5 12.5 4.5 4.5L19 7.5" />
  </Icon>
);

export const CloseIcon = (p: IconProps) => (
  <Icon {...p}>
    <path d="M6 6l12 12M18 6 6 18" />
  </Icon>
);

export const TrashIcon = (p: IconProps) => (
  <Icon {...p}>
    <path d="M4 7h16M10 11v6M14 11v6M6 7l1 12a1 1 0 0 0 1 1h8a1 1 0 0 0 1-1l1-12M9 7V4h6v3" />
  </Icon>
);

export const CopyIcon = (p: IconProps) => (
  <Icon {...p}>
    <rect x="8" y="8" width="12" height="12" rx="2.5" />
    <path d="M16 8V6a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2h2" />
  </Icon>
);

export const ArrowRightIcon = (p: IconProps) => (
  <Icon {...p}>
    <path d="M5 12h14M13 6l6 6-6 6" />
  </Icon>
);

export const ChevronLeftIcon = (p: IconProps) => (
  <Icon {...p}>
    <path d="m15 5-7 7 7 7" />
  </Icon>
);

export const PinIcon = (p: IconProps) => (
  <Icon {...p}>
    <path d="M12 21s7-6.2 7-11.5A7 7 0 0 0 5 9.5C5 14.8 12 21 12 21Z" />
    <circle cx="12" cy="9.5" r="2.5" />
  </Icon>
);

export const LockIcon = (p: IconProps) => (
  <Icon {...p}>
    <rect x="5" y="11" width="14" height="9" rx="2.5" />
    <path d="M8 11V8a4 4 0 0 1 8 0v3" />
  </Icon>
);

export const ThumbUpIcon = (p: IconProps) => (
  <Icon {...p}>
    <path d="M7 11v9H4a1 1 0 0 1-1-1v-7a1 1 0 0 1 1-1h3Zm0 0 3.5-7a2 2 0 0 1 3 1.8L13 9h5.3a2 2 0 0 1 1.9 2.6l-1.7 6.5a2 2 0 0 1-1.9 1.5H7" />
  </Icon>
);

export const ThumbDownIcon = (p: IconProps) => (
  <Icon {...p} style={{ transform: "scaleY(-1)", ...p.style }}>
    <path d="M7 11v9H4a1 1 0 0 1-1-1v-7a1 1 0 0 1 1-1h3Zm0 0 3.5-7a2 2 0 0 1 3 1.8L13 9h5.3a2 2 0 0 1 1.9 2.6l-1.7 6.5a2 2 0 0 1-1.9 1.5H7" />
  </Icon>
);

export const SmilePlusIcon = (p: IconProps) => (
  <Icon {...p}>
    <path d="M20.5 12.5A8.5 8.5 0 1 1 11.5 3.5" />
    <path d="M8.5 14.2a4.2 4.2 0 0 0 7 0M9 9.8h.01M14 9.8h.01M18 2.5v5M15.5 5h5" />
  </Icon>
);

export const WhatsAppIcon = (p: IconProps) => (
  <Icon {...p}>
    <path d="M3.5 20.5 5 16A8.5 8.5 0 1 1 8 19l-4.5 1.5Z" />
    <path d="M9 8.5c0 3.5 2.5 6 6 6l1.2-1.5-2-1-1 .8c-.9-.4-1.7-1.2-2.1-2.1l.8-1-1-2L9 8.5Z" />
  </Icon>
);

export const UpiIcon = (p: IconProps) => (
  <Icon {...p}>
    <path d="M6 5h8a4 4 0 0 1 0 8H8M8 13l-2 6M13 13l-2 6" />
  </Icon>
);

export const CalendarIcon = (p: IconProps) => (
  <Icon {...p}>
    <rect x="3.5" y="5" width="17" height="15" rx="3" />
    <path d="M3.5 10h17M8 3v4M16 3v4" />
  </Icon>
);
