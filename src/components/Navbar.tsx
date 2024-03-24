import { useRecoilValue } from 'recoil';
import Logo from './Logo';
import ProfileIcon from './icons/Profile';
import { userState } from '@/store/app-state';
import { logout } from '@/auth';
import { useRouter } from 'next/navigation';

export default function Navbar() {
  const user = useRecoilValue(userState);
  const router = useRouter();

  const handleCerrarSesion = () => {
    logout().then(() => router.replace('/'));
  };

  return (
    <header className='flex justify-between items-center py-2'>
      <div />
      <Logo />
      <div className='dropdown'>
        <div tabIndex={0} role='button' className='btn btn-ghost'>
          <p className='font-semi-bold'>{`Hola ${user.username}`}</p>
          <div>
            <ProfileIcon />
          </div>
        </div>
        <ul
          tabIndex={0}
          className='menu menu-sm dropdown-content mt-3 z-[1] p-2 shadow bg-base-100 rounded-box w-52'
        >
          <li onClick={handleCerrarSesion}>
            <a className='text-red-400'>Cerrar Sesion</a>
          </li>
        </ul>
      </div>
    </header>
  );
}
