import { IProductsProps } from '@/app/page';
import { IProductItemProps } from '@/components/ProductCard';
import axios, { AxiosResponse } from 'axios';

export const api = axios.create({
  baseURL: 'http://localhost:8080/api/',
});

export const getProducts = async (
  page: number
): Promise<AxiosResponse<IProductsProps>> => {
  try {
    const response = await api.get(`/products?page=${page}&pageSize=20`);
    return response;
  } catch (error) {
    throw error;
  }
};

export const updateProductPrice = async (
  itemData: IProductItemProps[]
): Promise<AxiosResponse> => {
  try {
    const response = await api.put(`products/increment`, itemData);
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

export const searchProducts = async (
  query: string,
  page: number
): Promise<AxiosResponse<IProductsProps>> => {
  try {
    const response = await api.get(
      `products/search?page=${page}&pageSize=100`,
      {
        params: {
          query,
        },
      }
    );
    return response;
  } catch (error) {
    throw error;
  }
};

export const getProductsByStock = async (
  page: number
): Promise<AxiosResponse<IProductsProps>> => {
  try {
    const response = await api.get(`products/stock?page=${page}&pageSize=20`);
    return response;
  } catch (error) {
    throw error;
  }
};
