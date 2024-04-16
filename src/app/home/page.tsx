'use client';
import { getProducts } from '@/api';
import Pagination from '@/components/Pagination';
import { IProductItemProps } from '@/components/ProductCard';
import SearchInput from '@/components/SearchInput';
import { productsState } from '@/store/app-state';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { useRecoilState } from 'recoil';
import Lottie from 'react-lottie';
import LoadingLottie from '../../components/lottie/loading-lottie.json';
import Navbar from '@/components/Navbar';
import ProductSubCard from '@/components/ProductSubCard';
import useGlobalUserState from '@/hooks/useGlobalUserState';
import Footer from '@/components/Footer';

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
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(1);
  const router = useRouter();
  const { user, loadingSession } = useGlobalUserState();

  // Redirect if user does not exists
  useEffect(() => {
    if (!user?.username) {
      router.push('/');
    }
  }, [user]);

  const defaultOptions = {
    loop: true,
    autoplay: true,
    animationData: LoadingLottie,
    rendererSettings: {
      preserveAspectRatio: 'xMidYMid slice',
    },
  };

  const fetchProducts = async () => {
    setLoading(true);
    try {
      const response = await getProducts(page);
      const productsData = response.data;
      setProducts(productsData);
      setLoading(false);
    } catch (error) {
      console.error('Error fetching data:', error);
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProducts();
  }, [page]);

  const handlePageChange = (page: number) => {
    setPage(page);
  };

  if (loadingSession) {
    return (
      <div className='flex justify-center items-center font-nunito font-bold text-xl min-h-screen'>
        <p>Cargando...</p>
      </div>
    );
  }

  return (
    <>
      <main className='flex min-h-screen flex-col font-nunito'>
        <Navbar />
        <div className='flex items-center justify-center w-full '>
          <div className='w-full md:w-3/4 lg:w-1/2 mb-4'>
            <SearchInput />
          </div>
        </div>
        {loading ? (
          <div className='flex flex-1 justify-center items-center'>
            <Lottie options={defaultOptions} height={200} width={200} />
          </div>
        ) : !products?.data[0] ? (
          <div className='flex flex-1 justify-center items-center'>
            <p className='text-2xl font-bold'>No hay productos para mostrar</p>
          </div>
        ) : (
          <div className='grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-4'>
            {products?.data?.map((item, index) => {
              return <ProductSubCard item={item} key={index} />;
            })}
          </div>
        )}

        <Pagination
          totalCards={products?.pagination?.totalItems || 0}
          currentPage={page}
          cardsPerPage={50}
          paginate={handlePageChange}
        />
      </main>
      <Footer />
    </>
  );
}
