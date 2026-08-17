// Hero de landing page com fundo WebGL (plasma animado) renderizado via ogl.
// Identidade visual: logo horizontal da marca e a paleta oficial declarada em
// tailwind.config.ts (brand.blue #1800AD, brand.navy #261B6E, brand.ink
// #1D1A33, brand.gold #AD9600).
import React, { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { Renderer, Program, Mesh, Triangle } from 'ogl'
import { Button } from '@/components/ui/button'
import { Sparkles, CheckCircle, Upload, Mail, BarChart3, ShieldCheck, ArrowRight } from 'lucide-react'
import logoListaValida from '@/assets/logo-lista-valida.png'

// Azul principal da marca, usado como padrao do fundo animado.
const BRAND_BLUE = '#1800AD'

type PlasmaDirection = 'forward' | 'reverse' | 'pingpong'

interface PlasmaProps {
  color?: string
  speed?: number
  // Ausente no tipo original, mas usado pelo componente: sem esta linha o
  // build quebra ao desestruturar direction das props.
  direction?: PlasmaDirection
  scale?: number
  opacity?: number
  mouseInteractive?: boolean
}

export const hexToRgb = (hex: string): [number, number, number] => {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex)
  if (!result) return [1, 0.5, 0.2]
  return [
    parseInt(result[1], 16) / 255,
    parseInt(result[2], 16) / 255,
    parseInt(result[3], 16) / 255,
  ]
}

const vertex = `#version 300 es
precision highp float;
in vec2 position;
in vec2 uv;
out vec2 vUv;
void main() {
  vUv = uv;
  gl_Position = vec4(position, 0.0, 1.0);
}
`

const fragment = `#version 300 es
precision highp float;
uniform vec2 iResolution;
uniform float iTime;
uniform vec3 uCustomColor;
uniform float uUseCustomColor;
uniform float uSpeed;
uniform float uDirection;
uniform float uScale;
uniform float uOpacity;
uniform vec2 uMouse;
uniform float uMouseInteractive;
out vec4 fragColor;
void mainImage(out vec4 o, vec2 C) {
  vec2 center = iResolution.xy * 0.5;
  C = (C - center) / uScale + center;
  vec2 mouseOffset = (uMouse - center) * 0.0002;
  C += mouseOffset * length(C - center) * step(0.5, uMouseInteractive);
  float i, d, z, T = iTime * uSpeed * uDirection;
  vec3 O, p, S;
  for (vec2 r = iResolution.xy, Q; ++i < 60.; O += o.w/d*o.xyz) {
    p = z*normalize(vec3(C-.5*r,r.y));
    p.z -= 4.;
    S = p;
    d = p.y-T;
    p.x += .4*(1.+p.y)*sin(d + p.x*0.1)*cos(.34*d + p.x*0.05);
    Q = p.xz *= mat2(cos(p.y+vec4(0,11,33,0)-T));
    z+= d = abs(sqrt(length(Q*Q)) - .25*(5.+S.y))/3.+8e-4;
    o = 1.+sin(S.y+p.z*.5+S.z-length(S-p)+vec4(2,1,0,8));
  }
  o.xyz = tanh(O/1e4);
}
bool finite1(float x){ return !(isnan(x) || isinf(x)); }
vec3 sanitize(vec3 c){
  return vec3(
    finite1(c.r) ? c.r : 0.0,
    finite1(c.g) ? c.g : 0.0,
    finite1(c.b) ? c.b : 0.0
  );
}
void main() {
  vec4 o = vec4(0.0);
  mainImage(o, gl_FragCoord.xy);
  vec3 rgb = sanitize(o.rgb);
  float intensity = (rgb.r + rgb.g + rgb.b) / 3.0;
  vec3 customColor = intensity * uCustomColor;
  vec3 finalColor = mix(rgb, customColor, step(0.5, uUseCustomColor));
  float alpha = length(rgb) * uOpacity;
  fragColor = vec4(finalColor, alpha);
}`

export const Plasma: React.FC<PlasmaProps> = ({
  color = '#ffffff',
  speed = 1,
  direction = 'forward',
  scale = 1,
  opacity = 1,
  mouseInteractive = true,
}) => {
  const containerRef = useRef<HTMLDivElement | null>(null)
  const mousePos = useRef({ x: 0, y: 0 })

  useEffect(() => {
    // Guardado numa constante: containerRef.current pode ja estar nulo na
    // hora da limpeza, e o React avisa sobre ler a ref ali dentro.
    const container = containerRef.current
    if (!container) return

    const useCustomColor = color ? 1.0 : 0.0
    const customColorRgb = color ? hexToRgb(color) : [1, 1, 1]
    const directionMultiplier = direction === 'reverse' ? -1.0 : 1.0

    const prefereMenosMovimento = window.matchMedia('(prefers-reduced-motion: reduce)').matches

    const renderer = new Renderer({
      webgl: 2,
      alpha: true,
      antialias: false,
      // dpr travado em 1: o shader roda 60 iteracoes de raymarch por pixel,
      // entao dpr 2 quadruplica o custo por quadro. O resultado e um plasma
      // difuso sob uma camada branca de 60-80% de opacidade - a diferenca
      // de nitidez nao e perceptivel, a de custo e.
      dpr: 1,
    })
    const gl = renderer.gl
    const canvas = gl.canvas as HTMLCanvasElement
    canvas.style.display = 'block'
    canvas.style.width = '100%'
    canvas.style.height = '100%'
    container.appendChild(canvas)

    const geometry = new Triangle(gl)
    const program = new Program(gl, {
      vertex: vertex,
      fragment: fragment,
      uniforms: {
        iTime: { value: 0 },
        iResolution: { value: new Float32Array([1, 1]) },
        uCustomColor: { value: new Float32Array(customColorRgb) },
        uUseCustomColor: { value: useCustomColor },
        uSpeed: { value: speed * 0.4 },
        uDirection: { value: directionMultiplier },
        uScale: { value: scale },
        uOpacity: { value: opacity },
        uMouse: { value: new Float32Array([0, 0]) },
        uMouseInteractive: { value: mouseInteractive ? 1.0 : 0.0 },
      },
    })
    const mesh = new Mesh(gl, { geometry, program })

    const handleMouseMove = (e: MouseEvent) => {
      if (!mouseInteractive) return
      const rect = container.getBoundingClientRect()
      mousePos.current.x = e.clientX - rect.left
      mousePos.current.y = e.clientY - rect.top
      const mouseUniform = program.uniforms.uMouse.value as Float32Array
      mouseUniform[0] = mousePos.current.x
      mouseUniform[1] = mousePos.current.y
    }
    if (mouseInteractive) {
      container.addEventListener('mousemove', handleMouseMove)
    }

    const setSize = () => {
      const rect = container.getBoundingClientRect()
      const width = Math.max(1, Math.floor(rect.width))
      const height = Math.max(1, Math.floor(rect.height))
      renderer.setSize(width, height)
      const res = program.uniforms.iResolution.value as Float32Array
      res[0] = gl.drawingBufferWidth
      res[1] = gl.drawingBufferHeight
    }
    const ro = new ResizeObserver(setSize)
    ro.observe(container)
    setSize()

    let raf = 0
    const t0 = performance.now()
    const loop = (t: number) => {
      const timeValue = (t - t0) * 0.001
      if (direction === 'pingpong') {
        const cycle = Math.sin(timeValue * 0.5) * directionMultiplier
        program.uniforms.uDirection.value = cycle
      }
      program.uniforms.iTime.value = timeValue
      renderer.render({ scene: mesh })
      raf = requestAnimationFrame(loop)
    }
    // Com movimento reduzido desenha um unico quadro e para: o fundo continua
    // existindo, sem animacao nem custo continuo de GPU.
    if (prefereMenosMovimento) {
      renderer.render({ scene: mesh })
    } else {
      raf = requestAnimationFrame(loop)
    }

    return () => {
      cancelAnimationFrame(raf)
      ro.disconnect()
      if (mouseInteractive) {
        container.removeEventListener('mousemove', handleMouseMove)
      }
      try {
        container.removeChild(canvas)
      } catch {
        // canvas ja removido do DOM
      }
      // Libera o contexto WebGL explicitamente. Sem isso ele so seria
      // recolhido quando o coletor de lixo decidisse, e numa SPA o usuario
      // pode entrar e sair da landing varias vezes na mesma aba - cada
      // montagem cria um contexto novo. Navegadores limitam quantos existem
      // ao mesmo tempo (perto de 16) e descartam os mais antigos em silencio.
      gl.getExtension('WEBGL_lose_context')?.loseContext()
    }
  }, [color, speed, direction, scale, opacity, mouseInteractive])

  return <div ref={containerRef} className="w-full h-full relative overflow-hidden" />
}

// Assinatura horizontal da marca (icone + tipografia). O PNG ja traz o nome,
// por isso nao ha texto ao lado - repetir "Lista Valida" duplicaria a leitura.
export function Logo({ className = 'h-10' }: { className?: string }) {
  return <img src={logoListaValida} alt="Lista Válida" className={`${className} w-auto`} />
}

const GlassmorphicNavbar = () => {
  const [isMenuOpen, setIsMenuOpen] = useState(false)

  const links = [
    { label: 'Recursos', href: '#recursos' },
    { label: 'Entregabilidade', href: '#entregabilidade' },
    { label: 'Como funciona', href: '#como-funciona' },
  ]

  return (
    <nav className="fixed top-4 left-1/2 transform -translate-x-1/2 z-50 w-full max-w-6xl xl:px-0 px-6">
      <div className="bg-white/70 backdrop-blur-xl rounded-3xl md:rounded-full px-6 py-3 shadow-lg border border-white/40">
        <div className="flex items-center justify-between gap-4">
          <Link to="/" aria-label="Lista Válida - início">
            <Logo className="h-8 md:h-9" />
          </Link>
          {/* Links de navegacao (desktop) */}
          <div className="hidden md:flex items-center space-x-1">
            {links.map((link) => (
              <a
                key={link.href}
                href={link.href}
                className="px-4 py-2 text-brand-ink/80 hover:text-brand-blue font-medium rounded-full hover:bg-white/60 transition-colors"
              >
                {link.label}
              </a>
            ))}
          </div>
          {/* Acoes: as duas levam para a tela de login, que ja tem cadastro */}
          <div className="hidden md:flex items-center space-x-2">
            <Link
              to="/app"
              className="px-5 py-2 text-brand-ink/80 font-medium rounded-full hover:bg-white/60 hover:text-brand-blue transition-colors"
            >
              Entrar
            </Link>
            <Link
              to="/app"
              className="px-5 py-2 bg-brand-blue text-white font-medium rounded-full shadow-md hover:bg-brand-navy transition-colors"
            >
              Criar conta
            </Link>
          </div>
          {/* Botao do menu mobile */}
          <button
            className="md:hidden p-2 rounded-full bg-white/60 text-brand-ink"
            onClick={() => setIsMenuOpen(!isMenuOpen)}
            aria-label={isMenuOpen ? 'Fechar menu' : 'Abrir menu'}
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              {isMenuOpen ? (
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M6 18L18 6M6 6l12 12"
                />
              ) : (
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M4 6h16M4 12h16M4 18h16"
                />
              )}
            </svg>
          </button>
        </div>
        {/* Menu mobile */}
        {isMenuOpen && (
          <div className="md:hidden mt-4 bg-white/95 rounded-2xl p-4 shadow-lg border border-white/40">
            <div className="flex flex-col space-y-3">
              {links.map((link) => (
                <a
                  key={link.href}
                  href={link.href}
                  onClick={() => setIsMenuOpen(false)}
                  className="px-4 py-3 text-brand-ink/80 hover:text-brand-blue font-medium rounded-lg hover:bg-white transition-colors"
                >
                  {link.label}
                </a>
              ))}
              <div className="border-t border-brand-ink/10 pt-3 flex flex-col space-y-3">
                <Link
                  to="/app"
                  className="px-4 py-3 text-center text-brand-ink/80 font-medium rounded-lg bg-white/60"
                >
                  Entrar
                </Link>
                <Link
                  to="/app"
                  className="px-4 py-3 text-center bg-brand-blue text-white font-medium rounded-lg shadow-md"
                >
                  Criar conta
                </Link>
              </div>
            </div>
          </div>
        )}
      </div>
    </nav>
  )
}

// Os tres diferenciais sao os mesmos ja anunciados no painel da tela de
// login, para a landing nao contar uma historia diferente do produto.
const RECURSOS = [
  {
    icon: Sparkles,
    title: 'Classificação por IA',
    description: 'Normalização automática de seniority, interesses e demandas do perfil.',
  },
  {
    icon: Mail,
    title: 'Perfis Personalizados',
    description: 'Geração instantânea de mensagens customizadas para alcance direto.',
  },
  {
    icon: Upload,
    title: 'Importação Simples em CSV',
    description: 'Mapeamento dinâmico de colunas e validação inteligente de duplicados.',
  },
]

// Capacidades reais da plataforma, no lugar das metricas de exemplo do
// componente original. Nao ha numeros de marketing inventados aqui.
const CAPACIDADES = [
  { icon: ShieldCheck, valor: 'SPF · DKIM · DMARC', rotulo: 'Domínio autenticado' },
  { icon: Upload, valor: 'CSV e XLSX', rotulo: 'Importação de listas' },
  { icon: BarChart3, valor: 'Aberturas e cliques', rotulo: 'Relatório de entregas' },
  { icon: CheckCircle, valor: 'Sem custo', rotulo: 'Para começar' },
]

const PASSOS = [
  {
    numero: '1',
    title: 'Importe sua lista',
    description: 'Suba a planilha em CSV ou XLSX e mapeie as colunas.',
  },
  {
    numero: '2',
    title: 'Higienize e classifique',
    description: 'A IA normaliza cargos, marca duplicados e separa bloqueados.',
  },
  {
    numero: '3',
    title: 'Dispare e acompanhe',
    description: 'Envie a campanha e veja aberturas, cliques e falhas em tempo real.',
  },
]

interface HeroSectionProps {
  color?: string
  speed?: number
  scale?: number
  opacity?: number
  mouseInteractive?: boolean
}

const HeroSection = ({
  color = BRAND_BLUE,
  speed = 0.5,
  scale = 1.2,
  opacity = 0.15,
  mouseInteractive = true,
}: HeroSectionProps = {}) => {
  return (
    <div className="min-h-screen relative overflow-hidden w-full bg-white">
      <GlassmorphicNavbar />
      {/* fixed em vez de absolute: com absolute o canvas assumia a altura do
          container, que cresce com as secoes abaixo do hero - o shader
          passava a rodar sobre a pagina inteira em vez de uma janela. Preso
          a viewport, o custo por quadro nao aumenta conforme a pagina cresce. */}
      <div className="fixed inset-0 z-0">
        <Plasma
          color={color}
          speed={speed}
          direction="forward"
          scale={scale}
          opacity={opacity}
          mouseInteractive={mouseInteractive}
        />
        {/* Sobreposicao em gradiente para dar legibilidade ao texto */}
        <div className="absolute inset-0 bg-gradient-to-b from-white/40 to-white/80"></div>
      </div>

      {/* Conteudo */}
      <div className="relative z-10 max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 pt-40 md:pt-52 pb-20 text-center">
        <div className="inline-flex items-center rounded-full bg-brand-blue/10 px-4 py-2 text-sm font-medium text-brand-blue mb-8">
          <Sparkles className="w-4 h-4 mr-2 text-brand-gold" />
          Higienização de mailing com Inteligência Artificial
        </div>

        <h1 className="text-4xl sm:text-5xl md:text-6xl font-extrabold text-brand-ink tracking-tight pb-4">
          Higienize seus mailings e
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-brand-blue to-brand-navy block mt-2 pb-2">
            dispare e-mail rapidamente
          </span>
        </h1>

        <p className="text-lg sm:text-xl text-brand-ink/70 max-w-3xl mx-auto mb-10">
          Classifique cargos, identifique interesses reais e crie abordagens personalizadas com
          Inteligência Artificial para elevar a conversão dos seus eventos.
        </p>

        <div className="flex flex-col sm:flex-row gap-4 justify-center items-center mb-16">
          {/* asChild: o Button vira o proprio Link, entao a navegacao e
              client-side e nao ha recarga de pagina. */}
          <Button
            asChild
            size="lg"
            className="h-auto px-8 py-4 text-base bg-brand-blue text-white shadow-lg hover:bg-brand-navy transition-colors duration-300 transform hover:-translate-y-1"
          >
            <Link to="/app">
              Acessar Aplicação
              <ArrowRight className="w-5 h-5 ml-2" />
            </Link>
          </Button>
          <Button
            asChild
            variant="outline"
            size="lg"
            className="h-auto px-8 py-4 text-base bg-white text-brand-ink border-brand-ink/15 shadow-sm hover:shadow-md hover:bg-white transition-all duration-300"
          >
            <a href="#recursos">
              <CheckCircle className="w-5 h-5 mr-2 text-brand-blue" />
              Ver recursos
            </a>
          </Button>
        </div>

        {/* Capacidades da plataforma */}
        <div
          id="entregabilidade"
          className="grid grid-cols-2 md:grid-cols-4 gap-8 max-w-4xl mx-auto scroll-mt-28"
        >
          {CAPACIDADES.map((item) => {
            const Icon = item.icon
            return (
              <div key={item.rotulo} className="text-center">
                <Icon className="w-5 h-5 text-brand-blue mx-auto mb-2" />
                <div className="text-lg font-bold text-brand-ink">{item.valor}</div>
                <div className="text-sm text-brand-ink/60">{item.rotulo}</div>
              </div>
            )
          })}
        </div>
      </div>

      {/* Recursos */}
      <div
        id="recursos"
        className="relative z-10 max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 pb-20 scroll-mt-28"
      >
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {RECURSOS.map((item) => {
            const Icon = item.icon
            return (
              <div
                key={item.title}
                className="bg-white/70 backdrop-blur-sm border border-white/50 rounded-2xl p-6 shadow-sm text-left"
              >
                <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-brand-blue to-brand-navy flex items-center justify-center shadow mb-4">
                  <Icon className="w-5 h-5 text-white" />
                </div>
                <h3 className="font-semibold text-brand-ink mb-1">{item.title}</h3>
                <p className="text-sm text-brand-ink/70 leading-relaxed">{item.description}</p>
              </div>
            )
          })}
        </div>
      </div>

      {/* Como funciona */}
      <div
        id="como-funciona"
        className="relative z-10 max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 pb-24 scroll-mt-28"
      >
        <h2 className="text-2xl font-bold text-brand-ink text-center mb-8">Como funciona</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {PASSOS.map((passo) => (
            <div key={passo.numero} className="text-left">
              {/* Dourado da paleta como destaque, com texto em brand.ink -
                  branco sobre #AD9600 nao teria contraste suficiente. */}
              <div className="w-8 h-8 rounded-full bg-brand-gold text-brand-ink font-bold text-sm flex items-center justify-center mb-3">
                {passo.numero}
              </div>
              <h3 className="font-semibold text-brand-ink mb-1">{passo.title}</h3>
              <p className="text-sm text-brand-ink/70 leading-relaxed">{passo.description}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Rodape */}
      <footer className="relative z-10 border-t border-brand-ink/10 py-8 text-center text-xs text-brand-ink/50">
        © {new Date().getFullYear()} Lista Válida – Gestão Inteligente de Mailings (listas).
      </footer>

      {/* Elementos flutuantes decorativos */}
      <div className="absolute top-1/4 left-10 w-6 h-6 rounded-full bg-brand-blue/20 blur-xl"></div>
      <div className="absolute bottom-1/3 right-16 w-10 h-10 rounded-full bg-brand-navy/20 blur-xl"></div>
      <div className="absolute top-1/3 right-1/4 w-8 h-8 rounded-full bg-brand-gold/20 blur-xl"></div>
    </div>
  )
}

export { HeroSection }
export default HeroSection
