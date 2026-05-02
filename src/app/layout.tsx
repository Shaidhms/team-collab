import type { Metadata, Viewport } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: {
    default: 'Team Collab — Real-time shared task board',
    template: '%s · Team Collab',
  },
  description:
    'A real-time collaborative task board. Multiple teammates can join, add tasks, and see each other’s changes live.',
  applicationName: 'Team Collab',
  authors: [{ name: 'Shaid' }],
  keywords: [
    'team collaboration',
    'real-time',
    'task management',
    'shared workspace',
    'productivity',
    'Next.js',
    'Cloud Run',
  ],
  robots: { index: true, follow: true },
  openGraph: {
    type: 'website',
    title: 'Team Collab',
    description: 'Real-time shared task board for small teams.',
    siteName: 'Team Collab',
  },
  twitter: {
    card: 'summary',
    title: 'Team Collab',
    description: 'Real-time shared task board for small teams.',
  },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#ffffff' },
    { media: '(prefers-color-scheme: dark)', color: '#0a0a0a' },
  ],
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <a className="skip-link" href="#main">
          Skip to main content
        </a>
        {children}
      </body>
    </html>
  );
}
