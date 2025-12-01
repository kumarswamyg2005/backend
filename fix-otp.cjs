const mongoose = require("mongoose");

mongoose
  .connect("mongodb://127.0.0.1:27017/designden")
  .then(async () => {
    console.log("Connected to MongoDB");

    // Define Order schema
    const orderSchema = new mongoose.Schema({}, { strict: false });
    const Order = mongoose.model("Order", orderSchema);

    // Find all orders that need OTP
    const orders = await Order.find({
      status: {
        $in: [
          "out_for_delivery",
          "picked_up",
          "in_transit",
          "ready_for_pickup",
        ],
      },
    });

    console.log(`Found ${orders.length} orders in delivery status`);

    for (const order of orders) {
      if (!order.deliveryOTP || !order.deliveryOTP.code) {
        const otp = String(Math.floor(1000 + Math.random() * 9000));
        await Order.updateOne(
          { _id: order._id },
          {
            $set: {
              deliveryOTP: {
                code: otp,
                generatedAt: new Date(),
                verified: false,
              },
            },
          }
        );
        console.log(`✅ Added OTP ${otp} to order ${order._id}`);
      } else {
        console.log(
          `Order ${order._id} already has OTP: ${order.deliveryOTP.code}`
        );
      }
    }

    console.log("\n✅ Done!");
    process.exit(0);
  })
  .catch((err) => {
    console.error("Error:", err);
    process.exit(1);
  });
