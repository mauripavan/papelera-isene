import type { Metadata } from 'next';
import { Inter, Chakra_Petch, Nunito } from 'next/font/google';
import '../styles/globals.css';
import Logo from '@/components/Logo';

const inter = Inter({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-inter',
});
const chakra = Chakra_Petch({
  weight: ['300', '400', '500', '600', '700'],
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-chakra-petch',
});

const nunito = Nunito({
  weight: ['200', '300', '400', '500', '600', '700', '800'],
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-nunito',
});

export const metadata: Metadata = {
  title: 'Papelera Isene',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang='en' className='bg-gray-10'>
      <body
        className={`${inter.variable} ${chakra.variable} ${nunito.variable} px-20`}
      >
        <div className='flex py-2 justify-center'>
          <Logo />
        </div>
        {children}
      </body>
    </html>
  );
}
