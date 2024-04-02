'use client';
import { getProducts, getProductsByStock, updateStock } from '@/api';
import MainButton from '@/components/MainButton';
import Pagination from '@/components/Pagination';
import PriceModal from '@/components/PriceModal';
import ProductCard, { IProductItemProps } from '@/components/ProductCard';
import TableHeader from '@/components/TableHeader';
import SearchInput from '@/components/SearchInput';
import PlusIcon from '@/components/icons/Plus';
import { productsState, userState } from '@/store/app-state';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { useRecoilState } from 'recoil';
import Lottie from 'react-lottie';
import LoadingLottie from '../../components/lottie/loading-lottie.json';
import { getSession } from '@/auth';
import Navbar from '@/components/Navbar';
import ProductSubCard from '@/components/ProductSubCard';

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
  const [loadingSession, setLoadingSession] = useState(true);
  const [modalVisible, setModalVisible] = useState(false);
  const [onlyNoStock, setOnlyNoStock] = useState(false);
  const [page, setPage] = useState(1);
  const [, setUser] = useRecoilState(userState);
  const router = useRouter();

  useEffect(() => {
    getSession()
      .then(res => {
        if (res !== null) {
          setUser({
            email: res.user.email,
            username: res.user.username,
            admin: res.user.admin,
          });
        } else {
          router.replace('/');
        }
      })
      .finally(() => setLoadingSession(false));
  }, []);

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

  const handleStockUpdate = async (stock: boolean, id: string) => {
    const data = {
      stock,
    };
    try {
      await updateStock(Number(id), data);
    } catch (error) {
      console.error('Error updating data:', error);
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

  if (loadingSession) {
    return (
      <div className='flex justify-center items-center font-nunito font-bold text-xl min-h-screen'>
        <p>Cargando...</p>
      </div>
    );
  }

  return (
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

      {modalVisible && (
        <PriceModal
          onClose={() => setModalVisible(false)}
          noStock={onlyNoStock}
        />
      )}
      {!modalVisible && (
        <Pagination
          totalCards={products?.pagination?.totalItems || 0}
          currentPage={page}
          cardsPerPage={20}
          paginate={handlePageChange}
        />
      )}
    </main>
  );
}
