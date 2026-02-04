import { initializeApp } from 'firebase/app';
import {
    getAuth,
    createUserWithEmailAndPassword,
    signInWithEmailAndPassword,
    signOut,
    onAuthStateChanged
} from 'firebase/auth';
import {
    getDatabase,
    ref,
    set,
    get,
    update,
    query,
    orderByChild,
    equalTo,
    limitToLast
} from 'firebase/database';
import { firebaseConfig } from '../config/firebase.config.js';

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const database = getDatabase(app);

class FirebaseService {
    constructor() {
        this.currentUser = null;
        this.authStateCallback = null;

        // Listen for auth state changes
        onAuthStateChanged(auth, (user) => {
            this.currentUser = user;
            if (this.authStateCallback) {
                this.authStateCallback(user);
            }
        });
    }

    // Set callback for auth state changes
    onAuthStateChange(callback) {
        this.authStateCallback = callback;
    }

    // Check if username exists
    async checkUsernameExists(username) {
        try {
            const usersQuery = query(
                ref(database, 'users'),
                orderByChild('username'),
                equalTo(username)
            );
            const snapshot = await get(usersQuery);
            return snapshot.exists();
        } catch (error) {
            console.error("Error checking username:", error);
            // Default to false if error, or handle gracefully? 
            // Better to assume it doesn't exist or rethrow, but here we'll return false to fallback to auth error if collision happens later (unlikely with fake emails).
            return false;
        }
    }

    // Register new user
    async register(username, password) { // password param kept for signature compatibility but ignored for regular users
        try {
            // Check if username already exists
            const exists = await this.checkUsernameExists(username);
            if (exists) {
                return { success: false, error: 'Username already taken' };
            }

            // Create fake email for Firebase Auth
            const lowerUsername = username.toLowerCase().replace(/\s/g, '');
            const email = `${lowerUsername}@fullerton.com`;

            // Use default password for all users
            const DEFAULT_PASSWORD = 'flappy_default_pass_123';

            const userCredential = await createUserWithEmailAndPassword(auth, email, DEFAULT_PASSWORD);
            const user = userCredential.user;

            // Create user profile in database
            await set(ref(database, 'users/' + user.uid), {
                username: username,
                email: email, // Store the fake email just in case
                highScore: 0,
                gamesPlayed: 0,
                createdAt: new Date().toISOString()
            });

            return { success: true, user };
        } catch (error) {
            return { success: false, error: error.message };
        }
    }

    // Login existing user
    async login(username, password = null) {
        try {
            const lowerUsername = username.toLowerCase().replace(/\s/g, '');
            const email = `${lowerUsername}@fullerton.com`;

            // If password is not provided (regular user), use default
            const authPassword = password || 'flappy_default_pass_123';

            const userCredential = await signInWithEmailAndPassword(auth, email, authPassword);
            return { success: true, user: userCredential.user };
        } catch (error) {
            return { success: false, error: error.message };
        }
    }

    // Logout
    async logout() {
        try {
            await signOut(auth);
            return { success: true };
        } catch (error) {
            return { success: false, error: error.message };
        }
    }

    // Get user profile
    async getUserProfile(uid) {
        try {
            const snapshot = await get(ref(database, 'users/' + uid));
            if (snapshot.exists()) {
                return { success: true, data: snapshot.val() };
            } else {
                return { success: false, error: 'User profile not found' };
            }
        } catch (error) {
            return { success: false, error: error.message };
        }
    }

    // Update high score
    async updateHighScore(uid, score) {
        try {
            const profileResult = await this.getUserProfile(uid);
            if (!profileResult.success) {
                return profileResult;
            }

            const currentHighScore = profileResult.data.highScore || 0;

            // Only update if new score is higher
            if (score > currentHighScore) {
                await update(ref(database, 'users/' + uid), {
                    highScore: score,
                    lastUpdated: new Date().toISOString()
                });
                return { success: true, newHighScore: true, score };
            }

            return { success: true, newHighScore: false, score: currentHighScore };
        } catch (error) {
            return { success: false, error: error.message };
        }
    }

    // Increment games played
    async incrementGamesPlayed(uid) {
        try {
            const profileResult = await this.getUserProfile(uid);
            if (!profileResult.success) {
                return profileResult;
            }

            const currentGamesPlayed = profileResult.data.gamesPlayed || 0;
            const newGamesPlayed = currentGamesPlayed + 1;

            await update(ref(database, 'users/' + uid), {
                gamesPlayed: newGamesPlayed,
                lastPlayed: new Date().toISOString()
            });

            return { success: true, gamesPlayed: newGamesPlayed };
        } catch (error) {
            return { success: false, error: error.message };
        }
    }

    // Get leaderboard (top 10)
    async getLeaderboard() {
        try {
            const leaderboardQuery = query(
                ref(database, 'users'),
                orderByChild('highScore'),
                limitToLast(10)
            );

            const snapshot = await get(leaderboardQuery);
            if (snapshot.exists()) {
                const users = [];
                snapshot.forEach((childSnapshot) => {
                    users.push({
                        uid: childSnapshot.key,
                        ...childSnapshot.val()
                    });
                });

                // Sort descending by high score
                users.sort((a, b) => b.highScore - a.highScore);

                return { success: true, leaderboard: users };
            } else {
                return { success: true, leaderboard: [] };
            }
        } catch (error) {
            return { success: false, error: error.message };
        }
    }

    // Get all users (for admin)
    async getAllUsers() {
        try {
            const snapshot = await get(ref(database, 'users'));
            if (snapshot.exists()) {
                const users = [];
                snapshot.forEach((childSnapshot) => {
                    users.push({
                        uid: childSnapshot.key,
                        ...childSnapshot.val()
                    });
                });
                return { success: true, users };
            } else {
                return { success: true, users: [] };
            }
        } catch (error) {
            return { success: false, error: error.message };
        }
    }

    // Get current user
    getCurrentUser() {
        return this.currentUser;
    }

    // Check if user is authenticated
    isAuthenticated() {
        return this.currentUser !== null;
    }

    // Get disclaimer config
    async getDisclaimerConfig() {
        try {
            const snapshot = await get(ref(database, 'config/disclaimer'));
            if (snapshot.exists()) {
                return { success: true, config: snapshot.val() };
            } else {
                // Default config
                return { success: true, config: { enabled: false, text: '' } };
            }
        } catch (error) {
            return { success: false, error: error.message };
        }
    }

    // Update disclaimer config
    async updateDisclaimerConfig(enabled, text) {
        try {
            await set(ref(database, 'config/disclaimer'), {
                enabled,
                text,
                updatedAt: new Date().toISOString()
            });
            return { success: true };
        } catch (error) {
            return { success: false, error: error.message };
        }
    }
}

// Export singleton instance
export const firebaseService = new FirebaseService();
