import { useRecoilState } from 'recoil';
import Logo from './Logo';
import ProfileIcon from './icons/Profile';
import { userState } from '@/store/app-state';
import { useRouter } from 'next/navigation';

export default function Navbar() {
  const [user, setUser] = useRecoilState(userState);
  const router = useRouter();

  const handleCerrarSesion = () => {
    localStorage.removeItem('token');
    setUser({
      username: '',
      email: '',
      admin: false,
      papeleras: false,
    });
    router.replace('/');
  };

  return (
    <header className='flex justify-between items-center py-2'>
      <div />
      <Logo />
      {user?.username && (
        <div className='dropdown'>
          <div tabIndex={0} role='button' className='btn btn-ghost'>
            <p className='font-semi-bold'>{`Hola ${user?.username}`}</p>
            <div>
              <ProfileIcon />
            </div>
          </div>
          <ul
            tabIndex={0}
            className='menu menu-sm dropdown-content mt-3 z-[1] p-2 shadow bg-base-100 rounded-box w-52'
          >
            <li onClick={() => router.push('/home')}>
              <a>Inicio</a>
            </li>
            {user.admin && (
              <li onClick={() => router.push('/dashboard')}>
                <a>Panel admin</a>
              </li>
            )}
            <li onClick={handleCerrarSesion}>
              <a className='text-red-400'>Cerrar Sesion</a>
            </li>
          </ul>
        </div>
      )}
    </header>
  );
}
