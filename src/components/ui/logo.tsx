// Marca Lista Valida.
//
// Formatos:
// - BrandLogoStacked: assinatura vertical (icone sobre o nome). E a marca
//   usada em todas as telas do app.
// - BrandLogo: assinatura horizontal. Usada apenas na landing, onde a navbar
//   e larga e baixa.
// - BrandMark: so o icone, para espacos estreitos (topbar no mobile).
//
// Cores: as artes foram remapeadas para os hex oficiais (#1800AD e #261B6E).
// A variante "branco" existe para fundos escuros, onde a arte colorida teria
// contraste de ~1,1:1 e sumiria; ela troca so o RGB e mantem o alfa.
import logoHorizontal from '@/assets/logo-lista-valida.png'
import logoHorizontalBranco from '@/assets/logo-lista-valida-branco.png'
import logoVertical from '@/assets/logo-lista-valida-vertical.png'
import logoVerticalBranco from '@/assets/logo-lista-valida-vertical-branco.png'
import marca from '@/assets/mark-lista-valida.png'
import marcaBranca from '@/assets/mark-lista-valida-branco.png'

type Variante = 'cor' | 'branco'

interface LogoProps {
  className?: string
  variante?: Variante
}

export function BrandLogoStacked({ className = 'h-16', variante = 'cor' }: LogoProps) {
  const src = variante === 'branco' ? logoVerticalBranco : logoVertical
  return <img src={src} alt="Lista Válida" className={`${className} w-auto`} />
}

export function BrandLogo({ className = 'h-9', variante = 'cor' }: LogoProps) {
  const src = variante === 'branco' ? logoHorizontalBranco : logoHorizontal
  return <img src={src} alt="Lista Válida" className={`${className} w-auto`} />
}

export function BrandMark({ className = 'h-9', variante = 'cor' }: LogoProps) {
  const src = variante === 'branco' ? marcaBranca : marca
  return <img src={src} alt="Lista Válida" className={`${className} w-auto`} />
}
