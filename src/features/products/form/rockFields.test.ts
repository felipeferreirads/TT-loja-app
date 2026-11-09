import { describe, expect, it } from 'vitest'
import { emptyRockRow, isBlankRockRow, rockRowToInput, rocksSectionApplies, subtypeOptions } from './rockFields'

describe('rocksSectionApplies', () => {
  it('mineral, fóssil e outro sempre; meteorito só Impactito; joia nunca', () => {
    expect(rocksSectionApplies('mineral')).toBe(true)
    expect(rocksSectionApplies('fossil')).toBe(true)
    expect(rocksSectionApplies('other')).toBe(true)
    expect(rocksSectionApplies('meteorite', 'Rochoso')).toBe(false)
    expect(rocksSectionApplies('meteorite')).toBe(false)
    expect(rocksSectionApplies('meteorite', 'Impactito')).toBe(true)
    expect(rocksSectionApplies('jewelry')).toBe(false)
  })
})

describe('rockRowToInput', () => {
  it('grava nulo nos campos que não se aplicam ao tipo/subtipo', () => {
    const row = { ...emptyRockRow(), name: ' Granito ', rock_type: 'igneous', subtype: 'plutonic', color_index: 'light', cement: 'siliceous', hcl_reaction: 'weak', crater: 'Ries' }
    const out = rockRowToInput(row)
    expect(out.name).toBe('Granito')
    expect(out.color_index).toBe('light')
    expect(out.cement).toBeNull()
    expect(out.hcl_reaction).toBeNull()
    expect(out.crater).toBeNull()
  })

  it('subtipo de outro tipo é descartado; textura multivalor é normalizada', () => {
    const row = { ...emptyRockRow(), rock_type: 'sedimentary', subtype: 'plutonic', texture: 'glassy;  vesicular' }
    const out = rockRowToInput(row)
    expect(out.subtype).toBeNull()
    expect(out.texture).toBe('glassy, vesicular')
  })

  it('subtypeOptions segue o tipo e linha vazia é detectada', () => {
    expect(subtypeOptions('impact').map((o) => o.value)).toContain('tektite')
    expect(subtypeOptions('')).toEqual([])
    expect(isBlankRockRow(emptyRockRow())).toBe(true)
  })
})
