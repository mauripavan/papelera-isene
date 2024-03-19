import Lottie from 'react-lottie';
import SuccessLotie from './lottie/success2-lottie.json';
import ErrorLotie from './lottie/error-lottie.json';
import Link from 'next/link';

export interface IAddProductModalProps {
  onClose: () => void;
  error?: boolean;
  text: string;
  link?: string;
  linkText?: string;
  errorMessage?: string;
}

export default function AddProductModal(props: IAddProductModalProps) {
  const { onClose, error, text, link, linkText, errorMessage } = props;

  const defaultOptions = {
    loop: false,
    autoplay: true,
    animationData: error ? ErrorLotie : SuccessLotie,
    rendererSettings: {
      preserveAspectRatio: 'xMidYMid slice',
    },
  };
  return (
    <div className='flex items-center justify-center fixed inset-0 bg-black bg-opacity-50 font-nunito'>
      <div className='modal-box'>
        <button className='btn btn-circle absolute right-5' onClick={onClose}>
          <svg
            xmlns='http://www.w3.org/2000/svg'
            className='h-6 w-6'
            fill='none'
            viewBox='0 0 24 24'
            stroke='currentColor'
          >
            <path
              strokeLinecap='round'
              strokeLinejoin='round'
              strokeWidth='2'
              d='M6 18L18 6M6 6l12 12'
            />
          </svg>
        </button>
        {!error ? (
          <>
            <Lottie options={defaultOptions} height={300} width={300} />
            <h3 className='font-semibold text-2xl text-center text-gray-700'>
              {text}
            </h3>
            {link && (
              <div className='flex justify-center items-center w-full text-lg text-purple-500 font-bold mt-5'>
                <Link href={link}>
                  <p>{linkText}</p>
                </Link>
              </div>
            )}
          </>
        ) : (
          <>
            <Lottie options={defaultOptions} height={300} width={300} />
            <h3 className='font-semibold text-2xl text-center text-gray-700'>
              {errorMessage
                ? errorMessage
                : 'Se produjo un problema. Intente nuevamente'}
            </h3>
          </>
        )}
      </div>
    </div>
  );
}
