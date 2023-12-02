import { ReactNode } from 'react';

interface IMainButtonProps {
  text: string;
  color?: string;
  textColor?: string;
  icon?: ReactNode;
  disabled?: boolean;
}

export default function MainButton(props: IMainButtonProps) {
  const { text, color, textColor, icon, disabled } = props;
  return (
    <button
      disabled={disabled}
      className={`flex font-nunito font-medium text-xs px-2 py-1 rounded-md ${
        textColor ? textColor : 'text-white'
      } ${color && !disabled ? color : 'bg-gray-200'}`}
    >
      {text}
      {icon && <span>{icon}</span>}
    </button>
  );
}
