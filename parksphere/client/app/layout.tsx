import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'
import dynamic from 'next/dynamic'

const inter = Inter({ subsets: ['latin'] })

const CustomCursor = dynamic(() => import('@/components/CustomCursor'), {
  ssr: false,
})

export const metadata: Metadata = {
  title: 'ParkSphere - Explore US National Parks',
  description: 'Interactive 3D exploration of US National Parks',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <CustomCursor />
        <main>
          {children}
        </main>
      </body>
    </html>
  )
}