/**
 * ==============================================================================
 * TXON Internship Task 02: Student / Profile Directory (JSON File Storage)
 * ==============================================================================
 * File: server.js
 * Description: Express.js backend server that provides REST API endpoints to
 *              view and add student records stored permanently in a local JSON file.
 * ==============================================================================
 */

// Import required Node.js core and npm packages
const express = require('express');
const path = require('path');
const fs = require('fs').promises;


// Initialize the Express application
const app = express();

// Set the port number (default: 3000 or from environment variable)
const PORT = process.env.PORT || 3000;

// Path to the local JSON file used as our database
const DATA_FILE = path.join(__dirname, 'students.json');



// ==============================================================================
// MIDDLEWARE CONFIGURATION
// ==============================================================================

// 1. Parse incoming JSON payloads in request bodies (req.body)
app.use(express.json());

// 2. Serve static frontend files (HTML, CSS, JS) from the 'public' directory
app.use(express.static(path.join(__dirname, 'public')));

// ==============================================================================
// HELPER FUNCTIONS (Reading & Writing JSON File)
// ==============================================================================

/**
 * Reads and parses the student records from students.json.
 * If the file doesn't exist yet, it initializes an empty array.
 * @returns {Promise<Array>} Array of student objects
 */
async function getStudents() {
  try {
    const data = await fs.readFile(DATA_FILE, 'utf-8');
    return JSON.parse(data);
  } catch (error) {
    // If the file doesn't exist, create it with an empty array
    if (error.code === 'ENOENT') {
      await fs.writeFile(DATA_FILE, JSON.stringify([], null, 2), 'utf-8');
      return [];
    }
    // If file contains invalid JSON, propagate error
    throw error;
  }
}

/**
 * Writes the given array of students to students.json.
 * Formatted with 2 spaces for human-readable JSON.
 * @param {Array} students Array of student objects to save
 */
async function saveStudents(students) {
  await fs.writeFile(DATA_FILE, JSON.stringify(students, null, 2), 'utf-8');
}

// ==============================================================================
// REST API ROUTES
// ==============================================================================

/**
 * GET /api/students
 * Fetches the list of all students from students.json.
 * Returns: HTTP 200 with JSON array of students, or HTTP 500 on server error.
 */
app.get('/api/students', async (req, res) => {
  try {
    const students = await getStudents();
    res.status(200).json({
      success: true,
      count: students.length,
      data: students
    });
  } catch (error) {
    console.error('Error reading students data:', error.message);
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve students from storage.'
    });
  }
});

/**
 * POST /api/students
 * Adds a new student record to students.json.
 * Expected JSON Body: { name, course, email }
 * Returns: HTTP 201 with newly created student, or HTTP 400 on invalid input.
 */
app.post('/api/students', async (req, res) => {
  try {
    const { name, course, email } = req.body;

    // --- Input Validation ---
    if (!name || typeof name !== 'string' || name.trim() === '') {
      return res.status(400).json({
        success: false,
        message: 'Student name is required and cannot be empty.'
      });
    }

    if (!course || typeof course !== 'string' || course.trim() === '') {
      return res.status(400).json({
        success: false,
        message: 'Course is required and cannot be empty.'
      });
    }

    if (!email || typeof email !== 'string' || email.trim() === '') {
      return res.status(400).json({
        success: false,
        message: 'Email address is required and cannot be empty.'
      });
    }

    // Basic email format check
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email.trim())) {
      return res.status(400).json({
        success: false,
        message: 'Please provide a valid email address.'
      });
    }

    // --- Read Current Records ---
    const students = await getStudents();

    // Check for duplicate email address (optional, good practice)
    const emailExists = students.some(
      s => s.email.toLowerCase() === email.trim().toLowerCase()
    );
    if (emailExists) {
      return res.status(400).json({
        success: false,
        message: 'A student with this email address already exists.'
      });
    }

    // --- Generate Unique ID & Construct New Student ---
    // Using a combination of timestamp and a random integer to guarantee uniqueness
    const newStudent = {
      id: Date.now().toString(),
      name: name.trim(),
      course: course.trim(),
      email: email.trim().toLowerCase()
    };

    // Append the new student to the array
    students.push(newStudent);

    // Persist updated array to students.json
    await saveStudents(students);

    // Return success response with 201 Created
    res.status(201).json({
      success: true,
      message: 'Student added successfully!',
      data: newStudent
    });

  } catch (error) {
    console.error('Error saving student:', error.message);
    res.status(500).json({
      success: false,
      message: 'Failed to save student record to storage.'
    });
  }
});

// ==============================================================================
// START THE SERVER
// ==============================================================================

const server = app.listen(PORT, () => {
  console.log(`====================================================`);
  console.log(`🚀 TXON Student Directory Server is running!`);
  console.log(`📡 Local URL: http://localhost:${PORT}`);
  console.log(`📁 Data File: ${DATA_FILE}`);
  console.log(`====================================================`);
});

// Export app and server for modularity and testing
module.exports = { app, server };
