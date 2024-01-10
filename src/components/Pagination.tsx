import ArrowLeftIcon from './icons/ArrowLeft';
import ArrowRightIcon from './icons/ArrowRight';

export interface PaginationComponentProps {
  cardsPerPage: number;
  totalCards: number;
  currentPage: number;
  paginate: (pageNumber: number) => void;
}

const Pagination = ({
  cardsPerPage,
  totalCards,
  currentPage,
  paginate,
}: PaginationComponentProps) => {
  const pageNumbers = [];

  for (let i = 1; i <= Math.ceil(totalCards / cardsPerPage); i++) {
    pageNumbers.push(i);
  }

  function handleSelectPage(page: number) {
    paginate(page);
  }

  function handleNextPage() {
    if (
      currentPage >= 1 &&
      currentPage < Math.ceil(totalCards / cardsPerPage)
    ) {
      paginate(currentPage + 1);
    }
  }

  function handlePrevPage() {
    if (currentPage > 1) {
      paginate(currentPage - 1);
    }
  }

  function renderPageNumber(number: number, current: number) {
    return (
      <li key={number} className='list-none font-nunito'>
        <a
          className={
            current === number
              ? 'relative z-10 flex items-center justify-center border border-gray-200 bg-gray-200 rounded-full w-10 h-10 text-sm font-bold text-black focus:z-20 cursor-pointer'
              : 'relative flex items-center justify-center w-10 h-10 text-sm font-bold text-gray-500 cursor-pointer'
          }
          onClick={() => handleSelectPage(number)}
        >
          {number}
        </a>
      </li>
    );
  }

  if (pageNumbers.length <= 1) return null;

  return (
    <>
      <div
        data-cy='pagination'
        className='flex items-center justify-between mt-4 px-4 py-3 sm:px-6'
      >
        <div className='hidden sm:flex sm:flex-1 sm:items-center sm:justify-center'>
          <div>
            <nav
              className='isolate inline-flex space-x-4 rounded-md items-center'
              aria-label='Pagination'
            >
              <button
                onClick={handlePrevPage}
                className='bg-black rounded-full w-8 h-8 flex justify-center items-center'
              >
                <ArrowLeftIcon className='w-6 h-6 fill-current text-white' />
              </button>
              {pageNumbers.map((number, index) => {
                if (index < 3) {
                  return renderPageNumber(number, currentPage);
                }
                if (index === 3 && currentPage > 4) {
                  return (
                    <li key='ellipsis-1' className='list-none'>
                      <a
                        className={
                          'relative flex items-center justify-center w-10 h-10 text-sm font-bold text-gray-500'
                        }
                      >
                        ...
                      </a>
                    </li>
                  );
                }
                if (
                  number >= currentPage - 1 &&
                  number <= currentPage + 1 &&
                  index > 2 &&
                  index < pageNumbers.length - 3
                ) {
                  return renderPageNumber(number, currentPage);
                }
                if (
                  index === pageNumbers.length - 4 &&
                  currentPage < pageNumbers.length - 3
                ) {
                  return (
                    <li key='ellipsis-2' className='list-none'>
                      <a
                        className={
                          'relative flex items-center justify-center w-10 h-10 text-sm font-bold text-gray-500'
                        }
                      >
                        ...
                      </a>
                    </li>
                  );
                }
                if (index >= pageNumbers.length - 3) {
                  return renderPageNumber(number, currentPage);
                }
                return null;
              })}
              <button
                onClick={handleNextPage}
                className='bg-black rounded-full w-8 h-8 flex justify-center items-center'
              >
                <ArrowRightIcon className='w-6 h-6 fill-current text-white' />
              </button>
            </nav>
          </div>
        </div>
      </div>
    </>
  );
};

export default Pagination;
