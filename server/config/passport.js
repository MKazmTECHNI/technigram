const passport = require("passport");
const GoogleStrategy = require("passport-google-oauth20").Strategy;
const { return_sql, exec_sql } = require("../utils/dbUtils");
const jwt = require("jsonwebtoken");

passport.use(
  new GoogleStrategy(
    {
      clientID: process.env.GOOGLESTRATEGY_CLIENTID,
      clientSecret: process.env.GOOGLESTRATEGY_CLIENTSECRET,
      callbackURL: "https://technigram.onrender.com/auth/google/callback",
    },
    async (accessToken, refreshToken, profile, done) => {
      const email = profile.emails[0].value;

      // Validate email pattern
      if (!/^u\d{3}_[a-z]{6}_[a-z]{3}@technischools\.com$/.test(email)) {
        return done(null, false, { message: "Invalid email format" });
      }

      const result = await return_sql(
        `SELECT id, username, token FROM users WHERE email = ?`,
        [email]
      );

      let user;
      let token;

      if (result.length) {
        user = result[0];
        token =
          user.token ||
          jwt.sign({ id: user.id }, process.env.APP_SECRET, {
            expiresIn: "1h",
          });
        if (!user.token) {
          await exec_sql(`UPDATE users SET token = ? WHERE id = ?`, [
            token,
            user.id,
          ]);
        }
      } else {
        const newUser = await exec_sql(
          `INSERT INTO users (username, email) VALUES (?, ?) RETURNING id`,
          [profile.displayName, email]
        );
        token = jwt.sign({ id: newUser.id }, process.env.APP_SECRET, {
          expiresIn: "1h",
        });
        await exec_sql(`UPDATE users SET token = ? WHERE id = ?`, [
          token,
          newUser.id,
        ]);
        user = { id: newUser.id, username: profile.displayName };
      }

      return done(null, { ...user, token });
    }
  )
);

passport.serializeUser((user, done) => {
  done(null, { id: user.id, username: user.username, token: user.token });
});

passport.deserializeUser(async (user, done) => {
  try {
    const result = await return_sql(
      `SELECT id, username FROM users WHERE id = ?`,
      [user.id]
    );
    if (result.length === 0) return done(new Error("User not found"), null);
    done(null, { ...result[0], token: user.token });
  } catch (error) {
    done(error, null);
  }
});

module.exports = passport;
