// Testes de src/components/ui/logo.tsx (BrandLogo, BrandLogoStacked, BrandMark).
// Componentes puros sem estado: renderizados via renderToStaticMarkup
// (react-dom/server), que produz HTML estatico sem precisar de jsdom/DOM -
// nao ha @testing-library/react nem jsdom instalados neste projeto, entao
// nao dependemos deles aqui.
import { describe, expect, it } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'
import { BrandLogo, BrandLogoStacked, BrandMark } from './logo'

describe('BrandLogo', () => {
  it('dado_variante_padrao_quando_renderiza_entao_usa_a_arte_colorida', () => {
    const html = renderToStaticMarkup(BrandLogo({}))

    expect(html).toContain('logo-lista-valida.png')
    expect(html).not.toContain('logo-lista-valida-branco.png')
  })

  it('dado_variante_branco_quando_renderiza_entao_usa_a_arte_branca', () => {
    const html = renderToStaticMarkup(BrandLogo({ variante: 'branco' }))

    expect(html).toContain('logo-lista-valida-branco.png')
  })

  it('dado_sem_classname_quando_renderiza_entao_aplica_a_altura_padrao_h9', () => {
    const html = renderToStaticMarkup(BrandLogo({}))

    expect(html).toContain('class="h-9 w-auto"')
  })

  it('dado_classname_customizado_quando_renderiza_entao_substitui_a_altura_padrao', () => {
    const html = renderToStaticMarkup(BrandLogo({ className: 'h-20' }))

    expect(html).toContain('class="h-20 w-auto"')
    expect(html).not.toContain('h-9')
  })

  it('dado_qualquer_variante_quando_renderiza_entao_mantem_o_alt_text_da_marca', () => {
    const html = renderToStaticMarkup(BrandLogo({}))

    expect(html).toContain('alt="Lista Válida"')
  })
})

describe('BrandLogoStacked', () => {
  it('dado_variante_padrao_quando_renderiza_entao_usa_a_arte_vertical_colorida', () => {
    const html = renderToStaticMarkup(BrandLogoStacked({}))

    expect(html).toContain('logo-lista-valida-vertical.png')
    expect(html).not.toContain('logo-lista-valida-vertical-branco.png')
  })

  it('dado_variante_branco_quando_renderiza_entao_usa_a_arte_vertical_branca', () => {
    const html = renderToStaticMarkup(BrandLogoStacked({ variante: 'branco' }))

    expect(html).toContain('logo-lista-valida-vertical-branco.png')
  })

  it('dado_sem_classname_quando_renderiza_entao_aplica_a_altura_padrao_h16', () => {
    const html = renderToStaticMarkup(BrandLogoStacked({}))

    expect(html).toContain('class="h-16 w-auto"')
  })
})

describe('BrandMark', () => {
  it('dado_variante_padrao_quando_renderiza_entao_usa_o_icone_colorido', () => {
    const html = renderToStaticMarkup(BrandMark({}))

    expect(html).toContain('mark-lista-valida.png')
    expect(html).not.toContain('mark-lista-valida-branco.png')
  })

  it('dado_variante_branco_quando_renderiza_entao_usa_o_icone_branco', () => {
    const html = renderToStaticMarkup(BrandMark({ variante: 'branco' }))

    expect(html).toContain('mark-lista-valida-branco.png')
  })

  it('dado_sem_classname_quando_renderiza_entao_aplica_a_altura_padrao_h9', () => {
    const html = renderToStaticMarkup(BrandMark({}))

    expect(html).toContain('class="h-9 w-auto"')
  })

  it('dado_classname_customizado_quando_renderiza_entao_substitui_a_altura_padrao', () => {
    const html = renderToStaticMarkup(BrandMark({ className: 'h-4' }))

    expect(html).toContain('class="h-4 w-auto"')
  })
})
