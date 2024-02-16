'use client';
import { KeyboardEvent, useState } from 'react';
import Search from './icons/Search';
import { getProducts, searchProducts } from '@/api';
import { useRecoilState } from 'recoil';
import { productsState } from '@/store/app-state';
import CloseIcon from './icons/Close';

export default function SearchInput() {
  const [searchTerm, setSearchTerm] = useState('');
  const [, setProducts] = useRecoilState(productsState);

  const searchResults = async (query: string) => {
    try {
      const response = await searchProducts(query, 1);
      console.log('response ===>', response);

      const searchData = response.data;
      setProducts(searchData);
    } catch (error) {
      console.error('Error fetching data:', error);
    }
  };

  const fetchProducts = async () => {
    try {
      const response = await getProducts(1);
      const productsData = response.data;
      setProducts(productsData);
    } catch (error) {
      console.error('Error fetching data:', error);
    }
  };

  const handleKeyPress = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Enter') {
      searchResults(searchTerm);
    }
  };

  const handleClearInput = () => {
    setSearchTerm('');
    fetchProducts();
  };
  return (
    <div className='flex-1 py-2 w-full text-gray-400 group'>
      <div className='flex py-2 px-4 bg-white rounded-lg w-full relative gap-2 group-focus-within:border group-focus-within:border-purple-500 group-focus-within:text-gray-800'>
        <Search className='fill-current' />
        <input
          placeholder='Buscar por nombre de articulo'
          className='w-full bg-white font-nunito focus:outline-none'
          value={searchTerm}
          onChange={e => {
            setSearchTerm(e.target.value);
          }}
          onKeyDown={event => handleKeyPress(event)}
        />
        {searchTerm && (
          <button onClick={handleClearInput}>
            <CloseIcon className='fill-current' />
          </button>
        )}
      </div>
    </div>
  );
}
