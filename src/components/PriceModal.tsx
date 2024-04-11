'use client';
import { formatCurrency } from '@/utils/helpers';
import MainButton from './MainButton';
import { useEffect, useState } from 'react';
import { getProducts, getProductsByStock, updateProductPrice } from '@/api';
import { useRecoilState } from 'recoil';
import { productsState, selectedProductState } from '@/store/app-state';
import TextInput, { InputType } from './TextInput';
import { z } from 'zod';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { updatePriceForm } from '@/forms/updatePrice';

export interface IPriceModalProps {
  onClose: () => void;
  noStock: boolean;
}
export default function PriceModal(props: IPriceModalProps) {
  const { onClose, noStock } = props;
  const [modified, setModified] = useState(false);
  const [, setProducts] = useRecoilState(productsState);
  const [selectedProducts, setSelectedProduct] =
    useRecoilState(selectedProductState);

  const UpdtaePriceFormSchema = updatePriceForm();

  type CreateForm = z.infer<typeof UpdtaePriceFormSchema>;
  const {
    register,
    getValues,
    setFocus,
    formState: { isDirty, isValid },
  } = useForm<CreateForm>({
    mode: 'onTouched',
    resolver: zodResolver(UpdtaePriceFormSchema),
    defaultValues: {
      increment: '' || 0,
    },
  });

  const handleIncrement = () => {
    const updatedProducts = selectedProducts.map(item => {
      const date = new Date().toDateString();
      console.log('date', date);
      const { cost, pi, pp, updatedDate, ...rest } = item;
      return {
        cost: Number((item.cost * getValues('increment')) / 100 + item.cost),
        pi: Number((item.pi * getValues('increment')) / 100 + item.pi),
        pp: Number((item.pp * getValues('increment')) / 100 + item.pp),
        updatedDate: new Date().toDateString(),
        ...rest,
      };
    });
    setSelectedProduct(updatedProducts);
    setModified(true);
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

  const fetchProductsOutOfSotck = async () => {
    try {
      const response = await getProductsByStock(1);
      const productsData = response.data;
      setProducts(productsData);
    } catch (error) {
      console.error('Error fetching data:', error);
    }
  };

  const updateProduct = async () => {
    try {
      await updateProductPrice(selectedProducts);
    } catch (error) {
      console.error('Error updating data:', error);
    }
  };

  const handleSave = () => {
    updateProduct()
      .then(() => {
        !noStock ? fetchProducts() : fetchProductsOutOfSotck();
      })
      .then(onClose)
      .then(() => setSelectedProduct([]));
  };

  const handleClose = () => {
    setSelectedProduct([]);
    onClose();
  };

  useEffect(() => {
    setFocus('increment', { shouldSelect: true });
  }, [setFocus]);

  return (
    <div className='flex items-center justify-center fixed inset-0 bg-black bg-opacity-50 font-nunito '>
      <div className='flex bg-white p-8 w-auto max-h-3/4 rounded-md '>
        <div className='flex-col flex w-full items-center justify-center'>
          <p className='font-nunito text-3xl mb-8'>Actualizador de precios:</p>
          <div className='overflow-y-auto'>
            {selectedProducts.map((item, index) => {
              return (
                <div
                  className='flex items-center gap-12 w-full'
                  key={`si-${index}`}
                >
                  <div className='flex-grow w-full'>
                    <p className='font-nunito text-md mb-4'>
                      {`${item.description} x${item.quantity}`}
                    </p>
                  </div>
                  <div className='flex gap-4 mb-4 w-full'>
                    <div className='flex gap-1'>
                      <p className='font-nunito'>Costo:</p>
                      <p className='font-nunito font-bold'>
                        {formatCurrency(item.cost, true)}
                      </p>
                    </div>

                    <div className='flex gap-1'>
                      <p className='font-nunito'>PI:</p>
                      <p className='font-nunito font-bold'>
                        {formatCurrency(item.pi, true)}
                      </p>
                    </div>
                    <div className='flex  gap-1'>
                      <p className='font-nunito'>PP:</p>
                      <p className='font-nunito font-bold'>
                        {formatCurrency(item.pp, true)}
                      </p>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
          <div className='flex mb-4 items-center'>
            <p className='font-nunito w-28 text-center'>Incremento %</p>
            <TextInput
              type={InputType.number}
              style={`w-28 text-center ${
                !isDirty || !isValid ? 'text-gray-200' : null
              }`}
              registerOptions={{ ...register('increment') }}
            />
            <button
              className='ml-8'
              onClick={handleIncrement}
              disabled={!isDirty || !isValid}
            >
              <p
                className={`font-nunito text-sm ${
                  !isDirty || !isValid ? 'text-gray-300' : 'text-blue-500'
                }`}
              >
                Aplicar
              </p>
            </button>
          </div>
          <div className='flex gap-4'>
            <MainButton
              text={'Guardar'}
              className={`${
                !modified ? 'bg-purple-200' : 'bg-purple-500'
              } text-white  w-28 justify-center`}
              onClick={handleSave}
              disabled={!modified}
            />
            <MainButton
              text={'Cancelar'}
              className='text-white bg-red-500 w-28 justify-center'
              onClick={handleClose}
            />
          </div>
        </div>
      </div>
    </div>

    // <div
    //   data-te-modal-init
    //   className='fixed left-0 top-0 z-[1055] hidden h-full w-full overflow-y-auto overflow-x-hidden outline-none'
    // >
    //   <div className='pointer-events-none relative h-[calc(100%-1rem)] w-auto translate-y-[-50px] opacity-0 transition-all duration-300 ease-in-out min-[576px]:mx-auto min-[576px]:mt-7 min-[576px]:h-[calc(100%-3.5rem)] min-[576px]:max-w-[500px]'>
    //     <div className='pointer-events-auto relative flex max-h-[100%] w-full flex-col overflow-hidden rounded-md border-none bg-white bg-clip-padding text-current shadow-lg outline-none dark:bg-neutral-600'>
    //       <div className='flex flex-shrink-0 items-center justify-between rounded-t-md border-b-2 border-neutral-100 border-opacity-100 p-4 dark:border-opacity-50'>
    //         <h5
    //           className='text-xl font-medium leading-normal text-neutral-800 dark:text-neutral-200'
    //           id='exampleModalScrollableLabel'
    //         >
    //           Modal title
    //         </h5>
    //         <button
    //           type='button'
    //           className='box-content rounded-none border-none hover:no-underline hover:opacity-75 focus:opacity-100 focus:shadow-none focus:outline-none'
    //           data-te-modal-dismiss
    //           aria-label='Close'
    //         >
    //           <svg
    //             xmlns='http://www.w3.org/2000/svg'
    //             fill='none'
    //             viewBox='0 0 24 24'
    //             stroke-width='1.5'
    //             stroke='currentColor'
    //             className='h-6 w-6'
    //           >
    //             <path
    //               stroke-linecap='round'
    //               stroke-linejoin='round'
    //               d='M6 18L18 6M6 6l12 12'
    //             />
    //           </svg>
    //         </button>
    //       </div>

    //       <div className='relative overflow-y-auto p-4'>
    //         <p>
    //           This is some placeholder content to show the scrolling behavior
    //           for modals. We use repeated line breaks to demonstrate how content
    //           can exceed minimum inner height, thereby showing inner scrolling.
    //           When content becomes longer than the predefined max-height of
    //           modal, content will be cropped and scrollable within the modal.
    //         </p>
    //         <div className='height:800px;'></div>
    //         <p>This content should appear at the bottom after you scroll.</p>
    //       </div>

    //       <div className='flex flex-shrink-0 flex-wrap items-center justify-end rounded-b-md border-t-2 border-neutral-100 border-opacity-100 p-4 dark:border-opacity-50'>
    //         <button
    //           type='button'
    //           className='inline-block rounded bg-primary-100 px-6 pb-2 pt-2.5 text-xs font-medium uppercase leading-normal text-primary-700 transition duration-150 ease-in-out hover:bg-primary-accent-100 focus:bg-primary-accent-100 focus:outline-none focus:ring-0 active:bg-primary-accent-200'
    //           data-te-modal-dismiss
    //           data-te-ripple-init
    //           data-te-ripple-color='light'
    //         >
    //           Close
    //         </button>
    //         <button
    //           type='button'
    //           className='ml-1 inline-block rounded bg-primary px-6 pb-2 pt-2.5 text-xs font-medium uppercase leading-normal text-white shadow-[0_4px_9px_-4px_#3b71ca] transition duration-150 ease-in-out hover:bg-primary-600 hover:shadow-[0_8px_9px_-4px_rgba(59,113,202,0.3),0_4px_18px_0_rgba(59,113,202,0.2)] focus:bg-primary-600 focus:shadow-[0_8px_9px_-4px_rgba(59,113,202,0.3),0_4px_18px_0_rgba(59,113,202,0.2)] focus:outline-none focus:ring-0 active:bg-primary-700 active:shadow-[0_8px_9px_-4px_rgba(59,113,202,0.3),0_4px_18px_0_rgba(59,113,202,0.2)] dark:shadow-[0_4px_9px_-4px_rgba(59,113,202,0.5)] dark:hover:shadow-[0_8px_9px_-4px_rgba(59,113,202,0.2),0_4px_18px_0_rgba(59,113,202,0.1)] dark:focus:shadow-[0_8px_9px_-4px_rgba(59,113,202,0.2),0_4px_18px_0_rgba(59,113,202,0.1)] dark:active:shadow-[0_8px_9px_-4px_rgba(59,113,202,0.2),0_4px_18px_0_rgba(59,113,202,0.1)]'
    //           data-te-ripple-init
    //           data-te-ripple-color='light'
    //         >
    //           Save changes
    //         </button>
    //       </div>
    //     </div>
    //   </div>
    // </div>
  );
}
