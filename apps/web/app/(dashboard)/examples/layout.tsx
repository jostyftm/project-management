
import { Metadata } from 'next'
import React from 'react'

export const metadata: Metadata = {
  title: 'Page de ejemplo',
  description: 'Esta es una página de ejemplo para demostrar la estructura y funcionalidad de un componente de página en Next.js. Aquí puedes agregar cualquier contenido que desees mostrar en esta página, como texto, imágenes, o incluso otros componentes. La idea es proporcionar una base sólida para que puedas construir tu propia página personalizada según tus necesidades.'
}

const Layout = ({
  children
}: Readonly<{
  children: React.ReactNode
}>) => {
  return children
}

export default Layout
