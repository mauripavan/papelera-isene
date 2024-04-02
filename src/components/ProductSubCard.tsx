import { IProductItemProps } from './ProductCard';
import Image from 'next/image';

export interface IProductSubCardProps {
  item: IProductItemProps;
  key: number;
}

export default function ProductSubCard(props: IProductSubCardProps) {
  const { item } = props;
  return (
    <div className='w-full h-50 border bg-white '>
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
        <p className='font-semibold text-gray-800 text-xl mb-2'>${item.pi}</p>
        {item.stock ? (
          <p className='text-green-600 text-sm'>EN STOCK</p>
        ) : (
          <p className='text-red-600 text-sm'>SIN STOCK</p>
        )}
      </div>
    </div>
  );
}