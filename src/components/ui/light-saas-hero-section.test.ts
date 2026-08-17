// Testes de hexToRgb (src/components/ui/light-saas-hero-section.tsx).
// Funcao pura de conversao hex -> RGB normalizado (0..1), usada como cor
// customizada do shader do plasma. Exportada apenas com a palavra `export`
// adicionada ao nome existente - sem mudanca de comportamento - para ficar
// testavel isoladamente das partes que dependem de DOM/WebGL.
import { describe, expect, it } from 'vitest'
import { hexToRgb } from './light-saas-hero-section'

describe('hexToRgb', () => {
  it('dado_hex_com_cardinal_quando_converte_entao_retorna_tupla_rgb_normalizada', () => {
    expect(hexToRgb('#1800AD')).toEqual([
      0x18 / 255,
      0x00 / 255,
      0xad / 255,
    ])
  })

  it('dado_hex_sem_cardinal_quando_converte_entao_ainda_reconhece', () => {
    expect(hexToRgb('1800AD')).toEqual([
      0x18 / 255,
      0x00 / 255,
      0xad / 255,
    ])
  })

  it('dado_hex_minusculo_quando_converte_entao_converte_corretamente', () => {
    expect(hexToRgb('#ffffff')).toEqual([1, 1, 1])
  })

  it('dado_hex_preto_quando_converte_entao_retorna_tupla_zerada', () => {
    expect(hexToRgb('#000000')).toEqual([0, 0, 0])
  })

  it('dado_hex_invalido_quando_converte_entao_cai_no_fallback_laranja', () => {
    expect(hexToRgb('nao-e-um-hex')).toEqual([1, 0.5, 0.2])
  })

  it('dado_hex_com_tamanho_incorreto_quando_converte_entao_cai_no_fallback', () => {
    expect(hexToRgb('#18')).toEqual([1, 0.5, 0.2])
  })

  it('dado_string_vazia_quando_converte_entao_cai_no_fallback', () => {
    expect(hexToRgb('')).toEqual([1, 0.5, 0.2])
  })
})
