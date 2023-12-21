'use client';

import { RecoilRoot } from 'recoil';

export default function RecoilProvider({ children }: { children: any }) {
  return <RecoilRoot>{children}</RecoilRoot>;
}
