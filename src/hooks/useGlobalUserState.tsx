import { useEffect, useState } from 'react';
import { checkSession } from '@/api';
import { userState } from '@/store/app-state';
import { useRecoilState } from 'recoil';

const useGlobalUserState = () => {
  const [user, setUser] = useRecoilState(userState);
  const [loadingSession, setLoadingSession] = useState(true);

  useEffect(() => {
    checkSession()
      .then(userInfo => {
        setUser(userInfo);
        setLoadingSession(false);
      })
      .catch(error => {
        // Handle error
        console.error('Failed to fetch user information:', error);
        setLoadingSession(false);
      });
  }, []);

  return { user, setUser, loadingSession };
};

export default useGlobalUserState;
