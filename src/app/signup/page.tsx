'use client';
import TextInput, { InputType } from '@/components/TextInput';
import { zodResolver } from '@hookform/resolvers/zod';
import { SubmitHandler, useForm } from 'react-hook-form';
import { z } from 'zod';
import MainButton from '@/components/MainButton';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { signupForm } from '@/forms/signupForm';
import Link from 'next/link';
import PasswordRequirements from '@/components/PasswordRequirements';

export type PasswordRequirementsType = {
  length: boolean | undefined;
  uppercase: boolean | undefined;
  lowercase: boolean | undefined;
  number: boolean | undefined;
};

export default function Singup() {
  const router = useRouter();

  const [loading, setLoading] = useState(false);

  const SignupFormSchema = signupForm();
  type CreateForm = z.infer<typeof SignupFormSchema>;

  const {
    register,
    handleSubmit,
    formState: { errors, isDirty, isValid },
  } = useForm<CreateForm>({
    mode: 'onBlur',
    resolver: zodResolver(SignupFormSchema),
    defaultValues: {
      email: '',
      password: '',
      name: '',
      confirm_password: '',
    },
  });

  const onSubmit: SubmitHandler<CreateForm> = data => {
    setLoading(true);
    try {
      router.push('home');
    } catch (error) {
      console.error(error);
    }
  };

  const [passwordRequirements, setPasswordRequirements] =
    useState<PasswordRequirementsType>({
      length: undefined,
      uppercase: undefined,
      lowercase: undefined,
      number: undefined,
    });

  const handlePasswordChange = (e: any) => {
    const newPasswordRequirements = {
      length: e.target.value.length >= 6,
      uppercase: /[A-Z]/.test(e.target.value),
      lowercase: /[a-z]/.test(e.target.value),
      number: /\d/.test(e.target.value),
    };

    setPasswordRequirements(newPasswordRequirements);
  };

  return (
    <main className='flex min-h-screen flex-col items-center font-nunito'>
      <div className='w-1/2 mt-20'>
        <div>
          <TextInput
            type={InputType.text}
            placeholder='Ingrese su nombre'
            label='Nombre'
            error={errors.name}
            registerOptions={{ ...register('name') }}
            style='w-full'
            containerStyle='mb-5'
          />
          <TextInput
            type={InputType.text}
            placeholder='Ingrese su email'
            label='Email'
            error={errors.name}
            registerOptions={{ ...register('email') }}
            style='w-full'
            containerStyle='mb-5'
          />
          <TextInput
            type={InputType.password}
            placeholder='Ingrese su contraseña'
            label='Contraseña'
            registerOptions={{
              ...register('password', { onChange: handlePasswordChange }),
            }}
            style='w-full'
            containerStyle='mb-5'
          />
          <TextInput
            type={InputType.password}
            placeholder='Ingrese su contraseña'
            label='Reingrese su contraseña'
            error={errors.confirm_password}
            registerOptions={{ ...register('confirm_password') }}
            style='w-full'
            containerStyle='mb-5'
          />
          <PasswordRequirements requirements={passwordRequirements} />

          <div className='flex justify-center items-center w-full mt-10'>
            <MainButton
              text={'REGISTRARSE'}
              className={`${
                isValid ? 'bg-purple-500' : 'bg-purple-200'
              } py-4 px-20`}
              disabled={!isValid || loading}
              onClick={handleSubmit(onSubmit)}
              loading={loading}
              LoadingComponent={() => (
                <span className='loading loading-dots loading-lg'></span>
              )}
            />
          </div>

          <div className='flex justify-center mt-3 font-semibold text-purple-800'>
            <Link href={'/'}>
              <p>Ya tiene cuenta? Iniciar Sesion</p>
            </Link>
          </div>
        </div>
      </div>
    </main>
  );
}
