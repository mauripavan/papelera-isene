'use client';
import * as z from 'zod';
import { addProductForm } from '@/forms/addProduct';
import { zodResolver } from '@hookform/resolvers/zod';
import { useEffect, useState } from 'react';
import { useForm, SubmitHandler } from 'react-hook-form';
import TextInput, { InputType } from '@/components/TextInput';
import { createProduct } from '@/api';
import AddProductModal from '@/components/AddProductModal';
import { useProtectedRoute } from '@/hooks/useProtectedRoute';
import { getSession } from '@/auth';
import { useRecoilState } from 'recoil';
import { userState } from '@/store/app-state';
import { useRouter } from 'next/navigation';
import MainButton from '@/components/MainButton';
import Logo from '@/components/Logo';
import Navbar from '@/components/Navbar';

export default function AddItem() {
  useProtectedRoute();

  const [inStock, setInStock] = useState(true);
  const [modalVisible, setModalVisible] = useState(false);
  const [addProductError, setAddProductError] = useState(false);
  const [loading, setLoading] = useState(false);
  const [loadingSession, setLoadingSession] = useState(true);
  const [, setUser] = useRecoilState(userState);
  const router = useRouter();

  useEffect(() => {
    getSession()
      .then(res => {
        if (res !== null) {
          setUser({
            email: res.user.email,
            username: res.user.username,
            admin: res.user.admin,
          });
        } else {
          router.replace('/');
        }
      })
      .finally(() => setLoadingSession(false));
  }, []);

  const AddProductFormSchema = addProductForm();
  type CreateForm = z.infer<typeof AddProductFormSchema>;
  const {
    register,
    handleSubmit,
    watch,
    setValue,
    reset,
    formState: { errors, isValid },
  } = useForm<CreateForm>({
    mode: 'onTouched',
    resolver: zodResolver(AddProductFormSchema),
  });

  const onSubmit: SubmitHandler<CreateForm> = data => {
    setLoading(true);
    try {
      const body = {
        description: data.description,
        cost: data.cost,
        pi: data.PI,
        pp: data.PP,
        stock: data.stock,
        updatedDate: new Date().toDateString(),
        earningPI: data.earningPI,
        earningPP: data.earningPP,
        quantity: data.quantity,
        iva: false,
      };
      createProduct({ productData: body }).then(res => {
        if (res.status === 200) {
          setModalVisible(true);
        } else {
          setAddProductError(true);
          setModalVisible(true);
        }
      });
      setLoading(false);
    } catch (error) {
      console.error(error);
      setLoading(false);
    }
  };

  const handleChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
    setInStock(event.target.value === 'true');
  };

  const costo = watch('cost');
  const earningPI = watch('earningPI');
  const earningPP = watch('earningPP');

  useEffect(() => {
    if (costo && earningPI) {
      const piValue = costo * (1 + earningPI / 100);
      setValue('PI', piValue);
    }
  }, [costo, earningPI]);

  useEffect(() => {
    if (costo && earningPP) {
      const ppValue = costo * (1 + earningPP / 100);
      setValue('PP', ppValue);
    }
  }, [costo, earningPP]);

  const handleCloseModal = () => {
    setModalVisible(false);
    !addProductError && reset();
  };

  if (loadingSession) {
    return (
      <div className='flex justify-center items-center font-nunito font-bold text-xl min-h-screen'>
        <p>Cargando...</p>
      </div>
    );
  }

  return (
    <main className='flex min-h-screen flex-col font-nunito'>
      <Navbar />
      <div>
        <h1 className=' font-black'>AGREGAR PRODUCTO</h1>
        <form className=''>
          <label className='form-control w-full grid grid-cols-3 gap-8'>
            <div className='col-span-3 md:col-span-2'>
              <TextInput
                type={InputType.text}
                placeholder='Descripción'
                label='Descripción'
                error={errors.description}
                registerOptions={{ ...register('description') }}
                style='w-full'
              />
            </div>

            <div className='col-span-3 md:col-span-1'>
              <TextInput
                type={InputType.number}
                placeholder='Cantidad'
                label='Cantidad'
                error={errors.quantity}
                registerOptions={{ ...register('quantity') }}
                style='w-full'
              />
            </div>

            <div className='col-span-3 md:col-span-1'>
              <TextInput
                type={InputType.number}
                placeholder='Costo'
                label='Costo'
                error={errors.cost}
                registerOptions={{ ...register('cost') }}
                style='w-full'
              />
            </div>

            <div className='col-span-3 md:col-span-1'>
              <TextInput
                type={InputType.number}
                placeholder='% Ganacias Isene'
                label='% Ganacias Isene'
                error={errors.earningPI}
                registerOptions={{ ...register('earningPI') }}
                style='w-full'
              />
            </div>

            <div className='col-span-3 md:col-span-1'>
              <TextInput
                type={InputType.number}
                placeholder='% Ganancias Papeleras'
                label='% Ganancias Papeleras'
                error={errors.earningPP}
                registerOptions={{ ...register('earningPP') }}
                style='w-full'
              />
            </div>

            <div className='col-span-3 md:col-span-1'>
              <TextInput
                type={InputType.number}
                placeholder='Precio Isene'
                label='Precio Isene'
                error={errors.PI}
                registerOptions={{ ...register('PI') }}
                disabled
                style='w-full'
              />
            </div>

            <div className='col-span-3 md:col-span-1'>
              <TextInput
                type={InputType.number}
                placeholder='Precio Papeleras'
                label='Precio Papeleras'
                error={errors.PP}
                registerOptions={{ ...register('PP') }}
                disabled
                style='w-full'
              />
            </div>

            <div className='col-span-3 md:col-span-1  font-bold'>
              <div className=' label '>
                <span className='label-text'>Stock</span>
              </div>
              <select
                className={`select select-bordered w-full text-center ${
                  inStock ? 'bg-green-200' : 'bg-red-200'
                }`}
                {...register('stock')}
                value={String(inStock)}
                onChange={handleChange}
                defaultValue={0}
              >
                <option value={'true'}>EN STOCK</option>
                <option value={'false'}>REPONER</option>
              </select>
              {errors.stock && (
                <p className='text-red-500 font-bold'>
                  {errors.stock?.message}
                </p>
              )}
            </div>
          </label>
          <div className='flex justify-center items-center w-full mt-10'>
            <MainButton
              text={'AGREGAR PRODUCTO +'}
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
        </form>
      </div>
      {modalVisible && (
        <AddProductModal
          onClose={handleCloseModal}
          error={addProductError}
          text='Producto agregado correctamente'
        />
      )}
    </main>
  );
}
