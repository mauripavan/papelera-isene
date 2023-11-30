import Logo from '@/components/Logo';

export default function Home() {
  return (
    <main className='flex min-h-screen flex-col items-center p-12'>
      <Logo />
      <div className='flex-1 px-20 py-4 bg-red-200 w-full'>
        {/* TextInput component */}
        <div className='p-2 bg-gray-200 rounded-full w-full relative'>
          <input
            placeholder='Busque por nombre de articulo'
            className='w-full bg-gray-200'
          />
        </div>
      </div>
    </main>
  );
}
