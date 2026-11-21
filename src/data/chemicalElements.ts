// Arquivo COMPARTILHADO com a loja (scripts/shared-ui.mjs): sem dependência de
// idioma do app — o idioma entra como parâmetro.

/** Idiomas com nome de elemento curado (mesmo conjunto de `AppLanguage` do catálogo). */
export type ElementLanguage = 'pt' | 'en' | 'es'
type AppLanguage = ElementLanguage

// Dados de referência da tabela periódica (fatos científicos, não string de
// UI — mesmo tratamento de src/data/mineralData.ts e do `formula`/
// `mineral_class` de minerals_reference: nome em pt/en/es guardado direto no
// dado, sem passar pelas chaves de src/locales/*.json). Usado só pela
// categoria virtual "Química" (features/categories/chemicalElementsCategory.ts
// e ChemistryCategoryPage.tsx) para desenhar a grade e resolver o nome
// exibido no idioma da UI.
//
// `row`/`col` seguem a disposição padrão IUPAC de 18 colunas; lantanídeos
// (57–71) e actinídeos (89–103) saem das linhas 6/7 (onde ficariam nas
// colunas 3–17) e viram duas linhas extras (8 e 9) abaixo da tabela
// principal — mesma convenção visual usada em qualquer tabela periódica
// impressa (e na tabela periódica em 3D do Google Arts & Culture, referência
// visual pedida pelo dono: https://artsexperiments.withgoogle.com/periodic-table).
//
// `category` segue a MESMA classificação em 10 famílias usada por aquele
// site (confirmado abrindo a página: Metal alcalino, Metal alcalinoterroso,
// Metal de transição, Metal pós-transição, Semimetal, Ametal reativo, Gás
// nobre, Lantanídeo, Actinídeo, Propriedades químicas desconhecidas — note
// que halogênio entra em "Ametal reativo", não é família própria). Elemento
// sintético pesado (Z≥104) sem propriedade química confirmada experimental-
// mente cai em 'unknown' quando a classificação é incerta — não afeta o
// catálogo de minerais na prática (nenhum ocorre em fórmula mineral).
export type ElementCategory =
  | 'alkali-metal'
  | 'alkaline-earth'
  | 'transition-metal'
  | 'post-transition-metal'
  | 'metalloid'
  | 'reactive-nonmetal'
  | 'noble-gas'
  | 'lanthanide'
  | 'actinide'
  | 'unknown'

export interface ElementInfo {
  symbol: string
  atomicNumber: number
  row: number
  col: number
  category: ElementCategory
  namePt: string
  nameEn: string
  nameEs: string
}

export const CHEMICAL_ELEMENTS: ElementInfo[] = [
  { symbol: 'H', atomicNumber: 1, row: 1, col: 1, category: 'reactive-nonmetal', namePt: 'Hidrogênio', nameEn: 'Hydrogen', nameEs: 'Hidrógeno' },
  { symbol: 'He', atomicNumber: 2, row: 1, col: 18, category: 'noble-gas', namePt: 'Hélio', nameEn: 'Helium', nameEs: 'Helio' },
  { symbol: 'Li', atomicNumber: 3, row: 2, col: 1, category: 'alkali-metal', namePt: 'Lítio', nameEn: 'Lithium', nameEs: 'Litio' },
  { symbol: 'Be', atomicNumber: 4, row: 2, col: 2, category: 'alkaline-earth', namePt: 'Berílio', nameEn: 'Beryllium', nameEs: 'Berilio' },
  { symbol: 'B', atomicNumber: 5, row: 2, col: 13, category: 'metalloid', namePt: 'Boro', nameEn: 'Boron', nameEs: 'Boro' },
  { symbol: 'C', atomicNumber: 6, row: 2, col: 14, category: 'reactive-nonmetal', namePt: 'Carbono', nameEn: 'Carbon', nameEs: 'Carbono' },
  { symbol: 'N', atomicNumber: 7, row: 2, col: 15, category: 'reactive-nonmetal', namePt: 'Nitrogênio', nameEn: 'Nitrogen', nameEs: 'Nitrógeno' },
  { symbol: 'O', atomicNumber: 8, row: 2, col: 16, category: 'reactive-nonmetal', namePt: 'Oxigênio', nameEn: 'Oxygen', nameEs: 'Oxígeno' },
  { symbol: 'F', atomicNumber: 9, row: 2, col: 17, category: 'reactive-nonmetal', namePt: 'Flúor', nameEn: 'Fluorine', nameEs: 'Flúor' },
  { symbol: 'Ne', atomicNumber: 10, row: 2, col: 18, category: 'noble-gas', namePt: 'Neônio', nameEn: 'Neon', nameEs: 'Neón' },
  { symbol: 'Na', atomicNumber: 11, row: 3, col: 1, category: 'alkali-metal', namePt: 'Sódio', nameEn: 'Sodium', nameEs: 'Sodio' },
  { symbol: 'Mg', atomicNumber: 12, row: 3, col: 2, category: 'alkaline-earth', namePt: 'Magnésio', nameEn: 'Magnesium', nameEs: 'Magnesio' },
  { symbol: 'Al', atomicNumber: 13, row: 3, col: 13, category: 'post-transition-metal', namePt: 'Alumínio', nameEn: 'Aluminium', nameEs: 'Aluminio' },
  { symbol: 'Si', atomicNumber: 14, row: 3, col: 14, category: 'metalloid', namePt: 'Silício', nameEn: 'Silicon', nameEs: 'Silicio' },
  { symbol: 'P', atomicNumber: 15, row: 3, col: 15, category: 'reactive-nonmetal', namePt: 'Fósforo', nameEn: 'Phosphorus', nameEs: 'Fósforo' },
  { symbol: 'S', atomicNumber: 16, row: 3, col: 16, category: 'reactive-nonmetal', namePt: 'Enxofre', nameEn: 'Sulfur', nameEs: 'Azufre' },
  { symbol: 'Cl', atomicNumber: 17, row: 3, col: 17, category: 'reactive-nonmetal', namePt: 'Cloro', nameEn: 'Chlorine', nameEs: 'Cloro' },
  { symbol: 'Ar', atomicNumber: 18, row: 3, col: 18, category: 'noble-gas', namePt: 'Argônio', nameEn: 'Argon', nameEs: 'Argón' },
  { symbol: 'K', atomicNumber: 19, row: 4, col: 1, category: 'alkali-metal', namePt: 'Potássio', nameEn: 'Potassium', nameEs: 'Potasio' },
  { symbol: 'Ca', atomicNumber: 20, row: 4, col: 2, category: 'alkaline-earth', namePt: 'Cálcio', nameEn: 'Calcium', nameEs: 'Calcio' },
  { symbol: 'Sc', atomicNumber: 21, row: 4, col: 3, category: 'transition-metal', namePt: 'Escândio', nameEn: 'Scandium', nameEs: 'Escandio' },
  { symbol: 'Ti', atomicNumber: 22, row: 4, col: 4, category: 'transition-metal', namePt: 'Titânio', nameEn: 'Titanium', nameEs: 'Titanio' },
  { symbol: 'V', atomicNumber: 23, row: 4, col: 5, category: 'transition-metal', namePt: 'Vanádio', nameEn: 'Vanadium', nameEs: 'Vanadio' },
  { symbol: 'Cr', atomicNumber: 24, row: 4, col: 6, category: 'transition-metal', namePt: 'Cromo', nameEn: 'Chromium', nameEs: 'Cromo' },
  { symbol: 'Mn', atomicNumber: 25, row: 4, col: 7, category: 'transition-metal', namePt: 'Manganês', nameEn: 'Manganese', nameEs: 'Manganeso' },
  { symbol: 'Fe', atomicNumber: 26, row: 4, col: 8, category: 'transition-metal', namePt: 'Ferro', nameEn: 'Iron', nameEs: 'Hierro' },
  { symbol: 'Co', atomicNumber: 27, row: 4, col: 9, category: 'transition-metal', namePt: 'Cobalto', nameEn: 'Cobalt', nameEs: 'Cobalto' },
  { symbol: 'Ni', atomicNumber: 28, row: 4, col: 10, category: 'transition-metal', namePt: 'Níquel', nameEn: 'Nickel', nameEs: 'Níquel' },
  { symbol: 'Cu', atomicNumber: 29, row: 4, col: 11, category: 'transition-metal', namePt: 'Cobre', nameEn: 'Copper', nameEs: 'Cobre' },
  { symbol: 'Zn', atomicNumber: 30, row: 4, col: 12, category: 'transition-metal', namePt: 'Zinco', nameEn: 'Zinc', nameEs: 'Zinc' },
  { symbol: 'Ga', atomicNumber: 31, row: 4, col: 13, category: 'post-transition-metal', namePt: 'Gálio', nameEn: 'Gallium', nameEs: 'Galio' },
  { symbol: 'Ge', atomicNumber: 32, row: 4, col: 14, category: 'metalloid', namePt: 'Germânio', nameEn: 'Germanium', nameEs: 'Germanio' },
  { symbol: 'As', atomicNumber: 33, row: 4, col: 15, category: 'metalloid', namePt: 'Arsênio', nameEn: 'Arsenic', nameEs: 'Arsénico' },
  { symbol: 'Se', atomicNumber: 34, row: 4, col: 16, category: 'reactive-nonmetal', namePt: 'Selênio', nameEn: 'Selenium', nameEs: 'Selenio' },
  { symbol: 'Br', atomicNumber: 35, row: 4, col: 17, category: 'reactive-nonmetal', namePt: 'Bromo', nameEn: 'Bromine', nameEs: 'Bromo' },
  { symbol: 'Kr', atomicNumber: 36, row: 4, col: 18, category: 'noble-gas', namePt: 'Criptônio', nameEn: 'Krypton', nameEs: 'Kriptón' },
  { symbol: 'Rb', atomicNumber: 37, row: 5, col: 1, category: 'alkali-metal', namePt: 'Rubídio', nameEn: 'Rubidium', nameEs: 'Rubidio' },
  { symbol: 'Sr', atomicNumber: 38, row: 5, col: 2, category: 'alkaline-earth', namePt: 'Estrôncio', nameEn: 'Strontium', nameEs: 'Estroncio' },
  { symbol: 'Y', atomicNumber: 39, row: 5, col: 3, category: 'transition-metal', namePt: 'Ítrio', nameEn: 'Yttrium', nameEs: 'Itrio' },
  { symbol: 'Zr', atomicNumber: 40, row: 5, col: 4, category: 'transition-metal', namePt: 'Zircônio', nameEn: 'Zirconium', nameEs: 'Zirconio' },
  { symbol: 'Nb', atomicNumber: 41, row: 5, col: 5, category: 'transition-metal', namePt: 'Nióbio', nameEn: 'Niobium', nameEs: 'Niobio' },
  { symbol: 'Mo', atomicNumber: 42, row: 5, col: 6, category: 'transition-metal', namePt: 'Molibdênio', nameEn: 'Molybdenum', nameEs: 'Molibdeno' },
  { symbol: 'Tc', atomicNumber: 43, row: 5, col: 7, category: 'transition-metal', namePt: 'Tecnécio', nameEn: 'Technetium', nameEs: 'Tecnecio' },
  { symbol: 'Ru', atomicNumber: 44, row: 5, col: 8, category: 'transition-metal', namePt: 'Rutênio', nameEn: 'Ruthenium', nameEs: 'Rutenio' },
  { symbol: 'Rh', atomicNumber: 45, row: 5, col: 9, category: 'transition-metal', namePt: 'Ródio', nameEn: 'Rhodium', nameEs: 'Rodio' },
  { symbol: 'Pd', atomicNumber: 46, row: 5, col: 10, category: 'transition-metal', namePt: 'Paládio', nameEn: 'Palladium', nameEs: 'Paladio' },
  { symbol: 'Ag', atomicNumber: 47, row: 5, col: 11, category: 'transition-metal', namePt: 'Prata', nameEn: 'Silver', nameEs: 'Plata' },
  { symbol: 'Cd', atomicNumber: 48, row: 5, col: 12, category: 'transition-metal', namePt: 'Cádmio', nameEn: 'Cadmium', nameEs: 'Cadmio' },
  { symbol: 'In', atomicNumber: 49, row: 5, col: 13, category: 'post-transition-metal', namePt: 'Índio', nameEn: 'Indium', nameEs: 'Indio' },
  { symbol: 'Sn', atomicNumber: 50, row: 5, col: 14, category: 'post-transition-metal', namePt: 'Estanho', nameEn: 'Tin', nameEs: 'Estaño' },
  { symbol: 'Sb', atomicNumber: 51, row: 5, col: 15, category: 'metalloid', namePt: 'Antimônio', nameEn: 'Antimony', nameEs: 'Antimonio' },
  { symbol: 'Te', atomicNumber: 52, row: 5, col: 16, category: 'metalloid', namePt: 'Telúrio', nameEn: 'Tellurium', nameEs: 'Telurio' },
  { symbol: 'I', atomicNumber: 53, row: 5, col: 17, category: 'reactive-nonmetal', namePt: 'Iodo', nameEn: 'Iodine', nameEs: 'Yodo' },
  { symbol: 'Xe', atomicNumber: 54, row: 5, col: 18, category: 'noble-gas', namePt: 'Xenônio', nameEn: 'Xenon', nameEs: 'Xenón' },
  { symbol: 'Cs', atomicNumber: 55, row: 6, col: 1, category: 'alkali-metal', namePt: 'Césio', nameEn: 'Caesium', nameEs: 'Cesio' },
  { symbol: 'Ba', atomicNumber: 56, row: 6, col: 2, category: 'alkaline-earth', namePt: 'Bário', nameEn: 'Barium', nameEs: 'Bario' },
  { symbol: 'La', atomicNumber: 57, row: 8, col: 3, category: 'lanthanide', namePt: 'Lantânio', nameEn: 'Lanthanum', nameEs: 'Lantano' },
  { symbol: 'Ce', atomicNumber: 58, row: 8, col: 4, category: 'lanthanide', namePt: 'Cério', nameEn: 'Cerium', nameEs: 'Cerio' },
  { symbol: 'Pr', atomicNumber: 59, row: 8, col: 5, category: 'lanthanide', namePt: 'Praseodímio', nameEn: 'Praseodymium', nameEs: 'Praseodimio' },
  { symbol: 'Nd', atomicNumber: 60, row: 8, col: 6, category: 'lanthanide', namePt: 'Neodímio', nameEn: 'Neodymium', nameEs: 'Neodimio' },
  { symbol: 'Pm', atomicNumber: 61, row: 8, col: 7, category: 'lanthanide', namePt: 'Promécio', nameEn: 'Promethium', nameEs: 'Prometio' },
  { symbol: 'Sm', atomicNumber: 62, row: 8, col: 8, category: 'lanthanide', namePt: 'Samário', nameEn: 'Samarium', nameEs: 'Samario' },
  { symbol: 'Eu', atomicNumber: 63, row: 8, col: 9, category: 'lanthanide', namePt: 'Európio', nameEn: 'Europium', nameEs: 'Europio' },
  { symbol: 'Gd', atomicNumber: 64, row: 8, col: 10, category: 'lanthanide', namePt: 'Gadolínio', nameEn: 'Gadolinium', nameEs: 'Gadolinio' },
  { symbol: 'Tb', atomicNumber: 65, row: 8, col: 11, category: 'lanthanide', namePt: 'Térbio', nameEn: 'Terbium', nameEs: 'Terbio' },
  { symbol: 'Dy', atomicNumber: 66, row: 8, col: 12, category: 'lanthanide', namePt: 'Disprósio', nameEn: 'Dysprosium', nameEs: 'Disprosio' },
  { symbol: 'Ho', atomicNumber: 67, row: 8, col: 13, category: 'lanthanide', namePt: 'Hólmio', nameEn: 'Holmium', nameEs: 'Holmio' },
  { symbol: 'Er', atomicNumber: 68, row: 8, col: 14, category: 'lanthanide', namePt: 'Érbio', nameEn: 'Erbium', nameEs: 'Erbio' },
  { symbol: 'Tm', atomicNumber: 69, row: 8, col: 15, category: 'lanthanide', namePt: 'Túlio', nameEn: 'Thulium', nameEs: 'Tulio' },
  { symbol: 'Yb', atomicNumber: 70, row: 8, col: 16, category: 'lanthanide', namePt: 'Itérbio', nameEn: 'Ytterbium', nameEs: 'Iterbio' },
  { symbol: 'Lu', atomicNumber: 71, row: 8, col: 17, category: 'lanthanide', namePt: 'Lutécio', nameEn: 'Lutetium', nameEs: 'Lutecio' },
  { symbol: 'Hf', atomicNumber: 72, row: 6, col: 4, category: 'transition-metal', namePt: 'Háfnio', nameEn: 'Hafnium', nameEs: 'Hafnio' },
  { symbol: 'Ta', atomicNumber: 73, row: 6, col: 5, category: 'transition-metal', namePt: 'Tântalo', nameEn: 'Tantalum', nameEs: 'Tantalio' },
  { symbol: 'W', atomicNumber: 74, row: 6, col: 6, category: 'transition-metal', namePt: 'Tungstênio', nameEn: 'Tungsten', nameEs: 'Wolframio' },
  { symbol: 'Re', atomicNumber: 75, row: 6, col: 7, category: 'transition-metal', namePt: 'Rênio', nameEn: 'Rhenium', nameEs: 'Renio' },
  { symbol: 'Os', atomicNumber: 76, row: 6, col: 8, category: 'transition-metal', namePt: 'Ósmio', nameEn: 'Osmium', nameEs: 'Osmio' },
  { symbol: 'Ir', atomicNumber: 77, row: 6, col: 9, category: 'transition-metal', namePt: 'Irídio', nameEn: 'Iridium', nameEs: 'Iridio' },
  { symbol: 'Pt', atomicNumber: 78, row: 6, col: 10, category: 'transition-metal', namePt: 'Platina', nameEn: 'Platinum', nameEs: 'Platino' },
  { symbol: 'Au', atomicNumber: 79, row: 6, col: 11, category: 'transition-metal', namePt: 'Ouro', nameEn: 'Gold', nameEs: 'Oro' },
  { symbol: 'Hg', atomicNumber: 80, row: 6, col: 12, category: 'transition-metal', namePt: 'Mercúrio', nameEn: 'Mercury', nameEs: 'Mercurio' },
  { symbol: 'Tl', atomicNumber: 81, row: 6, col: 13, category: 'post-transition-metal', namePt: 'Tálio', nameEn: 'Thallium', nameEs: 'Talio' },
  { symbol: 'Pb', atomicNumber: 82, row: 6, col: 14, category: 'post-transition-metal', namePt: 'Chumbo', nameEn: 'Lead', nameEs: 'Plomo' },
  { symbol: 'Bi', atomicNumber: 83, row: 6, col: 15, category: 'post-transition-metal', namePt: 'Bismuto', nameEn: 'Bismuth', nameEs: 'Bismuto' },
  { symbol: 'Po', atomicNumber: 84, row: 6, col: 16, category: 'post-transition-metal', namePt: 'Polônio', nameEn: 'Polonium', nameEs: 'Polonio' },
  { symbol: 'At', atomicNumber: 85, row: 6, col: 17, category: 'metalloid', namePt: 'Astato', nameEn: 'Astatine', nameEs: 'Astato' },
  { symbol: 'Rn', atomicNumber: 86, row: 6, col: 18, category: 'noble-gas', namePt: 'Radônio', nameEn: 'Radon', nameEs: 'Radón' },
  { symbol: 'Fr', atomicNumber: 87, row: 7, col: 1, category: 'alkali-metal', namePt: 'Frâncio', nameEn: 'Francium', nameEs: 'Francio' },
  { symbol: 'Ra', atomicNumber: 88, row: 7, col: 2, category: 'alkaline-earth', namePt: 'Rádio', nameEn: 'Radium', nameEs: 'Radio' },
  { symbol: 'Ac', atomicNumber: 89, row: 9, col: 3, category: 'actinide', namePt: 'Actínio', nameEn: 'Actinium', nameEs: 'Actinio' },
  { symbol: 'Th', atomicNumber: 90, row: 9, col: 4, category: 'actinide', namePt: 'Tório', nameEn: 'Thorium', nameEs: 'Torio' },
  { symbol: 'Pa', atomicNumber: 91, row: 9, col: 5, category: 'actinide', namePt: 'Protactínio', nameEn: 'Protactinium', nameEs: 'Protactinio' },
  { symbol: 'U', atomicNumber: 92, row: 9, col: 6, category: 'actinide', namePt: 'Urânio', nameEn: 'Uranium', nameEs: 'Uranio' },
  { symbol: 'Np', atomicNumber: 93, row: 9, col: 7, category: 'actinide', namePt: 'Netúnio', nameEn: 'Neptunium', nameEs: 'Neptunio' },
  { symbol: 'Pu', atomicNumber: 94, row: 9, col: 8, category: 'actinide', namePt: 'Plutônio', nameEn: 'Plutonium', nameEs: 'Plutonio' },
  { symbol: 'Am', atomicNumber: 95, row: 9, col: 9, category: 'actinide', namePt: 'Amerício', nameEn: 'Americium', nameEs: 'Americio' },
  { symbol: 'Cm', atomicNumber: 96, row: 9, col: 10, category: 'actinide', namePt: 'Cúrio', nameEn: 'Curium', nameEs: 'Curio' },
  { symbol: 'Bk', atomicNumber: 97, row: 9, col: 11, category: 'actinide', namePt: 'Berquélio', nameEn: 'Berkelium', nameEs: 'Berkelio' },
  { symbol: 'Cf', atomicNumber: 98, row: 9, col: 12, category: 'actinide', namePt: 'Califórnio', nameEn: 'Californium', nameEs: 'Californio' },
  { symbol: 'Es', atomicNumber: 99, row: 9, col: 13, category: 'actinide', namePt: 'Einstênio', nameEn: 'Einsteinium', nameEs: 'Einstenio' },
  { symbol: 'Fm', atomicNumber: 100, row: 9, col: 14, category: 'actinide', namePt: 'Férmio', nameEn: 'Fermium', nameEs: 'Fermio' },
  { symbol: 'Md', atomicNumber: 101, row: 9, col: 15, category: 'actinide', namePt: 'Mendelévio', nameEn: 'Mendelevium', nameEs: 'Mendelevio' },
  { symbol: 'No', atomicNumber: 102, row: 9, col: 16, category: 'actinide', namePt: 'Nobélio', nameEn: 'Nobelium', nameEs: 'Nobelio' },
  { symbol: 'Lr', atomicNumber: 103, row: 9, col: 17, category: 'actinide', namePt: 'Laurêncio', nameEn: 'Lawrencium', nameEs: 'Laurencio' },
  { symbol: 'Rf', atomicNumber: 104, row: 7, col: 4, category: 'transition-metal', namePt: 'Rutherfórdio', nameEn: 'Rutherfordium', nameEs: 'Rutherfordio' },
  { symbol: 'Db', atomicNumber: 105, row: 7, col: 5, category: 'transition-metal', namePt: 'Dúbnio', nameEn: 'Dubnium', nameEs: 'Dubnio' },
  { symbol: 'Sg', atomicNumber: 106, row: 7, col: 6, category: 'transition-metal', namePt: 'Seabórgio', nameEn: 'Seaborgium', nameEs: 'Seaborgio' },
  { symbol: 'Bh', atomicNumber: 107, row: 7, col: 7, category: 'transition-metal', namePt: 'Bóhrio', nameEn: 'Bohrium', nameEs: 'Bohrio' },
  { symbol: 'Hs', atomicNumber: 108, row: 7, col: 8, category: 'transition-metal', namePt: 'Hássio', nameEn: 'Hassium', nameEs: 'Hasio' },
  { symbol: 'Mt', atomicNumber: 109, row: 7, col: 9, category: 'unknown', namePt: 'Meitnério', nameEn: 'Meitnerium', nameEs: 'Meitnerio' },
  { symbol: 'Ds', atomicNumber: 110, row: 7, col: 10, category: 'unknown', namePt: 'Darmstácio', nameEn: 'Darmstadtium', nameEs: 'Darmstadio' },
  { symbol: 'Rg', atomicNumber: 111, row: 7, col: 11, category: 'unknown', namePt: 'Roentgênio', nameEn: 'Roentgenium', nameEs: 'Roentgenio' },
  { symbol: 'Cn', atomicNumber: 112, row: 7, col: 12, category: 'transition-metal', namePt: 'Copernício', nameEn: 'Copernicium', nameEs: 'Copernicio' },
  { symbol: 'Nh', atomicNumber: 113, row: 7, col: 13, category: 'unknown', namePt: 'Nihônio', nameEn: 'Nihonium', nameEs: 'Nihonio' },
  { symbol: 'Fl', atomicNumber: 114, row: 7, col: 14, category: 'post-transition-metal', namePt: 'Fleróvio', nameEn: 'Flerovium', nameEs: 'Flerovio' },
  { symbol: 'Mc', atomicNumber: 115, row: 7, col: 15, category: 'unknown', namePt: 'Moscóvio', nameEn: 'Moscovium', nameEs: 'Moscovio' },
  { symbol: 'Lv', atomicNumber: 116, row: 7, col: 16, category: 'unknown', namePt: 'Livermório', nameEn: 'Livermorium', nameEs: 'Livermorio' },
  { symbol: 'Ts', atomicNumber: 117, row: 7, col: 17, category: 'unknown', namePt: 'Tenessino', nameEn: 'Tennessine', nameEs: 'Teneso' },
  { symbol: 'Og', atomicNumber: 118, row: 7, col: 18, category: 'unknown', namePt: 'Oganessônio', nameEn: 'Oganesson', nameEs: 'Oganesón' },
]

export const ELEMENT_SYMBOLS: readonly string[] = CHEMICAL_ELEMENTS.map((e) => e.symbol)

const BY_SYMBOL = new Map(CHEMICAL_ELEMENTS.map((e) => [e.symbol, e]))

export function elementInfo(symbol: string): ElementInfo | undefined {
  return BY_SYMBOL.get(symbol)
}

export function elementName(symbol: string, lang: AppLanguage): string {
  const e = BY_SYMBOL.get(symbol)
  if (!e) return symbol
  return lang === 'pt' ? e.namePt : lang === 'es' ? e.nameEs : e.nameEn
}

/** Cor de fundo por família química — mesma paleta/famílias da tabela
 *  periódica em 3D do Google Arts & Culture (ver comentário no topo). */
export const ELEMENT_CATEGORY_COLORS: Record<ElementCategory, string> = {
  'alkali-metal': '#fb7185',
  'alkaline-earth': '#fb923c',
  'transition-metal': '#fbbf24',
  'post-transition-metal': '#a3e635',
  metalloid: '#34d399',
  'reactive-nonmetal': '#22d3ee',
  'noble-gas': '#818cf8',
  lanthanide: '#e879f9',
  actinide: '#f472b6',
  unknown: '#94a3b8',
}

const CATEGORY_LABELS: Record<ElementCategory, { pt: string; en: string; es: string }> = {
  'alkali-metal': { pt: 'Metal alcalino', en: 'Alkali metal', es: 'Metal alcalino' },
  'alkaline-earth': { pt: 'Metal alcalinoterroso', en: 'Alkaline earth metal', es: 'Metal alcalinotérreo' },
  'transition-metal': { pt: 'Metal de transição', en: 'Transition metal', es: 'Metal de transición' },
  'post-transition-metal': { pt: 'Metal pós-transição', en: 'Post-transition metal', es: 'Metal post-transición' },
  metalloid: { pt: 'Semimetal', en: 'Metalloid', es: 'Metaloide' },
  'reactive-nonmetal': { pt: 'Ametal reativo', en: 'Reactive nonmetal', es: 'No metal reactivo' },
  'noble-gas': { pt: 'Gás nobre', en: 'Noble gas', es: 'Gas noble' },
  lanthanide: { pt: 'Lantanídeo', en: 'Lanthanide', es: 'Lantánido' },
  actinide: { pt: 'Actinídeo', en: 'Actinide', es: 'Actínido' },
  unknown: { pt: 'Propriedades químicas desconhecidas', en: 'Unknown chemical properties', es: 'Propiedades químicas desconocidas' },
}

export function categoryLabel(category: ElementCategory, lang: AppLanguage): string {
  const l = CATEGORY_LABELS[category]
  return lang === 'pt' ? l.pt : lang === 'es' ? l.es : l.en
}
