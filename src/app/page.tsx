import MainButton from '@/components/MainButton';
import ProductCard, { IProductCardProps } from '@/components/ProductCard';
import TextInput from '@/components/TextInput';
import PlusIcon from '@/components/icons/Plus';

export default function Home() {
  const mockedProducts: Array<IProductCardProps> = [
    {
      code: '1234',
      description: 'Caja carton reforzada 40x50',
      cost: 1000,
      pi: 1300,
      pp: 1200,
      stock: true,
      updatedDate: '2023-12-02T21:51:21Z',
    },
    {
      code: '1234',
      description: 'Caja carton reforzada 40x50',
      cost: 1000,
      pi: 1300,
      pp: 1200,
      stock: true,
      updatedDate: '2023-12-02T21:51:21Z',
    },
    {
      code: '1234',
      description: 'Caja carton reforzada 40x50',
      cost: 1000,
      pi: 1300,
      pp: 1200,
      stock: true,
      updatedDate: '2023-12-02T21:51:21Z',
    },
  ];
  return (
    <main className='flex min-h-screen flex-col'>
      <div className='flex items-center gap-32'>
        <div className='flex-none'>
          <p className='font-nunito font-bold text-2xl'>Lista de precios</p>
        </div>
        <div className='flex-grow'>
          <TextInput />
        </div>
        <div className='flex-none'>
          <MainButton
            text={'Nuevo producto'}
            className='text-md bg-blue-500'
            icon={<PlusIcon className='fill-current text-white w-4 h-4' />}
          />
        </div>
      </div>
      <div className='grid grid-cols-24 gap-4 w-full px-4 py-2 sticky top-0 items-center mt- bg-gray-10 z-50'>
        <p className='font-nunito font-medium text-sm col-span-2'>Codigo</p>
        <p className='font-nunito font-medium text-sm col-span-9'>
          Descripcion
        </p>
        <p className='font-nunito font-medium text-sm col-span-2'>Costo</p>
        <p className='font-nunito font-medium text-sm col-span-2'>PI</p>
        <p className='font-nunito font-medium text-sm col-span-2'>PP</p>
        <p className='font-nunito font-medium text-sm col-span-2'>Status</p>
        <p className='font-nunito font-medium text-sm col-span-2'>
          Actualizado
        </p>
        <div className='col-span-1'>
          <div className='form-control'>
            <label className='label cursor-pointer'>
              <input type='checkbox' className='checkbox checkbox-sm' />
            </label>
          </div>
        </div>
        <p className='col-span-2'></p>
      </div>

      {mockedProducts.map((item, index) => {
        return (
          <ProductCard
            key={index}
            code={item.code}
            description={item.description}
            cost={item.cost}
            pi={item.pi}
            pp={item.pp}
            stock={item.stock}
            updatedDate={item.updatedDate}
          />
        );
      })}
    </main>
  );
}
