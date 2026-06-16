<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://ai.google.dev/static/site-assets/images/share-ais-513315318.png" />
</div>

# Run your local Ollama chat app

This contains everything you need to run your app locally.

## Run Locally

**Prerequisites:**  Node.js


1. Install dependencies:
   `npm install`
2. Make sure Ollama is running at `http://localhost:11434`
3. Optionally set `OLLAMA_MODEL` in your environment if you want a model other than the default `qwen2.5:3b`
4. Run the frontend:
   `npm run dev`
5. Run the backend API in a second terminal:
   `npm run dev:server`

If you want the original single-process full app flow, run:
`npm run dev:full`
