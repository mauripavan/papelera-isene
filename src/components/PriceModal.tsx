'use client';
import { formatCurrency } from '@/utils/helpers';
import MainButton from './MainButton';
import { useEffect, useState } from 'react';
import { getProducts, getProductsByStock, updateProductPrice } from '@/api';
import { useRecoilState } from 'recoil';
import { productsState, selectedProductState } from '@/store/app-state';
import TextInput, { InputType } from './TextInput';
import { z } from 'zod';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { updatePriceForm } from '@/forms/updatePrice';

export interface IPriceModalProps {
  onClose: () => void;
  noStock: boolean;
}
export default function PriceModal(props: IPriceModalProps) {
  const { onClose, noStock } = props;
  const [modified, setModified] = useState(false);
  const [, setProducts] = useRecoilState(productsState);
  const [selectedProducts, setSelectedProduct] =
    useRecoilState(selectedProductState);

  const UpdtaePriceFormSchema = updatePriceForm();

  type CreateForm = z.infer<typeof UpdtaePriceFormSchema>;
  const {
    register,
    getValues,
    setFocus,
    formState: { isDirty, isValid },
  } = useForm<CreateForm>({
    mode: 'onTouched',
    resolver: zodResolver(UpdtaePriceFormSchema),
    defaultValues: {
      increment: '' || 0,
    },
  });

  const handleIncrement = () => {
    const updatedProducts = selectedProducts.map(item => {
      const { cost, pi, pp, ...rest } = item;
      return {
        cost: Number((item.cost * getValues('increment')) / 100 + item.cost),
        pi: Number((item.pi * getValues('increment')) / 100 + item.pi),
        pp: Number((item.pp * getValues('increment')) / 100 + item.pp),
        ...rest,
      };
    });
    setSelectedProduct(updatedProducts);
    setModified(true);
  };

  const fetchProducts = async () => {
    try {
      const response = await getProducts(1);
      const productsData = response.data;
      setProducts(productsData);
    } catch (error) {
      console.error('Error fetching data:', error);
    }
  };

  const fetchProductsOutOfSotck = async () => {
    try {
      const response = await getProductsByStock(1);
      const productsData = response.data;
      setProducts(productsData);
    } catch (error) {
      console.error('Error fetching data:', error);
    }
  };

  const updateProduct = async () => {
    try {
      await updateProductPrice(selectedProducts);
    } catch (error) {
      console.error('Error updating data:', error);
    }
  };

  const handleSave = () => {
    updateProduct()
      .then(() => {
        !noStock ? fetchProducts() : fetchProductsOutOfSotck();
      })
      .then(onClose)
      .then(() => setSelectedProduct([]));
  };

  const handleClose = () => {
    setSelectedProduct([]);
    onClose();
  };

  useEffect(() => {
    setFocus('increment', { shouldSelect: true });
  }, [setFocus]);

  return (
    <div className='flex items-center justify-center fixed inset-0 bg-black bg-opacity-50 font-nunito '>
      <div className='flex bg-white p-8 w-auto h-auto rounded-md '>
        <div className='flex-col flex w-full items-center justify-center'>
          <p className='font-nunito text-3xl mb-8'>Actualizador de precios:</p>
          {selectedProducts.map((item, index) => {
            return (
              <div
                className='flex items-center gap-12 w-full'
                key={`si-${index}`}
              >
                <div className='flex-grow w-full'>
                  <p className='font-nunito text-md mb-4'>
                    {`${item.description} x${item.quantity}`}
                  </p>
                </div>
                <div className='flex gap-4 mb-4 w-full'>
                  <div className='flex gap-1'>
                    <p className='font-nunito'>Costo:</p>
                    <p className='font-nunito font-bold'>
                      {formatCurrency(item.cost, true)}
                    </p>
                  </div>

                  <div className='flex gap-1'>
                    <p className='font-nunito'>PI:</p>
                    <p className='font-nunito font-bold'>
                      {formatCurrency(item.pi, true)}
                    </p>
                  </div>
                  <div className='flex  gap-1'>
                    <p className='font-nunito'>PP:</p>
                    <p className='font-nunito font-bold'>
                      {formatCurrency(item.pp, true)}
                    </p>
                  </div>
                </div>
              </div>
            );
          })}
          <div className='flex mb-4 items-center'>
            <p className='font-nunito w-28 text-center'>Incremento %</p>
            <TextInput
              type={InputType.number}
              style={`w-28 text-center ${
                !isDirty || !isValid ? 'text-gray-200' : null
              }`}
              registerOptions={{ ...register('increment') }}
            />
            <button
              className='ml-8'
              onClick={handleIncrement}
              disabled={!isDirty || !isValid}
            >
              <p
                className={`font-nunito text-sm ${
                  !isDirty || !isValid ? 'text-gray-300' : 'text-blue-500'
                }`}
              >
                Aplicar
              </p>
            </button>
          </div>
          <div className='flex gap-4'>
            <MainButton
              text={'Guardar'}
              className={`${
                !modified ? 'bg-purple-200' : 'bg-purple-500'
              } text-white  w-28 justify-center`}
              onClick={handleSave}
              disabled={!modified}
            />
            <MainButton
              text={'Cancelar'}
              className='text-white bg-red-500 w-28 justify-center'
              onClick={handleClose}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
