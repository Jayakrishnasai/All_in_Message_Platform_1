# Testing Guide

Comprehensive testing procedures for the Messaging Intelligence Platform.

---

## API Testing with cURL

### Health Checks

```bash
# Matrix Synapse
curl -s http://localhost:8008/_matrix/client/versions | jq .

# AI Backend
curl -s http://localhost:8000/health | jq .

# Frontend (via NGINX)
curl -s -o /dev/null -w "%{http_code}" http://localhost:3000
```

### Matrix API Tests

```bash
# Get server version
curl -s http://localhost:8008/_matrix/client/versions | jq .

# Login
curl -X POST http://localhost:8008/_matrix/client/r0/login \
  -H "Content-Type: application/json" \
  -d '{
    "type": "m.login.password",
    "user": "admin",
    "password": "YourPassword123!"
  }' | jq .

# Save the access_token for subsequent requests
export ACCESS_TOKEN="your_access_token_here"

# Get joined rooms
curl -s -H "Authorization: Bearer $ACCESS_TOKEN" \
  http://localhost:8008/_matrix/client/r0/joined_rooms | jq .

# Get room messages
curl -s -H "Authorization: Bearer $ACCESS_TOKEN" \
  "http://localhost:8008/_matrix/client/r0/rooms/!roomid:server/messages?limit=10" | jq .
```

### AI Backend Tests

```bash
# Test summarization
curl -X POST http://localhost:8000/api/summarize \
  -H "Content-Type: application/json" \
  -d '{
    "messages": [
      "Hi, I need help with my order",
      "Sure, what seems to be the problem?",
      "My package has not arrived yet",
      "Let me check the tracking for you",
      "It shows delayed due to weather"
    ],
    "max_length": 100
  }' | jq .

# Test intent classification
curl -X POST http://localhost:8000/api/intent \
  -H "Content-Type: application/json" \
  -d '{"message": "URGENT: I need immediate help with a payment issue!"}' | jq .

# Test with different intents
curl -X POST http://localhost:8000/api/intent \
  -H "Content-Type: application/json" \
  -d '{"message": "What are your pricing plans?"}' | jq .

curl -X POST http://localhost:8000/api/intent \
  -H "Content-Type: application/json" \
  -d '{"message": "Thanks for helping me yesterday!"}' | jq .

# Test priority scoring
curl -X POST http://localhost:8000/api/priority \
  -H "Content-Type: application/json" \
  -d '{
    "messages": [
      "URGENT: System is completely down!",
      "Hi, just wanted to check in",
      "Can you help me understand the pricing?",
      "My payment failed and I need support now"
    ]
  }' | jq .

# Test semantic search (after adding some messages)
curl -X POST http://localhost:8000/api/search \
  -H "Content-Type: application/json" \
  -d '{
    "query": "how to track my order",
    "top_k": 5
  }' | jq .

# Get daily report
curl -s "http://localhost:8000/api/reports/daily" | jq .

# Get knowledge base entries
curl -s "http://localhost:8000/api/knowledge?limit=10" | jq .
```

---

## Functional Testing

### Test Case 1: User Login

**Steps:**
1. Navigate to https://your-domain/
2. Enter Matrix homeserver URL
3. Enter username and password
4. Click "Sign In"

**Expected:**
- Redirect to /dashboard
- User info displayed
- Rooms list visible

### Test Case 2: Message Viewing

**Steps:**
1. Login to dashboard
2. Click on a room
3. Observe message list

**Expected:**
- Messages load within 3 seconds
- Sender names visible
- Timestamps accurate
- Intent badges shown

### Test Case 3: AI Summary Generation

**Steps:**
1. Navigate to a room with messages
2. Click "Summarize" button

**Expected:**
- Loading indicator shows
- Summary appears within 10 seconds
- Summary is coherent and relevant

### Test Case 4: Priority Inbox

**Steps:**
1. Navigate to /priority
2. Observe message list

**Expected:**
- Messages sorted by priority score
- High priority items have red indicator
- Urgency keywords highlighted

### Test Case 5: AI Insights

**Steps:**
1. Navigate to /insights
2. Select a date

**Expected:**
- Daily report generates
- Intent distribution chart visible
- Room summaries displayed

### Test Case 6: Knowledge Base Search

**Steps:**
1. Navigate to /knowledge
2. Enter search query
3. Click search

**Expected:**
- Relevant results returned
- Results ranked by relevance
- Q&A format clear

---

## Integration Testing

### Instagram Bridge Flow

**Prerequisites:**
- Instagram account configured in bridge
- Test Instagram account to send messages

**Steps:**
1. Send DM from test Instagram account
2. Wait 30 seconds
3. Check Matrix for new message
4. View in frontend

**Expected:**
- Message appears in Matrix room
- Sender identified as Instagram user
- Message content matches
- Visible in frontend

### AI Pipeline Flow

**Steps:**
1. Send multiple test messages
2. Wait for AI processing
3. Check priorities
4. Check daily report

**Expected:**
- Messages classified correctly
- Priority scores assigned
- Report includes new messages

---

## Load Testing

### Simple Load Test

```bash
# Install hey (HTTP load generator)
sudo apt install hey

# Test AI backend
hey -n 100 -c 10 http://localhost:8000/health

# Test Matrix API
hey -n 100 -c 10 http://localhost:8008/_matrix/client/versions
```

### Expected Performance

| Endpoint | Target Response Time |
|----------|---------------------|
| /health | < 50ms |
| Matrix versions | < 100ms |
| Summarization | < 5s |
| Intent classification | < 500ms |
| Priority scoring | < 1s |

---

## Error Scenarios

### Test Case: Network Failure

**Steps:**
1. Disconnect AI backend container
2. Try to generate summary

**Expected:**
- Graceful error message
- No application crash
- Recovery when reconnected

### Test Case: Invalid Input

**Steps:**
1. Send empty message for summarization
2. Send very long message (> 10000 chars)

**Expected:**
- Appropriate error messages
- No server errors (500)
- Input validation working

---

## Browser Testing

### Supported Browsers

| Browser | Version | Status |
|---------|---------|--------|
| Chrome | Latest | ☐ Tested |
| Firefox | Latest | ☐ Tested |
| Safari | Latest | ☐ Tested |
| Edge | Latest | ☐ Tested |

### Mobile Testing

| Device | Status |
|--------|--------|
| iOS Safari | ☐ Tested |
| Android Chrome | ☐ Tested |

### Responsive Design

| Breakpoint | Status |
|------------|--------|
| Desktop (> 1200px) | ☐ Tested |
| Tablet (768px - 1200px) | ☐ Tested |
| Mobile (< 768px) | ☐ Tested |

---

## Test Data

### Sample Messages for Testing

```json
[
  "URGENT: My order is missing and I need help immediately!",
  "Hi, I wanted to ask about your premium pricing plans",
  "Can you help me understand how to use this feature?",
  "Thanks so much for solving my issue yesterday!",
  "The payment failed again and this is unacceptable",
  "What are your office hours?",
  "I'm interested in the enterprise plan, who can I talk to?",
  "Just checking in to say everything is working great now"
]
```

### Expected Intent Classifications

| Message | Expected Intent |
|---------|-----------------|
| URGENT: My order is missing... | urgent |
| Hi, I wanted to ask about pricing... | sales |
| Can you help me understand... | support |
| Thanks so much for... | casual |
| The payment failed... | urgent/support |

---

## Automated Test Script

```bash
#!/bin/bash
# test-all.sh - Run all basic tests

echo "=== Testing Messaging Intelligence Platform ==="
echo ""

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
NC='\033[0m'

pass() { echo -e "${GREEN}✓ $1${NC}"; }
fail() { echo -e "${RED}✗ $1${NC}"; }

# Test Synapse
echo "Testing Matrix Synapse..."
if curl -s http://localhost:8008/_matrix/client/versions > /dev/null; then
    pass "Matrix Synapse is responding"
else
    fail "Matrix Synapse is not responding"
fi

# Test AI Backend
echo "Testing AI Backend..."
if curl -s http://localhost:8000/health | grep -q "healthy"; then
    pass "AI Backend is healthy"
else
    fail "AI Backend is not healthy"
fi

# Test Frontend
echo "Testing Frontend..."
if curl -s -o /dev/null -w "%{http_code}" http://localhost:3000 | grep -q "200"; then
    pass "Frontend is responding"
else
    fail "Frontend is not responding"
fi

# Test Summarization
echo "Testing Summarization..."
if curl -s -X POST http://localhost:8000/api/summarize \
    -H "Content-Type: application/json" \
    -d '{"messages": ["Hello", "World"]}' | grep -q "summary"; then
    pass "Summarization working"
else
    fail "Summarization not working"
fi

# Test Intent
echo "Testing Intent Classification..."
if curl -s -X POST http://localhost:8000/api/intent \
    -H "Content-Type: application/json" \
    -d '{"message": "I need help"}' | grep -q "intent"; then
    pass "Intent classification working"
else
    fail "Intent classification not working"
fi

echo ""
echo "=== Testing Complete ==="
```

Save as `test-all.sh` and run with:
```bash
chmod +x test-all.sh
./test-all.sh
```
