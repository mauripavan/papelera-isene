import { IProductProps } from '@/components/ProductCard';
import { atom } from 'recoil';

export const selectedProductState = atom<Array<IProductProps>>({
  key: 'SelectedProductState',
  default: undefined,
});

export const productsState = atom<Array<IProductProps> | null>({
  key: 'ProductsState',
  default: [],
});
