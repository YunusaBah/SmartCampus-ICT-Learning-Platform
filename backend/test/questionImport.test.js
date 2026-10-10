const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const AdmZip = require("adm-zip");
const XLSX = require("xlsx");
const {
    extractDocumentText,
    extractQuestionsFromDocument,
    parseQuestionText
} = require("../src/utils/extractQuestionsFromDocument");

const upload = (name, contents) => ({
    originalname: name,
    buffer: Buffer.isBuffer(contents) ? contents : Buffer.from(contents)
});

const makeDocx = (text) => {
    const zip = new AdmZip();
    zip.addFile("word/document.xml", Buffer.from(
        `<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:body>${text
            .split("\n").map((line) => `<w:p><w:r><w:t>${line}</w:t></w:r></w:p>`).join("")}</w:body></w:document>`
    ));
    return zip.toBuffer();
};

const makePptx = () => {
    const zip = new AdmZip();
    zip.addFile("[Content_Types].xml", Buffer.from("<Types/>"));
    zip.addFile("ppt/presentation.xml", Buffer.from("<p:presentation/>"));
    zip.addFile("ppt/slides/slide2.xml", Buffer.from(
        "<p:sld><p:spTree><p:sp><p:txBody><a:p><a:r><a:t>2. Explain recursion.</a:t></a:r></a:p></p:txBody></p:sp></p:spTree></p:sld>"
    ));
    zip.addFile("ppt/slides/slide1.xml", Buffer.from(
        "<p:sld><p:spTree><p:sp><p:txBody><a:p><a:r><a:t>1. What is a variable?</a:t></a:r></a:p></p:txBody></p:sp></p:spTree></p:sld>"
    ));
    return zip.toBuffer();
};

test("identifies MCQ and theory questions and maps a separate answer key", () => {
    const result = parseQuestionText([
        "1. What is an operating system? (5 marks)",
        "A. Manages resources",
        "B. Designs websites",
        "2. Explain database normalization. [10 marks]",
        "",
        "Answer Key:",
        "1. A"
    ].join("\n"));

    assert.equal(result.questions.length, 2);
    assert.equal(result.questions[0].questionType, "MCQ");
    assert.equal(result.questions[0].correctAnswer, "A");
    assert.equal(result.questions[0].marks, 5);
    assert.equal(result.questions[1].questionType, "THEORY");
    assert.equal(result.questions[1].marks, 10);
    assert.equal(result.questions[1].correctAnswer, null);
});

test("flags an incomplete multiple-choice question instead of converting it to theory", () => {
    const result = parseQuestionText("1. Which is a programming language?\nA. Java");
    assert.equal(result.questions[0].questionType, "MCQ");
    assert.ok(result.questions[0].reviewFlags.some((flag) => flag.includes("Fewer than two")));
});

test("recognizes roman-numeral options", () => {
    const result = parseQuestionText([
        "1. What is a primary key?",
        "(i) A unique identifier",
        "(ii) A repeated value",
        "(iii) A table name",
        "(iv) A database",
        "Answer: (i)"
    ].join("\n"));
    assert.equal(result.questions[0].questionType, "MCQ");
    assert.equal(result.questions[0].optionA, "A unique identifier");
    assert.equal(result.questions[0].optionD, "A database");
    assert.equal(result.questions[0].correctAnswer, "A");
});

test("extracts plain text documents and reports documents with no identifiable questions", async () => {
    const result = await extractQuestionsFromDocument(upload(
        "questions.txt",
        "What is an algorithm?\n\nExplain how a queue works."
    ));
    assert.deepEqual(result.questions.map((question) => question.questionType), ["THEORY", "THEORY"]);
    await assert.rejects(
        extractQuestionsFromDocument(upload("notes.txt", "Week one lecture notes.")),
        /No questions could be identified/
    );
});

test("extracts structured CSV and Excel question sheets", async () => {
    const csv = "Question,Option A,Option B,Answer,Marks\nWhat is 2+2?,3,4,B,2";
    const csvResult = await extractQuestionsFromDocument(upload("quiz.csv", csv));
    assert.equal(csvResult.questions[0].correctAnswer, "B");
    assert.equal(csvResult.questions[0].marks, 2);

    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, XLSX.utils.aoa_to_sheet([
        ["Question", "Type", "Marks"],
        ["Describe a database index.", "THEORY", 4]
    ]), "Questions");
    const xlsx = XLSX.write(workbook, { type: "buffer", bookType: "xlsx" });
    const xlsxResult = await extractQuestionsFromDocument(upload("questions.xlsx", xlsx));
    assert.equal(xlsxResult.questions[0].questionType, "THEORY");
    assert.equal(xlsxResult.questions[0].marks, 4);
});

test("extracts Word paragraphs as theory questions", async () => {
    const result = await extractQuestionsFromDocument(upload(
        "questions.docx",
        makeDocx("1. Define an algorithm.")
    ));
    assert.equal(result.questions[0].questionType, "THEORY");
    assert.match(result.questions[0].question, /Define an algorithm/);
});

test("extracts readable text from PDF documents", async () => {
    const pdfPackagePath = require.resolve("pdf-parse");
    const pdfFixture = path.join(path.dirname(pdfPackagePath), "test", "data", "01-valid.pdf");
    const result = await extractDocumentText(upload("questions.pdf", fs.readFileSync(pdfFixture)));
    assert.match(result.text, /Trace-based Just-in-Time Type Specialization/);
});

test("extracts PowerPoint questions in slide order", async () => {
    const result = await extractQuestionsFromDocument(upload("questions.pptx", makePptx()));
    assert.deepEqual(result.questions.map((question) => question.sourceNumber), [1, 2]);
    assert.match(result.questions[0].question, /What is a variable/);
});

test("rejects empty, unsupported, and corrupted documents with clear errors", async () => {
    await assert.rejects(extractQuestionsFromDocument(upload("empty.txt", Buffer.alloc(0))), /empty/);
    await assert.rejects(extractQuestionsFromDocument(upload("run.exe", "data")), /Unsupported/);
    await assert.rejects(extractQuestionsFromDocument(upload("broken.pdf", "not a PDF")), /corrupted/);
    await assert.rejects(extractQuestionsFromDocument(upload("broken.docx", "not a zip")), /could not be read/);
});
