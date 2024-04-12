'use client';
import * as z from 'zod';
import { addProductForm } from '@/forms/addProduct';
import { zodResolver } from '@hookform/resolvers/zod';
import { useEffect, useState } from 'react';
import { useForm, SubmitHandler } from 'react-hook-form';
import TextInput, { InputType } from '@/components/TextInput';
import { createProduct } from '@/api';
import AddProductModal from '@/components/AddProductModal';
import { useRouter } from 'next/navigation';
import MainButton from '@/components/MainButton';
import Navbar from '@/components/Navbar';
import useGlobalUserState from '@/hooks/useGlobalUserState';

export default function AddItem() {
  const [modalVisible, setModalVisible] = useState(false);
  const [addProductError, setAddProductError] = useState(false);
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const { user, loadingSession } = useGlobalUserState();

  useEffect(() => {
    if (!user?.admin) router.replace('/home');
  }, [user]);

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
        piIva: data.PIIVA,
        ppIva: data.PPIVA,
        stock: data.stock,
        updatedDate: new Date().toDateString(),
        earningPI: data.earningPI,
        earningPP: data.earningPP,
        quantity: data.quantity,
        iva: data.iva,
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

  const costo = watch('cost');
  const earningPI = watch('earningPI');
  const earningPP = watch('earningPP');
  const stock = watch('stock');
  const iva = watch('iva');

  useEffect(() => {
    if (costo && earningPI) {
      const earningConIva = Number(earningPI) + 21;
      const piValue = costo * (1 + earningPI / 100);
      const piIvaValue = costo * (1 + earningConIva / 100);
      setValue('PI', piValue);
      if (!iva) {
        setValue('PIIVA', piIvaValue);
      } else {
        setValue('PIIVA', piValue);
      }
    }
  }, [costo, earningPI, iva]);

  useEffect(() => {
    if (costo && earningPP) {
      const earningConIva = Number(earningPP) + 21;
      const ppValue = costo * (1 + earningPP / 100);
      const ppIvaValue = costo * (1 + earningConIva / 100);
      setValue('PP', ppValue);
      if (!iva) {
        setValue('PPIVA', ppIvaValue);
      } else {
        setValue('PPIVA', ppValue);
      }
    }
  }, [costo, earningPP, iva]);

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
        <form>
          <label className='form-control w-full grid grid-cols-4 gap-8'>
            <div className='col-span-4 md:col-span-3'>
              <TextInput
                type={InputType.text}
                placeholder='Descripción'
                label='Descripción'
                error={errors.description}
                registerOptions={{ ...register('description') }}
                style='w-full'
              />
            </div>

            <div className='col-span-4 md:col-span-1'>
              <TextInput
                type={InputType.number}
                placeholder='Cantidad'
                label='Cantidad'
                error={errors.quantity}
                registerOptions={{ ...register('quantity') }}
                style='w-full'
              />
            </div>

            <div className='col-span-4 md:col-span-1'>
              <TextInput
                type={InputType.number}
                placeholder='Costo'
                label='Costo'
                error={errors.cost}
                registerOptions={{ ...register('cost') }}
                style='w-full'
              />
            </div>

            <div className='col-span-4 md:col-span-1'>
              <TextInput
                type={InputType.number}
                placeholder='% Ganacias Isene'
                label='% Ganacias Isene'
                error={errors.earningPI}
                registerOptions={{ ...register('earningPI') }}
                style='w-full'
              />
            </div>

            <div className='col-span-4 md:col-span-1'>
              <TextInput
                type={InputType.number}
                placeholder='% Ganancias Papeleras'
                label='% Ganancias Papeleras'
                error={errors.earningPP}
                registerOptions={{ ...register('earningPP') }}
                style='w-full'
              />
            </div>

            <div className='col-span-4 md:col-span-1  font-bold'>
              <div className=' label '>
                <span className='label-text'>Stock</span>
              </div>
              <select
                className={`select select-bordered w-full text-center ${
                  !stock || String(stock) === 'false'
                    ? 'bg-red-200'
                    : 'bg-green-200'
                }`}
                {...register('stock')}
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

            <div className='col-span-4 md:col-span-1'>
              <TextInput
                type={InputType.number}
                placeholder='0'
                label='Precio Isene'
                error={errors.PI}
                registerOptions={{ ...register('PI') }}
                disabled
                style='w-full'
              />
            </div>

            <div className='col-span-4 md:col-span-1'>
              <TextInput
                type={InputType.number}
                label='Precio Isene + IVA'
                placeholder='0'
                error={errors.PP}
                registerOptions={{ ...register('PIIVA') }}
                disabled
                style='w-full'
              />
            </div>

            <div className='col-span-4 md:col-span-1'>
              <TextInput
                type={InputType.number}
                placeholder='0'
                label='Precio Papeleras'
                error={errors.PP}
                registerOptions={{ ...register('PP') }}
                disabled
                style='w-full'
              />
            </div>

            <div className='col-span-4 md:col-span-1'>
              <TextInput
                type={InputType.number}
                placeholder='0'
                label='Precio Papeleras + IVA'
                error={errors.PP}
                registerOptions={{ ...register('PPIVA') }}
                disabled
                style='w-full'
              />
            </div>

            <div className='col-span-4 md:col-span-1 font-bold'>
              <div className='label'>
                <span className='label-text'>Incluye IVA?</span>
              </div>
              <select
                className={`select select-bordered w-full text-center ${
                  !iva || String(iva) === 'false'
                    ? 'bg-green-200'
                    : 'bg-orange-200'
                }`}
                {...register('iva')}
                defaultValue={0}
              >
                <option value={'false'}>NO</option>
                <option value={'true'}>SI</option>
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
