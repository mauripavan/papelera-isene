import Lottie from 'react-lottie';
import SuccessLotie from './lottie/success2-lottie.json';

export interface IDeleteProductModalProps {
  onClose: () => void;
  onCloseAndBack: () => void;
  onConfirm: () => void;
  itemDeleted: boolean;
}

export function DeleteProductModal(props: IDeleteProductModalProps) {
  const { onClose, onConfirm, itemDeleted, onCloseAndBack } = props;

  const defaultOptions = {
    loop: false,
    autoplay: true,
    animationData: SuccessLotie,
    rendererSettings: {
      preserveAspectRatio: 'xMidYMid slice',
    },
  };
  return (
    <div className='flex items-center justify-center fixed inset-0 bg-black bg-opacity-50 font-nunito'>
      <div className='modal-box'>
        <h1 className='font-semibold text-2xl text-center text-gray-700'>
          Desea eliminar el producto?
        </h1>
        {itemDeleted ? (
          <div>
            <Lottie options={defaultOptions} height={300} width={300} />
            <p className='text-center'>Producto eliminado correctamente.</p>
            <div className='flex items-center justify-center w-full mt-8'>
              <button className='btn' onClick={onCloseAndBack}>
                VOLVER
              </button>
            </div>
          </div>
        ) : (
          <div className='flex gap-4 mt-10 w-full justify-center'>
            <button className='btn' onClick={onClose}>
              CANCELAR
            </button>
            <button className='btn btn-neutral' onClick={onConfirm}>
              CONFIRMAR
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
