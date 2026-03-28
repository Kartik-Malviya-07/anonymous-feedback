document.addEventListener("DOMContentLoaded", () => {
    // 1. Star Rating Logic
    const starRatingContainer = document.getElementById("starRating");
    if (starRatingContainer) {
        const stars = starRatingContainer.querySelectorAll("i");
        const ratingInput = document.getElementById("rating");

        stars.forEach(star => {
            star.addEventListener("mouseover", function() {
                const value = parseInt(this.getAttribute("data-value"));
                updateStarClasses(stars, value, "hover");
            });

            star.addEventListener("mouseout", function() {
                updateStarClasses(stars, ratingInput.value, "hover-out");
            });

            star.addEventListener("click", function() {
                const value = this.getAttribute("data-value");
                ratingInput.value = value;
                updateStarClasses(stars, value, "click");
                document.getElementById("ratingError").textContent = ""; 
            });
        });

        function updateStarClasses(elements, value, action) {
            elements.forEach(star => {
                const starVal = parseInt(star.getAttribute("data-value"));
                if (action === "hover") {
                    if (starVal <= value) {
                        star.classList.replace("fa-regular", "fa-solid");
                        star.classList.add("hover-active");
                    } else {
                        star.classList.replace("fa-solid", "fa-regular");
                        star.classList.remove("hover-active");
                    }
                } else if (action === "hover-out") {
                    star.classList.remove("hover-active");
                    if (starVal <= value) {
                        star.classList.replace("fa-regular", "fa-solid");
                    } else {
                        star.classList.replace("fa-solid", "fa-regular");
                    }
                } else if (action === "click") {
                    if (starVal <= value) {
                        star.classList.replace("fa-regular", "fa-solid");
                        star.classList.add("active");
                    } else {
                        star.classList.replace("fa-solid", "fa-regular");
                        star.classList.remove("active");
                    }
                }
            });
        }
    }

    // 2. Submit Feedback Form
    const feedbackForm = document.getElementById("feedbackForm");
    if (feedbackForm) {
        feedbackForm.addEventListener("submit", async (e) => {
            e.preventDefault();

            const ratingInput = document.getElementById("rating");
            if (!ratingInput.value) {
                document.getElementById("ratingError").textContent = "Please select a rating.";
                return;
            }

            const btn = document.getElementById("submitBtn");
            btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Submitting...';
            btn.disabled = true;

            const formData = {
                session_id: document.getElementById("sessionId") ? document.getElementById("sessionId").value : null,
                name: document.getElementById("name").value,
                rating: ratingInput.value,
                message: document.getElementById("message").value
            };

            try {
                const response = await fetch("/submit-feedback", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify(formData)
                });

                const data = await response.json();
                
                if (data.success) {
                    feedbackForm.classList.add("hidden");
                    document.getElementById("successMessage").classList.remove("hidden");
                } else {
                    alert("Error: " + data.error);
                }
            } catch (err) {
                console.error(err);
                alert("Something went wrong. Please try again later.");
            } finally {
                btn.innerHTML = '<span>Submit Feedback</span><i class="fa-solid fa-paper-plane"></i>';
                btn.disabled = false;
            }
        });
    }

    // 3. Admin Login Logic
    const loginForm = document.getElementById("loginForm");
    if (loginForm) {
        loginForm.addEventListener("submit", async (e) => {
            e.preventDefault();

            const btn = document.getElementById("loginBtn");
            const errBox = document.getElementById("loginError");
            
            errBox.classList.add("hidden");
            btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Authenticating...';
            btn.disabled = true;

            const formData = {
                username: document.getElementById("username").value,
                password: document.getElementById("password").value
            };

            try {
                const response = await fetch("/login", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify(formData)
                });

                const data = await response.json();
                
                if (data.success) {
                    window.location.href = "/admin"; 
                } else {
                    errBox.textContent = data.error;
                    errBox.classList.remove("hidden");
                }
            } catch (err) {
                console.error(err);
                errBox.textContent = "Connection error. Please try again.";
                errBox.classList.remove("hidden");
            } finally {
                btn.innerHTML = '<span>Secure Login</span><i class="fa-solid fa-right-to-bracket"></i>';
                btn.disabled = false;
            }
        });
    }
});

// 4. Load Feedback Dashboard
async function loadFeedback() {
    const tableBody = document.getElementById("feedbackTableBody");
    const categoryQuery = document.getElementById("filterCategory").value;
    const sessionFilter = document.getElementById("filterSession");
    const sessionQuery = sessionFilter ? sessionFilter.value : "All";
    
    if(!tableBody) return;
    
    tableBody.innerHTML = '<tr><td colspan="6" class="text-center"><i class="fa-solid fa-spinner fa-spin"></i> Loading...</td></tr>';
    document.getElementById("emptyState").classList.add("hidden");

    try {
        const response = await fetch(`/get-feedback?category=${encodeURIComponent(categoryQuery)}&session_id=${encodeURIComponent(sessionQuery)}`);
        const data = await response.json();

        if (data.success) {
            document.getElementById("totalCount").textContent = data.total;
            document.getElementById("avgRating").textContent = data.average_rating;

            if (data.feedbacks.length === 0) {
                tableBody.innerHTML = "";
                document.getElementById("emptyState").classList.remove("hidden");
            } else {
                tableBody.innerHTML = "";
                data.feedbacks.forEach(f => {
                    const tr = document.createElement("tr");
                    
                    let starsHtml = '<div class="mini-stars">';
                    for(let i=1; i<=5; i++) {
                        if(i <= f.rating) {
                            starsHtml += '<i class="fa-solid fa-star"></i>';
                        } else {
                            starsHtml += '<i class="fa-regular fa-star"></i>';
                        }
                    }
                    starsHtml += '</div>';

                    const nameDisplay = f.name === "Anonymous" 
                        ? `<span style="color:var(--gray)"><em>Anonymous</em></span>`
                        : `<strong>${escapeHTML(f.name)}</strong>`;

                    tr.innerHTML = `
                        <td data-label="Date"><span style="color:var(--text-muted); font-size: 0.85rem">${f.created_at}</span></td>
                        <td data-label="Name">${nameDisplay}</td>
                        <td data-label="Category"><span class="tag tag-${f.category}">${f.category}</span></td>
                        <td data-label="Rating">${starsHtml}</td>
                        <td data-label="Message" class="feedback-text">${escapeHTML(f.message)}</td>
                        <td data-label="Action" class="action-cell">
                            <button onclick="deleteFeedback('${f._id}')" class="btn danger-btn" title="Delete">
                                <i class="fa-solid fa-trash"></i>
                            </button>
                        </td>
                    `;
                    tableBody.appendChild(tr);
                });
            }
        } else if (response.status === 401) {
            window.location.href = "/login";
        }
    } catch (err) {
        console.error("Error fetching data:", err);
        tableBody.innerHTML = '<tr><td colspan="6" class="text-center" style="color:var(--danger)">Failed to load data.</td></tr>';
    }
}

// 5. Delete Feedback
async function deleteFeedback(id) {
    if (!confirm("Are you sure you want to delete this feedback?")) {
        return;
    }

    try {
        const response = await fetch(`/delete-feedback/${id}`, {
            method: "DELETE"
        });
        
        const data = await response.json();
        
        if (data.success) {
            loadFeedback();
        } else {
            alert("Failed to delete: " + data.error);
        }
    } catch (err) {
        console.error(err);
        alert("Error deleting record.");
    }
}

function escapeHTML(str) {
    if (!str) return "";
    return str.replace(/[&<>'"]/g, 
        tag => ({
            '&': '&amp;',
            '<': '&lt;',
            '>': '&gt;',
            "'": '&#39;',
            '"': '&quot;'
        }[tag] || tag)
    );
}

// 6. Session Management
async function createSession() {
    const titleInp = document.getElementById("newSessionTitle");
    const catInp = document.getElementById("newSessionCategory");
    const title = titleInp.value.trim();
    const category = catInp ? catInp.value : "";
    if (!title || !category) {
        alert("Please enter a session title and select a category");
        return;
    }
    const btn = document.getElementById("createSessionBtn");
    btn.disabled = true;
    btn.textContent = "Generating...";
    try {
        const res = await fetch("/api/sessions", {
            method: "POST",
            headers: {"Content-Type": "application/json"},
            body: JSON.stringify({title, category})
        });
        const data = await res.json();
        if (data.success) {
            titleInp.value = "";
            if (catInp) catInp.value = "";
            loadSessions();
        } else {
            alert("Error: " + data.error);
        }
    } catch(e) {
        alert("Connection error");
    } finally {
        btn.disabled = false;
        btn.textContent = "Generate Link";
    }
}

async function loadSessions() {
    const table = document.getElementById("sessionsTableBody");
    const dropdown = document.getElementById("filterSession");
    if(!table) return;
    
    try {
        const res = await fetch("/api/sessions");
        const data = await res.json();
        if(data.success) {
            table.innerHTML = "";
            
            // clear dropdown except first option
            const currVal = dropdown ? dropdown.value : "All";
            if (dropdown) dropdown.innerHTML = '<option value="All">All Feedback Links</option>';
            
            if(data.sessions.length === 0) {
                table.innerHTML = '<tr><td colspan="3" class="text-center">No links generated yet.</td></tr>';
                return;
            }
            
            data.sessions.forEach(s => {
                const tr = document.createElement("tr");
                const url = window.location.origin + "/f/" + s._id;
                tr.innerHTML = `
                    <td data-label="Date"><span style="color:var(--text-muted); font-size: 0.85rem">${s.created_at}</span></td>
                    <td data-label="Title"><strong>${escapeHTML(s.title)}</strong></td>
                    <td data-label="Action" class="action-cell">
                        <button class="btn secondary-btn small-btn" onclick="copyToClipboard('${url}')" style="padding: 8px 12px; font-size: 0.85rem;">
                            <i class="fa-regular fa-copy"></i> Copy Link
                        </button>
                    </td>
                `;
                table.appendChild(tr);
                
                if (dropdown) {
                    const opt = document.createElement("option");
                    opt.value = s._id;
                    opt.textContent = escapeHTML(s.title);
                    dropdown.appendChild(opt);
                }
            });
            
            if (dropdown && Array.from(dropdown.options).some(o => o.value === currVal)) {
                dropdown.value = currVal;
            }
        }
    } catch(e) {
        console.error(e);
    }
}

window.copyToClipboard = function(text) {
    navigator.clipboard.writeText(text).then(() => alert("Link copied to clipboard!"));
};

document.addEventListener("DOMContentLoaded", () => {
    if(document.getElementById("sessionsTableBody")) {
        loadSessions();
    }
});

// Expose functions globally for inline handlers
window.loadFeedback = loadFeedback;
window.deleteFeedback = deleteFeedback;
window.createSession = createSession;
