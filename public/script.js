/**
 * ==============================================================================
 * TXON Internship Task 02: Student / Profile Directory
 * ==============================================================================
 * File: script.js
 * Description: Vanilla JavaScript frontend logic. Handles fetching students from
 *              the Express backend, rendering dynamic cards, adding students
 *              via POST request, live searching, and user notifications.
 * ==============================================================================
 */

// ==============================================================================
// 1. GLOBAL STATE & DOM ELEMENT SELECTORS
// ==============================================================================

// Array to hold the full list of students retrieved from the backend
let allStudents = [];

// DOM Elements: Form & Modal Controls
const openFormBtn = document.getElementById('openFormBtn');
const closeFormBtn = document.getElementById('closeFormBtn');
const cancelFormBtn = document.getElementById('cancelFormBtn');
const formSection = document.getElementById('formSection');
const addStudentForm = document.getElementById('addStudentForm');
const submitBtn = document.getElementById('submitBtn');
const btnText = document.getElementById('btnText');
const btnSpinner = document.getElementById('btnSpinner');

// DOM Elements: Form Fields & Error Labels
const studentNameInput = document.getElementById('studentName');
const studentCourseInput = document.getElementById('studentCourse');
const studentEmailInput = document.getElementById('studentEmail');
const nameError = document.getElementById('nameError');
const courseError = document.getElementById('courseError');
const emailError = document.getElementById('emailError');

// DOM Elements: Toolbar & Counter
const totalStudentsCount = document.getElementById('totalStudentsCount');
const searchInput = document.getElementById('searchInput');
const clearSearchBtn = document.getElementById('clearSearchBtn');
const resultsInfo = document.getElementById('resultsInfo');

// DOM Elements: Containers & States
const studentsGrid = document.getElementById('studentsGrid');
const loadingState = document.getElementById('loadingState');
const emptyState = document.getElementById('emptyState');
const emptyTitle = document.getElementById('emptyTitle');
const emptyDescription = document.getElementById('emptyDescription');
const emptyActionBtn = document.getElementById('emptyActionBtn');
const notification = document.getElementById('notification');

let notificationTimeout = null;

// ==============================================================================
// 2. HELPER UTILITIES
// ==============================================================================

/**
 * Extracts uppercase initials from a student's full name.
 * e.g., "Aarav Sharma" -> "AS", "Priya" -> "P"
 * @param {string} name 
 * @returns {string} Initials
 */
function getInitials(name) {
  if (!name) return 'ST';
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) {
    return parts[0].substring(0, 2).toUpperCase();
  }
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

/**
 * Escapes HTML special characters to prevent Cross-Site Scripting (XSS).
 * @param {string} str 
 * @returns {string} Sanitized string
 */
function escapeHTML(str) {
  if (!str) return '';
  return str
    .toString()
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

/**
 * Displays an alert notification banner at top right.
 * @param {string} message Text to display
 * @param {'success'|'error'} type 'success' or 'error'
 */
function showNotification(message, type = 'success') {
  clearTimeout(notificationTimeout);
  notification.textContent = message;
  notification.className = `notification ${type}`;

  notificationTimeout = setTimeout(() => {
    notification.className = 'notification hidden';
  }, 4000);
}

// ==============================================================================
// 3. API CALLS (GET & POST using fetch)
// ==============================================================================

/**
 * Fetches all students from GET /api/students
 */
async function fetchStudents() {
  try {
    // Show the loading spinner state
    loadingState.classList.remove('hidden');
    studentsGrid.classList.add('hidden');
    emptyState.classList.add('hidden');

    const response = await fetch('/api/students');

    if (!response.ok) {
      throw new Error(`Server returned HTTP ${response.status}`);
    }

    const result = await response.json();

    if (result.success && Array.isArray(result.data)) {
      allStudents = result.data;
      updateTotalCount(allStudents.length);
      renderStudents(allStudents);
    } else {
      throw new Error(result.message || 'Invalid data format received.');
    }
  } catch (error) {
    console.error('Error fetching students:', error);
    showNotification(`Could not load students: ${error.message}`, 'error');
    // Display error state in UI
    showEmptyState(
      'Failed to load students',
      'Please make sure the Express backend server is running, then reload the page.',
      'Retry',
      fetchStudents
    );
  } finally {
    loadingState.classList.add('hidden');
  }
}

/**
 * Handles adding a new student via POST /api/students
 * @param {Event} e 
 */
async function handleFormSubmit(e) {
  e.preventDefault();

  // Reset any previous validation error messages
  clearValidationErrors();

  const name = studentNameInput.value.trim();
  const course = studentCourseInput.value.trim();
  const email = studentEmailInput.value.trim();

  // Client-side validation
  let hasError = false;

  if (!name) {
    nameError.textContent = 'Student name cannot be empty.';
    studentNameInput.classList.add('input-error');
    hasError = true;
  }

  if (!course) {
    courseError.textContent = 'Enrolled course cannot be empty.';
    studentCourseInput.classList.add('input-error');
    hasError = true;
  }

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!email) {
    emailError.textContent = 'Email address cannot be empty.';
    studentEmailInput.classList.add('input-error');
    hasError = true;
  } else if (!emailRegex.test(email)) {
    emailError.textContent = 'Please enter a valid email address.';
    studentEmailInput.classList.add('input-error');
    hasError = true;
  }

  if (hasError) return;

  // Toggle button into loading state
  submitBtn.disabled = true;
  btnText.textContent = 'Saving...';
  btnSpinner.classList.remove('hidden');

  try {
    const response = await fetch('/api/students', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ name, course, email })
    });

    const result = await response.json();

    if (!response.ok || !result.success) {
      throw new Error(result.message || 'Failed to add student.');
    }

    // Success: Add new student to the local state (at beginning of list)
    allStudents.unshift(result.data);

    // Update count badge
    updateTotalCount(allStudents.length);

    // Re-render student cards
    renderStudents(allStudents);

    // Reset and close form
    addStudentForm.reset();
    closeForm();

    // Show success banner
    showNotification(`Student "${result.data.name}" added successfully!`, 'success');

    // If search filter was active, clear it so user sees the new student
    if (searchInput.value.trim() !== '') {
      searchInput.value = '';
      clearSearchBtn.classList.add('hidden');
      resultsInfo.textContent = `Showing all ${allStudents.length} students`;
    }

  } catch (error) {
    console.error('Error adding student:', error);
    showNotification(error.message, 'error');
  } finally {
    // Restore button state
    submitBtn.disabled = false;
    btnText.textContent = 'Save Student';
    btnSpinner.classList.add('hidden');
  }
}

// ==============================================================================
// 4. RENDERING & UI FUNCTIONS
// ==============================================================================

/**
 * Updates the total count stat widget in the dashboard.
 * @param {number} count 
 */
function updateTotalCount(count) {
  totalStudentsCount.textContent = count;
}

/**
 * Renders the provided array of students into the grid.
 * @param {Array} studentsToRender 
 */
function renderStudents(studentsToRender) {
  // If list is empty, show appropriate empty state
  if (studentsToRender.length === 0) {
    studentsGrid.classList.add('hidden');
    
    if (allStudents.length === 0) {
      showEmptyState(
        'No Students Registered',
        'Your student directory is currently empty. Click below to add your first student record.',
        'Add First Student',
        openForm
      );
    } else {
      showEmptyState(
        'No Matching Results',
        `No student matches "${escapeHTML(searchInput.value)}". Try searching by another name, course, or email.`,
        'Clear Search',
        clearSearch
      );
    }
    return;
  }

  // Hide empty state and show grid
  emptyState.classList.add('hidden');
  studentsGrid.classList.remove('hidden');

  // Build card elements using document fragment for high performance
  const fragment = document.createDocumentFragment();

  studentsToRender.forEach(student => {
    const card = document.createElement('article');
    card.className = 'student-card';

    const safeName = escapeHTML(student.name);
    const safeCourse = escapeHTML(student.course);
    const safeEmail = escapeHTML(student.email);
    const safeId = escapeHTML(student.id || 'N/A');
    const initials = getInitials(student.name);

    card.innerHTML = `
      <div class="student-header">
        <div class="student-avatar" aria-hidden="true">${initials}</div>
        <div class="student-title-wrap">
          <h2 class="student-name" title="${safeName}">${safeName}</h2>
          <span class="student-id" title="Student ID">ID: ${safeId}</span>
        </div>
      </div>
      <div class="student-body">
        <div class="student-course" title="${safeCourse}">
          <!-- Book / Academic Icon -->
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"></path>
            <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"></path>
          </svg>
          <span>${safeCourse}</span>
        </div>
        <div class="student-email">
          <!-- Mail Icon -->
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"></path>
            <polyline points="22,6 12,13 2,6"></polyline>
          </svg>
          <a href="mailto:${safeEmail}" title="Send email to ${safeName}">${safeEmail}</a>
        </div>
      </div>
    `;

    fragment.appendChild(card);
  });

  // Replace content of grid
  studentsGrid.innerHTML = '';
  studentsGrid.appendChild(fragment);
}

/**
 * Displays the empty state section with custom content and action.
 */
function showEmptyState(title, description, buttonText, buttonAction) {
  emptyTitle.textContent = title;
  emptyDescription.textContent = description;
  emptyActionBtn.textContent = buttonText;
  
  // Cleanly replace click handler
  emptyActionBtn.onclick = buttonAction;
  emptyState.classList.remove('hidden');
}

// ==============================================================================
// 5. SEARCH & FILTER LOGIC
// ==============================================================================

/**
 * Filters the students array in real-time as the user types.
 */
function handleSearch() {
  const query = searchInput.value.trim().toLowerCase();

  // Show or hide clear button
  if (query.length > 0) {
    clearSearchBtn.classList.remove('hidden');
  } else {
    clearSearchBtn.classList.add('hidden');
  }

  // Filter students based on name, course, or email
  const filtered = allStudents.filter(student => {
    const nameMatch = (student.name || '').toLowerCase().includes(query);
    const courseMatch = (student.course || '').toLowerCase().includes(query);
    const emailMatch = (student.email || '').toLowerCase().includes(query);
    return nameMatch || courseMatch || emailMatch;
  });

  // Update results summary label
  if (query.length > 0) {
    resultsInfo.textContent = `Showing ${filtered.length} of ${allStudents.length} students`;
  } else {
    resultsInfo.textContent = `Showing all ${allStudents.length} students`;
  }

  renderStudents(filtered);
}

/**
 * Clears the search input and restores the full list.
 */
function clearSearch() {
  searchInput.value = '';
  clearSearchBtn.classList.add('hidden');
  resultsInfo.textContent = `Showing all ${allStudents.length} students`;
  renderStudents(allStudents);
  searchInput.focus();
}

// ==============================================================================
// 6. FORM & MODAL INTERACTIONS
// ==============================================================================

function openForm() {
  clearValidationErrors();
  formSection.classList.remove('hidden');
  studentNameInput.focus();
  // Smoothly scroll to the form
  formSection.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
}

function closeForm() {
  formSection.classList.add('hidden');
  clearValidationErrors();
}

function clearValidationErrors() {
  nameError.textContent = '';
  courseError.textContent = '';
  emailError.textContent = '';
  studentNameInput.classList.remove('input-error');
  studentCourseInput.classList.remove('input-error');
  studentEmailInput.classList.remove('input-error');
}

// ==============================================================================
// 7. EVENT LISTENERS & INITIALIZATION
// ==============================================================================

document.addEventListener('DOMContentLoaded', () => {
  // 1. Fetch initial student data from the backend
  fetchStudents();

  // 2. Open / Close form interactions
  openFormBtn.addEventListener('click', () => {
    if (formSection.classList.contains('hidden')) {
      openForm();
    } else {
      closeForm();
    }
  });

  closeFormBtn.addEventListener('click', closeForm);
  cancelFormBtn.addEventListener('click', closeForm);

  // 3. Form submission
  addStudentForm.addEventListener('submit', handleFormSubmit);

  // 4. Real-time search listeners
  searchInput.addEventListener('input', handleSearch);
  clearSearchBtn.addEventListener('click', clearSearch);

  // 5. Clear field errors on input
  studentNameInput.addEventListener('input', () => {
    nameError.textContent = '';
    studentNameInput.classList.remove('input-error');
  });
  studentCourseInput.addEventListener('input', () => {
    courseError.textContent = '';
    studentCourseInput.classList.remove('input-error');
  });
  studentEmailInput.addEventListener('input', () => {
    emailError.textContent = '';
    studentEmailInput.classList.remove('input-error');
  });
});
