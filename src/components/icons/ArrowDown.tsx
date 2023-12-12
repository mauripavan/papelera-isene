interface ArrowDownProps {
  className?: string;
}

export default function ArrowDownIcon({
  className,
}: ArrowDownProps): JSX.Element {
  return (
    <svg
      xmlns='http://www.w3.org/2000/svg'
      height='20'
      viewBox='0 -960 960 960'
      width='20'
      className={className}
    >
      <path d='M480-345 240-585l56-56 184 184 184-184 56 56-240 240Z' />
    </svg>
  );
}
