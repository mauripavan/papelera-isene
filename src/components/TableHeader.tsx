'use client';

import { productsState, selectedProductState } from '@/store/app-state';
import { useState } from 'react';
import { useRecoilState, useRecoilValue } from 'recoil';
import MainButton from './MainButton';

export default function TableHeader() {
  const [selected, setSelected] = useState(false);

  const [, setSelectedProduct] = useRecoilState(selectedProductState);
  const products = useRecoilValue(productsState);

  const handleSelectAll = () => {
    setSelected(prevSelected => !prevSelected);
    if (selected) {
      setSelectedProduct([]);
    } else {
      setSelectedProduct(products?.data || []);
    }
  };
  return (
    <div className='grid grid-cols-24 gap-4 w-full px-2 sticky top-0 items-center bg-gray-10'>
      <p className='font-nunito font-medium text-sm col-span-5'>Descripcion</p>
      <p className='font-nunito font-medium text-sm col-span-2'>Cant</p>
      <p className='font-nunito font-medium text-sm col-span-2'>PI</p>
      <p className='font-nunito font-medium text-sm col-span-2'>PI+IVA</p>
      <p className='font-nunito font-medium text-sm col-span-2'>PP</p>
      <p className='font-nunito font-medium text-sm col-span-2'>PP+IVA</p>
      <p className='font-nunito font-medium text-sm col-span-1'>IVA</p>
      <p className='font-nunito font-medium text-sm col-span-1'>Stock</p>
      <p className='font-nunito font-medium text-sm col-span-3'>Fecha</p>
      <div className='col-span-1'>
        <div className='form-control'>
          <label className='label cursor-pointer'>
            <input
              type='checkbox'
              className='checkbox checkbox-sm'
              onClick={handleSelectAll}
              checked={selected}
            />
          </label>
        </div>
      </div>
      <p className='font-nunito font-medium text-sm col-span-1'></p>
    </div>
  );
}
