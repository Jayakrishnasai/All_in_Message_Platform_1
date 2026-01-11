# Demo Walkthrough Script

Use this script when recording your Loom video demonstration.

---

## Video Setup

- **Duration Target**: 5-10 minutes
- **Resolution**: 1080p
- **Audio**: Clear microphone, minimize background noise
- **Browser**: Chrome (latest)
- **Test beforehand**: Run through once to ensure everything works

---

## Opening (30 seconds)

**Script:**

> "Hello! Today I'm demonstrating the Messaging Intelligence Platform - a system that centralizes social media messages, stores them in Matrix, and provides AI-powered insights.

> Let me show you how it works end-to-end."

---

## Part 1: Architecture Overview (1 minute)

**Show:** Architecture diagram from docs

**Script:**

> "The platform consists of several key components:
>
> 1. **Matrix Synapse** - our messaging backbone
> 2. **Mautrix Bridge** - connects Instagram to Matrix
> 3. **AI Backend** - provides NLP analysis with FastAPI
> 4. **Next.js Frontend** - the user interface
>
> All running on an Azure VM with Docker.
>
> Let's see it in action."

---

## Part 2: Login Flow (1 minute)

**Show:** Landing page

**Steps:**
1. Open the platform URL
2. Show the login form
3. Explain Matrix authentication
4. Login with credentials

**Script:**

> "Here's our landing page. Users authenticate using Matrix credentials.

> I'll login with our admin account...

> And we're redirected to the dashboard."

---

## Part 3: Dashboard Tour (2 minutes)

**Show:** Dashboard page

**Steps:**
1. Point to stats cards
2. Explain room list
3. Show intent distribution
4. Click on quick actions

**Script:**

> "The dashboard gives an overview of messaging activity.
>
> These cards show: total messages, active rooms, high priority items, and actionable messages.
>
> Here's the room list - these are Matrix rooms including our Instagram bridge rooms.
>
> The intent distribution shows how messages are classified: urgent, support, sales, and casual.
>
> Let's explore the AI features."

---

## Part 4: Chat View with AI Summary (2 minutes)

**Show:** Room/chat page

**Steps:**
1. Click on a room
2. Show message list
3. Click "Summarize" button
4. Show the AI summary

**Script:**

> "Let's look at a conversation from Instagram.
>
> These messages were automatically bridged from Instagram DMs into Matrix.
>
> Each message shows the sender and a timestamp. Notice the intent badges - the AI classified these as 'support' queries.
>
> Now I'll click 'Summarize' to get an AI-generated summary...
>
> There it is! The AI has analyzed the conversation and produced a concise summary of what was discussed."

---

## Part 5: Priority Inbox (1 minute)

**Show:** Priority inbox page

**Steps:**
1. Navigate to Priority Inbox
2. Show the filtering
3. Explain priority scores

**Script:**

> "The Priority Inbox helps identify messages that need immediate attention.
>
> Messages are scored based on: intent classification, urgency keywords, and message patterns.
>
> I can filter by priority level - let's see just the high priority items.
>
> These red-flagged messages contain urgent keywords and likely need faster responses."

---

## Part 6: AI Insights (1 minute)

**Show:** Insights page

**Steps:**
1. Navigate to Insights
2. Show daily report
3. Show room summaries

**Script:**

> "The AI Insights page provides daily reports.
>
> We can see the date, total message count, and how many were high priority.
>
> The intent distribution chart breaks down message types across the day.
>
> Below, we have AI-generated summaries for each active room - perfect for getting caught up quickly."

---

## Part 7: Knowledge Base (1 minute)

**Show:** Knowledge base page

**Steps:**
1. Navigate to Knowledge Base
2. Show entries
3. Demonstrate search

**Script:**

> "Finally, the Knowledge Base automatically extracts Q&A pairs from conversations.
>
> These can be used to build FAQs or train future AI assistants.
>
> Let me search for 'order tracking'...
>
> The semantic search returns relevant Q&As based on meaning, not just keywords."

---

## Part 8: Technical Highlights (1 minute)

**Show:** Terminal with docker ps

**Script:**

> "Behind the scenes, everything runs in Docker containers.
>
> We have: Matrix Synapse, the Instagram bridge, our FastAPI AI service, the Next.js frontend, NGINX, and Redis.
>
> The AI uses:
> - BART for summarization
> - spaCy for NLP
> - FAISS for vector search
>
> All deployed on a single Azure VM."

---

## Closing (30 seconds)

**Script:**

> "To summarize, the Messaging Intelligence Platform:
>
> ✓ Centralizes social media messages via Matrix
> ✓ Bridges Instagram conversations in real-time
> ✓ Provides AI-powered summarization
> ✓ Classifies message intent automatically
> ✓ Prioritizes urgent messages
> ✓ Builds a knowledge base from conversations
>
> Thank you for watching! The code is available on GitHub at [your-repo-url]."

---

## Backup Demos (if main feature fails)

### If Bridge Not Working:
> "For the demo, I've pre-loaded some sample Instagram conversations to show the functionality..."

### If AI Slow:
> "The AI is processing... while we wait, let me explain the architecture..."

### If Frontend Error:
> "Let me show you the API directly via curl..."
>
> ```bash
> curl -X POST http://localhost:8000/api/summarize \
>   -H "Content-Type: application/json" \
>   -d '{"messages": ["Hello", "How can I help?"]}'
> ```

---

## Recording Tips

1. **Clear browser cache** before recording
2. **Close unnecessary tabs** 
3. **Disable notifications**
4. **Have sample data ready**
5. **Keep terminal ready** for backup demos
6. **Practice the flow** 2-3 times
7. **Speak clearly and at moderate pace**
8. **Pause briefly** between sections

---

## Post-Recording

1. Review the video
2. Trim dead air
3. Add captions if needed
4. Upload to Loom
5. Copy sharing link
