'use client';
import { getProducts, getProductsByStock } from '@/api';
import MainButton from '@/components/MainButton';
import Pagination from '@/components/Pagination';
import PriceModal from '@/components/PriceModal';
import ProductCard, { IProductItemProps } from '@/components/ProductCard';
import TableHeader from '@/components/TableHeader';
import SearchInput from '@/components/SearchInput';
import PlusIcon from '@/components/icons/Plus';
import { productsState } from '@/store/app-state';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { useRecoilState } from 'recoil';

export interface PaginationProps {
  page: number;
  pageSize: number;
  totalItems: number;
  totalPages: number;
}
export interface IProductsProps {
  data: Array<IProductItemProps>;
  pagination: PaginationProps;
}

export default function Home() {
  const [products, setProducts] = useRecoilState(productsState);
  const [modalVisible, setModalVisible] = useState(false);
  const [onlyNoStock, setOnlyNoStock] = useState(false);
  const [page, setPage] = useState(1);
  const router = useRouter();

  const fetchProducts = async () => {
    try {
      const response = await getProducts(page);
      const productsData = response.data;
      setProducts(productsData);
    } catch (error) {
      console.error('Error fetching data:', error);
    }
  };
  useEffect(() => {
    fetchProducts();
  }, [page]);

  const onProductUpdate = () => {
    setModalVisible(true);
  };

  const fetchProductsOutOfSotck = async () => {
    try {
      const response = await getProductsByStock(page);
      const productsData = response.data;
      setProducts(productsData);
    } catch (error) {
      console.error('Error fetching data:', error);
    }
  };

  const handleNoStockFilter = () => {
    setOnlyNoStock(!onlyNoStock);
    !onlyNoStock ? fetchProductsOutOfSotck() : fetchProducts();
  };

  const handlePageChange = (page: number) => {
    setPage(page);
  };

  return (
    <main className='flex min-h-screen flex-col'>
      <div className='flex items-center gap-32'>
        <div className='flex-none'>
          <p className='font-nunito font-bold text-2xl'>Lista de precios</p>
        </div>
        <div className='flex-grow'>
          <SearchInput />
        </div>
        <div className='flex-none'>
          <MainButton
            onClick={() => router.push('/addItem')}
            text={'Nuevo producto'}
            className='text-md bg-blue-500'
            icon={<PlusIcon className='fill-current text-white w-4 h-4' />}
          />
        </div>
      </div>
      <div className='my-2'>
        <MainButton
          text='Solo productos a reponer'
          className={`text-white text-xs ${
            onlyNoStock ? 'bg-red-400' : 'bg-red-200'
          } `}
          onClick={handleNoStockFilter}
        />
      </div>
      <div>
        <TableHeader />
      </div>

      {products?.data?.map((item, index) => {
        return (
          <ProductCard
            item={item}
            key={`product-${index}`}
            onUpdate={() => onProductUpdate()}
            modalVisible={modalVisible}
          />
        );
      })}
      {modalVisible && (
        <PriceModal
          onClose={() => setModalVisible(false)}
          noStock={onlyNoStock}
        />
      )}
      <Pagination
        totalCards={products?.pagination?.totalItems || 0}
        currentPage={page}
        cardsPerPage={20}
        paginate={handlePageChange}
      />
    </main>
  );
}
