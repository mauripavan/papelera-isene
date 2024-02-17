'use client';
import * as z from 'zod';
import { addProductForm } from '@/forms/addProduct';
import { zodResolver } from '@hookform/resolvers/zod';
import { useEffect, useState } from 'react';
import { useForm, SubmitHandler } from 'react-hook-form';
import TextInput, { InputType } from '@/components/TextInput';
import AddProductModal from '@/components/AddProductModal';
import { useRecoilValue } from 'recoil';
import { editProductsState } from '@/store/app-state';
import { deleteProduct, updateProduct } from '@/api';
import { DeleteProductModal } from '@/components/DeleteProductModal';
import { useRouter } from 'next/navigation';

export default function EditItem() {
  const editProduct = useRecoilValue(editProductsState);

  const router = useRouter();

  const [inStock, setInStock] = useState(editProduct?.stock);
  const [modalVisible, setModalVisible] = useState(false);
  const [deleteModalVisible, setDeleteModalVisible] = useState(false);
  const [addProductError, setAddProductError] = useState(false);
  const [loading, setLoading] = useState(false);
  const [itemDeleted, setItemDeleted] = useState(false);

  const AddProductFormSchema = addProductForm();
  type CreateForm = z.infer<typeof AddProductFormSchema>;
  const {
    register,
    handleSubmit,
    watch,
    setValue,
    reset,
    getValues,
    formState: { errors, isDirty },
  } = useForm<CreateForm>({
    mode: 'onChange',
    resolver: zodResolver(AddProductFormSchema),
    defaultValues: {
      cost: editProduct?.cost,
      description: editProduct?.description,
      earningPI: editProduct?.earningPI,
      earningPP: editProduct?.earningPP,
      PI: editProduct?.pi,
      PP: editProduct?.pp,
      quantity: editProduct?.quantity,
      stock: editProduct?.stock,
    },
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
      updateProduct({
        productId: Number(editProduct?.id) || 0,
        productData: body,
      }).then(res => {
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
    addProductError && reset();
  };

  const handleCloseDeleteModal = () => {
    setDeleteModalVisible(false);
  };

  const handleDeleteItem = (event: React.MouseEvent<HTMLButtonElement>) => {
    event.preventDefault();
    setDeleteModalVisible(true);
  };

  const handleConfirmDeletion = () => {
    try {
      deleteProduct(Number(editProduct?.id)).then(res => {
        if (res.status === 200) {
          setItemDeleted(true);
        } else {
          console.log(res);
        }
      });
    } catch (error) {
      console.error(error);
    }
  };

  const handleCloseAndBack = () => {
    setDeleteModalVisible(false);
    router.back();
  };

  useEffect(() => {
    console.log('isDirty', isDirty);
  }, [isDirty]);

  useEffect(() => {
    console.log(getValues());
  }, [getValues]);

  return (
    <>
      <div className='font-nunito'>
        <h1 className=' font-black'>EDITAR PRODUCTO</h1>
        <form className=''>
          <label className='form-control w-full grid grid-cols-6 gap-8'>
            <div className='col-span-4'>
              <TextInput
                type={InputType.text}
                placeholder='Descripción'
                label='Descripción'
                error={errors.description}
                registerOptions={{ ...register('description') }}
              />
            </div>

            <div className='col-span-2'>
              <TextInput
                type={InputType.number}
                placeholder='Cantidad'
                label='Cantidad'
                error={errors.quantity}
                registerOptions={{ ...register('quantity') }}
              />
            </div>

            <div className='col-span-2'>
              <TextInput
                type={InputType.number}
                placeholder='Costo'
                label='Costo'
                error={errors.cost}
                registerOptions={{ ...register('cost') }}
              />
            </div>

            <div className='col-span-2'>
              <TextInput
                type={InputType.number}
                placeholder='% Ganacias Isene'
                label='% Ganacias Isene'
                error={errors.earningPI}
                registerOptions={{ ...register('earningPI') }}
              />
            </div>

            <div className='col-span-2'>
              <TextInput
                type={InputType.number}
                placeholder='% Ganancias Papeleras'
                label='% Ganancias Papeleras'
                error={errors.earningPP}
                registerOptions={{ ...register('earningPP') }}
              />
            </div>

            <div className='col-span-2'>
              <TextInput
                type={InputType.number}
                placeholder='Precio Isene'
                label='Precio Isene'
                error={errors.PI}
                registerOptions={{ ...register('PI') }}
                disabled
              />
            </div>

            <div className='col-span-2'>
              <TextInput
                type={InputType.number}
                placeholder='Precio Papeleras'
                label='Precio Papeleras'
                error={errors.PP}
                registerOptions={{ ...register('PP') }}
                disabled
              />
            </div>

            <div className='col-span-2  font-bold'>
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
            <button
              className='btn btn-xs sm:btn-sm md:btn-md lg:btn-lg bg-red-400 text-white col-start-3'
              onClick={handleDeleteItem}
            >
              {loading ? (
                <span className='loading loading-dots loading-md'></span>
              ) : (
                <p>ELIMINAR PRODUCTO</p>
              )}
            </button>

            <button
              className='btn btn-xs sm:btn-sm md:btn-md lg:btn-lg bg-blue-400 text-white col-start-4'
              disabled={!isDirty}
              onClick={handleSubmit(onSubmit)}
            >
              {loading ? (
                <span className='loading loading-dots loading-md'></span>
              ) : (
                <p>EDITAR PRODUCTO</p>
              )}
            </button>
          </label>
        </form>
      </div>
      {modalVisible && (
        <AddProductModal
          onClose={handleCloseModal}
          error={addProductError}
          text='Producto editado correctamente'
        />
      )}

      {deleteModalVisible && (
        <DeleteProductModal
          onClose={handleCloseDeleteModal}
          onConfirm={handleConfirmDeletion}
          itemDeleted={itemDeleted}
          onCloseAndBack={handleCloseAndBack}
        />
      )}
    </>
  );
}
