export const CREATIVITY_QUOTES = [
  { quote: "Inspiration exists, but it has to find you working.", author: "Pablo Picasso" },
  {
    quote:
      "Creativity is not the finding of a thing, but the making something out of it after it is found.",
    author: "James Russell Lowell",
  },
  {
    quote:
      "There is no such thing as a new idea. We simply take a lot of old ideas and put them into a sort of mental kaleidoscope.",
    author: "Mark Twain",
  },
  { quote: "Creativity is just connecting things.", author: "Steve Jobs" },
  {
    quote:
      "Curiosity about life in all of its aspects is still the secret of great creative people.",
    author: "Leo Burnett",
  },
  {
    quote:
      "Creativity involves breaking out of established patterns in order to look at things in a different way.",
    author: "Edward de Bono",
  },
  {
    quote:
      "Think left and think right and think low and think high. Oh, the things you can think up if only you try.",
    author: "Dr. Seuss",
  },
  {
    quote: "You can't wait for inspiration, you have to go after it with a club.",
    author: "Jack London",
  },
  {
    quote:
      "Creativity requires input, and that's what research is. You're gathering material with which to build.",
    author: "Gene Luen Yang",
  },
] as const

export function getRandomQuote(): (typeof CREATIVITY_QUOTES)[number] {
  return CREATIVITY_QUOTES[Math.floor(Math.random() * CREATIVITY_QUOTES.length)]
}

export function getRandomQuoteOtherThan(
  current: (typeof CREATIVITY_QUOTES)[number] | null
): (typeof CREATIVITY_QUOTES)[number] {
  if (CREATIVITY_QUOTES.length <= 1) return CREATIVITY_QUOTES[0]
  let next = getRandomQuote()
  while (next === current) {
    next = getRandomQuote()
  }
  return next
}
