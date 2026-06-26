# Japanese Learning

An Android-first vocabulary trainer for studying Japanese words from the Standard Japanese beginner and intermediate path.

The first version is intentionally small: it proves the phone app workflow before importing a full vocabulary dataset.

## Why this shape

- Android app, not a mobile web page.
- Built with Expo React Native so it can run on an Honor Android phone through Expo Go during development and later be packaged as an APK.
- Vocabulary is grouped by level, book, and lesson.
- Practice supports flashcards, multiple choice, Japanese/kana input, wrong-word review, and simple spaced repetition.
- Progress is saved locally on the phone with AsyncStorage.

## Data policy

This public repository should not copy a complete textbook vocabulary list unless the data source has a clear license or you own the data. The app currently includes a small hand-written sample set and a documented import format.

Recommended import format:

```json
[
  {
    "id": "b-u-01-001",
    "level": "beginner",
    "book": "upper",
    "lesson": 1,
    "japanese": "学生",
    "kana": "がくせい",
    "meaning": "学生",
    "partOfSpeech": "名词",
    "example": "わたしは学生です。",
    "exampleMeaning": "我是学生。"
  }
]
```

## Run locally

Requires Node.js `20.19.4` or newer.

```bash
npm install
npm run start
```

Then scan the Expo QR code with Expo Go on Android.

## Build APK later

```bash
npm install -g eas-cli
eas build -p android --profile preview
```

## GitHub workflow

Use one issue per feature or vocabulary-import task. Work through a branch and pull request:

```bash
git checkout -b feature/import-vocabulary
git add .
git commit -m "Add vocabulary import workflow"
git push origin feature/import-vocabulary
```

Every issue, commit, pull request, comment, and build log will remain visible on GitHub.
