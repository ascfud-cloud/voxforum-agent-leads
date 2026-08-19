export const metadata = {
  title: 'Voxforum Leads Agent',
  description: 'Gjetje automatike kontaktesh për pjesëmarrësit e Voxforum',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="sq">
      <body style={{ margin: 0, background: '#fafafa' }}>{children}</body>
    </html>
  )
}
