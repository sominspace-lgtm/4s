// Run this locally to turn a PIN into the hash the server checks against —
// the plaintext PIN never has to leave your machine, and never needs to be
// typed anywhere but here and the login screen itself.
//
// Usage:
//   node scripts/hash-pin.mjs <pin> <pepper>
//
// <pepper> is the PIN_PEPPER value (same one for every profile — see the
// setup instructions you were given alongside this script). Put the printed
// hash into the matching *_PIN_HASH environment variable in Vercel.

import { pbkdf2Sync } from 'crypto'

const [, , pin, pepper] = process.argv
if (!pin || !pepper) {
  console.error('Usage: node scripts/hash-pin.mjs <pin> <pepper>')
  process.exit(1)
}

const hash = pbkdf2Sync(pin, pepper, 100_000, 32, 'sha256').toString('hex')
console.log(hash)
