import Search from './icons/Search';

export default function TextInput() {
  return (
    <div className='flex-1 py-2 w-full text-gray-400 group'>
      <div className='flex py-2 px-4 bg-white rounded-lg w-full relative gap-2 group-focus-within:border group-focus-within:border-purple-500 group-focus-within:text-gray-800'>
        <Search className='fill-current' />
        <input
          placeholder='Buscar por nombre de articulo'
          className='w-full bg-white font-nunito focus:outline-none'
        />
      </div>
    </div>
  );
}
