# Delivery Partner Integration Options

## Overview

To implement multiple delivery options (similar to Zomato's multi-restaurant delivery), we can integrate with logistics aggregator APIs that provide access to multiple delivery partners.

## Recommended Delivery Aggregator APIs

### 1. **Shiprocket** (Recommended for India)

- **Website**: https://www.shiprocket.in/
- **Features**:
  - Access to 17+ courier partners (Delhivery, Blue Dart, DTDC, etc.)
  - Automatic courier selection based on serviceability
  - Real-time tracking
  - Weight-based pricing
  - COD support
  - NDR management
- **Pricing**: Pay-per-shipment model
- **API Documentation**: https://apidocs.shiprocket.in/
- **Integration Complexity**: Medium

### 2. **Delhivery Direct API**

- **Website**: https://www.delhivery.com/
- **Features**:
  - Pan-India coverage
  - Real-time tracking
  - Surface and air shipping
  - API for rate calculation, order creation, tracking
- **Pricing**: Volume-based contracts
- **API Documentation**: https://developers.delhivery.com/
- **Integration Complexity**: Medium

### 3. **Dunzo Business API** (For Hyperlocal Delivery)

- **Website**: https://business.dunzo.com/
- **Features**:
  - Same-day delivery in major cities
  - Live tracking
  - Quick delivery (within hours)
  - Good for local/city deliveries
- **Pricing**: Per-delivery charges
- **Integration Complexity**: Low-Medium

### 4. **Porter (For Same-City Logistics)**

- **Website**: https://porter.in/
- **Features**:
  - Intra-city delivery
  - Vehicle options (bikes, vans, trucks)
  - Real-time tracking
  - API integration
- **Pricing**: Distance and vehicle-based
- **Integration Complexity**: Medium

### 5. **Shadowfax**

- **Website**: https://www.shadowfax.in/
- **Features**:
  - B2B and B2C delivery
  - Hyperlocal and long-distance
  - API integration
  - Multi-modal logistics
- **Pricing**: Custom enterprise pricing
- **Integration Complexity**: Medium

## Implementation Strategy

### Phase 1: Single Partner Integration

1. Start with **Shiprocket** (easiest for multi-courier access)
2. Implement basic features:
   - Calculate shipping rates
   - Create shipment orders
   - Generate AWB (Airway Bill)
   - Track shipments

### Phase 2: Multi-Partner Comparison

1. Add 2-3 more partners (e.g., Dunzo for local, Delhivery for long-distance)
2. Show delivery options at checkout:
   ```
   ┌─────────────────────────────────────────┐
   │ Standard Delivery (5-7 days)    ₹100   │
   │ Express Delivery (2-3 days)     ₹250   │
   │ Same Day Delivery (Today)       ₹500   │
   └─────────────────────────────────────────┘
   ```
3. Let customer choose based on:
   - Price
   - Delivery time
   - Courier partner ratings

### Phase 3: Smart Routing

1. Implement intelligent courier selection based on:
   - Pincode serviceability
   - Best price for weight/distance
   - Delivery time requirements
   - Partner performance history

## Database Schema Updates Needed

```javascript
// Add to Order schema
const orderSchema = new mongoose.Schema({
  // ... existing fields

  deliveryPartner: {
    name: String, // 'shiprocket', 'delhivery', 'dunzo'
    partnerOrderId: String, // Their order/AWB number
    courierName: String, // Actual courier (Blue Dart, etc.)
    estimatedDelivery: Date,
    actualCost: Number,
  },

  deliveryOption: {
    type: String,
    enum: ["standard", "express", "same-day"],
    default: "standard",
  },

  // ... rest of schema
});
```

## API Endpoints to Create

```javascript
// Get delivery options for pincode and weight
GET /api/delivery/options?pincode=560001&weight=0.5
Response: [
  {
    partner: 'shiprocket',
    option: 'standard',
    courier: 'Delhivery Surface',
    days: 5-7,
    cost: 100
  },
  {
    partner: 'shiprocket',
    option: 'express',
    courier: 'Blue Dart',
    days: 2-3,
    cost: 250
  }
]

// Create shipment with selected partner
POST /api/delivery/create
Body: {
  orderId: '...',
  partner: 'shiprocket',
  option: 'express'
}

// Track shipment
GET /api/delivery/track/:orderId
```

## Next Steps

1. **Sign up for Shiprocket account** (they have a free tier for testing)
2. **Get API credentials** (API key, email)
3. **Test in sandbox environment**
4. **Implement basic flow**:
   - Calculate rates at checkout
   - Create shipment when order is ready to ship
   - Fetch tracking updates
5. **Add webhook** to receive delivery status updates
6. **Test with real shipments** (use test mode first)

## Cost Estimation

For a startup/small business:

- **Shiprocket**: ₹30-150 per shipment (depending on weight/distance)
- **Setup cost**: Free (API integration)
- **Monthly platform fee**: None for pay-per-shipment model

## Security Considerations

- Store API keys in environment variables
- Never expose API keys in frontend
- Use webhook signatures to verify callbacks
- Implement rate limiting for API calls
- Log all delivery API requests for debugging

## Resources

- Shiprocket API Docs: https://apidocs.shiprocket.in/
- Delhivery API Docs: https://developers.delhivery.com/
- India Post Pincode API: https://api.postalpincode.in/
