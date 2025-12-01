#!/bin/bash

echo "=== Testing Add to Cart Flow ==="
echo ""

# Step 1: Login
echo "1. Logging in as customer..."
LOGIN_RESPONSE=$(curl -s -c /tmp/test_cookies.txt -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email": "customer1@designden.com", "password": "password"}')

echo "Login Response: $LOGIN_RESPONSE"
echo ""

# Check if login was successful
if echo "$LOGIN_RESPONSE" | grep -q '"success":true'; then
  echo "✓ Login successful"
else
  echo "✗ Login failed"
  exit 1
fi
echo ""

# Step 2: Get a product ID
echo "2. Getting product ID..."
PRODUCT_ID=$(curl -s http://localhost:3000/api/shop/products | python3 -c "import sys, json; data=json.load(sys.stdin); print(data['products'][0]['_id'])" 2>/dev/null)
echo "Product ID: $PRODUCT_ID"
echo ""

# Step 3: Add to cart
echo "3. Adding product to cart..."
CART_RESPONSE=$(curl -s -b /tmp/test_cookies.txt -X POST http://localhost:3000/api/customer/cart \
  -H "Content-Type: application/json" \
  -d "{\"productId\": \"$PRODUCT_ID\", \"quantity\": 1, \"size\": \"M\", \"color\": \"Blue\"}")

echo "Cart Response: $CART_RESPONSE"
echo ""

if echo "$CART_RESPONSE" | grep -q '"success":true'; then
  echo "✓ Add to cart successful"
else
  echo "✗ Add to cart failed"
fi

# Clean up
rm -f /tmp/test_cookies.txt
