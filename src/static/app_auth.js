document.addEventListener("DOMContentLoaded", () => {
  // DOM elements
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
  const viewOnlyNote = document.getElementById("view-only-note");
  const unregisterBtn = document.getElementById("unregister-btn");

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
    clearLoginForm();
  });

  // Close modal when clicking outside
  window.addEventListener("click", (e) => {
    if (e.target === loginModal) {
      loginModal.classList.add("hidden");
      clearLoginForm();
    }
  });

  loginForm.addEventListener("submit", handleLogin);
  signupForm.addEventListener("submit", handleSignup);
  unregisterBtn.addEventListener("click", handleUnregister);

  // Authentication functions
  async function checkAuthStatus() {
    if (!authToken) {
      showUnauthenticatedState();
      return;
    }

    try {
      const response = await fetch("/auth/me", {
        headers: {
          "Authorization": `Bearer ${authToken}`
        }
      });

      if (response.ok) {
        currentUser = await response.json();
        showAuthenticatedState();
      } else {
        // Token is invalid
        localStorage.removeItem("authToken");
        authToken = null;
        showUnauthenticatedState();
      }
    } catch (error) {
      console.error("Error checking auth status:", error);
      showUnauthenticatedState();
    }

    // Always load activities
    loadActivities();
  }

  async function handleLogin(e) {
    e.preventDefault();
    
    const email = document.getElementById("login-email").value;
    const password = document.getElementById("login-password").value;

    try {
      const formData = new FormData();
      formData.append("email", email);
      formData.append("password", password);

      const response = await fetch("/auth/login", {
        method: "POST",
        body: formData
      });

      const data = await response.json();

      if (response.ok) {
        authToken = data.access_token;
        currentUser = data.user;
        localStorage.setItem("authToken", authToken);
        
        loginModal.classList.add("hidden");
        clearLoginForm();
        showAuthenticatedState();
        showMessage(loginMessage, `Welcome, ${currentUser.first_name}!`, "success");
      } else {
        showMessage(loginMessage, data.detail || "Login failed", "error");
      }
    } catch (error) {
      console.error("Login error:", error);
      showMessage(loginMessage, "Network error. Please try again.", "error");
    }
  }

  function logout() {
    authToken = null;
    currentUser = null;
    localStorage.removeItem("authToken");
    showUnauthenticatedState();
  }

  function showAuthenticatedState() {
    loginSection.classList.add("hidden");
    userSection.classList.remove("hidden");
    userInfo.textContent = `${currentUser.first_name} ${currentUser.last_name} (${currentUser.role})`;
    
    // Show signup container for faculty/admin
    if (currentUser.role === "faculty" || currentUser.role === "admin") {
      signupContainer.classList.remove("hidden");
      viewOnlyNote.classList.add("hidden");
    } else {
      signupContainer.classList.add("hidden");
      viewOnlyNote.classList.remove("hidden");
    }
  }

  function showUnauthenticatedState() {
    loginSection.classList.remove("hidden");
    userSection.classList.add("hidden");
    signupContainer.classList.add("hidden");
    viewOnlyNote.classList.remove("hidden");
  }

  function clearLoginForm() {
    document.getElementById("login-email").value = "";
    document.getElementById("login-password").value = "";
    hideMessage(loginMessage);
  }

  // Activity management functions
  async function loadActivities() {
    try {
      const headers = {};
      if (authToken) {
        headers["Authorization"] = `Bearer ${authToken}`;
      }

      const response = await fetch("/activities", { headers });
      const activities = await response.json();

      displayActivities(activities);
      populateActivitySelect(activities);
    } catch (error) {
      console.error("Error loading activities:", error);
      activitiesList.innerHTML = "<p>Error loading activities. Please try again.</p>";
    }
  }

  function displayActivities(activities) {
    activitiesList.innerHTML = "";

    Object.entries(activities).forEach(([name, activity]) => {
      const activityCard = document.createElement("div");
      activityCard.className = "activity-card";

      const spotsLeft = activity.max_participants - activity.participants.length;
      const isFull = spotsLeft === 0;

      activityCard.innerHTML = `
        <h4>${name}</h4>
        <p><strong>Description:</strong> ${activity.description}</p>
        <p><strong>Schedule:</strong> ${activity.schedule}</p>
        <p><strong>Capacity:</strong> ${activity.participants.length}/${activity.max_participants} 
          ${isFull ? '<span class="full-indicator">(FULL)</span>' : `(${spotsLeft} spots left)`}</p>
        <div class="participants">
          <strong>Participants:</strong>
          ${activity.participants.length > 0 
            ? `<ul>${activity.participants.map(p => `<li>${p}</li>`).join("")}</ul>`
            : "<p>No participants yet</p>"
          }
        </div>
      `;

      activitiesList.appendChild(activityCard);
    });
  }

  function populateActivitySelect(activities) {
    activitySelect.innerHTML = '<option value="">-- Select an activity --</option>';
    
    Object.keys(activities).forEach(name => {
      const option = document.createElement("option");
      option.value = name;
      option.textContent = name;
      activitySelect.appendChild(option);
    });
  }

  async function handleSignup(e) {
    e.preventDefault();
    
    if (!authToken) {
      showMessage(messageDiv, "Please log in to manage registrations.", "error");
      return;
    }

    const email = document.getElementById("email").value;
    const activity = document.getElementById("activity").value;

    if (!email || !activity) {
      showMessage(messageDiv, "Please fill in all fields.", "error");
      return;
    }

    await performRegistrationAction("signup", activity, email);
  }

  async function handleUnregister(e) {
    e.preventDefault();
    
    if (!authToken) {
      showMessage(messageDiv, "Please log in to manage registrations.", "error");
      return;
    }

    const email = document.getElementById("email").value;
    const activity = document.getElementById("activity").value;

    if (!email || !activity) {
      showMessage(messageDiv, "Please fill in all fields.", "error");
      return;
    }

    await performRegistrationAction("unregister", activity, email);
  }

  async function performRegistrationAction(action, activity, email) {
    try {
      const formData = new FormData();
      formData.append("email", email);

      const url = `/activities/${encodeURIComponent(activity)}/${action === "signup" ? "signup" : "unregister"}`;
      const method = action === "signup" ? "POST" : "DELETE";

      const options = {
        method: method,
        headers: {
          "Authorization": `Bearer ${authToken}`
        }
      };

      if (action === "signup") {
        options.body = formData;
      } else {
        // For DELETE, add email as query parameter
        const urlWithEmail = new URL(url, window.location.origin);
        urlWithEmail.searchParams.append("email", email);
        options.method = "DELETE";
        const response = await fetch(urlWithEmail.toString(), {
          method: "DELETE",
          headers: {
            "Authorization": `Bearer ${authToken}`
          }
        });
        
        const data = await response.json();

        if (response.ok) {
          showMessage(messageDiv, data.message, "success");
          document.getElementById("email").value = "";
          document.getElementById("activity").value = "";
          loadActivities(); // Refresh activities
        } else {
          showMessage(messageDiv, data.detail || `Failed to ${action} student`, "error");
        }
        return;
      }

      const response = await fetch(url, options);
      const data = await response.json();

      if (response.ok) {
        showMessage(messageDiv, data.message, "success");
        document.getElementById("email").value = "";
        document.getElementById("activity").value = "";
        loadActivities(); // Refresh activities
      } else {
        showMessage(messageDiv, data.detail || `Failed to ${action} student`, "error");
      }
    } catch (error) {
      console.error(`${action} error:`, error);
      showMessage(messageDiv, "Network error. Please try again.", "error");
    }
  }

  // Utility functions
  function showMessage(element, message, type) {
    element.textContent = message;
    element.className = `message ${type}`;
    element.classList.remove("hidden");
    
    setTimeout(() => {
      hideMessage(element);
    }, 5000);
  }

  function hideMessage(element) {
    element.classList.add("hidden");
  }
});
