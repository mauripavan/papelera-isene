'use client';
import { getProducts } from '@/api';
import MainButton from '@/components/MainButton';
import ProductCard, { IProductProps } from '@/components/ProductCard';
import TableHeader from '@/components/TableHeader';
import TextInput from '@/components/TextInput';
import PlusIcon from '@/components/icons/Plus';
import { useEffect, useState } from 'react';

export default function Home() {
  const [products, setProducts] = useState<Array<IProductProps>>([]);

  const fetchProducts = async () => {
    try {
      const response = await getProducts();
      const productsData = response.data;
      setProducts(productsData);
    } catch (error) {
      console.error('Error fetching data:', error);
    }
  };
  useEffect(() => {
    fetchProducts();
  }, []);

  return (
    <main className='flex min-h-screen flex-col'>
      <div className='flex items-center gap-32'>
        <div className='flex-none'>
          <p className='font-nunito font-bold text-2xl'>Lista de precios</p>
        </div>
        <div className='flex-grow'>
          <TextInput />
        </div>
        <div className='flex-none'>
          <MainButton
            text={'Nuevo producto'}
            className='text-md bg-blue-500'
            icon={<PlusIcon className='fill-current text-white w-4 h-4' />}
          />
        </div>
      </div>
      <div>
        <TableHeader />
      </div>

      {products.map((item, index) => {
        return <ProductCard item={item} key={`product-${index}`} />;
      })}
    </main>
  );
}
