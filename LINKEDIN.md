# LinkedIn Post Draft

---

Most people know Claude refuses certain requests. Fewer know *how* that behavior is trained — and it's more interesting than a hardcoded blocklist.

Anthropic's Constitutional AI method (Bai et al. 2022) has the model critique and revise its own outputs against a written set of principles, no human harm labels required. I spent the past week building a sandbox to watch that loop run in real time.

Here's what it actually shows:

- **The critique step is legible.** Each card in the trace shows exactly which principle triggered the revision and what the model flagged — you can read the reasoning, not just the outcome
- **Principles conflict in predictable ways.** "Be maximally helpful" and "never cause harm" fire against each other on 4 out of 5 test prompts. The sandbox surfaces these as explicit tension detections
- **The severity sliders change everything.** Shift helpfulness to 8/10 and harmlessness to 2/10, and you get completely different critique guidance from the exact same principle — same words, different weight

Built with FastAPI + Claude API on the backend, React + Vite on the frontend. Streams word-level diffs in real time as each revision lands. Side-by-side mode lets you watch the same prompt with and without a constitution simultaneously.

Live demo (mock mode, no API key): https://frontend-tanay126s-projects.vercel.app
GitHub + full writeup: https://github.com/tanay126/constitutional-ai-sandbox

If you're working on alignment, interpretability, or just curious how Constitutional AI actually works under the hood — take it for a spin.

#anthropic #constitutionalai #llmsafety #aialignment #buildinpublic #machinelearning #interpretability

---
