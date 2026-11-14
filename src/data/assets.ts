// Central artwork map: replace a file here without hunting through the UI.
const art = (path: string) => new URL(path, import.meta.url).href;

export const assets = {
  // The artwork copy script places this exact file at /art for dev and production.
  backgroundMusic: '/art/bg%20music.mp3',
  cursor: art('../../art/mouse.png'),
  welcomeCat: art('../../art/welcome cat.png'),
  welcomeCatAfterClick: art('../../art/welcome cat 2.png'),
  exclamationBubble: art('../../art/exclamation bubble.png'),
  envelope: art('../../art/letter envelope.png'),
  letterBackground: art('../../art/letter bg.png'),
  hubBackground: {
    desktop: art('../../art/desktop background.png'),
    phone: art('../../art/phone background.png'),
  },
  activities: {
    dressUp: art('../../art/dress up game.png'),
    drawing: art('../../art/drawing game.png'),
    letters: art('../../art/letters.png'),
  },
  characters: {
    cat: art('../../art/character-crops/cat.png'),
    dog: art('../../art/character-crops/dog.png'),
    olaf: art('../../art/character-crops/olaf.png'),
    bear: art('../../art/character-crops/bear.png'),
  },
  accessories: {
    gingerbread: art('../../art/accessory-parts/gingerbread.png'),
    bow: art('../../art/accessory-parts/bow.png'),
    santaHat: art('../../art/accessory-parts/santa-hat.png'),
    scarf: art('../../art/accessory-parts/scarf.png'),
  },
  drawingPrompts: {
    pusheenWreath: art('../../art/drawing game/pusheen wreath.png'),
    bearTree: art('../../art/drawing game/bear w tree.png.webp'),
    helloKittyGingerbread: art('../../art/drawing game/hello kitty gingerbread.png'),
    pusheenWinter: art('../../art/drawing game/pusheen winter.jpg'),
  },
};
