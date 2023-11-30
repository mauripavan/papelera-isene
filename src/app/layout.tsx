import type { Metadata } from 'next';
import { Inter, Chakra_Petch } from 'next/font/google';
import '../styles/globals.css';

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
      <body className={`${inter.variable} ${chakra.variable}`}>{children}</body>
    </html>
  );
}
