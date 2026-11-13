// Central artwork map: replace a file here without hunting through the UI.
const art = (path: string) => new URL(path, import.meta.url).href;

export const assets = {
  welcomeCat: art('../../art/welcome cat.png'),
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
    cat: art('../../art/cat.png'),
    dog: art('../../art/dog.png'),
    olaf: art('../../art/olaf.png'),
    bear: art('../../art/bear.png'),
  },
  accessories: {
    gingerbread: art('../../art/accessory-parts/gingerbread.png'),
    bow: art('../../art/accessory-parts/bow.png'),
    santaHat: art('../../art/accessory-parts/santa-hat.png'),
    scarf: art('../../art/accessory-parts/scarf.png'),
  },
};
