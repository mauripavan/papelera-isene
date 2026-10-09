import { useEffect, useRef, useState } from 'react';
import { moneyToInput, parseMoney } from '../lib/money.ts';

export function MoneyInput({
  value,
  onChange,
  label,
  className,
}: {
  value: number;
  onChange: (value: number) => void;
  label: string;
  className?: string;
}) {
  const [text, setText] = useState(() => moneyToInput(value));
  const focused = useRef(false);

  useEffect(() => {
    if (!focused.current) setText(moneyToInput(value));
  }, [value]);

  return (
    <input
      className={className}
      aria-label={label}
      inputMode="decimal"
      value={text}
      onFocus={(event) => {
        focused.current = true;
        event.target.select();
      }}
      onBlur={() => {
        focused.current = false;
        const parsed = parseMoney(text);
        if (parsed == null) {
          setText(moneyToInput(value));
          return;
        }
        if (parsed !== value) onChange(parsed);
        setText(moneyToInput(parsed));
      }}
      onChange={(event) => {
        const next = event.target.value;
        setText(next);
        const parsed = parseMoney(next);
        if (parsed != null && parsed !== value) onChange(parsed);
      }}
    />
  );
}
