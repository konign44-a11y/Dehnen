// ============================================================
//  DEINE ÜBUNGEN – Reihenfolge = Reihenfolge in der Session.
//
//  duration: Sekunden (ohne Angabe = SETTINGS.duration)
//  sides:    true        → zur Halbzeit "Seite wechseln" + Ton
//            "Richtung"  → zur Halbzeit "Richtung wechseln" + Ton
// ============================================================

const SETTINGS = {
  duration: 60, // Standard-Sekunden pro Übung
  prep: 5,      // Sekunden "Mach dich bereit" vor jeder Übung (0 = aus)
};

const EXERCISES = [
  // ---------- Nacken & Oberkörper (im Stand) ----------
  { area: "Nacken", name: "HWS und Nacken dehnen",
    tip: "Hände auf den Hinterkopf, Kinn sanft zur Brust ziehen – nur das Gewicht der Arme wirken lassen.",
    img: "img/02-hws-nacken.jpg" },
  { area: "Nacken", name: "Seitlicher Nacken", sides: true,
    tip: "Hand über den Kopf, Ohr sanft zur Schulter ziehen, andere Schulter tief.",
    img: "img/03-nacken-seitlich.jpg" },
  { area: "Schultern", name: "Schultern dehnen",
    tip: "Hände auf einen Tisch, Oberkörper absenken, Kopf zwischen die Arme sinken lassen.",
    img: "img/05-schultern.jpg" },
  { area: "Rumpf", name: "Rumpf dehnen", sides: true, duration: 90,
    tip: "Seitlich neigen, Hand gleitet am Bein entlang nach unten, Becken bleibt stabil.",
    img: "img/04-rumpf.jpg" },

  // ---------- Hüftbeuger & Oberschenkel vorne ----------
  { area: "Hüftbeuger", name: "Hüftbeuger an der Wand",
    tip: "Hände an die Wand, Füße hüftbreit, Becken bewusst nach vorn Richtung Wand schieben.",
    img: "img/01-hueftbeuger.jpg" },
  { area: "Hüftbeuger", name: "Hüftbeuger im Kniestand", sides: true, duration: 120,
    tip: "Hinteres Knie am Boden, Gesäß anspannen und Becken nach vorn schieben. Oberkörper aufrecht.",
    img: "img/16-hueftbeuger-knie.jpg" },
  { area: "Oberschenkel", name: "Oberschenkel vorne an der Wand", sides: true, duration: 60,
    tip: "Hinteres Knie an der Wandkante, Fuß an der Wand hoch. Oberkörper aufrichten und nach hinten zur Wand lehnen.",
    img: "img/20-oberschenkel-wand.jpg" },
  { area: "Hüfte", name: "Front Split", sides: true, duration: 80,
    tip: "Kissen unters hintere Knie, mit dem Bein langsam vor und zurück gleiten, Hüfte zeigt nach vorn.",
    img: "img/08-front-split.jpg" },

  // ---------- Beinrückseite & Waden ----------
  { area: "Beinrückseite", name: "Beinrückseite im Stand",
    tip: "Vorbeugen, Fußgelenke greifen und dich aktiv mit den Armen an die Beine heranziehen.",
    img: "img/06-beinrueckseite.jpg" },
  { area: "Waden", name: "Waden dehnen", sides: true, duration: 60,
    tip: "Herabschauender Hund: einen Fuß hinter die Ferse des anderen haken, Ferse Richtung Boden drücken.",
    img: "img/19-waden.jpg" },
  { area: "Beinrückseite", name: "Hamstrings im Sitzen",
    tip: "Im Langsitz mit langem Rücken nach vorn beugen, Richtung Füße greifen, Knie gestreckt.",
    img: "img/14-hamstrings.jpg" },

  // ---------- Beininnenseite, Hüfte & Gesäß ----------
  { area: "Adduktoren", name: "Beininnenseite dehnen", sides: true, duration: 120,
    tip: "Ein Knie am Boden, anderes Bein seitlich gestreckt. Körper Richtung gestrecktes Bein lehnen.",
    img: "img/17-bein-innenseite.jpg" },
  { area: "Adduktoren", name: "Pancake",
    tip: "Im Grätschsitz mit langem Rücken aus der Hüfte nach vorn sinken, Hände wandern nach vorn.",
    img: "img/07-pancake.jpg" },
  { area: "Hüfte", name: "Hüftrotation",
    tip: "Im Sitz auf die Hände gestützt, Knie langsam von Seite zu Seite kippen – Oberkörper bleibt stabil.",
    img: "img/09-hueftrotation.jpg" },
  { area: "Gesäß", name: "Gesäß dehnen (Taube)", sides: true, duration: 120,
    tip: "Vorderes Bein angewinkelt vor dir, hinteres lang nach hinten. Oberkörper ablegen, Gewicht abgeben, tief atmen.",
    img: "img/15-gesaess.jpg" },

  // ---------- Schienbeine & Füße ----------
  { area: "Schienbeine", name: "Schienbeine dehnen",
    tip: "Auf den Fersen sitzen, Fußrücken flach am Boden. Sitzen bleiben oder sanft nach links, rechts oder hinten neigen.",
    img: "img/10-schienbeine.jpg" },
  { area: "Füße", name: "Fußsohle dehnen",
    tip: "Zehen aufstellen und auf die Fersen setzen. Langsam Gewicht nach hinten geben.",
    img: "img/11-fusssohle.jpg" },
  { area: "Füße", name: "Fußrotation", sides: "Richtung",
    tip: "Auf dem Rücken liegen, Füße in großen Kreisen rotieren.",
    img: "img/12-fussrotation.jpg" },
  { area: "Füße", name: "Füße strecken & beugen", duration: 30,
    tip: "Gleiche Position: Fußspitzen abwechselnd weit nach vorn strecken und zu dir heranziehen.",
    img: "img/12-fussrotation.jpg" },

  // ---------- Abschluss ----------
  { area: "Unterer Rücken", name: "Unteren Rücken dehnen",
    tip: "Arme seitlich ausgestreckt, Oberkörper bleibt fest am Boden. Beine langsam von links nach rechts legen.",
    img: "img/18-unterer-ruecken.jpg" },
];
