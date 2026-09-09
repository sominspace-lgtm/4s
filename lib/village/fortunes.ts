// What the wishing well says back (2026-09-09). Short, warm, a little
// silly. A guest leaves a note or a thank-you and gets one of these. No
// meaning intended, that's the point.
export const FORTUNES: string[] = [
  'The best snack of the night is still in the fridge.',
  'Someone here will make you laugh before you leave.',
  'A good song is three songs away.',
  'You will remember this in a warm way.',
  'The cat has decided you are acceptable.',
  'Go back for seconds. It is allowed.',
  'A small kindness of yours lands well this week.',
  'The right amount of dessert is slightly more than planned.',
  'You are exactly on time, even if you think you are late.',
  'Something you have been putting off gets easy on Tuesday.',
  'The next room has better lighting for a photo.',
  'A plan you nearly cancelled turns out to be the good one.',
  'You will give someone very sound advice about nothing important.',
  'Luck is just about done queueing behind you.',
  'The group photo works out. Nobody is blinking.',
  'You will find the thing you lost, in a pocket, later.',
  'A quiet person here has the best story of the night.',
  'Wear the comfortable shoes tomorrow.',
  'The leftovers are yours if you ask nicely.',
  'A message you send this week is better received than you expect.',
  'The weekend arrives faster than the calendar suggests.',
  'You are due a very ordinary, very nice day soon.',
  'Say yes to the walk.',
  'Your next cup of coffee is the good one.',
  'A knot untangles itself while you sleep.',
  'The house plant is going to be fine. Water it Sunday.',
  'Someone thinks of you fondly at an odd hour.',
  'The parking spot appears right when you need it.',
  'You will win an argument by being kind instead.',
  'A small purchase this month is worth every cent.',
]

export function randomFortune(): string {
  return FORTUNES[Math.floor(Math.random() * FORTUNES.length)]
}
