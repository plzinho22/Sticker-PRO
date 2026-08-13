/* ============================================================
   STICKER PRO — TEXTOS E CATEGORIAS
   ------------------------------------------------------------
   Aqui ficam só nomes, descrições e aulas.
   Os LINKS das pastas ficam em config.js (ou no Supabase,
   quando modoSeguro estiver ligado).
   ============================================================ */

window.STICKER_CONTEUDO = {

  marca: { nome: 'Sticker Pro', produto: 'Sticker Pro Premium' },

  /* Cada seção corresponde a uma pasta do seu Drive.
     "pasta" é a chave usada em config.pastas — não mude. */
  secoes: {

    premium: {
      pasta: 'premium',
      titulo: 'Figurinhas Premium',
      emoji: '🎀',
      chamada: 'Explore sua coleção Premium.',
      intro: 'Sua biblioteca principal. Toque em uma categoria para abrir a pasta e baixar o que quiser.',
      categorias: [
        { id: 'lifestyle', nome: 'Lifestyle', nota: 'Dia a dia e bem-estar', emoji: '🎀' },
        { id: 'rotina',    nome: 'Rotina',    nota: 'Manhã, treino, trabalho', emoji: '✨' },
        { id: 'cafe',      nome: 'Café',      nota: 'Xícaras, padaria, café da manhã', emoji: '☕' },
        { id: 'beleza',    nome: 'Beleza',    nota: 'Skincare, maquiagem, unhas', emoji: '💄' },
        { id: 'moda',      nome: 'Moda',      nota: 'Looks, sapatos, acessórios', emoji: '👜' },
        { id: 'frases',    nome: 'Frases',    nota: 'Textos prontos para aplicar', emoji: '💬' },
        { id: 'feminino',  nome: 'Feminino',  nota: 'Flores, laços, corações', emoji: '🌸' },
        { id: 'viagem',    nome: 'Viagem',    nota: 'Praia, avião, passeios', emoji: '✈️' },
        { id: 'comida',    nome: 'Comida',    nota: 'Doces, frutas, receitas', emoji: '🍓' },
        { id: 'estetica',  nome: 'Estética',  nota: 'Formas e texturas suaves', emoji: '🤍' },
        { id: 'diversos',  nome: 'Diversos',  nota: 'Um pouco de tudo', emoji: '⭐' }
      ]
    },

    figurinhas: {
      pasta: 'figurinhas',
      titulo: 'Figurinhas',
      emoji: '✨',
      chamada: 'Encontre elementos para todos os momentos.',
      intro: 'A coleção geral do Sticker Pro.',
      categorias: [
        { id: 'fig-geral', nome: 'Coleção completa', nota: 'Todos os elementos desta pasta', emoji: '✨' }
      ]
    },

    minimalistas: {
      pasta: 'minimalistas',
      titulo: 'Minimalistas',
      emoji: '🤍',
      chamada: 'Detalhes delicados para seus Stories.',
      intro: 'Traços finos e formas simples, para uma composição mais limpa.',
      categorias: [
        { id: 'min-geral', nome: 'Coleção minimalista', nota: 'Todos os elementos desta pasta', emoji: '🤍' }
      ]
    },

    icones: {
      pasta: 'icones',
      titulo: 'Ícones',
      emoji: '⭐',
      chamada: 'Pequenos detalhes para deixar seus Stories ainda mais bonitos.',
      intro: 'Elementos pequenos para destacar pontos do seu Story.',
      categorias: [
        { id: 'icones-geral', nome: 'Coleção de ícones', nota: 'Todos os elementos desta pasta', emoji: '⭐' }
      ]
    }
  },

  /* ---------------- COMECE AQUI ---------------- */
  etapas: [
    {
      numero: '01',
      titulo: 'Acesse sua biblioteca',
      resumo: 'Onde estão os seus conteúdos.',
      passos: [
        'No menu, toque em <b>Figurinhas Premium</b>, <b>Figurinhas</b>, <b>Minimalistas</b> ou <b>Ícones</b>.',
        'Escolha a categoria que combina com o que você vai postar.',
        'Toque em <b>Abrir pasta</b>. Ela abre em uma nova aba, no Google Drive.'
      ],
      dica: 'Salve esta página nos favoritos do celular para voltar rápido.'
    },
    {
      numero: '02',
      titulo: 'Salve suas figurinhas',
      resumo: 'Uma de cada vez, ou a pasta inteira.',
      passos: [
        'Dentro da pasta, toque na figurinha que você quer.',
        'Toque nos três pontinhos (⋮) no canto da tela.',
        'Escolha <b>Fazer download</b>. A imagem vai para a galeria do celular.',
        'Para levar tudo de uma vez, volte para a pasta e use <b>Fazer download</b> no menu da própria pasta.'
      ],
      dica: 'As figurinhas têm fundo transparente. Se aparecer um quadrado branco na galeria, não se preocupe: no Instagram o fundo some.'
    },
    {
      numero: '03',
      titulo: 'Use nos Stories',
      resumo: 'Da galeria para o seu Story.',
      passos: [
        'Abra o Instagram e comece um Story com sua foto ou vídeo.',
        'Toque no ícone de <b>figurinhas</b> (a carinha quadrada no topo).',
        'Escolha a opção de <b>adicionar da galeria</b> — costuma ser o primeiro quadradinho, com a sua última foto.',
        'Selecione a figurinha que você baixou.',
        'Arraste para posicionar e use dois dedos para aumentar, diminuir ou girar.'
      ],
      dica: 'Dá para colar várias no mesmo Story. Vá montando por camadas.'
    },
    {
      numero: '04',
      titulo: 'Crie Stories mais bonitos',
      resumo: 'Ajustes pequenos que mudam o resultado.',
      passos: [
        'Use uma categoria só por Story: a composição fica coerente.',
        'Menos é mais — duas ou três figurinhas costumam ficar melhor que oito.',
        'Deixe respiro nas bordas e não cubra o rosto da foto.',
        'Repita a mesma paleta durante o dia para criar identidade no seu perfil.',
        'Use as frases prontas para dar contexto sem precisar digitar.'
      ],
      dica: 'Monte uma sequência: capa com frase, foto com figurinhas, encerramento com ícone.'
    }
  ]
};
