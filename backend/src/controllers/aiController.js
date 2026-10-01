require("../config/env");
const Anthropic = require("@anthropic-ai/sdk");

exports.askAI = async (req, res) => {
    try {
        const { message, context } = req.body;
        if (typeof message !== "string" || !message.trim() || message.length > 4000) {
            return res.status(400).json({ message: "Enter a message of at most 4,000 characters" });
        }

        if (!process.env.ANTHROPIC_API_KEY ||
            process.env.ANTHROPIC_API_KEY === "your_anthropic_api_key") {
            return res.status(503).json({ message: "The AI assistant is not configured" });
        }

        const courseName = typeof context?.courseName === "string"
            ? context.courseName.slice(0, 200)
            : "";
        const lessonContent = typeof context?.lessonContent === "string"
            ? context.lessonContent.slice(0, 12000)
            : "";
        const isStaff = req.user.role === "lecturer" || req.user.role === "admin";

        let systemPrompt;

        if (isStaff) {
            systemPrompt = `You are an AI assistant for lecturers on SmartCampus LMS.
You help lecturers create educational quiz questions for their courses.
Course: "${courseName || "General"}"
Materials: "${lessonContent || "None provided"}"

When generating quiz questions, use this exact format:
QUESTION: [question text]
A: [option A]
B: [option B]
C: [option C]
D: [option D]
ANSWER: [correct letter]

Generate clear educational questions based only on the course materials.`;
        } else {
            systemPrompt = `You are an AI learning assistant for students on SmartCampus LMS.
The student is studying: "${courseName || "their course"}".
Course material available: "${lessonContent || "No materials uploaded yet"}".

STRICT RULES:
1. Only help students understand the course material above.
2. NEVER give direct answers to quiz questions or assignments.
3. If asked for quiz/assignment answers say: "I can't give you the answer directly, but let me explain the concept so you can work it out."
4. Guide with explanations and hints only.
5. If question is unrelated to course material say: "I can only help with topics from this course."
Be friendly, clear and educational.`;
        }

        const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
        const response = await client.messages.create({
            model: "claude-sonnet-4-20250514",
            max_tokens: 1024,
            system: systemPrompt,
            messages: [{ role: "user", content: message.trim() }]
        });

        const reply = response.content.find((block) => block.type === "text")?.text;
        if (!reply) {
            console.error("AI provider returned no text response");
            return res.status(502).json({ message: "The AI assistant returned an empty response" });
        }
        res.json({ reply });
    } catch (error) {
        console.error("AI request failed:", error);
        res.status(502).json({ message: "The AI assistant could not respond" });
    }
};