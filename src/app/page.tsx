import ProductCard from '@/components/ProductCard';
import TextInput from '@/components/TextInput';

export default function Home() {
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
          <button className='font-nunito'>Añadir producto</button>
        </div>
      </div>
      <div className='grid grid-cols-24 gap-4 w-full px-4 py-2 sticky top-0 items-center mt-2'>
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

      <ProductCard
        code={'1234'}
        description={'Caja carton reforzada 40x50'}
        cost={1017.56}
        pi={1508.69}
        pp={1300}
        stock={true}
        updatedDate={'23 Ene, 2023'}
      />
    </main>
  );
}
