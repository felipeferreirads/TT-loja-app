import { describe, expect, it } from 'vitest'
import { isNfeXml, nfeAmounts, parseNfeXml } from './nfeXml'

// Layout nacional da NF-e (nfeProc), com os valores de uma nota real de compra.
const XML = `<?xml version="1.0" encoding="UTF-8"?>
<nfeProc xmlns="http://www.portalfiscal.inf.br/nfe" versao="4.00">
<NFe><infNFe Id="NFe43261100695931000151550010000079661560622140" versao="4.00">
<ide><cUF>43</cUF><natOp>Venda de Mercadorias para Outros Estados</natOp><serie>1</serie><nNF>7966</nNF>
<dhEmi>2026-11-17T13:46:01-03:00</dhEmi></ide>
<emit><CNPJ>00695931000151</CNPJ><xNome>Bortoluzzi Com e Exp de Pedras Preciosas Ltda</xNome></emit>
<dest><CNPJ>69421122000158</CNPJ><xNome>TESOUROS DA TERRA ECOMMERCE LTDA</xNome></dest>
<det nItem="1"><prod><cProd>030019</cProd><cEAN>SEM GTIN</cEAN><xProd>DRUZAS DE AMETISTA EM BRUTO</xProd>
<NCM>71031000</NCM><CFOP>6102</CFOP><uCom>KG</uCom><qCom>234.4900</qCom><vUnCom>11.0000000000</vUnCom>
<vProd>2579.39</vProd></prod><imposto><ICMS><ICMS00><vICMS>309.53</vICMS></ICMS00></ICMS></imposto></det>
<det nItem="2"><prod><cProd>A&amp;B</cProd><xProd>GEODO &quot;CAPELA&quot;</xProd><NCM>71031000</NCM>
<CFOP>6102</CFOP><uCom>UN</uCom><qCom>2.0000</qCom><vUnCom>50.00</vUnCom><vProd>100.00</vProd></prod></det>
<total><ICMSTot><vICMS>309.53</vICMS><vST>0.00</vST><vProd>2679.39</vProd><vFrete>0.00</vFrete><vSeg>0.00</vSeg>
<vDesc>10.00</vDesc><vIPI>5.00</vIPI><vOutro>0.00</vOutro><vNF>2674.39</vNF></ICMSTot></total>
<transp><modFrete>0</modFrete><transporta><CNPJ>89317697000132</CNPJ><xNome>TW TRANSPORTES E LOGISTICA LTDA</xNome></transporta></transp>
<infAdic><infCpl>ROMANEIO No 007787/2026</infCpl></infAdic>
</infNFe></NFe>
<protNFe versao="4.00"><infProt><chNFe>43261100695931000151550010000079661560622140</chNFe>
<nProt>243260478375457</nProt></infProt></protNFe>
</nfeProc>`

describe('parseNfeXml', () => {
  const d = parseNfeXml(XML)

  it('lê a identificação da nota', () => {
    expect(d.key).toBe('43261100695931000151550010000079661560622140')
    expect(d.number).toBe('7966')
    expect(d.series).toBe('1')
    expect(d.issueDate).toBe('2026-11-17')
    expect(d.protocol).toBe('243260478375457')
    expect(d.issuerTaxId).toBe('00695931000151')
    expect(d.issuerName).toBe('Bortoluzzi Com e Exp de Pedras Preciosas Ltda')
    expect(d.recipientTaxId).toBe('69421122000158')
    expect(d.carrierName).toBe('TW TRANSPORTES E LOGISTICA LTDA')
    expect(d.additionalInfo).toBe('ROMANEIO No 007787/2026')
  })

  it('lê todas as linhas de produto, com entidades decodificadas', () => {
    expect(d.items).toHaveLength(2)
    expect(d.items[0]).toEqual({
      product_code: '030019',
      description: 'DRUZAS DE AMETISTA EM BRUTO',
      ncm: '71031000',
      cfop: '6102',
      unit: 'KG',
      quantity: 234.49,
      unit_price: 11,
      total: 2579.39,
    })
    expect(d.items[1].product_code).toBe('A&B')
    expect(d.items[1].description).toBe('GEODO "CAPELA"')
  })

  it('valores da compra: desconto abatido dos produtos, IPI em impostos, frete zero vira vazio', () => {
    expect(nfeAmounts(d)).toEqual({ goods: 2669.39, freight: null, fees: 5 })
  })

  it('aceita tags com prefixo de namespace e chave só no atributo Id', () => {
    const xml = `<nfe:NFe><nfe:infNFe Id="NFe${'1'.repeat(44)}"><nfe:ide><nfe:nNF>12</nfe:nNF></nfe:ide></nfe:infNFe></nfe:NFe>`
    const p = parseNfeXml(xml)
    expect(p.key).toBe('1'.repeat(44))
    expect(p.number).toBe('12')
    expect(p.items).toEqual([])
  })

  it('recusa arquivo que não é NF-e', () => {
    expect(isNfeXml('<xml><a/></xml>')).toBe(false)
    expect(() => parseNfeXml('<xml><a/></xml>')).toThrow()
  })
})
