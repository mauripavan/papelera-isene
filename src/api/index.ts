import { IProductsProps } from '@/app/page';
import { IProductItemProps } from '@/components/ProductCard';
import axios, { AxiosResponse } from 'axios';

let apiUrl;

if (process.env.NODE_ENV === 'production') {
  apiUrl = process.env.NEXT_PUBLIC_API_URL;
} else {
  apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080';
}

export const api = axios.create({
  baseURL: `${apiUrl}/api`,
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

export const createProduct = async ({
  productData,
}: {
  productData: {
    description: string;
    cost: number;
    pi: number;
    pp: number;
    stock: boolean;
    updatedDate: string;
    earningPI: number;
    earningPP: number;
    quantity: number;
    iva: boolean;
  };
}): Promise<AxiosResponse<IProductsProps>> => {
  try {
    const response = await api.post(`/products`, productData);
    return response;
  } catch (error) {
    throw error;
  }
};

export const updateProduct = async ({
  productId,
  productData,
}: {
  productId: number;
  productData: {
    description: string;
    cost: number;
    pi: number;
    pp: number;
    stock: boolean;
    updatedDate: string;
    earningPI: number;
    earningPP: number;
    quantity: number;
    iva: boolean;
  };
}): Promise<AxiosResponse<IProductsProps>> => {
  try {
    const response = await api.put(
      `/products/update/${productId}`,
      productData
    );
    return response;
  } catch (error) {
    console.log(error);
    throw error;
  }
};

export const deleteProduct = async (
  id: number
): Promise<AxiosResponse<IProductsProps>> => {
  try {
    const response = await api.delete(`/products/${id}`);
    return response;
  } catch (error) {
    console.log(error);
    throw error;
  }
};
