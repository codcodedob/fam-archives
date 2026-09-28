import './globals.css'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'FAM — Future Archives Modern',
  description: 'A native digital archive for declarations, documents, memories and cultural records.'
}

export default function RootLayout({children}:{children:React.ReactNode}){
  return <html lang="en"><body>{children}</body></html>
}
