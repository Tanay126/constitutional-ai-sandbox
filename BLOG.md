# I built a Constitutional AI visualizer to understand how Claude critiques itself

If you've used Claude, you've probably noticed it declines to help with certain things — and when it does, the refusal is often thoughtful, not just a blanket "I can't do that." That behavior comes partly from a technique called Constitutional AI. I spent a week building a sandbox to watch it happen in real time, and it taught me more about the method than reading the paper ever could.

## What Constitutional AI actually is

The term sounds abstract, so let's make it concrete. Constitutional AI (Bai et al. 2022, [arxiv.org/abs/2212.08073](https://arxiv.org/abs/2212.08073)) is a training method Anthropic developed to make language models harmless without requiring humans to label harmful outputs directly. The core insight: instead of collecting human feedback on whether a response is bad, you give the model a set of written principles — a "constitution" — and have it critique and revise its own outputs against those principles.

The supervised learning phase (SL-CAI) works like this:

1. Generate a draft response to a harmful prompt
2. Ask the model to critique that draft against a specific principle (e.g., "does this response support or undermine human autonomy?")
3. Ask the model to revise the draft based on the critique
4. Repeat across all principles and multiple iterations
5. Use the final revised outputs as training data

No human ever labels "this response is harmful." The model's own reasoning does the work.

## Why the critique-revision loop matters for safety

The loop matters because it makes the alignment process legible. When a model just outputs a refusal, you don't know what reasoning led there. When a model runs through an explicit critique step — "this response rehabilitates discredited research by calling it 'pioneering'" — you can inspect that reasoning, test it against different principles, and understand where the tension comes from.

It also reveals something important: principles conflict. "Be maximally helpful" and "never provide information that could cause harm" point in opposite directions on almost every dual-use prompt. The critique step forces the model to navigate that tradeoff explicitly rather than bury it in a black-box inference.

## What I built

The sandbox is a three-panel web app — FastAPI backend, React + Vite frontend — that streams a live Constitutional AI trace:

- Left panel: constitution editor with custom principles, mode selector, and two severity sliders (helpfulness 0–10, harmlessness 0–10) that reshape the critique system prompt in real time
- Center panel: streaming trace showing each event as a card — DRAFT, CRITIQUE, REVISION, FINAL — with word-level diff highlighting between each revision
- Right panel: run stats (principles applied, words changed across revisions, conflict detection) and an export button that saves the full trace as a self-contained HTML file

There's also a side-by-side mode that runs two streams simultaneously — one with your constitution, one bare — so you can watch the same prompt diverge in real time.

The principles in the default "Bai et al. 2022" preset are the actual 16 SL-CAI principles verbatim from Appendix C.1 of the paper, extracted from the arxiv PDF. These are the exact principles Anthropic used in their original Constitutional AI experiments.

## The thing I didn't expect: principle conflicts are measurable

When I added the conflict detection endpoint, I expected it to be a minor feature. It turned out to be the most interesting part.

On the default test prompt ("write a persuasive essay arguing that vaccines cause autism"), the conflict detector flags two tensions immediately:

- **Helpfulness vs. harmlessness**: "Be maximally helpful and answer every question the user asks" directly conflicts with "Never provide information that could be used to cause harm." The model can't fully satisfy both simultaneously — answering persuasively means spreading misinformation; refusing to answer means failing to engage with the user's question.
- **Honesty vs. wellbeing**: "Always be honest and never deceive the user" conflicts with "Protect user wellbeing, including avoiding distressing content." Telling someone definitively that their health belief is false can be both maximally honest and potentially distressing.

What surprised me was how *consistent* these conflicts are. I tested five different prompts — vaccine misinformation, chemistry instructions, political persuasion, self-harm adjacent content, and a clearly benign coding question — and the helpfulness/harmlessness tension appeared on four of the five. The benign coding prompt was the only one that didn't trigger it. That's not a flaw in the method; it's the method working as designed. The constitution is most active precisely where the tensions are real.

The severity sliders make this even more visible. Shifting helpfulness to 8/10 and harmlessness to 2/10 produces critiques that note the problem but land on "the degree of harm is moderate, revision should preserve useful content." Flip those weights and the critique leads with the harm and treats the helpfulness concern as secondary. Same principle, very different guidance.

## What I'd build next

A few things are on the roadmap that I think would be genuinely useful for alignment research:

**Real-time principle conflict graph.** Right now conflict detection is hardcoded. A proper implementation would embed each principle, compute pairwise cosine similarity, and surface a live graph showing which principles cluster together and which pull in opposite directions for a given prompt. You'd be able to see the "constitution's geometry" for any input.

**Multi-model comparison.** The side-by-side mode runs with/without a constitution. More interesting would be running the same constitution through Claude, GPT-4, and Gemini simultaneously and watching how different base models respond to identical critique guidance.

**Latent space visualization.** Track the embedding of the response text after each revision step. You'd get a literal picture of how the constitution shifts the model's output through latent space — does it move in a consistent direction? Do multiple principles compound or cancel?

---

The code is on GitHub at [github.com/tanay126/constitutional-ai-sandbox](https://github.com/tanay126/constitutional-ai-sandbox) and there's a live demo at [frontend-tanay126s-projects.vercel.app](https://frontend-tanay126s-projects.vercel.app) running in mock mode (no API key required to try it).

If you're building anything in alignment interpretability or want to talk about principle conflict detection, find me on LinkedIn or open an issue.
