import { IProductsProps } from '@/app/page';
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
