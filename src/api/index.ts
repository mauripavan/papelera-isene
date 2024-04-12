import { IProductsProps } from '@/app/home/page';
import { IUserProps } from '@/app/page';
import { IProductItemProps } from '@/components/ProductCard';
import axios, { AxiosResponse } from 'axios';

export const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL
    ? `${process.env.NEXT_PUBLIC_API_URL}/api`
    : 'http://localhost:8080/api/',
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
    piIva: number;
    ppIva: number;
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
    piIva: number;
    ppIva: number;
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

export const createUser = async ({
  user,
}: {
  user: IUserProps;
}): Promise<AxiosResponse<IUserProps>> => {
  try {
    const response = await api.post(`/users`, user);
    return response;
  } catch (error: any) {
    if (error.response && error.response.status === 400) {
      const errorMessage = error.response.data.error;
      throw new Error(errorMessage);
    } else {
      throw error;
    }
  }
};

export const login = async ({
  user,
}: {
  user: { email: string; password: string };
}) => {
  try {
    const response = await api.post('/users/login', user);
    return response;
  } catch (error) {
    console.log(error);
    throw error;
  }
};

export const checkSession = async () => {
  try {
    const token = localStorage.getItem('token');
    if (token) {
      const response = await api.get('/users/session', {
        headers: {
          Authorization: `Bearer ${token}`,
        },
        withCredentials: true, // Include cookies in the request
      });
      if (response.status === 200 && response.data.user) {
        console.log('response.data.user', response.data.user);

        return response.data.user;
      } else {
        throw new Error('Failed to fetch user information');
      }
    }
  } catch (error) {
    console.error('Error fetching user information:', error);
    throw error;
  }
};
