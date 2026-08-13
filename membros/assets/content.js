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
        /* Para adicionar uma categoria, copie uma linha e troque os valores.
           "link" é temporário: quando a categoria existir na tabela
           "colecoes" do Supabase, o link do servidor tem prioridade
           automática e este campo pode ficar vazio. */
        { id: '3d',                 nome: '3D',                  nota: '', emoji: '✨',
          link: 'https://drive.google.com/drive/folders/11zECq-JdLStPF3mBV6XX4OtpF7Bh5Uu3?usp=drive_link' },
        /* Categoria com galeria interna: em vez de abrir o Drive, abre uma
           tela dentro da área lendo o Supabase Storage.
           "bucket" e "pasta" diferenciam maiúsculas de minúsculas. */
        { id: 'academia',           nome: 'Academia',            nota: '', emoji: '🏋️',
          galeria: { bucket: 'Figurinhas', pasta: 'Academia' } },
        { id: 'sao-miguel-arcanjo', nome: 'São Miguel Arcanjo',  nota: '', emoji: '🕊️',
          link: 'https://drive.google.com/drive/folders/1P-rvjjRHqbiGWlCSr5RVimrjBygUwZ0w?usp=drive_link' },
        { id: 'achadinhos',         nome: 'Achadinhos',          nota: '', emoji: '🛍️',
          link: 'https://drive.google.com/drive/folders/1xdw7ovu6bBZZSSp0vGYCH5qo8SGX0StT?usp=drive_link' },
        { id: 'advocacia',          nome: 'Advocacia',           nota: '', emoji: '⚖️',
          link: 'https://drive.google.com/drive/folders/1trovS8z0MYgotz_cPPZEuFPo2lWxpl7S?usp=drive_link' }
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
