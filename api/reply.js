const config = require('./config.json');

module.exports = async (req, res) => {
  // Meta sends a GET request first to verify your webhook
  if (req.method === 'GET') {
    const VERIFY_TOKEN = process.env.VERIFY_TOKEN || 'my_verify_token_123';
    const mode = req.query['hub.mode'];
    const token = req.query['hub.verify_token'];
    const challenge = req.query['hub.challenge'];

    if (mode === 'subscribe' && token === VERIFY_TOKEN) {
      return res.status(200).send(challenge);
    }
    return res.status(403).send('Forbidden');
  }

  // Actual incoming messages come as POST requests
  if (req.method === 'POST') {
    try {
      const body = req.body;

      if (body.object === 'instagram') {
        for (const entry of body.entry) {
          const messaging = entry.messaging?.[0];
          if (messaging && messaging.message?.text) {
            const senderId = messaging.sender.id;
            const text = messaging.message.text.toLowerCase();
            const replyText = getReply(text);
            await sendReply(senderId, replyText);
          }
        }
      }

      return res.status(200).send('EVENT_RECEIVED');
    } catch (err) {
      console.error(err);
      return res.status(500).send('Error');
    }
  }

  return res.status(405).send('Method Not Allowed');
};

// Matches incoming text against config.json keywords
function getReply(text) {
  for (const [key, keywords] of Object.entries(config.faqs)) {
    const words = keywords.split(',');
    if (words.some(word => text.includes(word.trim()))) {
      if (key === 'hours') return `Our hours: ${config.hours}`;
      if (key === 'location') return `We're located at: ${config.location}`;
      if (key === 'delivery') return `Delivery info: ${config.delivery}`;
      if (key === 'pricing') return `For pricing, please ask us directly and we'll get you a quote!`;
    }
  }
  return config.fallback;
}

// Sends the reply back via Instagram's Graph API
async function sendReply(recipientId, message) {
  const PAGE_ACCESS_TOKEN = process.env.PAGE_ACCESS_TOKEN;

  await fetch(`https://graph.facebook.com/v21.0/me/messages?access_token=${PAGE_ACCESS_TOKEN}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      recipient: { id: recipientId },
      message: { text: message }
    })
  });
}

