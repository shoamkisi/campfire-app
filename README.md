# Campfire

A quiet tuner for people who can already strum. The other tools are only tabs for now.

## Open it on a phone

The app is meant to be opened from a link, not installed from an app store.

1. Ask whoever owns the GitHub repo to turn on the free site. The clicks are in [Put it on the web](#put-it-on-the-web) below. Until that is done, there is no public link.
2. On the phone, open `https://shoamkisi.github.io/campfire-app/`.
3. Tap **listen**.
4. When the phone asks, allow the microphone.
5. Play one open string. The big letter is the note. The needle leans left when you are flat and right when you are sharp. Amber means you are in tune, within about 5 cents.
6. To keep it on the home screen: in Safari, tap Share, then Add to Home Screen. In Chrome, tap the menu, then Install app or Add to Home screen.

The microphone only works on a secure page. The link above is secure. A plain `http://` address on the wifi will not be.

After the first visit, the tuner keeps working with the wifi off. The metronome, chords, and songs do nothing yet. They say **soon**.

You can look at the screen without a guitar:

- `?preview=idle`
- `?preview=flat`
- `?preview=intune`

Flat and in tune are not drawings. The page runs the same pitch detector on a pure tone at a known frequency.

## Run it on a computer

You need Node.js 22.

```bash
npm install
npm run dev
```

Open the `localhost` address Vite prints. `localhost` is allowed to use the microphone. Tap **listen**, allow it, and play a string near the computer.

```bash
npm test
npm run build
npm run preview
```

`npm run build` makes the installable offline version. `npm run preview` serves that version.

## How the tuner is tested

`npm test` does not use a microphone. It generates sine waves at the six open-string frequencies (E A D G B E, from A4 = 440) and checks three things:

- The McLeod pitch detector finds that frequency, at 44.1 kHz and 48 kHz, within 1.5 cents.
- The same strings, shifted flat and sharp by a known number of cents, come back with the right note, the right string, and the right offset.
- A brighter guitar-like tone (fundamental plus harmonics, including a weaker fundamental) still reports the fundamental, not the octave.

Silence, a quiet signal, and noise must return no pitch. Notes outside roughly 70–1000 Hz are rejected. The cents math has its own tests: in tune is ±5 cents, low E and high E stay distinct, and a note that sits between two strings is not claimed as either string.

## Folder structure

```
src/theme/tokens.ts     palette, type, grain, motion, and the future skins
src/theme/fonts.css     self-hosted Fraunces and IBM Plex Mono
src/pitch/              pitch detection, note math, smoothing
src/tuner/              the tuner screen and the microphone hook
src/shell/              the frame and the tabs
src/tools/registry.ts   the list of tools
public/                 icon and favicon
```

The campfire skin is the one on screen. `bright` and `shamanic` already have their colors in `src/theme/tokens.ts`. Pass another name to `applySkin` in `src/main.tsx` when you want to try one. There is no switcher in the interface.

To add the next tool:

1. Build it in a new folder, for example `src/tools/metronome/`.
2. Render it from `src/App.tsx` when that tool is selected.
3. Set `enabled: true` for it in `src/tools/registry.ts`.

The tab reads that list. When a tool is enabled it stops saying "soon". Leave the detector and the note math in `src/pitch/` so the other tools can share them.

## Put it on the web

The site is GitHub Pages, built by `.github/workflows/pages.yml`. It runs the tests, then publishes the app. It only runs from the `main` branch, and only after someone turns Pages on.

This repo is private. GitHub's free plan does not host Pages for a private repo. Either change the repo to public, or use a GitHub plan that includes Pages for private repos. Making it public is the free path. The tuner has no accounts and no private data.

Whoever owns the repo:

1. Merge the pull request into `main`.
2. On GitHub, open the repository, then **Settings**.
3. If the repo should stay free to host, open **General**, then in the Danger Zone choose **Change repository visibility**, then **Public**.
4. Open **Settings**, then **Pages**.
5. Under **Build and deployment**, set **Source** to **GitHub Actions**.
6. Open the **Actions** tab. If the "pages" workflow failed before Pages was turned on, open it and press **Re-run jobs**. You can also press **Run workflow** on the pages workflow.
7. Wait until the workflow is green. The phone link is `https://shoamkisi.github.io/campfire-app/`.

The first load needs a connection. After that the app is stored on the phone and works offline.
