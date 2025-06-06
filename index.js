const express = require("express");
const app = express();
const cors = require("cors");
require("dotenv").config();
const mongoose = require("mongoose");

app.use(cors());
app.use(express.static("public"));
app.use(express.urlencoded({ extended: true }));

//mongoose connection
mongoose
  .connect(process.env.MONGO_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  })
  .then(() => {
    console.log("MongoDB connected successfully");
  })
  .catch((err) => {
    console.error("MongoDB connection failed:", err.message);
  });

// user schema
const userSchema = new mongoose.Schema({
  username: { type: String, required: true, unique: true },
});

const User = mongoose.model("User", userSchema);

// Exercise Schema
const exerciseSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  description: { type: String, required: true },
  duration: { type: Number, required: true, min: 1 },
  date: { type: Date, default: Date.now }
});
const Exercise = mongoose.model('Exercise', exerciseSchema);

app.get("/", (req, res) => {
  res.sendFile(__dirname + "/views/index.html");
});

app.post("/api/users", async(req, res) => {
  try {
    const newUser = new User({ username: req.body.username });
    const savedUser = await newUser.save();
    res.json({ username: savedUser.username, _id: savedUser._id });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

app.get("/api/users", async(req, res) => {
    try {
      const user = await User.find({}, 'username _id');
      res.json(user);
    }catch (err) {
      res.status(500).json({ error: 'Server error' });
    }
});

app.post("/api/users/:_id/exercises", async(req, res) => {
  try {
    const userId = req.params._id;
    const { description, duration, date } = req.body;

    // Validate input
    if (!description || !duration) {
      return res
        .status(400)
        .json({ error: "Description and duration are required" });
    }

    const user = await User.findById(userId);
    if (!user) return res.status(404).json({ error: "User not found" });

    const exercise = new Exercise({
      userId,
      description,
      duration: parseInt(duration),
      date: date ? new Date(date) : new Date(),
    });

    const savedExercise = await exercise.save();

    res.json({
      _id: user._id,
      username: user.username,
      description: savedExercise.description,
      duration: savedExercise.duration,
      date: savedExercise.date.toDateString(),
    });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// 4. Get exercise log
app.get('/api/users/:_id/logs', async (req, res) => {
  try {
    const userId = req.params._id;
    const { from, to, limit } = req.query;
    
    const user = await User.findById(userId);
    if (!user) return res.status(404).json({ error: 'User not found' });
    
    // Build query
    const query = { userId };
    
    if (from || to) {
      query.date = {};
      if (from) query.date.$gte = new Date(from);
      if (to) query.date.$lte = new Date(to);
    }
    
    let logQuery = Exercise.find(query)
      .select('description duration date -_id');
    
    if (limit) logQuery = logQuery.limit(parseInt(limit));
    
    const exercises = await logQuery.exec();
    
    // Format response
    const log = exercises.map(ex => ({
      description: ex.description,
      duration: ex.duration,
      date: ex.date.toDateString()
    }));
    
    res.json({
      _id: user._id,
      username: user.username,
      count: exercises.length,
      log
    });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

const listener = app.listen(process.env.PORT || 3000, () => {
  console.log("Your app is listening on port " + listener.address().port);
});
