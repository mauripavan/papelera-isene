export default function ProductCard() {
  return (
    <div className='grid grid-cols-12 gap-4 w-full items-center px-2 pt-4'>
      <p className='font-manrope font-regular text-sm col-span-1'>Checbox</p>
      <p className='font-manrope font-regular text-sm col-span-1'>1234</p>
      <p className='font-manrope font-regular text-sm col-span-5'>
        Caja carton reforzada 40x50
      </p>
      <p className='font-manrope font-regular text-sm col-span-1'>$1250</p>
      <p className='font-manrope font-regular text-sm col-span-1'>$1100</p>
      <p className='font-manrope font-regular text-sm col-span-2'>
        23 Enero, 2023
      </p>
      <button className='col-span-1'></button>
    </div>
  );
}
