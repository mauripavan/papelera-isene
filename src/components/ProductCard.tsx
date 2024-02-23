'use client';
import { useEffect, useState } from 'react';
import ArrowDownIcon from './icons/ArrowDown';
import MainButton from './MainButton';
import { formatCurrency } from '@/utils/helpers';
import { useRecoilState } from 'recoil';
import { editProductsState, selectedProductState } from '@/store/app-state';
import { useRouter } from 'next/navigation';
import EditIcon from './icons/Edit';

export interface IProductItemProps {
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
  item: IProductItemProps;
  onUpdate?: () => void;
  modalVisible: boolean;
  onStockUpdate: (stock: boolean, id: string) => void;
}

export default function ProductCard(props: IProductCardProps) {
  const { item, onUpdate, modalVisible, onStockUpdate } = props;
  const [inStock, setInStock] = useState(false);
  const [selected, setSelected] = useState(false);
  const [selectedProducts, setSelectedProduct] =
    useRecoilState(selectedProductState);
  const [, setEditProduct] = useRecoilState(editProductsState);

  const router = useRouter();

  useEffect(() => {
    setInStock(item.stock);
    setSelected(false);
  }, [item, modalVisible]);

  const handleStockUpdate = async (stock: boolean, id: string) => {
    setInStock(stock);
    onStockUpdate(stock, id);
  };

  const handleItemSelection = () => {
    setSelected(prevSelected => !prevSelected);
    setSelectedProduct(prevSelectedProducts => {
      if (selected) {
        return prevSelectedProducts?.filter(product => product.id !== item.id);
      } else {
        return prevSelectedProducts ? [...prevSelectedProducts, item] : [item];
      }
    });
  };

  const handleEditClick = () => {
    setEditProduct(item);
    router.push(`/edit/${item.id}`);
  };

  useEffect(() => {
    const isSelected = selectedProducts?.find(
      product => product.id === item.id
    );
    setSelected(!!isSelected);
  }, [selectedProducts]);

  return (
    <div className='grid grid-cols-24 gap-4 w-full items-center p-4 bg-white rounded-md border border-gray-0 mb-2'>
      <p className='font-nunito font-medium text-sm col-span-2 text-blue-500'>
        {item.id}
      </p>
      <p className='font-nunito font-medium text-lg col-span-8'>
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
                onClick={() => handleStockUpdate(true, item.id)}
                className='font-nunito text-xs text-green-700 text-medium whitespace-nowrap'
              >
                EN STOCK
              </a>
            </li>
            <li>
              <a
                onClick={() => handleStockUpdate(false, item.id)}
                className='font-nunito text-xs text-red-700 text-medium whitespace-nowrap'
              >
                REPONER
              </a>
            </li>
          </ul>
        </div>
      </div>
      <div className='col-span-1'>
        <div className='form-control'>
          <label className='label cursor-pointer'>
            <input
              type='checkbox'
              checked={selected}
              className='checkbox checkbox-sm'
              onClick={handleItemSelection}
            />
          </label>
        </div>
      </div>
      <div className='col-span-2'>
        <MainButton
          text={'ACTUALIZAR'}
          className={`text-xs ${!selected ? 'bg-purple-200' : 'bg-purple-400'}`}
          onClick={onUpdate}
          disabled={!selected}
        />
      </div>

      <div className='col-span-1'>
        <button onClick={handleEditClick}>
          <EditIcon className='fill-current text-orange-900' />
        </button>
      </div>
    </div>
  );
}
