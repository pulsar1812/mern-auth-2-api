const User = require('../models/User');
const jwt = require('jsonwebtoken');
const _ = require('lodash');
const { OAuth2Client } = require('google-auth-library');
const fetch = require('node-fetch');
const sendgridMail = require('@sendgrid/mail');
sendgridMail.setApiKey(process.env.SENDGRID_API_KEY);

/*
// @desc    Signing up user
// @route   POST /api/signup
// @access  Public
exports.signup = (req, res) => {
  const { name, email, password } = req.body;

  User.findOne({ email }).exec((err, user) => {
    if (user) {
      return res.status(400).json({
        error: 'Email is taken',
      });
    }

    const token = jwt.sign(
      { name, email, password },
      process.env.JWT_ACCOUNT_ACTIVATION,
      { expiresIn: '3d' } // 3d for testing purpose
    );

    const emailData = {
      from: process.env.EMAIL_FROM,
      to: email,
      subject: `Account activation link`,
      html: `
                <h1>Please use the following link to activate your account</h1>
                <p>${process.env.CLIENT_URL}/auth/activate/${token}</p>
                <hr />
                <p>This email may contain sensetive information</p>
                <p>${process.env.CLIENT_URL}</p>
            `,
    };

    sendgridMail
      .send(emailData)
      .then((sent) => {
        // console.log('SIGNUP EMAIL SENT', sent)
        return res.json({
          message: `Email has been sent to ${email}. Follow the instruction to activate your account`,
        });
      })
      .catch((err) => {
        // console.log('SIGNUP EMAIL SENT ERROR', err)
        return res.json({
          message: err.message,
        });
      });
  });
};
*/

// @desc    Signing up user
// @route   POST /api/signup
// @access  Public
exports.signup = async (req, res) => {
  const { name, email, password } = req.body;

  try {
    let user = await User.findOne({ email });

    // Check if user already exists
    if (user) {
      return res.status(400).json({ error: 'Email is taken.' });
    }

    const token = jwt.sign(
      { name, email, password },
      process.env.JWT_ACCOUNT_ACTIVATION,
      { expiresIn: '3d' } // 3d for testing purpose
    );

    const emailData = {
      from: process.env.EMAIL_FROM,
      to: email,
      subject: `Account activation link`,
      html: `
        <h1>Please use the following link to activate your account</h1>
        <p>${process.env.CLIENT_URL}/auth/activate/${token}</p>
        <hr />
        <p>This email may contain sensitive information</p>
        <p>${process.env.CLIENT_URL}</p>
      `,
    };

    const sent = await sendgridMail.send(emailData);

    if (!sent) {
      return res.status(400).json({ error: 'Signup email sent error' });
    }

    res.json({
      message: `Email has been sent to ${email}. Follow the instruction to activate your account.`,
    });
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
};

// ----------------------------------------------------------------------------------------------------------

// @desc    Activate an account
// @route   POST /api/account-activation
// @access  Public
exports.accountActivation = (req, res) => {
  const { token } = req.body;

  if (token) {
    jwt.verify(
      token,
      process.env.JWT_ACCOUNT_ACTIVATION,
      function (err, decoded) {
        if (err) {
          console.log('JWT VERIFY IN ACCOUNT ACTIVATION ERROR', err);
          return res.status(401).json({
            error: 'Expired link. Signup again',
          });
        }

        const { name, email, password } = jwt.decode(token);

        const user = new User({ name, email, password });

        user.save((err, user) => {
          if (err) {
            console.log('SAVE USER IN ACCOUNT ACTIVATION ERROR', err);
            return res.status(401).json({
              error: 'Error saving user in database. Try signup again',
            });
          }
          return res.json({
            message: 'Signup success. Please signin.',
          });
        });
      }
    );
  } else {
    return res.json({
      message: 'Something went wrong. Try again.',
    });
  }
};

/*
exports.accountActivation = async (req, res) => {
  const { token } = req.body;

  // Make sure token exists
  if (!token) {
    return res.status(401).json({ error: 'There is no activation token.' });
  }

  try {
    // Verify token
    const decoded = jwt.verify(token, process.env.JWT_ACCOUNT_ACTIVATION);

    const { name, email, password } = decoded;

    const user = new User({ name, email, password });

    await user.save();

    res.json({
      message: 'Signup Success. Please Sign in.',
    });
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
};
*/

// ----------------------------------------------------------------------------------------------------------

/*
// @desc    Signing in user
// @route   POST /api/signin
// @access  Public
exports.signin = (req, res) => {
  const { email, password } = req.body;
  // check if user exist
  User.findOne({ email }).exec((err, user) => {
    if (err || !user) {
      return res.status(400).json({
        error: 'User with that email does not exist. Please signup',
      });
    }
    // authenticate
    if (!user.authenticate(password)) {
      return res.status(400).json({
        error: 'Email and password do not match',
      });
    }
    // generate a token and send to client
    const token = jwt.sign({ _id: user._id }, process.env.JWT_SECRET, {
      expiresIn: '7d',
    });
    const { _id, name, email, role } = user;

    return res.json({
      token,
      user: { _id, name, email, role },
    });
  });
};
*/

// @desc    Signing in user
// @route   POST /api/signin
// @access  Public
exports.signin = async (req, res) => {
  const { email, password } = req.body;

  try {
    // Check if user exists
    let user = await User.findOne({ email });

    if (!user) {
      return res.status(400).json({ error: 'User does not exist.' });
    }

    // Check if authenticated
    if (!user.authenticate(password)) {
      return res.status(400).json({
        error: 'Email and password do not match',
      });
    }

    // Generate token and send to client
    const token = jwt.sign({ _id: user._id }, process.env.JWT_SECRET, {
      expiresIn: '7d',
    });

    res.json({
      token,
      user,
    });
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
};

// ----------------------------------------------------------------------------------------------------------

// @desc    Forgot Password
// @route   PUT /api/forgot-password
// @access  Public
exports.forgotPassword = (req, res) => {
  const { email } = req.body;

  User.findOne({ email }, (err, user) => {
    if (err || !user) {
      return res.status(400).json({
        error: 'User with that email does not exist',
      });
    }

    const token = jwt.sign(
      { _id: user._id, name: user.name },
      process.env.JWT_RESET_PASSWORD,
      {
        expiresIn: '10m',
      }
    );

    const emailData = {
      from: process.env.EMAIL_FROM,
      to: email,
      subject: `Password Reset link`,
      html: `
                <h1>Please use the following link to reset your password</h1>
                <p>${process.env.CLIENT_URL}/auth/password/reset/${token}</p>
                <hr />
                <p>This email may contain sensetive information</p>
                <p>${process.env.CLIENT_URL}</p>
            `,
    };

    return user.updateOne({ resetPasswordLink: token }, (err, success) => {
      if (err) {
        console.log('RESET PASSWORD LINK ERROR', err);
        return res.status(400).json({
          error: 'Database connection error on user password forgot request',
        });
      } else {
        sendgridMail
          .send(emailData)
          .then((sent) => {
            // console.log('SIGNUP EMAIL SENT', sent)
            return res.json({
              message: `Email has been sent to ${email}. Follow the instruction to activate your account`,
            });
          })
          .catch((err) => {
            // console.log('SIGNUP EMAIL SENT ERROR', err)
            return res.json({
              message: err.message,
            });
          });
      }
    });
  });
};

/*
exports.forgotPassword = async (req, res) => {
  const { email } = req.body;

  try {
    let user = await User.findOne({ email });

    if (!user) {
      return res.status(404).json({
        error: 'User with that email does not exist',
      });
    }

    const token = jwt.sign(
      { _id: user._id, name: user.name },
      process.env.JWT_RESET_PASSWORD,
      {
        expiresIn: '10m',
      }
    );

    const emailData = {
      from: process.env.EMAIL_FROM,
      to: email,
      subject: `Password Reset Link`,
      html: `
        <h1>Hi, we have received a request to reset your password. 
        If you did not make the request, just ignore this email. Otherwise, 
        you can reset your password using this link:</h1>
        <p>${process.env.CLIENT_URL}/auth/password/reset/${token}</p>
        <p>This email may contain sensitive information</p>
        <p>${process.env.CLIENT_URL}</p>
      `,
    };

    const updatedUser = await user.updateOne({ resetPasswordLink: token });

    if (!updatedUser) {
      return res.status(400).json({ error: 'Update user error' });
    }

    const sent = await sendgridMail.send(emailData);

    if (!sent) {
      return res.status(400).json({ error: 'Reset email sent error' });
    }

    res.json({
      message: `Email has been sent to ${email}. Follow the instruction to reset your account.`,
    });
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
};
*/

// ----------------------------------------------------------------------------------------------------------

// @desc    Reset Password
// @route   PUT /api/reset-password
// @access  Private
exports.resetPassword = (req, res) => {
  const { resetPasswordLink, newPassword } = req.body;

  if (resetPasswordLink) {
    jwt.verify(
      resetPasswordLink,
      process.env.JWT_RESET_PASSWORD,
      function (err, decoded) {
        if (err) {
          return res.status(400).json({
            error: 'Expired link. Try again',
          });
        }

        User.findOne({ resetPasswordLink }, (err, user) => {
          if (err || !user) {
            return res.status(400).json({
              error: 'Something went wrong. Try later',
            });
          }

          const updatedFields = {
            password: newPassword,
            resetPasswordLink: '',
          };

          user = _.extend(user, updatedFields);

          user.save((err, result) => {
            if (err) {
              return res.status(400).json({
                error: 'Error resetting user password',
              });
            }
            res.json({
              message: `Great! Now you can login with your new password`,
            });
          });
        });
      }
    );
  }
};

/*
exports.resetPassword = async (req, res) => {
  const { resetPasswordLink, newPassword } = req.body;

  try {
    if (!resetPasswordLink) {
      return res.status(400).json({ error: 'Expired link. Try again.' });
    }

    const decoded = jwt.verify(
      resetPasswordLink,
      process.env.JWT_RESET_PASSWORD
    );

    let user = await User.findOne({ resetPasswordLink });

    if (!user) {
      return res
        .status(400)
        .json({ error: 'Something went wrong. Try later.' });
    }

    const updatedFields = {
      password: newPassword,
      resetPasswordLink: '',
    };

    user = _.extend(user, updatedFields);

    await user.save();

    res.json({
      message: 'Great! Now you can login with your new password.',
    });
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
};
*/

// ----------------------------------------------------------------------------------------------------------

// @desc    Google Login
// @route   POST /api/google-login
// @access  Public
const client = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);
exports.googleLogin = (req, res) => {
  const { idToken } = req.body;

  client
    .verifyIdToken({ idToken, audience: process.env.GOOGLE_CLIENT_ID })
    .then((response) => {
      // console.log('GOOGLE LOGIN RESPONSE',response)
      const { email_verified, name, email } = response.payload;
      if (email_verified) {
        User.findOne({ email }).exec((err, user) => {
          if (user) {
            const token = jwt.sign({ _id: user._id }, process.env.JWT_SECRET, {
              expiresIn: '7d',
            });
            const { _id, email, name, role } = user;
            return res.json({
              token,
              user: { _id, email, name, role },
            });
          } else {
            let password = email + process.env.JWT_SECRET;
            user = new User({ name, email, password });
            user.save((err, data) => {
              if (err) {
                console.log('ERROR GOOGLE LOGIN ON USER SAVE', err);
                return res.status(400).json({
                  error: 'User signup failed with google',
                });
              }
              const token = jwt.sign(
                { _id: data._id },
                process.env.JWT_SECRET,
                { expiresIn: '7d' }
              );
              const { _id, email, name, role } = data;
              return res.json({
                token,
                user: { _id, email, name, role },
              });
            });
          }
        });
      } else {
        return res.status(400).json({
          error: 'Google login failed. Try again',
        });
      }
    });
};

// ----------------------------------------------------------------------------------------------------------

// @desc    Facebook Login
// @route   POST /api/facebook-login
// @access  Public
exports.facebookLogin = (req, res) => {
  console.log('FACEBOOK LOGIN REQ BODY', req.body);
  const { userID, accessToken } = req.body;

  const url = `https://graph.facebook.com/v2.11/${userID}/?fields=id,name,email&access_token=${accessToken}`;

  return (
    fetch(url, {
      method: 'GET',
    })
      .then((response) => response.json())
      // .then(response => console.log(response))
      .then((response) => {
        const { email, name } = response;
        User.findOne({ email }).exec((err, user) => {
          if (user) {
            const token = jwt.sign({ _id: user._id }, process.env.JWT_SECRET, {
              expiresIn: '7d',
            });
            const { _id, email, name, role } = user;
            return res.json({
              token,
              user: { _id, email, name, role },
            });
          } else {
            let password = email + process.env.JWT_SECRET;
            user = new User({ name, email, password });
            user.save((err, data) => {
              if (err) {
                console.log('ERROR FACEBOOK LOGIN ON USER SAVE', err);
                return res.status(400).json({
                  error: 'User signup failed with facebook',
                });
              }
              const token = jwt.sign(
                { _id: data._id },
                process.env.JWT_SECRET,
                { expiresIn: '7d' }
              );
              const { _id, email, name, role } = data;
              return res.json({
                token,
                user: { _id, email, name, role },
              });
            });
          }
        });
      })
      .catch((error) => {
        res.json({
          error: 'Facebook login failed. Try later',
        });
      })
  );
};
