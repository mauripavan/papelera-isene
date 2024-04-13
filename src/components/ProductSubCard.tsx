import { useRecoilValue } from 'recoil';
import { IProductItemProps } from './ProductCard';
import Image from 'next/image';
import { userState } from '@/store/app-state';
import { formatCurrency } from '@/utils/helpers';

export interface IProductSubCardProps {
  item: IProductItemProps;
  key: number;
}

export default function ProductSubCard(props: IProductSubCardProps) {
  const { item } = props;
  const user = useRecoilValue(userState);
  return (
    <div className='w-full h-50 border bg-white hover:bg-gray-50 hover:scale-105 transition duration-75 ease-in-out'>
      <Image
        src='/no-product-image.png'
        alt='Product'
        width={500}
        height={500}
        style={{ objectFit: 'contain' }}
      />
      <div className='p-2'>
        <p className='font-black text-gray-800 line-clamp-2'>
          {item.description.toUpperCase()}
        </p>
        <p className='font-regular text-gray-500 mb-2 text-xs'>
          Cantidad:{item.quantity}
        </p>
        <p className='font-regular text-gray-500 mb-2 text-xs'>
          Tipo:{!item.iva ? '1' : '2'}
        </p>
        <p className='font-semibold text-gray-800 text-xl mb-2'>
          {user?.papeleras
            ? formatCurrency(item.pp, true)
            : formatCurrency(item.pi, true)}
        </p>
        {item.stock ? (
          <p className='text-green-600 text-sm'>EN STOCK</p>
        ) : (
          <p className='text-red-600 text-sm'>SIN STOCK</p>
        )}
      </div>
    </div>
  );
}
