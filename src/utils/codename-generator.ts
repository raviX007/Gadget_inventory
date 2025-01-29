const adjectives = ['Silent', 'Phantom', 'Shadow', 'Midnight', 'Crystal', 'Golden', 'Iron', 'Sonic'];
const nouns = ['Hawk', 'Serpent', 'Dragon', 'Phoenix', 'Wolf', 'Eagle', 'Tiger', 'Ghost'];

export function generateCodename(): string {
  const adjective = adjectives[Math.floor(Math.random() * adjectives.length)];
  const noun = nouns[Math.floor(Math.random() * nouns.length)];
  return `The ${adjective} ${noun}`;
}

export function generateMissionSuccessProbability(): number {
  return Math.floor(Math.random() * (95 - 60 + 1)) + 60; // Between 60% and 95%
}