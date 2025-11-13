import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Midnight Fetcher Bot',
  description: 'Windows-based mining application for Midnight',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="bg-gray-900 text-white min-h-screen">
        <div className="bg-gradient-to-r from-orange-500 via-red-500 to-pink-500 text-white py-3 px-4 text-center shadow-lg">
          <p className="text-base font-medium">
            Join our community for latest updates, support, and more!
            <a
              href="https://ada.markets/discord"
              target="_blank"
              rel="noopener noreferrer"
              className="ml-2 font-semibold underline hover:text-yellow-200 transition-colors"
            >
              Discord
            </a>
            <span className="mx-2">•</span>
            Follow
            <a
              href="https://x.com/cwpaulm"
              target="_blank"
              rel="noopener noreferrer"
              className="ml-1 font-semibold underline hover:text-yellow-200 transition-colors"
            >
              Paul
            </a>
            <span className="mx-1">&</span>
            <a
              href="https://x.com/PoolShamrock"
              target="_blank"
              rel="noopener noreferrer"
              className="font-semibold underline hover:text-yellow-200 transition-colors"
            >
              Paddy
            </a>
            <span className="ml-1">on X</span>
          </p>
        </div>
        {children}
      </body>
    </html>
  );
}
