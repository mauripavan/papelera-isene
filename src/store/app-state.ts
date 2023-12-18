import { IProductProps } from '@/components/ProductCard';
import { atom } from 'recoil';

export const selectedProductState = atom<IProductProps>({
  key: 'SelectedProductState',
  default: {
    id: '',
    description: '',
    cost: 0,
    earningPI: 0,
    earningPP: 0,
    iva: false,
    stock: false,
    pi: 0,
    pp: 0,
    quantity: 0,
    updatedDate: '',
  },
});

export const productsState = atom<Array<IProductProps> | null>({
  key: 'ProductsState',
  default: [],
});
