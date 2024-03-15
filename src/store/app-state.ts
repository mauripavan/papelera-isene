import { IProductsProps } from '@/app/home/page';
import { IProductItemProps } from '@/components/ProductCard';
import { atom } from 'recoil';

export const selectedProductState = atom<Array<IProductItemProps>>({
  key: 'SelectedProductState',
  default: undefined,
});

export const productsState = atom<IProductsProps | null>({
  key: 'ProductsState',
  default: null,
});

export const editProductsState = atom<IProductItemProps | null>({
  key: 'EditProductsState',
  default: null,
});
