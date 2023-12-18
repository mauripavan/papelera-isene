'use client';
import { getProducts } from '@/api';
import MainButton from '@/components/MainButton';
import PriceModal from '@/components/PriceModal';
import ProductCard, { IProductProps } from '@/components/ProductCard';
import TableHeader from '@/components/TableHeader';
import TextInput from '@/components/TextInput';
import PlusIcon from '@/components/icons/Plus';
import { productsState, selectedProductState } from '@/store/app-state';
import { useEffect, useState } from 'react';
import { useRecoilState } from 'recoil';

export default function Home() {
  const [products, setProducts] = useRecoilState<Array<IProductProps> | null>(
    productsState
  );
  const [modalVisible, setModalVisible] = useState(false);
  const [selectedProduct, setSelectedProduct] =
    useRecoilState(selectedProductState);

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

  const onProductUpdate = (item: IProductProps) => {
    setModalVisible(true);
    setSelectedProduct(item);
  };

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

      {products?.map((item, index) => {
        return (
          <ProductCard
            item={item}
            key={`product-${index}`}
            onUpdate={() => onProductUpdate(item)}
          />
        );
      })}
      {modalVisible && (
        <PriceModal
          product={selectedProduct}
          onClose={() => setModalVisible(false)}
        />
      )}
    </main>
  );
}
