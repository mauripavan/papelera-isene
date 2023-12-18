'use client';
import { formatCurrency } from '@/utils/helpers';
import MainButton from './MainButton';
import { IProductProps } from './ProductCard';
import { useState } from 'react';
import { getProducts, updateProductPrice } from '@/api';
import { useRecoilState } from 'recoil';
import { productsState } from '@/store/app-state';

export interface IPriceModalProps {
  onClose: () => void;
  product: IProductProps;
}

export default function PriceModal(props: IPriceModalProps) {
  const { onClose, product } = props;
  const [cost, setCost] = useState(product.cost);
  const [pp, setPP] = useState(product.pp);
  const [pi, setPI] = useState(product.pi);
  const [modified, setModified] = useState(false);
  const [increment, setIncrement] = useState<number | undefined>(undefined);
  const [, setProducts] = useRecoilState<Array<IProductProps> | null>(
    productsState
  );

  const handleIncrement = () => {
    setCost(Number((cost * increment!) / 100 + cost));
    setPI(Number((pi * increment!) / 100 + pi));
    setPP(Number((pp * increment!) / 100 + pp));
    setModified(true);
  };

  const fetchProducts = async () => {
    try {
      const response = await getProducts();
      const productsData = response.data;
      setProducts(productsData);
    } catch (error) {
      console.error('Error fetching data:', error);
    }
  };

  const updateProduct = async () => {
    const data = {
      cost,
      pi,
      pp,
    };
    try {
      await updateProductPrice(Number(product.id), data);
    } catch (error) {
      console.error('Error updating data:', error);
    }
  };

  const handleSave = () => {
    updateProduct().then(fetchProducts).then(onClose);
  };

  return (
    <div className='flex items-center justify-center fixed inset-0 bg-black bg-opacity-50 '>
      <div className='flex bg-white p-8 w-1/3 h-auto rounded-md '>
        <div className='flex-col flex w-full items-center justify-center'>
          <p className='font-nunito text-3xl mb-8'>Actualizador de precios:</p>
          <p className='font-nunito text-xl mb-4'>
            {`${product.description} x${product.quantity}`}
          </p>
          <div className='flex gap-4 mb-4'>
            <div className='flex gap-1'>
              <p className='font-nunito'>Costo:</p>
              <p className='font-nunito font-bold'>
                {formatCurrency(cost, true)}
              </p>
            </div>

            <div className='flex gap-1'>
              <p className='font-nunito'>PI:</p>
              <p className='font-nunito font-bold'>
                {formatCurrency(pi, true)}
              </p>
            </div>
            <div className='flex  gap-1'>
              <p className='font-nunito'>PP:</p>
              <p className='font-nunito font-bold'>
                {formatCurrency(pp, true)}
              </p>
            </div>
          </div>
          <div className='flex mb-4 items-center'>
            <p className='font-nunito w-28'>Incremento</p>
            <div className='flex rounded-md font-nunito focus:outline-none border border-black py-1 px-2 gap-1 w-28'>
              <p>%</p>
              <input
                className='focus:outline-none w-16 flex text-center font-bold'
                value={increment}
                onChange={value => setIncrement(Number(value.target.value))}
                onFocus={() => setIncrement(undefined)}
              />
            </div>
            <button
              className='ml-8'
              onClick={handleIncrement}
              disabled={!increment}
            >
              <p
                className={`font-nunito text-sm ${
                  !increment ? 'text-gray-300' : 'text-blue-500'
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
              onClick={onClose}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
