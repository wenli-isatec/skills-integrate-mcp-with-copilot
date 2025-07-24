document.addEventListener("DOMContentLoaded", () => {
  const activitiesList = document.getElementById("activities-list");
  const activitySelect = document.getElementById("activity");
  const signupForm = document.getElementById("signup-form");
  const messageDiv = document.getElementById("message");
  
  // Authentication elements
  const loginBtn = document.getElementById("login-btn");
  const logoutBtn = document.getElementById("logout-btn");
  const loginModal = document.getElementById("login-modal");
  const loginForm = document.getElementById("login-form");
  const loginSection = document.getElementById("login-section");
  const userSection = document.getElementById("user-section");
  const userInfo = document.getElementById("user-info");
  const signupContainer = document.getElementById("signup-container");
  const loginMessage = document.getElementById("login-message");
  const closeModal = document.querySelector(".close");

  // State management
  let currentUser = null;
  let authToken = localStorage.getItem("authToken");

  // Initialize app
  checkAuthStatus();
  
  // Event listeners
  loginBtn.addEventListener("click", () => {
    loginModal.classList.remove("hidden");
  });

  logoutBtn.addEventListener("click", logout);
  
  closeModal.addEventListener("click", () => {
    loginModal.classList.add("hidden");
  });

  window.addEventListener("click", (event) => {
    if (event.target === loginModal) {
      loginModal.classList.add("hidden");
    }
  });

  loginForm.addEventListener("submit", handleLogin);
  signupForm.addEventListener("submit", handleStudentRegistration);

  // Authentication functions
  async function checkAuthStatus() {
    if (authToken) {
      try {
        const response = await fetch("/auth/me", {
          headers: {
            "Authorization": `Bearer ${authToken}`
          }
        });
        
        if (response.ok) {
          currentUser = await response.json();
          updateAuthUI();
        } else {
          // Token is invalid
          localStorage.removeItem("authToken");
          authToken = null;
          currentUser = null;
          updateAuthUI();
        }
      } catch (error) {
        console.error("Auth check failed:", error);
        localStorage.removeItem("authToken");
        authToken = null;
        currentUser = null;
        updateAuthUI();
      }
    } else {
      updateAuthUI();
    }
    
    // Load activities regardless of auth status
    fetchActivities();
  }

  async function handleLogin(event) {
    event.preventDefault();
    
    const email = document.getElementById("login-email").value;
    const password = document.getElementById("login-password").value;
    
    try {
      const response = await fetch("/auth/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ email, password })
      });
      
      const data = await response.json();
      
      if (response.ok) {
        authToken = data.access_token;
        localStorage.setItem("authToken", authToken);
        
        // Get user info
        const userResponse = await fetch("/auth/me", {
          headers: {
            "Authorization": `Bearer ${authToken}`
          }
        });
        
        if (userResponse.ok) {
          currentUser = await userResponse.json();
          updateAuthUI();
          loginModal.classList.add("hidden");
          loginForm.reset();
          showMessage(loginMessage, "Login successful!", "success");
          setTimeout(() => loginMessage.classList.add("hidden"), 3000);
        }
      } else {
        showMessage(loginMessage, data.detail || "Login failed", "error");
      }
    } catch (error) {
      console.error("Login error:", error);
      showMessage(loginMessage, "Login failed. Please try again.", "error");
    }
  }

  function logout() {
    authToken = null;
    currentUser = null;
    localStorage.removeItem("authToken");
    updateAuthUI();
    showMessage(messageDiv, "Logged out successfully", "info");
    setTimeout(() => messageDiv.classList.add("hidden"), 3000);
  }

  function updateAuthUI() {
    if (currentUser) {
      // User is logged in
      loginSection.classList.add("hidden");
      userSection.classList.remove("hidden");
      userInfo.textContent = `${currentUser.first_name} ${currentUser.last_name} (${currentUser.role})`;
      
      // Show registration form only for faculty and admin
      if (currentUser.role === "faculty" || currentUser.role === "admin") {
        signupContainer.classList.remove("hidden");
      } else {
        signupContainer.classList.add("hidden");
      }
    } else {
      // User is not logged in
      loginSection.classList.remove("hidden");
      userSection.classList.add("hidden");
      signupContainer.classList.add("hidden");
    }
  }

  // Function to fetch activities from API
  async function fetchActivities() {
    try {
      const response = await fetch("/activities");
      const activities = await response.json();

      // Clear loading message
      activitiesList.innerHTML = "";
      
      // Populate activity select options
      activitySelect.innerHTML = '<option value="">-- Select an activity --</option>';

      // Populate activities list
      Object.entries(activities).forEach(([name, details]) => {
        const activityCard = document.createElement("div");
        activityCard.className = "activity-card";

        const spotsLeft = details.max_participants - details.participants.length;

        // Create participants HTML with delete buttons for faculty/admin
        const showDeleteButtons = currentUser && (currentUser.role === "faculty" || currentUser.role === "admin");
        
        const participantsHTML =
          details.participants.length > 0
            ? `<div class="participants-section">
              <h5>Participants:</h5>
              <ul class="participants-list">
                ${details.participants
                  .map(
                    (email) =>
                      `<li>
                        <span class="participant-email">${email}</span>
                        ${showDeleteButtons ? `<button class="delete-btn" data-activity="${name}" data-email="${email}">❌</button>` : ''}
                      </li>`
                  )
                  .join("")}
              </ul>
            </div>`
            : `<p><em>No participants yet</em></p>`;

        activityCard.innerHTML = `
          <h4>${name}</h4>
          <p>${details.description}</p>
          <p><strong>Schedule:</strong> ${details.schedule}</p>
          <p><strong>Availability:</strong> ${spotsLeft} spots left</p>
          <div class="participants-container">
            ${participantsHTML}
          </div>
        `;

        activitiesList.appendChild(activityCard);
        
        // Add option to select dropdown
        const option = document.createElement("option");
        option.value = name;
        option.textContent = name;
        activitySelect.appendChild(option);
      });

      // Add event listeners to delete buttons (only if user has permission)
      if (showDeleteButtons) {
        document.querySelectorAll(".delete-btn").forEach((button) => {
          button.addEventListener("click", handleUnregister);
        });
      }
    } catch (error) {
      activitiesList.innerHTML = "<p>Failed to load activities. Please try again later.</p>";
      console.error("Error fetching activities:", error);
    }
  }

  // Handle unregister functionality (faculty/admin only)
  async function handleUnregister(event) {
    const button = event.target;
    const activity = button.getAttribute("data-activity");
    const email = button.getAttribute("data-email");

    if (!authToken) {
      showMessage(messageDiv, "Please log in to perform this action", "error");
      return;
    }

    try {
      const response = await fetch(
        `/activities/${encodeURIComponent(activity)}/unregister?email=${encodeURIComponent(email)}`,
        {
          method: "DELETE",
          headers: {
            "Authorization": `Bearer ${authToken}`
          }
        }
      );

      const result = await response.json();

      if (response.ok) {
        showMessage(messageDiv, result.message, "success");
        fetchActivities(); // Refresh the activities list
      } else {
        showMessage(messageDiv, result.detail || "Failed to unregister student", "error");
      }
    } catch (error) {
      console.error("Unregister error:", error);
      showMessage(messageDiv, "Failed to unregister student. Please try again.", "error");
    }

    setTimeout(() => messageDiv.classList.add("hidden"), 5000);
  }

  // Handle student registration (faculty/admin only)
  async function handleStudentRegistration(event) {
    event.preventDefault();

    if (!authToken) {
      showMessage(messageDiv, "Please log in to perform this action", "error");
      return;
    }

    const email = document.getElementById("email").value;
    const activity = document.getElementById("activity").value;

    try {
      const response = await fetch(
        `/activities/${encodeURIComponent(activity)}/signup?email=${encodeURIComponent(email)}`,
        {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${authToken}`
          }
        }
      );

      const result = await response.json();

      if (response.ok) {
        showMessage(messageDiv, result.message, "success");
        fetchActivities(); // Refresh the activities list
        signupForm.reset();
      } else {
        showMessage(messageDiv, result.detail || "Failed to register student", "error");
      }
    } catch (error) {
      console.error("Registration error:", error);
      showMessage(messageDiv, "Failed to register student. Please try again.", "error");
    }

    setTimeout(() => messageDiv.classList.add("hidden"), 5000);
  }

  // Utility function to show messages
  function showMessage(element, message, type) {
    element.textContent = message;
    element.className = `message ${type}`;
    element.classList.remove("hidden");
  }
});
