تست شماره 1 — Provider Loading

مثلاً:

{
  "providers": {
    "openai": {
      "apiKey": "..."
    }
  }
}

runtime boot می‌شود؟

provider register می‌شود؟

default provider resolve می‌شود؟

تست شماره 2 — Model Resolution
/coder file.ts improve types

آیا:

model resolve می‌شود؟
provider resolve می‌شود؟
تست شماره 3 — Streaming

آیا:

chunkها emit می‌شوند؟
UI freeze نمی‌شود؟
تست شماره 4 — Proposal Flow

مهم‌ترین تست.

/coder file.ts refactor this

↓

AI response

↓

proposal

↓

diff

↓

approve

↓

apply

اگر این کار کند،
معماری اصلی validate شده.

تست شماره 5 — Provider Swap

مثلاً:

"defaultProvider": "ollama"

بدون تغییر coder plugin.

اگر کار کرد:
abstraction موفق شده.