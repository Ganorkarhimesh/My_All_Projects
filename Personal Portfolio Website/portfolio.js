        // Dark/Light Mode Toggle
        const themeToggle = document.querySelector('.theme-toggle');
        themeToggle.addEventListener('click', () => {
            document.body.classList.toggle('dark-mode');
            const icon = themeToggle.querySelector('i');
            if (document.body.classList.contains('dark-mode')) {
                icon.classList.remove('fa-moon');
                icon.classList.add('fa-sun');
                localStorage.setItem('theme', 'dark');
            } else {
                icon.classList.remove('fa-sun');
                icon.classList.add('fa-moon');
                localStorage.setItem('theme', 'light');
            }
        });

        // Check for saved theme preference
        if (localStorage.getItem('theme') === 'dark') {
            document.body.classList.add('dark-mode');
            themeToggle.querySelector('i').classList.remove('fa-moon');
            themeToggle.querySelector('i').classList.add('fa-sun');
        }

        // Mobile Menu Toggle
        const hamburger = document.querySelector('.hamburger');
        const navLinks = document.querySelector('.nav-links');
        hamburger.addEventListener('click', () => {
            navLinks.classList.toggle('active');
            hamburger.querySelector('i').classList.toggle('fa-times');
            hamburger.querySelector('i').classList.toggle('fa-bars');
        });

        // Close mobile menu when clicking a link
        document.querySelectorAll('.nav-links a').forEach(link => {
            link.addEventListener('click', () => {
                navLinks.classList.remove('active');
                hamburger.querySelector('i').classList.add('fa-bars');
                hamburger.querySelector('i').classList.remove('fa-times');
            });
        });

        // Project Filtering
        const filterButtons = document.querySelectorAll('.filter-btn');
        const projectCards = document.querySelectorAll('.project-card');

        filterButtons.forEach(button => {
            button.addEventListener('click', () => {
                // Remove active class from all buttons
                filterButtons.forEach(btn => btn.classList.remove('active'));
                // Add active class to clicked button
                button.classList.add('active');

                const filter = button.getAttribute('data-filter');

                projectCards.forEach(card => {
                    if (filter === 'all' || card.getAttribute('data-category') === filter) {
                        card.style.display = 'block';
                    } else {
                        card.style.display = 'none';
                    }
                });
            });
        });

        // Smooth Scrolling for Nav Links
        document.querySelectorAll('a[href^="#"]').forEach(anchor => {
            anchor.addEventListener('click', function(e) {
                e.preventDefault();
                document.querySelector(this.getAttribute('href')).scrollIntoView({
                    behavior: 'smooth'
                });
            });
        });

        // Project Modal
        const modal = document.getElementById('project-modal');
        const closeModal = document.querySelector('.close-modal');
        const viewDetailsButtons = document.querySelectorAll('.view-details');

        // Project data for modal
        const projectsData = {
            'portfolio': {
                title: 'Personal Portfolio',
                description: 'A fully responsive portfolio website built with pure HTML and CSS, featuring dark/light mode toggle, project filtering, and smooth animations. This project showcases my skills in creating clean, modern interfaces with semantic HTML and efficient CSS.',
                technologies: ['HTML5', 'CSS3', 'JavaScript'],
                image: 'https://via.placeholder.com/800x400',
                demo: '#',
                code: '#'
            },
            'restaurant': {
                title: 'Restaurant Website',
                description: 'A modern restaurant website with responsive design, CSS animations, and interactive elements. Features include a menu section, reservation form, and gallery with hover effects. Built with mobile-first approach for optimal performance on all devices.',
                technologies: ['HTML5', 'CSS3', 'JavaScript'],
                image: 'https://via.placeholder.com/800x400',
                demo: '#',
                code: '#'
            },
            'weather': {
                title: 'Weather App',
                description: 'Real-time weather application that fetches data from OpenWeather API. Users can search for any city worldwide and get current weather conditions, 5-day forecast, and weather icons. Features error handling for invalid locations and persistent search history.',
                technologies: ['JavaScript', 'API Integration', 'Local Storage'],
                image: 'https://via.placeholder.com/800x400',
                demo: '#',
                code: '#'
            },
            'task-manager': {
                title: 'Task Manager',
                description: 'A CRUD application that allows users to add, edit, delete, and mark tasks as complete. Tasks are saved to local storage so they persist between sessions. Features include filtering tasks by status and responsive design for all screen sizes.',
                technologies: ['JavaScript', 'Local Storage', 'DOM Manipulation'],
                image: 'https://via.placeholder.com/800x400',
                demo: '#',
                code: '#'
            },
            'ecommerce': {
                title: 'E-Commerce App',
                description: 'Frontend e-commerce platform built with React. Features include product filtering by category, search functionality, shopping cart with quantity adjustment, and product details page. State management handled with React Context API.',
                technologies: ['React', 'Context API', 'React Router'],
                image: 'https://via.placeholder.com/800x400',
                demo: '#',
                code: '#'
            },
            'movie-db': {
                title: 'Movie Database',
                description: 'Browse movies using TMDB API with search functionality. Users can view trending movies, search by title, and see detailed information including ratings, cast, and similar movies. Features pagination for browsing through results.',
                technologies: ['React', 'API Integration', 'React Hooks'],
                image: 'https://via.placeholder.com/800x400',
                demo: '#',
                code: '#'
            },
            'blog': {
                title: 'Blog Platform',
                description: 'Full-stack blog application with user authentication, CRUD operations for posts, and comment functionality. Built with React frontend, Node.js/Express backend, and MongoDB database. Features rich text editing and image uploads.',
                technologies: ['MERN Stack', 'JWT Authentication', 'Cloudinary'],
                image: 'https://via.placeholder.com/800x400',
                demo: '#',
                code: '#'
            }
        };

        // Open modal with project details
        viewDetailsButtons.forEach(button => {
            button.addEventListener('click', (e) => {
                e.preventDefault();
                const projectId = button.getAttribute('data-project');
                const project = projectsData[projectId];
                
                document.querySelector('.modal-title').textContent = project.title;
                document.querySelector('.modal-description').textContent = project.description;
                document.querySelector('.modal-img').src = project.image;
                
                const techContainer = document.querySelector('.modal-tech');
                techContainer.innerHTML = '';
                project.technologies.forEach(tech => {
                    const span = document.createElement('span');
                    span.textContent = tech;
                    techContainer.appendChild(span);
                });
                
                const links = document.querySelectorAll('.modal-links a');
                links[0].href = project.demo;
                links[1].href = project.code;
                
                modal.style.display = 'flex';
                document.body.style.overflow = 'hidden';
            });
        });

        // Close modal
        closeModal.addEventListener('click', () => {
            modal.style.display = 'none';
            document.body.style.overflow = 'auto';
        });

        // Close modal when clicking outside
        window.addEventListener('click', (e) => {
            if (e.target === modal) {
                modal.style.display = 'none';
                document.body.style.overflow = 'auto';
            }
        });

        // Form submission
        const contactForm = document.querySelector('.contact-form');
        contactForm.addEventListener('submit', (e) => {
            e.preventDefault();
            alert('Thank you for your message! I will get back to you soon.');
            contactForm.reset();
        });
