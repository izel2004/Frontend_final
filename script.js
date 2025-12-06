// Configuration - UPDATE THIS WITH YOUR DEPLOYED BACKEND URL
const API_BASE_URL = 'https://library2-2.onrender.com/api';

// DOM Elements
const sections = document.querySelectorAll('.section');
const navLinks = document.querySelectorAll('.nav-link');
const statusDot = document.getElementById('status-dot');
const apiStatusText = document.getElementById('api-status-text');
const activeLoansBadge = document.getElementById('active-loans-badge');

// Current state
let currentItemToDelete = null;
let currentItemToEdit = null;
let currentEditType = null;
let currentFilter = 'all';

// Initialize the application
document.addEventListener('DOMContentLoaded', function() {
    // Check API connection
    checkApiConnection();
    
    // Load initial data
    loadInitialData();
    
    // Set up navigation
    setupNavigation();
    
    // Set up form submissions
    setupForms();
    
    // Set up modal handlers
    setupModals();
    
    // Set up search and filters
    setupSearchAndFilters();
    
    // Set minimum date for loan due date to today
    const today = new Date().toISOString().split('T')[0];
    document.getElementById('loan-due-date').min = today;
    document.getElementById('loan-due-date').value = today;
    
    // Setup quick actions
    setupQuickActions();
});

// Navigation
function setupNavigation() {
    navLinks.forEach(link => {
        link.addEventListener('click', function(e) {
            e.preventDefault();
            
            // Update active nav link
            navLinks.forEach(l => l.classList.remove('active'));
            this.classList.add('active');
            
            // Show corresponding section
            const sectionId = this.getAttribute('data-section');
            sections.forEach(section => {
                section.classList.remove('active');
                if (section.id === sectionId) {
                    section.classList.add('active');
                }
            });
            
            // Refresh data for the active section
            if (sectionId === 'dashboard') {
                loadDashboardData();
            } else if (sectionId === 'books') {
                loadBooks();
            } else if (sectionId === 'members') {
                loadMembers();
            } else if (sectionId === 'loans') {
                loadLoans();
            }
        });
    });
}

// Setup quick actions
function setupQuickActions() {
    document.querySelectorAll('.btn-action').forEach(btn => {
        btn.addEventListener('click', function() {
            const section = this.getAttribute('data-section');
            
            // Update active nav link
            navLinks.forEach(l => l.classList.remove('active'));
            document.querySelector(`[data-section="${section}"]`).classList.add('active');
            
            // Show corresponding section
            sections.forEach(sectionEl => {
                sectionEl.classList.remove('active');
                if (sectionEl.id === section) {
                    sectionEl.classList.add('active');
                }
            });
        });
    });
}

// API Connection Check
async function checkApiConnection() {
    try {
        const response = await fetch(`${API_BASE_URL}/books`);
        if (response.ok) {
            statusDot.className = 'status-dot connected';
            apiStatusText.textContent = "Connected";
            showToast('Connected', 'API connection established', 'success');
        } else {
            throw new Error('API not responding properly');
        }
    } catch (error) {
        statusDot.className = 'status-dot disconnected';
        apiStatusText.textContent = "Disconnected";
        showToast('Connection Failed', 'Cannot connect to API server', 'error');
        console.error("API Connection Error:", error);
    }
}

// Load initial data
async function loadInitialData() {
    try {
        await loadDashboardData();
        await loadBooks();
        await loadMembers();
        await loadLoans();
        await populateMemberDropdown();
        await populateBookDropdown();
    } catch (error) {
        console.error('Error loading initial data:', error);
        showToast('Error', 'Failed to load initial data', 'error');
    }
}

// Dashboard Functions
async function loadDashboardData() {
    try {
        // Fetch counts for dashboard
        const [booksRes, membersRes, loansRes] = await Promise.all([
            fetch(`${API_BASE_URL}/books`),
            fetch(`${API_BASE_URL}/members`),
            fetch(`${API_BASE_URL}/loans`)
        ]);
        
        const books = await booksRes.json();
        const members = await membersRes.json();
        const loans = await loansRes.json();
        
        // Update stats
        document.getElementById('total-books').textContent = books.length || 0;
        document.getElementById('total-members').textContent = members.length || 0;
        
        // Calculate active and overdue loans
        const activeLoans = loans.filter(loan => !loan.returnedAt);
        const overdueLoans = activeLoans.filter(loan => {
            const dueDate = new Date(loan.dueAt);
            return dueDate < new Date();
        });
        
        document.getElementById('active-loans').textContent = activeLoans.length;
        document.getElementById('overdue-loans').textContent = overdueLoans.length;
        
        // Update badge
        activeLoansBadge.textContent = activeLoans.length;
        
        // Show recent activity (last 5 loans)
        const recentLoans = loans.slice(0, 5);
        const activityList = document.getElementById('activity-list');
        activityList.innerHTML = '';
        
        if (recentLoans.length === 0) {
            activityList.innerHTML = `
                <div class="empty-state">
                    <p class="text-muted">No recent activity</p>
                </div>
            `;
            return;
        }
        
        recentLoans.forEach(loan => {
            const activityItem = document.createElement('div');
            activityItem.className = 'activity-item';
            
            const loanDate = new Date(loan.loanedAt).toLocaleDateString();
            const status = loan.returnedAt ? 'Returned' : 'Active';
            const icon = loan.returnedAt ? 'fa-check-circle' : 'fa-exchange-alt';
            const iconColor = loan.returnedAt ? 'success' : 'warning';
            
            activityItem.innerHTML = `
                <div class="activity-icon">
                    <i class="fas ${icon} text-${iconColor}"></i>
                </div>
                <div class="activity-content">
                    <p>
                        <strong>${loan.memberId?.name || 'Member'}</strong> borrowed 
                        <strong>"${loan.bookId?.title || 'Book'}"</strong>
                    </p>
                    <div class="activity-time">
                        ${loanDate} • <span class="text-muted">${status}</span>
                    </div>
                </div>
            `;
            activityList.appendChild(activityItem);
        });
        
    } catch (error) {
        console.error('Error loading dashboard data:', error);
        showToast('Error', 'Failed to load dashboard data', 'error');
    }
}

// Books Functions
async function loadBooks() {
    try {
        const response = await fetch(`${API_BASE_URL}/books`);
        const books = await response.json();
        
        const booksList = document.getElementById('books-list');
        booksList.innerHTML = '';
        
        if (books.length === 0) {
            booksList.innerHTML = `
                <tr>
                    <td colspan="6" class="text-center text-muted">
                        No books found. Add your first book!
                    </td>
                </tr>
            `;
            document.getElementById('books-count').textContent = '0';
            return;
        }
        
        books.forEach(book => {
            const row = document.createElement('tr');
            const status = book.copies > 0 ? 'Available' : 'Out of Stock';
            const statusClass = book.copies > 0 ? 'status-active' : 'status-overdue';
            
            row.innerHTML = `
                <td>
                    <div class="flex items-center gap-4">
                        <div class="activity-icon">
                            <i class="fas fa-book"></i>
                        </div>
                        <div>
                            <strong>${book.title}</strong>
                            ${book.author ? `<div class="text-muted" style="font-size: 12px;">${book.author}</div>` : ''}
                        </div>
                    </div>
                </td>
                <td>${book.author || '—'}</td>
                <td><code>${book.isbn}</code></td>
                <td>${book.copies}</td>
                <td>
                    <span class="status-badge ${statusClass}">${status}</span>
                </td>
                <td>
                    <div class="action-buttons">
                        <button class="action-btn view" data-id="${book._id}" title="View">
                            <i class="fas fa-eye"></i>
                        </button>
                        <button class="action-btn edit" data-id="${book._id}" title="Edit">
                            <i class="fas fa-edit"></i>
                        </button>
                        <button class="action-btn delete" data-id="${book._id}" title="Delete">
                            <i class="fas fa-trash"></i>
                        </button>
                    </div>
                </td>
            `;
            booksList.appendChild(row);
        });
        
        document.getElementById('books-count').textContent = books.length;
        
        // Add event listeners to book buttons
        addBookEventListeners();
        
    } catch (error) {
        console.error('Error loading books:', error);
        showToast('Error', 'Failed to load books', 'error');
    }
}

function addBookEventListeners() {
    document.querySelectorAll('.action-btn.view[data-id]').forEach(button => {
        button.addEventListener('click', function() {
            const bookId = this.getAttribute('data-id');
            viewBookDetails(bookId);
        });
    });
    
    document.querySelectorAll('.action-btn.edit[data-id]').forEach(button => {
        button.addEventListener('click', function() {
            const bookId = this.getAttribute('data-id');
            showEditModal('book', bookId);
        });
    });
    
    document.querySelectorAll('.action-btn.delete[data-id]').forEach(button => {
        button.addEventListener('click', function() {
            const bookId = this.getAttribute('data-id');
            const bookTitle = this.closest('tr').querySelector('strong').textContent;
            showDeleteModal('book', bookId, `book "${bookTitle}"`);
        });
    });
}

async function viewBookDetails(bookId) {
    try {
        const response = await fetch(`${API_BASE_URL}/books/${bookId}`);
        const book = await response.json();
        
        const modal = document.getElementById('edit-modal');
        modal.querySelector('#modal-title').textContent = 'Book Details';
        
        const formFields = document.getElementById('edit-form-fields');
        formFields.innerHTML = `
            <div class="form-group">
                <label>Title</label>
                <div class="view-field">${book.title}</div>
            </div>
            <div class="form-group">
                <label>Author</label>
                <div class="view-field">${book.author || 'Not specified'}</div>
            </div>
            <div class="form-group">
                <label>ISBN</label>
                <div class="view-field">${book.isbn}</div>
            </div>
            <div class="form-group">
                <label>Available Copies</label>
                <div class="view-field">${book.copies}</div>
            </div>
        `;
        
        modal.querySelector('.modal-footer').innerHTML = `
            <button type="button" class="btn-secondary modal-close">Close</button>
        `;
        
        showModal('edit-modal');
        
    } catch (error) {
        console.error('Error loading book details:', error);
        showToast('Error', 'Failed to load book details', 'error');
    }
}

// Members Functions
async function loadMembers() {
    try {
        const response = await fetch(`${API_BASE_URL}/members`);
        const members = await response.json();
        
        const membersList = document.getElementById('members-list');
        membersList.innerHTML = '';
        
        if (members.length === 0) {
            membersList.innerHTML = `
                <tr>
                    <td colspan="5" class="text-center text-muted">
                        No members found. Register your first member!
                    </td>
                </tr>
            `;
            return;
        }
        
        // First, get loans to count active loans per member
        const loansRes = await fetch(`${API_BASE_URL}/loans`);
        const loans = await loansRes.json();
        
        members.forEach(member => {
            const activeLoans = loans.filter(loan => 
                loan.memberId?._id === member._id && !loan.returnedAt
            ).length;
            
            const joinDate = new Date(member.joinedAt).toLocaleDateString();
            const row = document.createElement('tr');
            
            row.innerHTML = `
                <td>
                    <div class="flex items-center gap-4">
                        <div class="activity-icon">
                            <i class="fas fa-user"></i>
                        </div>
                        <div>
                            <strong>${member.name}</strong>
                            <div class="text-muted" style="font-size: 12px;">ID: ${member._id.slice(-6)}</div>
                        </div>
                    </div>
                </td>
                <td>${member.email}</td>
                <td>${joinDate}</td>
                <td>
                    <span class="status-badge ${activeLoans > 0 ? 'status-active' : ''}">
                        ${activeLoans} active
                    </span>
                </td>
                <td>
                    <div class="action-buttons">
                        <button class="action-btn view" data-id="${member._id}" title="View">
                            <i class="fas fa-eye"></i>
                        </button>
                        <button class="action-btn edit" data-id="${member._id}" title="Edit">
                            <i class="fas fa-edit"></i>
                        </button>
                        <button class="action-btn delete" data-id="${member._id}" title="Delete">
                            <i class="fas fa-trash"></i>
                        </button>
                    </div>
                </td>
            `;
            membersList.appendChild(row);
        });
        
        addMemberEventListeners();
        
    } catch (error) {
        console.error('Error loading members:', error);
        showToast('Error', 'Failed to load members', 'error');
    }
}

function addMemberEventListeners() {
    document.querySelectorAll('.action-btn.view[data-id]').forEach(button => {
        button.addEventListener('click', function() {
            const memberId = this.getAttribute('data-id');
            viewMemberDetails(memberId);
        });
    });
    
    document.querySelectorAll('.action-btn.edit[data-id]').forEach(button => {
        button.addEventListener('click', function() {
            const memberId = this.getAttribute('data-id');
            showEditModal('member', memberId);
        });
    });
    
    document.querySelectorAll('.action-btn.delete[data-id]').forEach(button => {
        button.addEventListener('click', function() {
            const memberId = this.getAttribute('data-id');
            const memberName = this.closest('tr').querySelector('strong').textContent;
            showDeleteModal('member', memberId, `member "${memberName}"`);
        });
    });
}

async function viewMemberDetails(memberId) {
    try {
        const response = await fetch(`${API_BASE_URL}/members/${memberId}`);
        const member = await response.json();
        
        const modal = document.getElementById('edit-modal');
        modal.querySelector('#modal-title').textContent = 'Member Details';
        
        const formFields = document.getElementById('edit-form-fields');
        formFields.innerHTML = `
            <div class="form-group">
                <label>Name</label>
                <div class="view-field">${member.name}</div>
            </div>
            <div class="form-group">
                <label>Email</label>
                <div class="view-field">${member.email}</div>
            </div>
            <div class="form-group">
                <label>Joined Date</label>
                <div class="view-field">${new Date(member.joinedAt).toLocaleDateString()}</div>
            </div>
        `;
        
        modal.querySelector('.modal-footer').innerHTML = `
            <button type="button" class="btn-secondary modal-close">Close</button>
        `;
        
        showModal('edit-modal');
        
    } catch (error) {
        console.error('Error loading member details:', error);
        showToast('Error', 'Failed to load member details', 'error');
    }
}

// Loans Functions
async function loadLoans() {
    try {
        const response = await fetch(`${API_BASE_URL}/loans`);
        const loans = await response.json();
        
        const loansList = document.getElementById('loans-list');
        loansList.innerHTML = '';
        
        if (loans.length === 0) {
            loansList.innerHTML = `
                <tr>
                    <td colspan="6" class="text-center text-muted">
                        No loans found. Create your first loan!
                    </td>
                </tr>
            `;
            return;
        }
        
        // Filter loans based on current filter
        let filteredLoans = [...loans];
        if (currentFilter === 'active') {
            filteredLoans = filteredLoans.filter(loan => !loan.returnedAt);
        } else if (currentFilter === 'overdue') {
            filteredLoans = filteredLoans.filter(loan => 
                !loan.returnedAt && new Date(loan.dueAt) < new Date()
            );
        } else if (currentFilter === 'returned') {
            filteredLoans = filteredLoans.filter(loan => loan.returnedAt);
        }
        
        if (filteredLoans.length === 0) {
            loansList.innerHTML = `
                <tr>
                    <td colspan="6" class="text-center text-muted">
                        No ${currentFilter === 'all' ? '' : currentFilter} loans found
                    </td>
                </tr>
            `;
            return;
        }
        
        filteredLoans.forEach(loan => {
            const loanDate = new Date(loan.loanedAt).toLocaleDateString();
            const dueDate = new Date(loan.dueAt).toLocaleDateString();
            
            // Determine status
            let status = 'Active';
            let statusClass = 'status-active';
            
            if (loan.returnedAt) {
                status = 'Returned';
                statusClass = 'status-returned';
            } else if (new Date(loan.dueAt) < new Date()) {
                status = 'Overdue';
                statusClass = 'status-overdue';
            }
            
            const row = document.createElement('tr');
            
            row.innerHTML = `
                <td>
                    <div class="flex items-center gap-4">
                        <div class="activity-icon">
                            <i class="fas fa-user"></i>
                        </div>
                        <div>
                            <strong>${loan.memberId?.name || 'Unknown Member'}</strong>
                            <div class="text-muted" style="font-size: 12px;">${loan.memberId?.email || ''}</div>
                        </div>
                    </div>
                </td>
                <td>
                    <div>
                        <strong>${loan.bookId?.title || 'Unknown Book'}</strong>
                        <div class="text-muted" style="font-size: 12px;">${loan.bookId?.author || ''}</div>
                    </div>
                </td>
                <td>${loanDate}</td>
                <td>${dueDate}</td>
                <td>
                    <span class="status-badge ${statusClass}">
                        ${status}
                    </span>
                </td>
                <td>
                    <div class="action-buttons">
                        ${!loan.returnedAt ? `
                        <button class="action-btn return" data-id="${loan._id}" title="Mark Returned">
                            <i class="fas fa-check"></i>
                        </button>
                        ` : ''}
                        <button class="action-btn delete" data-id="${loan._id}" title="Delete">
                            <i class="fas fa-trash"></i>
                        </button>
                    </div>
                </td>
            `;
            loansList.appendChild(row);
        });
        
        addLoanEventListeners();
        
    } catch (error) {
        console.error('Error loading loans:', error);
        showToast('Error', 'Failed to load loans', 'error');
    }
}

function addLoanEventListeners() {
    document.querySelectorAll('.action-btn.return[data-id]').forEach(button => {
        button.addEventListener('click', function() {
            const loanId = this.getAttribute('data-id');
            returnLoan(loanId);
        });
    });
    
    document.querySelectorAll('.action-btn.delete[data-id]').forEach(button => {
        button.addEventListener('click', function() {
            const loanId = this.getAttribute('data-id');
            showDeleteModal('loan', loanId, 'this loan');
        });
    });
}

async function returnLoan(loanId) {
    if (!confirm('Mark this loan as returned?')) return;
    
    try {
        const response = await fetch(`${API_BASE_URL}/loans/${loanId}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                returnedAt: new Date().toISOString()
            })
        });
        
        if (response.ok) {
            showToast('Success', 'Loan marked as returned', 'success');
            loadLoans();
            loadDashboardData();
        } else {
            const error = await response.json();
            throw new Error(error.error || 'Failed to return loan');
        }
    } catch (error) {
        console.error('Error returning loan:', error);
        showToast('Error', error.message, 'error');
    }
}

// Form Setup
function setupForms() {
    // Add book form
    document.getElementById('add-book-form').addEventListener('submit', async function(e) {
        e.preventDefault();
        
        const title = document.getElementById('book-title').value.trim();
        const author = document.getElementById('book-author').value.trim();
        const isbn = document.getElementById('book-isbn').value.trim();
        const copies = parseInt(document.getElementById('book-copies').value);
        
        // Validation
        let isValid = true;
        
        if (!title) {
            document.getElementById('title-error').textContent = 'Title is required';
            isValid = false;
        } else {
            document.getElementById('title-error').textContent = '';
        }
        
        if (!isbn) {
            document.getElementById('isbn-error').textContent = 'ISBN is required';
            isValid = false;
        } else {
            document.getElementById('isbn-error').textContent = '';
        }
        
        if (!isValid) return;
        
        try {
            const response = await fetch(`${API_BASE_URL}/books`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    title,
                    author: author || undefined,
                    isbn,
                    copies
                })
            });
            
            const result = await response.json();
            
            if (response.ok) {
                showToast('Success', 'Book added successfully', 'success');
                this.reset();
                loadBooks();
                loadDashboardData();
                populateBookDropdown();
            } else {
                throw new Error(result.error || 'Failed to add book');
            }
        } catch (error) {
            console.error('Error adding book:', error);
            showToast('Error', error.message, 'error');
        }
    });
    
    // Add member form
    document.getElementById('add-member-form').addEventListener('submit', async function(e) {
        e.preventDefault();
        
        const name = document.getElementById('member-name').value.trim();
        const email = document.getElementById('member-email').value.trim();
        
        // Validation
        let isValid = true;
        
        if (!name) {
            document.getElementById('name-error').textContent = 'Name is required';
            isValid = false;
        } else {
            document.getElementById('name-error').textContent = '';
        }
        
        if (!email) {
            document.getElementById('email-error').textContent = 'Email is required';
            isValid = false;
        } else if (!isValidEmail(email)) {
            document.getElementById('email-error').textContent = 'Please enter a valid email';
            isValid = false;
        } else {
            document.getElementById('email-error').textContent = '';
        }
        
        if (!isValid) return;
        
        try {
            const response = await fetch(`${API_BASE_URL}/members`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    name,
                    email
                })
            });
            
            const result = await response.json();
            
            if (response.ok) {
                showToast('Success', 'Member added successfully', 'success');
                this.reset();
                loadMembers();
                loadDashboardData();
                populateMemberDropdown();
            } else {
                throw new Error(result.error || 'Failed to add member');
            }
        } catch (error) {
            console.error('Error adding member:', error);
            showToast('Error', error.message, 'error');
        }
    });
    
    // Add loan form
    document.getElementById('add-loan-form').addEventListener('submit', async function(e) {
        e.preventDefault();
        
        const memberId = document.getElementById('loan-member').value;
        const bookId = document.getElementById('loan-book').value;
        const dueAt = document.getElementById('loan-due-date').value;
        
        // Validation
        let isValid = true;
        
        if (!memberId) {
            document.getElementById('member-error').textContent = 'Please select a member';
            isValid = false;
        } else {
            document.getElementById('member-error').textContent = '';
        }
        
        if (!bookId) {
            document.getElementById('book-error').textContent = 'Please select a book';
            isValid = false;
        } else {
            document.getElementById('book-error').textContent = '';
        }
        
        if (!dueAt) {
            document.getElementById('due-date-error').textContent = 'Due date is required';
            isValid = false;
        } else {
            document.getElementById('due-date-error').textContent = '';
        }
        
        if (!isValid) return;
        
        try {
            const response = await fetch(`${API_BASE_URL}/loans`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    memberId,
                    bookId,
                    dueAt
                })
            });
            
            const result = await response.json();
            
            if (response.ok) {
                showToast('Success', 'Loan created successfully', 'success');
                this.reset();
                // Reset date to today
                const today = new Date().toISOString().split('T')[0];
                document.getElementById('loan-due-date').value = today;
                
                loadLoans();
                loadDashboardData();
            } else {
                throw new Error(result.error || 'Failed to create loan');
            }
        } catch (error) {
            console.error('Error creating loan:', error);
            showToast('Error', error.message, 'error');
        }
    });
    
    // Edit form
    document.getElementById('edit-form').addEventListener('submit', async function(e) {
        e.preventDefault();
        
        const formData = new FormData(this);
        const data = {};
        formData.forEach((value, key) => {
            data[key] = value;
        });
        
        try {
            const response = await fetch(`${API_BASE_URL}/${currentEditType}s/${currentItemToEdit}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(data)
            });
            
            if (response.ok) {
                hideModal('edit-modal');
                showToast('Success', `${currentEditType} updated successfully`, 'success');
                
                // Refresh data
                if (currentEditType === 'book') {
                    loadBooks();
                    populateBookDropdown();
                } else if (currentEditType === 'member') {
                    loadMembers();
                    populateMemberDropdown();
                } else if (currentEditType === 'loan') {
                    loadLoans();
                }
                
                loadDashboardData();
            } else {
                const error = await response.json();
                throw new Error(error.error || 'Failed to update');
            }
        } catch (error) {
            console.error('Error updating:', error);
            showToast('Error', error.message, 'error');
        }
    });
}

// Search and Filters
function setupSearchAndFilters() {
    // Book search
    const bookSearch = document.getElementById('book-search');
    const searchBookBtn = document.getElementById('search-book-btn');
    
    const performBookSearch = async () => {
        const searchTerm = bookSearch.value.trim().toLowerCase();
        
        if (!searchTerm) {
            loadBooks();
            return;
        }
        
        try {
            const response = await fetch(`${API_BASE_URL}/books`);
            const books = await response.json();
            
            const filteredBooks = books.filter(book => 
                book.title.toLowerCase().includes(searchTerm) || 
                (book.author && book.author.toLowerCase().includes(searchTerm)) ||
                book.isbn.toLowerCase().includes(searchTerm)
            );
            
            const booksList = document.getElementById('books-list');
            booksList.innerHTML = '';
            
            if (filteredBooks.length === 0) {
                booksList.innerHTML = `
                    <tr>
                        <td colspan="6" class="text-center text-muted">
                            No books found matching "${searchTerm}"
                        </td>
                    </tr>
                `;
                document.getElementById('books-count').textContent = '0';
                return;
            }
            
            filteredBooks.forEach(book => {
                const row = document.createElement('tr');
                const status = book.copies > 0 ? 'Available' : 'Out of Stock';
                const statusClass = book.copies > 0 ? 'status-active' : 'status-overdue';
                
                row.innerHTML = `
                    <td>
                        <div class="flex items-center gap-4">
                            <div class="activity-icon">
                                <i class="fas fa-book"></i>
                            </div>
                            <div>
                                <strong>${book.title}</strong>
                                ${book.author ? `<div class="text-muted" style="font-size: 12px;">${book.author}</div>` : ''}
                            </div>
                        </div>
                    </td>
                    <td>${book.author || '—'}</td>
                    <td><code>${book.isbn}</code></td>
                    <td>${book.copies}</td>
                    <td>
                        <span class="status-badge ${statusClass}">${status}</span>
                    </td>
                    <td>
                        <div class="action-buttons">
                            <button class="action-btn view" data-id="${book._id}" title="View">
                                <i class="fas fa-eye"></i>
                            </button>
                            <button class="action-btn edit" data-id="${book._id}" title="Edit">
                                <i class="fas fa-edit"></i>
                            </button>
                            <button class="action-btn delete" data-id="${book._id}" title="Delete">
                                <i class="fas fa-trash"></i>
                            </button>
                        </div>
                    </td>
                `;
                booksList.appendChild(row);
            });
            
            document.getElementById('books-count').textContent = filteredBooks.length;
            addBookEventListeners();
            
        } catch (error) {
            console.error('Error searching books:', error);
            showToast('Error', 'Failed to search books', 'error');
        }
    };
    
    bookSearch.addEventListener('keyup', function(e) {
        if (e.key === 'Enter') {
            performBookSearch();
        }
    });
    
    if (searchBookBtn) {
        searchBookBtn.addEventListener('click', performBookSearch);
    }
    
    // Loan filters
    document.querySelectorAll('.filter-btn').forEach(btn => {
        btn.addEventListener('click', function() {
            document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
            this.classList.add('active');
            
            currentFilter = this.getAttribute('data-filter');
            loadLoans();
        });
    });
    
    // Refresh buttons
    document.getElementById('refresh-books')?.addEventListener('click', loadBooks);
    document.getElementById('refresh-members')?.addEventListener('click', loadMembers);
    document.getElementById('refresh-loans')?.addEventListener('click', loadLoans);
    document.getElementById('refresh-activity')?.addEventListener('click', loadDashboardData);
}

// Dropdown Population
async function populateMemberDropdown() {
    try {
        const response = await fetch(`${API_BASE_URL}/members`);
        const members = await response.json();
        
        const dropdown = document.getElementById('loan-member');
        dropdown.innerHTML = '<option value="">Select a member</option>';
        
        members.forEach(member => {
            const option = document.createElement('option');
            option.value = member._id;
            option.textContent = `${member.name} (${member.email})`;
            dropdown.appendChild(option);
        });
    } catch (error) {
        console.error('Error loading members for dropdown:', error);
    }
}

async function populateBookDropdown() {
    try {
        const response = await fetch(`${API_BASE_URL}/books`);
        const books = await response.json();
        
        const dropdown = document.getElementById('loan-book');
        dropdown.innerHTML = '<option value="">Select a book</option>';
        
        // Only show books with available copies
        const availableBooks = books.filter(book => book.copies > 0);
        
        if (availableBooks.length === 0) {
            const option = document.createElement('option');
            option.value = '';
            option.textContent = 'No books available for loan';
            option.disabled = true;
            dropdown.appendChild(option);
        } else {
            availableBooks.forEach(book => {
                const option = document.createElement('option');
                option.value = book._id;
                option.textContent = `${book.title} by ${book.author || 'Unknown'} (${book.copies} available)`;
                dropdown.appendChild(option);
            });
        }
    } catch (error) {
        console.error('Error loading books for dropdown:', error);
    }
}

// Modal Functions
function setupModals() {
    // Close modals when clicking cancel or outside
    document.querySelectorAll('.modal-close').forEach(btn => {
        btn.addEventListener('click', function() {
            const modal = this.closest('.modal');
            hideModal(modal.id);
        });
    });
    
    // Close modals when clicking outside
    document.querySelectorAll('.modal').forEach(modal => {
        modal.addEventListener('click', function(e) {
            if (e.target === this) {
                hideModal(this.id);
            }
        });
    });
    
    // Confirm delete
    document.getElementById('confirm-delete')?.addEventListener('click', async function() {
        if (!currentItemToDelete) return;
        
        try {
            const response = await fetch(
                `${API_BASE_URL}/${currentItemToDelete.type}s/${currentItemToDelete.id}`,
                {
                    method: 'DELETE'
                }
            );
            
            if (response.ok) {
                hideModal('delete-modal');
                showToast('Success', `${currentItemToDelete.type} deleted successfully`, 'success');
                
                // Refresh data
                if (currentItemToDelete.type === 'book') {
                    loadBooks();
                    populateBookDropdown();
                } else if (currentItemToDelete.type === 'member') {
                    loadMembers();
                    populateMemberDropdown();
                } else if (currentItemToDelete.type === 'loan') {
                    loadLoans();
                }
                
                loadDashboardData();
            } else {
                const error = await response.json();
                throw new Error(error.error || 'Failed to delete');
            }
        } catch (error) {
            console.error('Error deleting:', error);
            showToast('Error', error.message, 'error');
        }
        
        currentItemToDelete = null;
    });
}

function showEditModal(type, id) {
    currentEditType = type;
    currentItemToEdit = id;
    
    const modal = document.getElementById('edit-modal');
    modal.querySelector('#modal-title').textContent = `Edit ${type}`;
    
    const formFields = document.getElementById('edit-form-fields');
    formFields.innerHTML = '';
    
    // Fetch item data and populate form
    fetch(`${API_BASE_URL}/${type}s/${id}`)
        .then(response => response.json())
        .then(item => {
            if (type === 'book') {
                formFields.innerHTML = `
                    <div class="form-group">
                        <label for="edit-title">Title *</label>
                        <input type="text" id="edit-title" name="title" value="${item.title}" required>
                    </div>
                    <div class="form-group">
                        <label for="edit-author">Author</label>
                        <input type="text" id="edit-author" name="author" value="${item.author || ''}">
                    </div>
                    <div class="form-group">
                        <label for="edit-isbn">ISBN *</label>
                        <input type="text" id="edit-isbn" name="isbn" value="${item.isbn}" required>
                    </div>
                    <div class="form-group">
                        <label for="edit-copies">Copies *</label>
                        <input type="number" id="edit-copies" name="copies" value="${item.copies}" min="0" required>
                    </div>
                `;
            } else if (type === 'member') {
                formFields.innerHTML = `
                    <div class="form-group">
                        <label for="edit-name">Name *</label>
                        <input type="text" id="edit-name" name="name" value="${item.name}" required>
                    </div>
                    <div class="form-group">
                        <label for="edit-email">Email *</label>
                        <input type="email" id="edit-email" name="email" value="${item.email}" required>
                    </div>
                `;
            } else if (type === 'loan') {
                const returnedAt = item.returnedAt ? new Date(item.returnedAt).toISOString().split('T')[0] : '';
                formFields.innerHTML = `
                    <div class="form-group">
                        <label for="edit-returnedAt">Returned Date</label>
                        <input type="date" id="edit-returnedAt" name="returnedAt" value="${returnedAt}">
                        <p class="text-muted" style="font-size: 12px; margin-top: 4px;">Set a date to mark this loan as returned</p>
                    </div>
                `;
            }
            
            modal.querySelector('.modal-footer').innerHTML = `
                <button type="submit" form="edit-form" class="btn-primary">Save Changes</button>
                <button type="button" class="btn-secondary modal-close">Cancel</button>
            `;
            
            showModal('edit-modal');
        })
        .catch(error => {
            console.error('Error loading item for edit:', error);
            showToast('Error', 'Failed to load item for editing', 'error');
        });
}

function showDeleteModal(type, id, itemName) {
    currentItemToDelete = { type, id };
    
    document.getElementById('delete-message').textContent = `Are you sure you want to delete ${itemName}?`;
    showModal('delete-modal');
}

function showModal(modalId) {
    document.getElementById(modalId).classList.add('active');
}

function hideModal(modalId) {
    document.getElementById(modalId).classList.remove('active');
}

// Toast notifications
function showToast(title, message, type = 'info') {
    const container = document.querySelector('.toast-container');
    const toast = document.createElement('div');
    
    const icons = {
        success: 'fas fa-check-circle',
        error: 'fas fa-exclamation-circle',
        warning: 'fas fa-exclamation-triangle',
        info: 'fas fa-info-circle'
    };
    
    toast.className = `toast ${type}`;
    toast.innerHTML = `
        <div class="toast-icon">
            <i class="${icons[type]}"></i>
        </div>
        <div class="toast-content">
            <div class="toast-title">${title}</div>
            <div class="toast-message">${message}</div>
        </div>
        <button class="toast-close">
            <i class="fas fa-times"></i>
        </button>
    `;
    
    container.appendChild(toast);
    
    // Remove toast after 5 seconds
    setTimeout(() => {
        toast.style.opacity = '0';
        toast.style.transform = 'translateX(100%)';
        setTimeout(() => toast.remove(), 300);
    }, 5000);
    
    // Close on click
    toast.querySelector('.toast-close').addEventListener('click', () => {
        toast.style.opacity = '0';
        toast.style.transform = 'translateX(100%)';
        setTimeout(() => toast.remove(), 300);
    });
}

// Utility Functions
function isValidEmail(email) {
    const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return re.test(email);
}