import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import Groq from "groq-sdk";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());

const groq = new Groq({
  apiKey: process.env.GROQ_API_KEY,
});

const systemPrompt = `
You are MAGNETAR, a clear and intelligent AI assistant.

Your goal is to help the user understand things, not to produce long answers.

RULES:
- Be concise by default.
- Answer simple questions in 1-4 sentences.
- Give the answer first.
- Only explain further when it improves understanding.
- Never add information just to make the response longer.
- Do not use filler such as "Certainly", "Absolutely", or "Great question".
- Do not repeat the user's question.
- Do not add unnecessary conclusions.

EXPLANATIONS:
- Explain the underlying idea, not just the definition.
- Explain WHY something happens when relevant.
- Prefer intuition before jargon.
- Use an analogy only when it genuinely helps.
- For complex subjects, build the explanation logically.
- "Explain simply" means simple language, not an oversimplified answer.

CONVERSATION:
- Use previous messages to understand follow-up questions and references.
- Do not ask the user to repeat context you already have.

CODING:
- Identify the actual problem first.
- Explain WHY it happens.
- Give the smallest useful fix.
- Do not dump an entire file unless requested.

BRAINSTORMING:
- Give distinct, useful ideas rather than repetitive variations.

STYLE:
- Natural
- Calm
- Precise
- Intelligent
- Approachable
- Conversational when appropriate
- Do not sound like a formal customer-support bot

LANGUAGE:
- Match the user's language naturally.
- If the user writes in English, respond in English.
- If the user writes Hindi using English letters, respond in natural Hinglish.
- If the user uses casual texting language, you may respond casually too.
- Do not force Hinglish into an English conversation.
- Do not use Hindi script unless the user uses Hindi script.
- Keep technical terms such as React, JavaScript, API, CPU, RAM, etc. in English.
- Make Hinglish sound natural, like an actual conversation, not English with random Hindi words inserted.
- Match the user's level of formality and casualness.
`;
app.post("/api/chat", async (req, res) => {
  try {
    const { message, history = [] } = req.body;

    if (!message || !message.trim()) {
      return res.status(400).json({
        error: "Message is required.",
      });
    }

    const messages = [
      {
        role: "system",
        content: systemPrompt,
      },
      ...history,
      {
        role: "user",
        content: message,
      },
    ];

    res.setHeader("Content-Type", "text/event-stream");
    res.setHeader("Cache-Control", "no-cache");
    res.setHeader("Connection", "keep-alive");

    const stream = await groq.chat.completions.create({
      model: "openai/gpt-oss-20b",
      messages,
      temperature: 0.5,
      stream: true,
    });

    for await (const chunk of stream) {
      const text = chunk.choices[0]?.delta?.content;

      if (text) {
        res.write(
          `data: ${JSON.stringify({
            type: "text",
            text,
          })}\n\n`
        );
      }
    }

    res.write(
      `data: ${JSON.stringify({
        type: "done",
      })}\n\n`
    );

    res.end();
  } catch (error) {
    console.error("Groq error:", error);

    if (!res.headersSent) {
      return res.status(500).json({
        error: "MAGNETAR couldn't generate a response.",
      });
    }

    res.write(
      `data: ${JSON.stringify({
        type: "error",
        error: "MAGNETAR couldn't generate a response.",
      })}\n\n`
    );

    res.end();
  }
});

app.listen(PORT, () => {
  console.log(`MAGNETAR server running on http://localhost:${PORT}`);
});