import type { Metadata } from 'next';
import { Inter, Chakra_Petch, Manrope } from 'next/font/google';
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

const manrope = Manrope({
  weight: ['200', '300', '400', '500', '600', '700', '800'],
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-manrope',
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
    <html lang='en'>
      <body
        className={`${inter.variable} ${chakra.variable} ${manrope.variable} px-20`}
      >
        <div className='flex py-2 justify-center'>
          <Logo />
        </div>
        {children}
      </body>
    </html>
  );
}
