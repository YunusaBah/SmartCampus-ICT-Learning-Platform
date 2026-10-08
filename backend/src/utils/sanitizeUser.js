const sanitizeUser = (user) => {
    const data = user.toJSON ? user.toJSON() : { ...user };
    data.googleLinked = Boolean(data.googleId);
    delete data.password;
    delete data.googleId;
    return data;
};

module.exports = sanitizeUser;
