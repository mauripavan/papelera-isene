'use client';
import { useState } from 'react';
import ArrowDownIcon from './icons/ArrowDown';
import MainButton from './MainButton';
import { formatCurrency } from '@/utils/helpers';

interface IProductCardProps {
  code: string;
  description: string;
  cost: number;
  pi: number;
  pp: number;
  stock: boolean;
  updatedDate: string;
}

export default function ProductCard(props: IProductCardProps) {
  const { code, cost, description, pi, pp, stock, updatedDate } = props;
  const [inStock, setInStock] = useState(stock);
  const [selected, setSelected] = useState(false);

  return (
    <div className='grid grid-cols-24 gap-4 w-full items-center p-4 bg-white rounded-md border border-gray-0'>
      <p className='font-nunito font-medium text-sm col-span-2 text-blue-500'>
        {code}
      </p>
      <p className='font-nunito font-medium text-lg col-span-9'>
        {description}
      </p>
      <p className='font-nunito font-medium text-sm col-span-2'>
        {formatCurrency(cost, false)}
      </p>
      <p className='font-nunito font-medium text-sm col-span-2'>
        {formatCurrency(pi, true)}
      </p>
      <p className='font-nunito font-medium text-sm col-span-2'>
        {formatCurrency(pp, true)}
      </p>
      <div className='col-span-2'>
        <div className='col-span-2 dropdown dropdown-bottom dropdown-end'>
          <div
            tabIndex={0}
            role='button'
            className={`font-nunito font-medium px-2 text-xs flex items-center ${
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
                onClick={() => setInStock(true)}
                className='font-nunito text-xs text-green-700 text-medium whitespace-nowrap'
              >
                EN STOCK
              </a>
            </li>
            <li>
              <a
                onClick={() => setInStock(false)}
                className='font-nunito text-xs text-red-700 text-medium whitespace-nowrap'
              >
                REPONER
              </a>
            </li>
          </ul>
        </div>
      </div>
      <p className='font-nunito font-medium text-sm col-span-2'>
        {updatedDate}
      </p>
      <div className='col-span-1'>
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
      </div>
      <div className='col-span-2'>
        <MainButton
          text={'ACTUALIZAR'}
          color='bg-purple-400'
          disabled={!selected}
        />
      </div>
    </div>
  );
}
