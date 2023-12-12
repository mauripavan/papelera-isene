import ScotchIcon from './icons/Scotch';

export default function Logo() {
  return (
    <div className='flex items-center'>
      <ScotchIcon className='h-20 w-20' />
      <div className='flex flex-col'>
        <p className='text-blue-0 font-chakra font-black text-2xl leading-none text-center'>
          PAPELERA
        </p>
        <p className='text-blue-0 font-chakra font-black text-5xl leading-none'>
          ISENE
        </p>
      </div>
    </div>
  );
}
