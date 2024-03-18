const mongoose = require("mongoose");

const conversationShema = new mongoose.Schema(
    {
        members: [{
            type: String,
            required: true,
        }],
        messages: [{
            type: mongoose.Schema.Types.ObjectId,
            required: true,
        }],
    },
    { timestamps: true }
);

const Conversation = mongoose.model("Conversation", conversationShema);

module.exports = Conversation;