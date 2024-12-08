document.addEventListener('DOMContentLoaded', () => {
    // Initialize EmailJS
    emailjs.init(config.emailjs.publicKey);

    // DOM Elements
    const staffForm = document.getElementById('staff-form');
    const notification = document.getElementById('notification');
    const streamStatus = document.getElementById('stream-status');

    // Twitch API Functions
    class TwitchAPI {
        constructor(clientId, clientSecret) {
            this.clientId = clientId;
            this.clientSecret = clientSecret;
            this.accessToken = null;
        }

        async getAccessToken() {
            try {
                const response = await fetch('https://id.twitch.tv/oauth2/token', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/x-www-form-urlencoded',
                    },
                    body: new URLSearchParams({
                        client_id: this.clientId,
                        client_secret: this.clientSecret,
                        grant_type: 'client_credentials'
                    })
                });

                if (!response.ok) {
                    throw new Error('Failed to get Twitch access token');
                }

                const data = await response.json();
                this.accessToken = data.access_token;
                return this.accessToken;
            } catch (error) {
                console.error('Error getting Twitch access token:', error);
                throw error;
            }
        }

        async getStreamInfo(username) {
            try {
                if (!this.accessToken) {
                    await this.getAccessToken();
                }

                const response = await fetch(`https://api.twitch.tv/helix/streams?user_login=${username}`, {
                    headers: {
                        'Client-ID': this.clientId,
                        'Authorization': `Bearer ${this.accessToken}`
                    }
                });

                if (!response.ok) {
                    if (response.status === 401) {
                        // Token expired, get new one and retry
                        await this.getAccessToken();
                        return this.getStreamInfo(username);
                    }
                    throw new Error('Failed to get stream info');
                }

                const data = await response.json();
                return data.data[0]; // Return stream info or undefined if offline
            } catch (error) {
                console.error('Error getting stream info:', error);
                throw error;
            }
        }

        async getUserInfo(username) {
            try {
                if (!this.accessToken) {
                    await this.getAccessToken();
                }

                const response = await fetch(`https://api.twitch.tv/helix/users?login=${username}`, {
                    headers: {
                        'Client-ID': this.clientId,
                        'Authorization': `Bearer ${this.accessToken}`
                    }
                });

                if (!response.ok) {
                    if (response.status === 401) {
                        await this.getAccessToken();
                        return this.getUserInfo(username);
                    }
                    throw new Error('Failed to get user info');
                }

                const data = await response.json();
                return data.data[0];
            } catch (error) {
                console.error('Error getting user info:', error);
                throw error;
            }
        }
    }

    // Initialize Twitch API
    const twitchAPI = new TwitchAPI(config.twitch.clientId, config.twitch.clientSecret);

    // Update Stream Status
    async function updateStreamStatus() {
        try {
            const streamInfo = await twitchAPI.getStreamInfo(config.twitch.username);
            const userInfo = await twitchAPI.getUserInfo(config.twitch.username);

            if (streamInfo) {
                // Stream is live
                streamStatus.innerHTML = `
                    <div class="stream-card live">
                        <div class="stream-thumbnail">
                            <img src="${streamInfo.thumbnail_url.replace('{width}', '440').replace('{height}', '248')}" alt="Stream en direct">
                        </div>
                        <div class="stream-info">
                            <div class="stream-header">
                                <div class="streamer-info">
                                    <img src="${userInfo.profile_image_url}" alt="Profile" class="profile-img">
                                    <div class="streamer-details">
                                        <h3>Stream</h3>
                                        <p class="game-name">${streamInfo.game_name}</p>
                                    </div>
                                    <div class="live-indicator">
                                        <span class="dot"></span>
                                        EN DIRECT
                                    </div>
                                </div>
                                <a href="https://twitch.tv/${config.twitch.username}" target="_blank" class="watch-now">
                                    <i class="fab fa-twitch"></i>
                                </a>
                            </div>
                        </div>
                    </div>
                `;
            } else {
                // Stream is offline
                streamStatus.innerHTML = `
                    <div class="stream-card offline">
                        <div class="stream-info">
                            <div class="stream-header">
                                <div class="streamer-info">
                                    <img src="${userInfo.profile_image_url}" alt="Profile" class="profile-img">
                                    <div class="streamer-details">
                                        <h3>Stream</h3>
                                        <p class="offline-text">Hors ligne</p>
                                    </div>
                                </div>
                                <a href="https://twitch.tv/${config.twitch.username}" target="_blank" class="watch-now">
                                    <i class="fab fa-twitch"></i>
                                </a>
                            </div>
                        </div>
                    </div>
                `;
            }
        } catch (error) {
            console.error('Error updating stream status:', error);
            streamStatus.innerHTML = `
                <div class="stream-card error">
                    <div class="stream-info">
                        <div class="stream-header">
                            <p><i class="fas fa-exclamation-circle"></i> Erreur de chargement</p>
                            <a href="https://twitch.tv/${config.twitch.username}" target="_blank" class="watch-now">
                                <i class="fab fa-twitch"></i>
                            </a>
                        </div>
                    </div>
                </div>
            `;
        }
    }

    // Scroll Animation
    const animateOnScroll = () => {
        const elements = document.querySelectorAll('.animate-on-scroll');
        elements.forEach(element => {
            const elementTop = element.getBoundingClientRect().top;
            const elementBottom = element.getBoundingClientRect().bottom;
            const isVisible = (elementTop < window.innerHeight - 100) && (elementBottom > 0);
            
            if (isVisible) {
                element.classList.add('show');
            }
        });
    };

    // Header Scroll Effect
    const header = document.querySelector('header');
    const handleHeaderScroll = () => {
        if (window.scrollY > 50) {
            header.classList.add('scrolled');
        } else {
            header.classList.remove('scrolled');
        }
    };

    // Notification System
    const showNotification = (type, message) => {
        const notificationEl = document.getElementById('notification');
        const iconEl = notificationEl.querySelector('.notification-icon');
        const messageEl = notificationEl.querySelector('.message');
        
        // Remove any existing animation classes
        notificationEl.classList.remove('slide-in', 'slide-out');
        
        // Set notification type and message
        notificationEl.className = `notification ${type}`;
        iconEl.className = `notification-icon fas ${type === 'success' ? 'fa-check-circle' : 'fa-exclamation-circle'}`;
        messageEl.textContent = message;
        
        // Add slide-in animation
        notificationEl.classList.add('slide-in');
        notificationEl.style.display = 'flex';
        
        // Remove notification after delay
        setTimeout(() => {
            notificationEl.classList.remove('slide-in');
            notificationEl.classList.add('slide-out');
            setTimeout(() => {
                notificationEl.style.display = 'none';
            }, 300);
        }, 5000);
    };

    // Close notification on click
    document.querySelector('.notification .close').addEventListener('click', () => {
        notification.classList.remove('show');
    });

    // YouTube Videos
    const fetchYouTubeVideos = async () => {
        try {
            const response = await fetch(`https://www.googleapis.com/youtube/v3/search?key=${config.youtube.apiKey}&channelId=${config.youtube.channelId}&part=snippet,id&order=date&maxResults=6&type=video`);
            const data = await response.json();
            
            const videoGrid = document.getElementById('youtube-videos');
            videoGrid.innerHTML = '';
            
            data.items.forEach(item => {
                if (item.id.kind === "youtube#video") {
                    const videoCard = document.createElement('div');
                    videoCard.className = 'video-card animate-on-scroll';
                    videoCard.innerHTML = `
                        <div class="video-thumbnail">
                            <img src="${item.snippet.thumbnails.high.url}" alt="${item.snippet.title}" loading="lazy">
                            <div class="video-overlay">
                                <i class="fas fa-play"></i>
                            </div>
                        </div>
                        <div class="video-info">
                            <h3>${item.snippet.title}</h3>
                            <p>${new Date(item.snippet.publishedAt).toLocaleDateString('fr-FR', { 
                                year: 'numeric', 
                                month: 'long', 
                                day: 'numeric' 
                            })}</p>
                        </div>
                    `;
                    
                    videoCard.addEventListener('click', () => {
                        window.open(`https://www.youtube.com/watch?v=${item.id.videoId}`, '_blank');
                    });
                    
                    videoGrid.appendChild(videoCard);
                }
            });
        } catch (error) {
            console.error('Error fetching YouTube videos:', error);
            document.getElementById('youtube-videos').innerHTML = `
                <div class="error-message">
                    <i class="fas fa-exclamation-circle"></i>
                    <p>Impossible de charger les vidéos YouTube.</p>
                </div>
            `;
        }
    };

    // Staff Application Form
    staffForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const formData = {
            discord_name: document.getElementById('discord-name').value,
            age: document.getElementById('age').value,
            availability: document.getElementById('availability').value,
            experience: document.getElementById('experience').value,
            platforms: {
                twitch: document.getElementById('twitch-follow').checked,
                youtube: document.getElementById('youtube-follow').checked,
                discord: document.getElementById('discord-member').checked
            }
        };

        if (!formData.discord_name || !formData.age || !formData.availability || !formData.experience) {
            showNotification('error', 'Veuillez remplir tous les champs obligatoires.');
            return;
        }

        try {
            const platformsList = Object.entries(formData.platforms)
                .filter(([_, checked]) => checked)
                .map(([platform]) => {
                    switch(platform) {
                        case 'twitch': return 'Twitch';
                        case 'youtube': return 'YouTube';
                        case 'discord': return 'Discord';
                        default: return platform;
                    }
                })
                .join(', ');

            const date = new Date().toLocaleDateString('fr-FR', {
                weekday: 'long',
                year: 'numeric',
                month: 'long',
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit'
            });

            const emailContent = {
                to_email: config.emailjs.recipientEmail,
                subject: `🎮 Nouvelle candidature Staff - ${formData.discord_name}`,
                message: `
📋 NOUVELLE CANDIDATURE STAFF

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

👤 INFORMATIONS PERSONNELLES
• Discord: ${formData.discord_name}
• Âge: ${formData.age} ans

⏰ DISPONIBILITÉS
${formData.availability}

🎯 EXPÉRIENCE
${formData.experience}

🌟 PLATEFORMES SUIVIES
${platformsList || '❌ Aucune plateforme sélectionnée'}

📅 DÉTAILS DE LA CANDIDATURE
• Date: ${date}
• ID: STAFF-${Date.now().toString(36)}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

💫 Cette candidature a été envoyée automatiquement via le site web.
`,
                discord_name: formData.discord_name,
                age: formData.age,
                availability: formData.availability,
                experience: formData.experience,
                platforms: platformsList || 'Aucune'
            };

            await emailjs.send(
                config.emailjs.serviceId,
                config.emailjs.templateId,
                emailContent
            );

            showNotification('success', '✨ Votre candidature a été envoyée avec succès ! Nous vous répondrons bientôt.');
            staffForm.reset();
            
        } catch (error) {
            console.error('Error sending email:', error);
            showNotification('error', '❌ Une erreur est survenue lors de l\'envoi de votre candidature. Veuillez réessayer.');
        }
    });

    // Glitch Effect
    const glitchText = document.querySelector('.glitch');
    if (glitchText) {
        const text = glitchText.textContent;
        glitchText.setAttribute('data-text', text);
    }

    // Initialize
    window.addEventListener('scroll', () => {
        animateOnScroll();
        handleHeaderScroll();
    });

    // Update stream status every 60 seconds
    setInterval(updateStreamStatus, 60000);

    // Initialize everything when the page loads
    window.addEventListener('load', () => {
        animateOnScroll();
        updateStreamStatus();
        fetchYouTubeVideos();
    });
});
