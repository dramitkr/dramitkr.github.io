# Dr Amit Kumar — personal website

Source of **https://dramitkr.github.io**, the personal website of Dr Amit Kumar (Senior Member, IEEE · Hyderabad Section), candidate for IEEE India Council Chair-Elect 2027.

The opinions expressed herein are the opinions of the author and not necessarily the opinions of IEEE. This is not an official IEEE website.

## Positions and awards

`data/positions.json` is the single source of truth for the Record tabs, the Awards grid, the awards line under the hero photo, the `award` list in the JSON-LD, and the "Proof, not promises" / awards boxes on the flyers in `../poster/`. Edit the JSON, then run:

    node tools/build-positions.js

Re-render the flyer PNG/PDF afterwards and copy them into `assets/posters/`.
