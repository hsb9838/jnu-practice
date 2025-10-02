let cardOne = 7;
let cardTwo = 5;
let cardThree = 7;

let bankDeck = [7, 5, 6, 4];

const sumCards = (...nums) => nums.reduce((a, b) => a + b, 0);

let playerSum = sumCards(cardOne, cardTwo);
if (cardThree) playerSum += cardThree;

console.log(`Player has ${playerSum} points.`);

if (playerSum > 21) {
  console.log('You lost (bust).');
} else if (playerSum === 21) {
  console.log('Blackjack! You win.');
} else {
  let bankSum = 0;
  let drawIndex = 0;

  while (bankSum < 17 && drawIndex < bankDeck.length) {
    bankSum += bankDeck[drawIndex++];
  }

  console.log(`Bank has ${bankSum} points.`);

  if (bankSum > 21) {
    console.log('You win (bank bust).');
  } else {
    if (playerSum === bankSum) {
      console.log('Draw.');
    } else if (playerSum > bankSum) {
      console.log('You win.');
    } else {
      console.log('Bank wins.');
    }
  }
}

