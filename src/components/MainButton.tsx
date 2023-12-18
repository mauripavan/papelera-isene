import { ReactNode } from 'react';

interface IMainButtonProps {
  text: string;
  icon?: ReactNode;
  disabled?: boolean;
  className?: string;
  onClick?: () => void;
}

export default function MainButton(props: IMainButtonProps) {
  const { text, className, icon, disabled, onClick } = props;
  return (
    <button
      disabled={disabled}
      className={`flex font-nunito font-medium px-2 py-1 rounded-md text-white items-center ${className}`}
      onClick={onClick}
    >
      {text}
      {icon && <span>{icon}</span>}
    </button>
  );
}
