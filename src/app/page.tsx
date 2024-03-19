'use client';
import TextInput, { InputType } from '@/components/TextInput';
import { zodResolver } from '@hookform/resolvers/zod';
import { loginForm } from '@/forms/loginForm';
import { SubmitHandler, useForm } from 'react-hook-form';
import { z } from 'zod';
import MainButton from '@/components/MainButton';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import Link from 'next/link';

export interface IUserProps {
  username: string;
  email: string;
  password: string;
}

export default function Login() {
  const router = useRouter();

  const [loading, setLoading] = useState(false);

  const LoginFormSchema = loginForm();
  type CreateForm = z.infer<typeof LoginFormSchema>;
  const {
    register,
    handleSubmit,
    formState: { errors, isDirty, isValid },
  } = useForm<CreateForm>({
    mode: 'onBlur',
    resolver: zodResolver(LoginFormSchema),
    defaultValues: {
      email: '',
      password: '',
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

  return (
    <main className='flex min-h-screen flex-col items-center font-nunito'>
      <div className='w-1/2 mt-20'>
        <div className=''>
          <TextInput
            type={InputType.text}
            placeholder='Ingrese su email'
            label='Email'
            error={errors.email}
            registerOptions={{ ...register('email') }}
            style='w-full'
            containerStyle='mb-5'
          />
          <TextInput
            type={InputType.password}
            placeholder='Ingrese su contraseña'
            label='Contraseña'
            error={errors.password}
            registerOptions={{ ...register('password') }}
            style='w-full'
          />
          <div className='flex justify-center items-center w-full mt-10'>
            <MainButton
              text={'INGRESAR'}
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
            <Link href={'signup'}>
              <p>No tiene cuenta? Registrarse</p>
            </Link>
          </div>
        </div>
      </div>
    </main>
  );
}
