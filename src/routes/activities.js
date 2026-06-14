const express = require('express'); // Import the Express framework to create a router for handling activity-related routes
const router = express.Router(); // Create a new Express router to handle activity-related routes
const Activity = require('../models/Activity'); // Import the Activity model to interact with activity data in the database

// Get recent activities
// This endpoint retrieves a list of recent activities in the system. It accepts optional query parameters for limiting the number of activities returned and specifying the language for activity descriptions. The 'limit' parameter allows clients to control how many activity records they want to receive, while the 'lang' parameter enables localization of activity descriptions based on the specified language code (e.g., 'en' for English, 'fr' for French). This endpoint is useful for displaying recent user actions and system events in an admin dashboard or activity feed.
router.get('/', async (req, res) => {
  try {
    // Parse query parameters with default values
    const limit = parseInt(req.query.limit) || 10;
    // The 'lang' parameter is used to specify the language for activity descriptions. It defaults to 'en' (English) if not provided. This allows the frontend to request activity descriptions in different languages based on user preferences or localization settings.
    const lang = req.query.lang || 'en'; // Default to English
    const activities = await Activity.getAll(limit, lang); // Fetch recent activities from the database with the specified limit and language for descriptions
    //
    res.json(activities);
  } catch (err) {
    console.error('Error fetching activities:', err);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;

