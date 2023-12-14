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
