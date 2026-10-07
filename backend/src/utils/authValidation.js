const normalizeEmail = (value) => {
    if (typeof value !== "string") return null;

    const email = value.trim().toLowerCase();
    if (!email || email.length > 254 || /[\u0000-\u0020\u007f]/.test(email)) return null;

    const at = email.indexOf("@");
    if (at < 1 || at !== email.lastIndexOf("@")) return null;

    const local = email.slice(0, at);
    const domain = email.slice(at + 1);
    if (local.length > 64 || local.startsWith(".") || local.endsWith(".") || local.includes("..")) return null;

    const labels = domain.split(".");
    if (labels.length < 2 || labels.some((label) =>
        !label || label.length > 63 || !/^[a-z0-9](?:[a-z0-9-]*[a-z0-9])?$/i.test(label)
    )) return null;

    if (!/^[a-z0-9.!#$%&'*+/=?^_`{|}~-]+$/i.test(local)) return null;
    return email;
};

const normalizeName = (value) => {
    if (typeof value !== "string") return null;
    const name = value.trim();
    if (name.length < 2 || name.length > 255 || /[\u0000-\u001f\u007f]/.test(name)) return null;
    return name;
};

const validatePassword = (value) => typeof value === "string" &&
    value.length >= 6 &&
    Buffer.byteLength(value, "utf8") <= 72;

const normalizeStudentId = (value) => {
    if (typeof value !== "string") return null;
    const studentId = value.trim();
    if (!studentId || studentId.length > 50 || /[\u0000-\u001f\u007f]/.test(studentId)) return null;
    return studentId;
};

const normalizePhone = (value) => {
    if (typeof value !== "string") return null;
    const phone = value.trim();
    const digits = phone.replace(/\D/g, "");
    if (phone.length > 30 || digits.length < 7 || digits.length > 20 ||
        !/^\+?[0-9\s().-]+$/.test(phone)) return null;
    return phone;
};

module.exports = {
    normalizeEmail,
    normalizeName,
    normalizePhone,
    normalizeStudentId,
    validatePassword
};
