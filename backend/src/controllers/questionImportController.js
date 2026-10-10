const { extractQuestionsFromDocument } = require("../utils/extractQuestionsFromDocument");

exports.extractQuestions = async (req, res) => {
    if (!req.file) return res.status(400).json({ message: "Choose a supported document to upload." });
    try {
        const result = await extractQuestionsFromDocument(req.file);
        res.json(result);
    } catch (error) {
        const knownClientError = error.message.startsWith("Unsupported") ||
            error.message.includes("corrupted") ||
            error.message.includes("empty") ||
            error.message.includes("limit") ||
            error.message.includes("UTF-8") ||
            error.message.includes("No questions");
        if (knownClientError) return res.status(422).json({ message: error.message });
        console.error("Question document extraction failed:", error.message);
        return res.status(422).json({ message: "This document could not be processed. Check the file and try again." });
    }
};
