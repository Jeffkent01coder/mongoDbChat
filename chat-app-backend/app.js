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

app.get("/conversations/search/:id", async (req, res) => {
  const { id } = req.params;

  console.log("Id is: ", id);

  try {
    // Find conversation where either member has the ID
    const conversations = await Conversation.find({
      members: id, // Check if the ID is in the members array
    })
      .sort({ createdAt: -1 })
      .populate("messages")
      .exec(); // Sort by latest conversation and populate messages
    console.log("Conversations are: ", conversations);

    const chats = []

    if(conversations.length !== 0) {
      for(const conversation of conversations) {
        // Find the other member apart from the ID
        const otherMember = conversation.members.find((member) => member !== id);

        // Get the last message in the conversation
        const lastMessageId = conversation.messages[conversation.messages.length - 1];
        const messageObject = await Message.findById(lastMessageId);
        const lastMessage = messageObject.message;

        chats.push({
          otherMember,
          lastMessage
        })
      }
    }    
    res.status(200).json(chats);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Failed to search for conversation" });
  }
});

// Start the server
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
