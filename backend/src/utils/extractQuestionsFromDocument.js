const path = require("path");
const AdmZip = require("adm-zip");
const mammoth = require("mammoth");
const pdfParse = require("pdf-parse");
const XLSX = require("xlsx");
const { XMLParser } = require("fast-xml-parser");

const supportedExtensions = new Set([".pdf", ".docx", ".pptx", ".txt", ".xlsx", ".csv"]);
const maxExpandedBytes = 40 * 1024 * 1024;
const maxArchiveEntries = 2000;
const optionPattern = /^\s*(?:\(?([A-D])\)?[.)]|[\[(]?(iv|iii|ii|i)[\])][.)]?)\s+(.+)$/i;
const numberedPattern = /^\s*(?:(?:question|q)\s*)?(\d{1,3})\s*[.):]\s+(.+)$/i;
const questionLeadPattern = /^(?:what|who|when|where|why|how|which|define|describe|explain|discuss|compare|contrast|state|list|outline|give|name|write|identify|calculate|differentiate|mention|evaluate|analyze|analyse|illustrate|summarize|summarise|prove|derive)\b/i;

const validateArchive = (buffer) => {
    const zip = new AdmZip(buffer);
    const entries = zip.getEntries();
    if (entries.length > maxArchiveEntries ||
        entries.reduce((total, entry) => total + (entry.header.size || 0), 0) > maxExpandedBytes ||
        entries.some((entry) => entry.isDirectory && entry.header.size > maxExpandedBytes)) {
        throw new Error("The document expands beyond the supported processing limit.");
    }
    return zip;
};

const textFromPptx = (zip) => {
    const parser = new XMLParser({ ignoreAttributes: true, parseTagValue: false });
    const slideNames = zip.getEntries()
        .map((entry) => entry.entryName)
        .filter((name) => /^ppt\/slides\/slide\d+\.xml$/i.test(name))
        .sort((left, right) => Number(left.match(/slide(\d+)/i)[1]) - Number(right.match(/slide(\d+)/i)[1]));
    const slides = slideNames.map((name) => {
        const xml = zip.readAsText(name);
        if (!xml) return "";
        const parsed = parser.parse(xml);
        const paragraphs = [];
        const collectParagraphs = (node) => {
            if (!node || typeof node !== "object") return;
            for (const [key, value] of Object.entries(node)) {
                if (key === "a:p") {
                    const paragraphList = Array.isArray(value) ? value : [value];
                    for (const paragraph of paragraphList) {
                        const values = [];
                        const collectText = (part) => {
                            if (typeof part === "string" || typeof part === "number") return;
                            if (!part || typeof part !== "object") return;
                            for (const [childKey, childValue] of Object.entries(part)) {
                                if (childKey === "a:t") {
                                    values.push(...(Array.isArray(childValue) ? childValue : [childValue])
                                        .filter((item) => typeof item === "string" || typeof item === "number")
                                        .map(String));
                                } else if (typeof childValue === "object") {
                                    collectText(childValue);
                                }
                            }
                        };
                        collectText(paragraph);
                        if (values.length) paragraphs.push(values.join(""));
                    }
                } else if (typeof value === "object") {
                    collectParagraphs(value);
                }
            }
        };
        collectParagraphs(parsed);
        return paragraphs.join("\n");
    });
    return slides.join("\n\n");
};

const normalizeHeader = (value) => String(value || "").trim().toLowerCase().replace(/[^a-z0-9]/g, "");

const findHeader = (headers, names) => headers.findIndex((header) => names.includes(normalizeHeader(header)));

const rowsToStructuredQuestions = (rows) => {
    const headerIndex = rows.findIndex((row) =>
        row.some((cell) => ["question", "questiontext", "prompt"].includes(normalizeHeader(cell)))
    );
    if (headerIndex < 0) return null;
    const headers = rows[headerIndex].map(normalizeHeader);
    const indexes = {
        question: findHeader(headers, ["question", "questiontext", "prompt"]),
        optionA: findHeader(headers, ["optiona", "choicea", "a"]),
        optionB: findHeader(headers, ["optionb", "choiceb", "b"]),
        optionC: findHeader(headers, ["optionc", "choicec", "c"]),
        optionD: findHeader(headers, ["optiond", "choiced", "d"]),
        answer: findHeader(headers, ["answer", "correctanswer", "answerkey", "key"]),
        type: findHeader(headers, ["type", "questiontype"]),
        marks: findHeader(headers, ["marks", "points", "score"])
    };
    return rows.slice(headerIndex + 1)
        .filter((row) => String(row[indexes.question] || "").trim())
        .map((row, index) => {
            const options = {};
            for (const letter of ["A", "B", "C", "D"]) {
                const value = row[indexes[`option${letter}`]];
                if (value != null && String(value).trim()) options[letter] = String(value).trim();
            }
            const answer = indexes.answer < 0 ? "" : String(row[indexes.answer] || "").trim();
            const type = indexes.type < 0 ? "" : String(row[indexes.type] || "").trim().toUpperCase();
            const marksValue = indexes.marks < 0 ? "" : Number(row[indexes.marks]);
            const question = buildQuestion(String(row[indexes.question]).trim(), options, {
                answer,
                sourceNumber: index + 1,
                marks: Number.isFinite(marksValue) && marksValue > 0 ? marksValue : null,
                forceTheory: type === "THEORY",
                forceMcq: type === "MCQ"
            });
            return question;
        });
};

const normalizeAnswer = (answer, optionLabels) => {
    const match = String(answer || "").match(/(?:option\s*)?([A-D]|iv|iii|ii|i)\b/i);
    if (!match) return null;
    const aliases = { I: "A", II: "B", III: "C", IV: "D" };
    const label = (aliases[match[1].toUpperCase()] || match[1].toUpperCase());
    return optionLabels.includes(label) ? label : null;
};

const buildQuestion = (text, options, metadata = {}) => {
    const normalizedOptions = {};
    for (const letter of ["A", "B", "C", "D"]) {
        if (options[letter]) normalizedOptions[letter] = String(options[letter]).trim();
    }
    const optionLabels = Object.keys(normalizedOptions);
    const hasOptions = optionLabels.length > 0;
    const questionType = metadata.forceTheory ? "THEORY" : (metadata.forceMcq || hasOptions ? "MCQ" : "THEORY");
    const correctAnswer = questionType === "MCQ"
        ? normalizeAnswer(metadata.answer, optionLabels)
        : null;
    const reviewFlags = [];
    if (metadata.forceMcq && !hasOptions) reviewFlags.push("No answer options were identified.");
    if (questionType === "MCQ" && optionLabels.length < 2) {
        reviewFlags.push("Fewer than two answer options were found; add or correct the missing options.");
    } else if (questionType === "MCQ" && optionLabels.length < 4) {
        reviewFlags.push("Fewer than four answer options were found; review the options.");
    }
    if (questionType === "MCQ" && !correctAnswer) {
        reviewFlags.push("Correct answer key not found; select the correct answer before publishing.");
    }
    if (metadata.ambiguous) reviewFlags.push("Question boundary is uncertain; review the extracted text.");

    return {
        question: String(text || "").trim(),
        questionType,
        optionA: normalizedOptions.A || "",
        optionB: normalizedOptions.B || "",
        optionC: normalizedOptions.C || "",
        optionD: normalizedOptions.D || "",
        correctAnswer,
        marks: metadata.marks || 1,
        sourceNumber: metadata.sourceNumber || null,
        confidence: metadata.confidence ?? (hasOptions ? 0.92 : 0.78),
        reviewFlags
    };
};

const parseMarks = (text) => {
    const match = text.match(/\s*[\[(]\s*(\d+(?:\.\d+)?)\s*(?:marks?|points?)\s*[\])]\s*$/i);
    if (!match) return { text: text.trim(), marks: null };
    return {
        text: text.slice(0, match.index).trim(),
        marks: Number(match[1])
    };
};

const extractAnswerKeys = (lines) => {
    const keys = new Map();
    const answerKeyHeader = /^\s*(?:answer\s*key|answers)\s*:?\s*$/i;
    let inKeySection = false;
    for (const line of lines) {
        if (answerKeyHeader.test(line)) {
            inKeySection = true;
            continue;
        }
        if (inKeySection) {
            const match = line.match(/^\s*(?:q(?:uestion)?\s*)?(\d{1,3})\s*[.):\-]\s*(?:answer\s*[:\-]\s*)?(?:option\s*)?[\[(]?([A-D]|iv|iii|ii|i)\b[\])]?/i);
            if (match) {
                keys.set(Number(match[1]), match[2]);
                continue;
            }
            if (line.trim() && !/^\s*(?:q(?:uestion)?\s*)?\d/.test(line)) inKeySection = false;
        }
    }
    return keys;
};

const parseQuestionText = (sourceText) => {
    const text = sourceText.replace(/\r\n?/g, "\n").replace(/\u00a0/g, " ");
    const lines = text.split("\n");
    const answerKeys = extractAnswerKeys(lines);
    const questions = [];
    const unassigned = [];
    let inKeySection = false;
    let current = null;
    let blankSinceContent = false;

    const flush = () => {
        if (!current) return;
        const questionText = current.questionLines.join(" ").replace(/\s+/g, " ").trim();
        if (questionText) {
            const marked = parseMarks(questionText);
            const answer = current.answer || answerKeys.get(current.number) || "";
            questions.push(buildQuestion(marked.text, current.options, {
                answer,
                sourceNumber: current.number,
                marks: current.marks || marked.marks,
                confidence: current.number ? (Object.keys(current.options).length >= 2 ? 0.96 : 0.88) : 0.74,
                ambiguous: !current.number && !current.options
            }));
        } else {
            unassigned.push(...current.questionLines);
        }
        current = null;
    };

    for (const rawLine of lines) {
        const line = rawLine.trim();
        if (!line) {
            blankSinceContent = true;
            continue;
        }
        if (/^\s*(?:answer\s*key|answers)\s*:?\s*$/i.test(line)) {
            flush();
            inKeySection = true;
            continue;
        }
        if (inKeySection) {
            const match = line.match(/^\s*(?:q(?:uestion)?\s*)?(\d{1,3})\s*[.):\-]\s*(?:answer\s*[:\-]\s*)?(?:option\s*)?[\[(]?([A-D]|iv|iii|ii|i)\b[\])]?/i);
            if (match) {
                answerKeys.set(Number(match[1]), match[2]);
                continue;
            }
            inKeySection = false;
        }

        const answerMatch = line.match(/^\s*(?:correct\s*)?answer\s*[:\-]\s*(?:option\s*)?[\[(]?([A-D]|iv|iii|ii|i)\b[\])]?/i);
        if (answerMatch && current) {
            current.answer = answerMatch[1];
            blankSinceContent = false;
            continue;
        }

        const optionMatch = line.match(optionPattern);
        if (optionMatch && current) {
            const letter = /^[A-D]$/i.test(optionMatch[1])
                ? optionMatch[1].toUpperCase()
                : ({ I: "A", II: "B", III: "C", IV: "D" }[optionMatch[2].toUpperCase()]);
            if (letter) current.options[letter] = optionMatch[3].trim();
            blankSinceContent = false;
            continue;
        }

        const numberedMatch = line.match(numberedPattern);
        if (numberedMatch) {
            flush();
            const parsed = parseMarks(numberedMatch[2]);
            current = {
                number: Number(numberedMatch[1]),
                questionLines: [parsed.text],
                options: {},
                answer: "",
                marks: parsed.marks
            };
            blankSinceContent = false;
            continue;
        }

        const looksLikeStart = line.endsWith("?") || questionLeadPattern.test(line);
        if (current && (blankSinceContent || (looksLikeStart && current.questionLines.join(" ").trim().endsWith("?")))) {
            if (looksLikeStart) flush();
        }
        if (!current && looksLikeStart) {
            const parsed = parseMarks(line);
            current = { number: null, questionLines: [parsed.text], options: {}, answer: "", marks: parsed.marks };
        } else if (current) {
            current.questionLines.push(line);
        } else {
            unassigned.push(line);
        }
        blankSinceContent = false;
    }
    flush();

    for (const question of questions) {
        if (question.sourceNumber && answerKeys.has(question.sourceNumber) && question.questionType === "MCQ") {
            question.correctAnswer = normalizeAnswer(answerKeys.get(question.sourceNumber), Object.keys(question).filter((key) => /^option[A-D]$/.test(key) && question[key]).map((key) => key.slice(-1)));
            question.reviewFlags = question.reviewFlags.filter((flag) =>
                flag !== "Correct answer key not found; select the correct answer before publishing."
            );
        }
    }
    return { questions, unassignedText: unassigned.join("\n").trim() };
};

const extractDocumentText = async (file) => {
    const extension = path.extname(file.originalname || "").toLowerCase();
    if (!supportedExtensions.has(extension)) {
        throw new Error("Unsupported file format. Upload PDF, DOCX, PPTX, TXT, XLSX, or CSV.");
    }
    const buffer = file.buffer;
    if (!Buffer.isBuffer(buffer) || !buffer.length) throw new Error("The uploaded document is empty.");

    if (extension === ".txt" || extension === ".csv") {
        const text = buffer.toString("utf8");
        if (text.includes("\u0000") || text.includes("\ufffd")) throw new Error("The text document is corrupted or is not valid UTF-8.");
        if (extension === ".csv") {
            const workbook = XLSX.read(buffer, { type: "buffer", raw: false });
            const rows = workbook.SheetNames.flatMap((name) =>
                XLSX.utils.sheet_to_json(workbook.Sheets[name], { header: 1, defval: "", raw: false })
            );
            return { text: rows.map((row) => row.join(" | ")).join("\n"), rows };
        }
        return { text, rows: null };
    }

    if (extension === ".pdf") {
        if (buffer.subarray(0, 5).toString() !== "%PDF-") throw new Error("This PDF file is corrupted or invalid.");
        const result = await pdfParse(buffer, { max: 101 });
        if (result.numpages > 100) throw new Error("PDF exceeds the 100-page processing limit.");
        return { text: result.text, rows: null };
    }

    const zip = validateArchive(buffer);
    const entries = new Set(zip.getEntries().map((entry) => entry.entryName));
    if (extension === ".docx") {
        if (!entries.has("word/document.xml")) throw new Error("This Word document is corrupted or invalid.");
        const result = await mammoth.extractRawText({ buffer });
        return { text: result.value, rows: null };
    }
    if (extension === ".pptx") {
        if (!entries.has("[Content_Types].xml") || !entries.has("ppt/presentation.xml")) {
            throw new Error("This PowerPoint document is corrupted or invalid.");
        }
        return { text: textFromPptx(zip), rows: null };
    }
    if (!entries.has("[Content_Types].xml") || !entries.has("xl/workbook.xml")) {
        throw new Error("This Excel document is corrupted or invalid.");
    }
    const workbook = XLSX.read(buffer, { type: "buffer", raw: false });
    const rows = workbook.SheetNames.flatMap((name) =>
        XLSX.utils.sheet_to_json(workbook.Sheets[name], { header: 1, defval: "", raw: false })
    );
    return { text: rows.map((row) => row.join(" | ")).join("\n"), rows };
};

const extractQuestionsFromDocument = async (file) => {
    const extension = path.extname(file.originalname || "").toLowerCase();
    if (!supportedExtensions.has(extension)) {
        throw new Error("Unsupported file format. Upload PDF, DOCX, PPTX, TXT, XLSX, or CSV.");
    }
    let extracted;
    try {
        extracted = await extractDocumentText(file);
    } catch (error) {
        if (error.message.startsWith("Unsupported") ||
            error.message.includes("corrupted") ||
            error.message.includes("empty") ||
            error.message.includes("limit") ||
            error.message.includes("UTF-8")) throw error;
        throw new Error("The document could not be read. Check that it is not corrupted and try another file.");
    }
    const structured = extracted.rows ? rowsToStructuredQuestions(extracted.rows) : null;
    const result = structured
        ? { questions: structured, unassignedText: "" }
        : parseQuestionText(extracted.text || "");
    if (!result.questions.length) {
        const suffix = extension === ".pdf" && !(extracted.text || "").trim()
            ? " This PDF appears to be scanned; OCR is not available on this server."
            : "";
        throw new Error(`No questions could be identified in this document.${suffix}`);
    }
    if (result.questions.length > 200) throw new Error("This document contains more than 200 detected questions.");
    return {
        questions: result.questions,
        unassignedText: result.unassignedText,
        warnings: result.unassignedText
            ? ["Some document text could not be confidently assigned to a question; review it before importing."]
            : []
    };
};

module.exports = { extractDocumentText, extractQuestionsFromDocument, parseQuestionText };
