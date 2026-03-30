# Atome Customer Support AI Bot – Submission

## Overview

This project implements a full-stack MVP customer support AI system consisting of:

- A **customer-facing chatbot**
- An **admin interface**
- A **manager-facing meta-agent**

The system demonstrates:
- AI-assisted support workflows  
- Configurability  
- Continuous improvement via feedback loops  

---

## Approach

I approached this as both a **product + system design problem**.

### Key design decisions:
- Clear separation of roles:
  - Customer → interacts with bot  
  - Admin → configures and improves bot  
  - Manager → defines new agent behavior  

- Hybrid architecture:
  - **Knowledge Base (KB)** → factual answers  
  - **Tools** → dynamic queries  

- Designed for:
  - Extensibility  
  - Configurability  
  - Explainability  

---

## Features Implemented

### Part 1 – Customer Support Bot
- KB-based question answering  
- Application status tool (mocked)  
- Transaction status tool (mocked)  
- Editable:
  - KB URL  
  - System prompt  
  - Additional guidelines  
- Mistake reporting  
- Admin review and archive  
- Auto-fix via correction rules  

### Part 2 – Manager / Meta-Agent
- Manager instructions input  
- Uploaded document (text)  
- Agent profile generation:
  - name  
  - system prompt  
  - guidelines  
  - tools  
  - assumptions  
- Persisted document + agent  

---

## Assumptions

- Atome help center returned **HTTP 403**, so fallback KB was used  
- External integrations are **mocked**  
- Document upload simplified as **text input**  
- Conversation is **stateless**  

---

## Product Thinking

This was designed as a **usable product**, not just a prototype.

### Key product decisions:
- Clear separation of:
  - `/` (customer)
  - `/admin`
  - `/manager`
- Simple, intuitive flows:
  - Ask → Answer → Report → Improve  
- No hallucinations:
  - If unsure → say unsure  
- Configurable without redeploy  
- Manager can create agents without engineering  

### UX priorities:
- Minimal friction  
- Clear behavior  
- Predictable responses  

---

## Trade-offs

### Simplicity vs Completeness
- Used **lexical retrieval** instead of vector DB  
- Avoided complex multi-agent orchestration  

### Reliability vs Live scraping
- Used fallback KB due to scraping issues  

### Speed vs Depth
- Prioritized end-to-end working system  
- Limited advanced features like:
  - memory  
  - streaming  
  - full ingestion pipeline  

---

## AI Usage

AI was used to **accelerate development**, not replace decision-making.

### Tools:
- ChatGPT / OpenAI:
  - architecture  
  - prompt design  
  - debugging  
- Cursor:
  - scaffolding  
  - refactoring  

### AI helped with:
- boilerplate generation  
- debugging  
- prompt iteration  

### Done manually:
- system design  
- product decisions  
- architecture and trade-offs  

---

## Limitations

- No persistent conversation memory  
- Basic retrieval (non-vector)  
- Mocked integrations  
- Limited KB size  

---

## Future Improvements

- Vector-based retrieval  
- Conversation memory  
- Real API integrations  
- Better document ingestion (PDF, chunking)  
- Multi-agent workflows  
- Admin analytics dashboard  

---

## Demo Flow

1. Open `/admin` → Reindex  
2. Open `/` → ask:
   - KB question  
   - application status  
   - failed transaction  
3. Report a mistake  
4. Go to `/admin` → review + archive  
5. Open `/manager`  
6. Generate agent profile  

---

## Conclusion

This project demonstrates:

- Practical AI system design  
- Strong product thinking  
- Ability to deliver a usable MVP under ambiguity  

The focus was on building a **usable, extensible, and explainable system**, rather than over-engineering components.

---

## Demo & Repository

Demo: https://atome-bot-assessment.vercel.app/
Repository: https://github.com/SaumyaGurtu/atome-bot.git
