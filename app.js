const { Pool } = require("pg");

const pool = new Pool({
  user: "postgres",
  host: "localhost",
  database: "postgres",
  password: "Grape2004",
  port: 5432, // default PostgreSQL port
});

const session = require("express-session");
const pgSession = require("connect-pg-simple")(session);
const bcrypt = require("bcrypt");

const express = require("express");
const bodyParser = require("body-parser");

const app = express();
app.use(express.static("public"));
app.set("view engine", "ejs");
app.use(bodyParser.urlencoded({ extended: true }));
app.use(
  session({
    store: new pgSession({pool:pool,tableName:'session' }), // use same pg connection
    secret: "yourSecretKey",        // used to sign session IDs (keep it private)
    resave: false,                  // don't save session if nothing changed
    saveUninitialized: false,       // don't save empty sessions
    cookie: {
      maxAge:  5 * 60 * 1000, // 5 minutes for testing, // session lasts 30 days (in ms)
    },
  })
);
const fetch = require("node-fetch"); // or use axios

app.use(async (req, res, next) => {
  if (req.session.userId) {
    const result = await pool.query("SELECT username FROM users WHERE id = $1", [req.session.userId]);
    res.locals.user = result.rows[0]; // makes it available in EJS
  } else {
    res.locals.user = null;
  }
  next();
});

let posts = [];
// app.get("/", async (req, res) => {
//   try {
//     const result = await pool.query("SELECT * FROM posts ORDER BY id DESC");
//     res.render("home", { posts: result.rows });
//   } catch (err) {
//     console.error("Error fetching posts for home:", err);
//     res.status(500).send("Error loading posts");
//   }
// });

app.get("/", async (req, res) => {
  if (!req.session.userId) {
    // Not logged in → Show landing page
    return res.render("landing");
  }

  try {
    
    res.render("home");
  } catch (err) {
    console.error("Error fetching posts for home:", err);
    res.status(500).send("Error loading posts");
  }
});


app.get("/signup", (req, res) => {
  res.render("signup");
});

app.post("/signup", async (req, res) => {
  const { username, password } = req.body;

  try {
    const hashedPassword = await bcrypt.hash(password, 10);
    await pool.query("INSERT INTO users (username, password) VALUES ($1, $2)", [
      username,
      hashedPassword,
    ]);
    res.redirect("/login");
  } catch (err) {
    console.error("Signup error:", err);
    res.status(500).send("User registration failed");
  }
});

app.get("/login", (req, res) => {
  res.render("login");
});

app.post("/login", async (req, res) => {
  const { username, password } = req.body;

  try {
    const result = await pool.query("SELECT * FROM users WHERE username = $1", [username]);

    if (result.rows.length === 0) {
      return res.status(400).send("User not found");
    }

    const user = result.rows[0];
    const match = await bcrypt.compare(password, user.password);

    if (match) {
      req.session.userId = user.id;
      res.redirect("/");
    } else {
      res.status(401).send("Incorrect password");
    }
  } catch (err) {
    console.error("Login error:", err);
    res.status(500).send("Login failed");
  }
});

function requireLogin(req, res, next) {
  if (!req.session.userId) {
    return res.redirect("/login");
  }
  next();
}

// Example: protect compose route
app.get("/compose", requireLogin, (req, res) => {
  res.render("compose");
});

app.post("/logout", (req, res) => {
  req.session.destroy(() => {
    res.redirect("/");
  });
});

app.get("/compose", (req, res) => {
  res.render("compose");
});

app.get("/posts", async (req, res) => {
  if (!req.session.userId) {
    return res.redirect("/login");
  }

  try {
    const result = await pool.query(
      "SELECT * FROM posts WHERE user_id = $1 ORDER BY id DESC",
      [req.session.userId]
    );
    res.render("all-posts", { posts: result.rows });
  } catch (err) {
    console.error("Error fetching posts:", err);
    res.status(500).send("Error loading posts");
  }
});


app.post("/compose", async (req, res) => {
  const { postTitle, postBody } = req.body;
  try {
    await pool.query(
      "INSERT INTO posts (title, content,user_id) VALUES ($1, $2,$3)",
      [postTitle, postBody,req.session.userId]
    );
    res.redirect("/");
  } catch (err) {
    console.error("Error inserting post:", err);
    res.status(500).send("Database error");
  }
});
app.use(express.static("public"));

// Route to view a single post


app.get("/posts/:id", async (req, res) => {
  const postId = parseInt(req.params.id);
  if (isNaN(postId)) {
    return res.status(400).send("Invalid post ID");
  }
  try {
    const result = await pool.query("SELECT * FROM posts WHERE id = $1", [postId]);

    if (result.rows.length > 0) {
      const post = result.rows[0];
      res.render("post", {post});
    } else {
      res.status(404).send("Post not found");
    }
  } catch (err) {
    console.error("Error fetching post:", err);
    res.status(500).send("Database error");
  }
});

app.get("/chat", requireLogin, (req, res) => {
  res.render("chat"); // render a form to enter prompt
});

app.post("/chat", requireLogin, async (req, res) => {
  const userPrompt = req.body.prompt;

  try {
    const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": "Bearer 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",
        "Content-Type": "application/json",
        "HTTP-Referer": "http://localhost:3000",  // Optional
        "X-Title": "BlogWithChatbot",            // Optional
      },
      body: JSON.stringify({
        model: "deepseek/deepseek-r1:free",
        messages: [
          { role: "user", content: userPrompt }
        ]
      }),
    });

    const data = await response.json();

    if (!data || !data.choices || !data.choices[0]) {
      return res.status(500).send("Failed to get response from chatbot");
    }

    const blogContent = data.choices[0].message.content;

    res.render("chat-result", {
      prompt: userPrompt,
      blogContent,
    });

  } catch (err) {
    console.error("Chatbot error:", err);
    res.status(500).send("Error contacting AI model");
  }
});

app.post("/save-ai-post", requireLogin, async (req, res) => {
  const { title, content } = req.body;

  try {
    await pool.query(
      "INSERT INTO posts (title, content, user_id) VALUES ($1, $2, $3)",
      [title, content, req.session.userId]
    );
    res.redirect("/posts"); // Redirect to "My Posts" page
  } catch (err) {
    console.error("Error saving AI-generated post:", err);
    res.status(500).send("Database error while saving post");
  }
});


app.listen(3000, () => {
  console.log("Server started on port 3000");
});
