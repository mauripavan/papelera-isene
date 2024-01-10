interface ArrowRightProps {
  className?: string;
}

export default function ArrowRightIcon({
  className,
}: ArrowRightProps): JSX.Element {
  return (
    <svg
      xmlns='http://www.w3.org/2000/svg'
      height='24'
      viewBox='0 -960 960 960'
      width='24'
      className={className}
    >
      <path d='M504-480 320-664l56-56 240 240-240 240-56-56 184-184Z' />
    </svg>
  );
}
