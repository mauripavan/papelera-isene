export default function TableHeader() {
  return (
    <div className='grid grid-cols-24 gap-4 w-full px-4 py-2 sticky top-0 items-center mt- bg-gray-10'>
      <p className='font-nunito font-medium text-sm col-span-2'>Codigo</p>
      <p className='font-nunito font-medium text-sm col-span-8'>Descripcion</p>
      <p className='font-nunito font-medium text-sm col-span-2'>Cantidad</p>
      <p className='font-nunito font-medium text-sm col-span-2'>Costo</p>
      <p className='font-nunito font-medium text-sm col-span-2'>PI</p>
      <p className='font-nunito font-medium text-sm col-span-2'>PP</p>
      <p className='font-nunito font-medium text-sm col-span-2'>Status</p>
      <div className='col-span-1'>
        <div className='form-control'>
          <label className='label cursor-pointer'>
            <input type='checkbox' className='checkbox checkbox-sm' />
          </label>
        </div>
      </div>
      <p className='font-nunito font-medium text-sm col-span-2'></p>
    </div>
  );
}
