#!/bin/bash
API="${API_URL:-http://localhost:4000}/api/signals"

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "  IMS Failure Simulation Script"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

echo "① Simulating RDBMS outage (10 signals, should create 1 Work Item)..."
for i in $(seq 1 10); do
  curl -s -X POST $API \
    -H "Content-Type: application/json" \
    -d "{\"componentId\":\"POSTGRES_MAIN\",\"componentType\":\"RDBMS\",\"errorCode\":\"CONN_TIMEOUT\",\"errorMessage\":\"Retry $i failed\",\"latencyMs\":30000,\"severity\":\"CRITICAL\"}" \
    > /dev/null
done
echo "   ✓ Sent 10 RDBMS signals"

sleep 1

echo ""
echo "② Simulating Cache failure (5 signals)..."
for i in $(seq 1 5); do
  curl -s -X POST $API \
    -H "Content-Type: application/json" \
    -d "{\"componentId\":\"CACHE_CLUSTER_01\",\"componentType\":\"CACHE\",\"errorCode\":\"CACHE_MISS\",\"errorMessage\":\"Redis timeout $i\",\"latencyMs\":5000,\"severity\":\"HIGH\"}" \
    > /dev/null
done
echo "   ✓ Sent 5 Cache signals"

sleep 1

echo ""
echo "③ Simulating API Gateway failure (3 signals)..."
for i in $(seq 1 3); do
  curl -s -X POST $API \
    -H "Content-Type: application/json" \
    -d "{\"componentId\":\"API_GATEWAY\",\"componentType\":\"API\",\"errorCode\":\"HTTP_503\",\"errorMessage\":\"Service unavailable $i\",\"latencyMs\":0,\"severity\":\"CRITICAL\"}" \
    > /dev/null
done
echo "   ✓ Sent 3 API signals"

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "✅ Done! Check http://localhost:3000"
echo "   Expected: 3 Work Items created (debounce working)"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
