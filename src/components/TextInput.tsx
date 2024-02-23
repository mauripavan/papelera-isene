import { RefObject } from 'react';
import { FieldError, UseFormRegisterReturn } from 'react-hook-form';

export enum InputType {
  text = 'text',
  email = 'email',
  date = 'date',
  dateTime = 'datetime-local',
  password = 'password',
  number = 'number',
}

export interface TextInputProps {
  label?: string;
  type: InputType;
  placeholder?: string;
  disabled?: boolean;
  error?: FieldError;
  registerOptions?: UseFormRegisterReturn;
  style?: string;
}

export default function TextInput(props: TextInputProps) {
  const { disabled, error, label, placeholder, registerOptions, type, style } =
    props;
  return (
    <>
      <div className='label font-bold'>
        <span className=' label-text'>{label}</span>
      </div>
      <input
        type={type}
        placeholder={placeholder}
        className={`input input-bordered ${style}`}
        disabled={disabled}
        {...registerOptions}
      />
      {error && <p className='text-red-500 font-bold'>{error.message}</p>}
    </>
  );
}
