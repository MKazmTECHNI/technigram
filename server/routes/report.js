const express = require("express");
const axios = require("axios");
const router = express.Router();

const webhookUrl = process.env.DISCORD_WEBHOOK_URL;

router.post("/", async (req, res) => {
  const { type, title, description, imageUrl } = req.body;
  if (!type || !title || !description) {
    return res.status(400).json({ error: "Missing required fields" });
  }
  if (!webhookUrl) {
    return res.status(500).json({ error: "Webhook URL not configured" });
  }

  // Format Discord message
  const embed = {
    title: `${type === "bug" ? "🐞 Bug" : "💡 Proposition"}: ${title}`,
    description,
    color: type === "bug" ? 0xff5555 : 0x55ff99,
    image: imageUrl ? { url: imageUrl } : undefined,
    timestamp: new Date().toISOString(),
  };

  try {
    await axios.post(webhookUrl, {
      embeds: [embed],
    });
    res.json({ success: true });
  } catch (err) {
    console.error("[Report] Discord webhook error:", err);
    res.status(500).json({ error: "Failed to send report" });
  }
});

module.exports = router;
