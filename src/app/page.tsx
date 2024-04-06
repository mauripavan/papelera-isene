'use client';
import TextInput, { InputType } from '@/components/TextInput';
import { zodResolver } from '@hookform/resolvers/zod';
import { loginForm } from '@/forms/loginForm';
import { SubmitHandler, useForm } from 'react-hook-form';
import { z } from 'zod';
import MainButton from '@/components/MainButton';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { login } from '@/api';
import AddProductModal from '@/components/AddProductModal';
import LoadingModal from '@/components/LoadingModal';
import Logo from '@/components/Logo';
import useGlobalUserState from '@/hooks/useGlobalUserState';

export interface IUserProps {
  username: string;
  email: string;
  password: string;
}

export default function Login() {
  const router = useRouter();

  const [loading, setLoading] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [error, setError] = useState('');
  const { user, loadingSession } = useGlobalUserState();

  const LoginFormSchema = loginForm();
  type CreateForm = z.infer<typeof LoginFormSchema>;
  const {
    register,
    handleSubmit,
    formState: { errors, isValid },
  } = useForm<CreateForm>({
    mode: 'onBlur',
    resolver: zodResolver(LoginFormSchema),
    defaultValues: {
      email: '',
      password: '',
    },
  });

  // Redirect if user is already logged in
  useEffect(() => {
    if (user?.username) {
      router.push('/home');
    }
  }, [user]);

  const onSubmit: SubmitHandler<CreateForm> = async data => {
    setLoading(true);
    try {
      const response = await login({
        user: { email: data.email, password: data.password },
      });
      if (response.status === 200) {
        localStorage.setItem('token', response.data.token);
        router.push('/home');
      }
    } catch (error: any) {
      if (error.response.status === 401) {
        setError('Email o contraseña incorrecto. Intente nuevamente');
      } else {
        setError(error.message);
      }
      setLoading(false);
      setModalVisible(true);
    }
  };

  const handleCloseModal = () => {
    setModalVisible(false);
    setError('');
  };

  return (
    <main className='flex min-h-screen flex-col items-center font-nunito'>
      <header className='flex py-2 justify-center'>
        <Logo />
      </header>
      <div className='w-full lg:w-1/2 mt-20'>
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
      {modalVisible && (
        <AddProductModal
          onClose={handleCloseModal}
          error={true}
          text='Error al iniciar sesion'
          errorMessage={error}
        />
      )}
      {loadingSession && <LoadingModal text='Verificando credencailes' />}
    </main>
  );
}
