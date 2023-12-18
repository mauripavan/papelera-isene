'use client';
import { useState } from 'react';
import ArrowDownIcon from './icons/ArrowDown';
import MainButton from './MainButton';
import { formatCurrency } from '@/utils/helpers';
import { updateStock } from '@/api';

export interface IProductProps {
  id: string;
  description: string;
  cost: number;
  pi: number;
  pp: number;
  stock: boolean;
  updatedDate: string;
  earningPI: number;
  earningPP: number;
  quantity: number;
  iva: boolean;
}

export interface IProductCardProps {
  item: IProductProps;
  onUpdate?: () => void;
}

export default function ProductCard(props: IProductCardProps) {
  const { item, onUpdate } = props;
  const [inStock, setInStock] = useState(item.stock);

  const handleStockUpdate = async (stock: boolean) => {
    setInStock(stock);
    const data = {
      stock,
    };
    try {
      await updateStock(Number(item.id), data);
    } catch (error) {
      console.error('Error updating data:', error);
    }
  };

  return (
    <div className='grid grid-cols-24 gap-4 w-full items-center p-4 bg-white rounded-md border border-gray-0 mb-2'>
      <p className='font-nunito font-medium text-sm col-span-2 text-blue-500'>
        {item.id}
      </p>
      <p className='font-nunito font-medium text-lg col-span-10'>
        {item.description}
      </p>
      <p className='font-nunito font-medium text-sm col-span-2'>
        {item.quantity}
      </p>
      <p className='font-nunito font-medium text-sm col-span-2'>
        {formatCurrency(item.cost, false)}
      </p>
      <p className='font-nunito font-medium text-sm col-span-2'>
        {formatCurrency(item.pi, true)}
      </p>
      <p className='font-nunito font-medium text-sm col-span-2'>
        {formatCurrency(item.pp, true)}
      </p>
      <div className='col-span-2'>
        <div className='dropdown dropdown-bottom dropdown-end w-full'>
          <div
            tabIndex={0}
            role='button'
            className={`font-nunito font-medium px-2 text-xs flex items-center justify-center ${
              inStock ? 'bg-green-400' : 'bg-red-400'
            } py-1 rounded-md text-white`}
          >
            {inStock ? 'STOCK' : 'REPONER'}
            <ArrowDownIcon className='fill-current text-white' />
          </div>
          <ul
            tabIndex={0}
            className='dropdown-content z-[1] menu shadow bg-base-100 rounded-box'
          >
            <li>
              <a
                onClick={() => handleStockUpdate(true)}
                className='font-nunito text-xs text-green-700 text-medium whitespace-nowrap'
              >
                EN STOCK
              </a>
            </li>
            <li>
              <a
                onClick={() => handleStockUpdate(false)}
                className='font-nunito text-xs text-red-700 text-medium whitespace-nowrap'
              >
                REPONER
              </a>
            </li>
          </ul>
        </div>
      </div>
      {/* <div className='col-span-1'>
        <div className='form-control'>
          <label className='label cursor-pointer'>
            <input
              type='checkbox'
              checked={selected}
              className='checkbox checkbox-sm'
              onClick={() => setSelected(!selected)}
            />
          </label>
        </div>
      </div> */}
      <div className='col-span-2'>
        <MainButton
          text={'ACTUALIZAR'}
          className={`text-xs bg-purple-400`}
          onClick={onUpdate}
        />
      </div>
    </div>
  );
}
