export default function LoadingModal({ text }: { text?: string }) {
  return (
    <div className='flex items-center justify-center fixed inset-0 bg-black bg-opacity-50 font-nunito'>
      <div className='modal-box flex flex-col items-center justify-center'>
        <h3 className='font-semibold text-2xl text-center text-gray-700'>
          {text ? text : 'Cargando. Por favor espere'}
        </h3>
        <span className='loading loading-spinner loading-lg mt-20'></span>
      </div>
    </div>
  );
}
