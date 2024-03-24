import { PasswordRequirementsType } from '@/app/signup/page';
import CheckIcon2 from './icons/Check2';
import WrongIcon from './icons/Wrong';

export interface IPasswordRequirementsProps {
  requirements: PasswordRequirementsType;
}

const PasswordRequirements = (props: IPasswordRequirementsProps) => {
  const { requirements: passwordRequirements } = props;
  return (
    <div className='bg-gray-1 py-4 px-5 mt-4 rounded-lg'>
      <div className='flex pb-1 border-b border-gray-3 text-gray-7 font-medium text-xs'>
        <p>La contraseña debe contener:</p>
      </div>
      <div className='grid grid-cols-1 sm:grid-cols-2 mt-2 text-gray-7 text-xs gap-y-2'>
        <div
          className={`flex col-span-1 gap-x-1 ${
            passwordRequirements.uppercase === undefined
              ? 'text-gray-7'
              : passwordRequirements.uppercase === true
                ? 'text-success'
                : 'text-error'
          }`}
        >
          {passwordRequirements.uppercase ===
          undefined ? null : passwordRequirements.uppercase === true ? (
            <CheckIcon2 />
          ) : (
            <WrongIcon />
          )}
          <p>ABC Una letra mayúscula</p>
        </div>
        <div
          className={`flex col-span-1 gap-x-1 ${
            passwordRequirements.lowercase === undefined
              ? 'text-gray-7'
              : passwordRequirements.lowercase === true
                ? 'text-success'
                : 'text-error'
          }`}
        >
          {passwordRequirements.lowercase ===
          undefined ? null : passwordRequirements.lowercase === true ? (
            <CheckIcon2 />
          ) : (
            <WrongIcon />
          )}
          <p>abc Una letra minúscula</p>
        </div>
        <div
          className={`flex col-span-1 gap-x-1 ${
            passwordRequirements.number === undefined
              ? 'text-gray-7'
              : passwordRequirements.number === true
                ? 'text-success'
                : 'text-error'
          }`}
        >
          {passwordRequirements.number ===
          undefined ? null : passwordRequirements.number === true ? (
            <CheckIcon2 />
          ) : (
            <WrongIcon />
          )}
          <p>123 Un número</p>
        </div>
        <div
          className={`flex col-span-1 gap-x-1 ${
            passwordRequirements.length === undefined
              ? 'text-gray-7'
              : passwordRequirements.length === true
                ? 'text-success'
                : 'text-error'
          }`}
        >
          {passwordRequirements.length ===
          undefined ? null : passwordRequirements.length === true ? (
            <CheckIcon2 />
          ) : (
            <WrongIcon />
          )}
          <p>*** Mínimo 6 caracteres</p>
        </div>
      </div>
    </div>
  );
};

export default PasswordRequirements;
