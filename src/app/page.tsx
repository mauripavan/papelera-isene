import TextInput from '@/components/TextInput';

export default function Home() {
  return (
    <main className='flex min-h-screen flex-col items-center'>
      <div className='w-1/2'>
        <TextInput />
      </div>
      <div className='grid grid-cols-24 gap-4 w-full items-center px-2 pt-4'>
        <p className='font-manrope font-regular text-sm col-span-1'>Check</p>
        <p className='font-manrope font-regular text-sm col-span-2'>Codigo</p>
        <p className='font-manrope font-regular text-sm col-span-8'>
          Descripcion
        </p>
        <p className='font-manrope font-regular text-sm col-span-2'>Costo</p>
        <p className='font-manrope font-regular text-sm col-span-2'>PI</p>
        <p className='font-manrope font-regular text-sm col-span-2'>PP</p>
        <p className='font-manrope font-regular text-sm col-span-3'>Status</p>
        <p className='font-manrope font-regular text-sm col-span-2'>
          Actualizado
        </p>
        <p className='col-span-2'></p>
      </div>
    </main>
  );
}
