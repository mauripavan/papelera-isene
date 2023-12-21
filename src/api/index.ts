import { IProductProps } from '@/components/ProductCard';
import axios, { AxiosResponse } from 'axios';

export const api = axios.create({
  baseURL: 'http://localhost:8080/api/',
});

export const getProducts = async (): Promise<
  AxiosResponse<Array<IProductProps>>
> => {
  try {
    const response = await api.get('/products');
    return response;
  } catch (error) {
    throw error;
  }
};

interface IncrementData {
  cost: number;
  pi: number;
  pp: number;
}

export const updateProductPrice = async (
  id: number,
  incrementData: IncrementData
): Promise<AxiosResponse> => {
  try {
    const response = await api.put(`products/increment/${id}`, incrementData);
    return response;
  } catch (error) {
    throw error;
  }
};

export const updateStock = async (
  id: number,
  stock: {
    stock: boolean;
  }
): Promise<AxiosResponse> => {
  try {
    const response = await api.put(`products/stock/${id}`, stock);
    return response;
  } catch (error) {
    throw error;
  }
};

interface ISearchResults {
  matchedProducts: IProductProps[];
}

export const searchProducts = async (
  query: string
): Promise<AxiosResponse<ISearchResults>> => {
  try {
    const response = await api.get(`products/search`, {
      params: {
        query,
      },
    });
    return response;
  } catch (error) {
    throw error;
  }
};

export const getProductsByStock = async (): Promise<
  AxiosResponse<Array<IProductProps>>
> => {
  try {
    const response = await api.get('products/stock');
    return response;
  } catch (error) {
    throw error;
  }
};
