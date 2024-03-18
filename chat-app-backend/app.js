const express = require("express");
const bodyParser = require("body-parser");
const mongoose = require("mongoose");

const app = express();
const PORT = process.env.PORT || 5000;

// MongoDB Connection
mongoose.connect("mongodb://localhost:27017/chat-app", {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});
const db = mongoose.connection;
db.on("error", console.error.bind(console, "MongoDB connection error:"));

// Models
const Message = require("./models/Message");
const Conversation = require("./models/conversations");

// Middleware
app.use(bodyParser.json());

// Routes
// Send a message to a conversation
app.post("/messages", async (req, res) => {
  const { sender, receiver, message } = req.body;

  console.log(sender, receiver, message);

  try {
    // Save the message in the messages collection
    const newMessage = new Message({
      sender: sender,
      receiver: receiver,
      message: message,
    });
    await newMessage.save();

    // Check if the conversation already exists
    let conversation = await Conversation.findOne({
      members: { $all: [sender, receiver] },
    });
    if (!conversation) {
      // If the conversation doesn't exist, create a new one
      conversation = new Conversation({
        members: [sender, receiver],
        messages: [newMessage], // Add the new message to the conversation
      });
    } else {
      // If the conversation exists, push the new message to the existing ones
      conversation.messages.push(newMessage);
    }

    // Save the conversation
    await conversation.save();

    res.status(201).json({ conversationId: conversation._id }); // Return conversation ID
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Failed to send message" });
  }
});
app.get("/messages/:sender/:receiver", async (req, res) => {
  const { sender, receiver } = req.params; // Destructure sender and receiver from req.params
  try {
    // Find the conversation that matches the sender and receiver
    const conversation = await Conversation.findOne({
      members: { $all: [sender, receiver] },
    });

    if (!conversation) {
      return res.status(404).json({ error: "Conversation not found" });
    }

    // Retrieve messages associated with the conversation and populate them
    const messages = await Message.find({
      _id: { $in: conversation.messages },
    });

    // Return the messages
    res.status(200).json(messages);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Failed to fetch messages" });
  }
});
// Search conversation by sender and receiver and return the conversation ID
app.get("/conversations/search", async (req, res) => {
  const { sender, receiver } = req.query;

  if (!sender || !receiver) {
    return res
      .status(400)
      .json({ error: "Sender and receiver parameters are required" });
  }

  try {
    // Find conversation by sender and receiver
    const conversation = await Conversation.findOne({
      members: { $all: [sender, receiver] },
    });

    if (!conversation) {
      return res.status(404).json({ error: "Conversation not found" });
    }

    res.status(200).json({ conversationId: conversation._id });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Failed to search for conversation" });
  }
});

// Start the server
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
