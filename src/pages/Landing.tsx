import HeroSection from '@/components/ui/light-saas-hero-section'

// Ajustes padrao do fundo de plasma. opacity baixo de proposito: o hero e
// tema claro e o texto precisa continuar legivel sobre a animacao.
const settings = {
  // Azul principal da marca (brand.blue em tailwind.config.ts).
  color: '#1800AD',
  speed: 0.5,
  scale: 1.2,
  opacity: 0.15,
  mouseInteractive: true,
}

// w-full em vez de w-screen: w-screen ignora a largura da barra de rolagem
// e gera rolagem horizontal indevida.
export default function Landing(props: Partial<typeof settings>) {
  const s = { ...settings, ...props }
  return (
    <div className="min-h-screen w-full">
      <HeroSection {...s} />
    </div>
  )
}
