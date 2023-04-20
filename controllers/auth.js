const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const gravatar = require("gravatar");
const {v4: uuidv4} = require("uuid");

const fs = require("fs/promises");
const path = require("path");

const { ctrlWrapper } = require("../utils");
const { User } = require("../models/user");
const { HttpError, sendEmail } = require("../helpers");

const { SECRET_KEY, BASE_URL } = process.env;

const avatarDir = path.join(__dirname, "../", "public", "avatars");

const register = async (req, res) => {
  const { email, password } = req.body;

  const user = await User.findOne({ email });
  if (user) {
    throw HttpError(409, "Email already exist");
  }

  const hashPassword = await bcrypt.hash(password, 10);
  const avatarURL = gravatar.url(email);
  const verificationToken = uuidv4();

  const newUser = await User.create({
    ...req.body,
    password: hashPassword,
    avatarURL,
    verificationToken,
  });
  const verifyEmail = {
    to: email,
    subject: "Verify email",
    html: `<a target="_blank" href="${BASE_URL}/api/auth/verify/${verificationToken}">Click verify email</a>`
};

await sendEmail(verifyEmail);

  res.status(201).json({
    email: newUser.email,
  });
};

const verifyEmail = async(req, res)=> {
  const {verificationToken} = req.params;
  const user = await User.findOne({verificationToken});
  if(!user) {
      throw HttpError(404, "Email not found");
  }
  await User.findByIdAndUpdate(user._id, {verify: true, verificationToken: ""});

  res.json({
      message: "Verify success"
  })
}

const resendEmail = async(req, res)=> {
  const {email} = req.body;
  const user = await User.findOne({email});
  if(!user) {
      throw HttpError(404, "Email not found");
  }
  if(user.verify) {
      throw HttpError(400, "Email already verify");
  }

  const verifyEmail = {
      to: email,
      subject: "Verify email",
      html: `<a target="_blank" href="${BASE_URL}/api/auth/verify/${user.verificationCode}">Click verify email</a>`
  };

  await sendEmail(verifyEmail);

  res.json({
      message: "Verification email resend"
  })
}


const login = async (req, res) => {
  const { email, password } = req.body;
  const user = await User.findOne({ email });

  if (!user) {
    throw HttpError(401, "Email or password invalid");
  }

  if (!user.verify) {
    throw HttpError(401, "Email no verify");
  }

  const passwordCompare = await bcrypt.compare(password, user.password);
  if (!passwordCompare) {
    throw HttpError(401, "Email or password invalid");
  }

  const payload = {
    id: user._id,
  };

  const token = jwt.sign(payload, SECRET_KEY, { expiresIn: "23h" });
  await User.findByIdAndUpdate(user._id, { token });

  res.json({
    token,
  });
};

const getCurrent = async (req, res) => {
  const { email } = req.user;

  res.json({
    email,
  });
};

const logout = async (req, res) => {
  const { _id } = req.user;
  await User.findByIdAndUpdate(_id, { token: "" });

  res.json({
    message: "Logout success",
  });
};
const updateAvatar = async (req, res) => {
  const { path: tempUpload, filename } = req.file;
  const { _id } = req.user;
  const savename = `${_id}_${filename}`;
  const resultUpload = path.join(avatarDir, savename);
  await fs.rename(tempUpload, resultUpload);
  const avatarURL = path.join("avatars", savename);
  await User.findByIdAndUpdate(_id, { avatarURL });

  res.json({
    avatarURL,
  });
};
module.exports = {
  register: ctrlWrapper(register),
  login: ctrlWrapper(login),
  getCurrent: ctrlWrapper(getCurrent),
  logout: ctrlWrapper(logout),
  updateAvatar: ctrlWrapper(updateAvatar),
  verifyEmail: ctrlWrapper(verifyEmail),
  resendEmail: ctrlWrapper(resendEmail),
};
