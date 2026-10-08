/**
 * LocalStorage-based storage layer - replaces PHP endpoints
 * Handles: contact form, newsletter subscription, admin data persistence
 * All data stored in localStorage, portable via JSON import/export
 */

const STORAGE_KEYS = {
    PROJECTS: 'amcf_projects',
    EDITS: 'amcf_edits',
    RESUME: 'amcf_resume',
    CONTACTS: 'amcf_contacts',
    NEWSLETTER: 'amcf_newsletter',
    SETTINGS: 'amcf_settings'
};

const Storage = {
    // Generic get/set
    get: function(key, defaultValue = null) {
        try {
            const raw = localStorage.getItem(key);
            return raw ? JSON.parse(raw) : defaultValue;
        } catch (e) {
            console.warn('Storage.get(' + key + ') failed:', e);
            return defaultValue;
        }
    },

    set: function(key, value) {
        try {
            localStorage.setItem(key, JSON.stringify(value));
            return true;
        } catch (e) {
            console.error('Storage.set(' + key + ') failed:', e);
            return false;
        }
    },

    // Projects
    getProjects: function() {
        return this.get(STORAGE_KEYS.PROJECTS, []);
    },

    saveProjects: function(list) {
        return this.set(STORAGE_KEYS.PROJECTS, list);
    },

    // Edits (overrides for existing projects)
    getEdits: function() {
        return this.get(STORAGE_KEYS.EDITS, {});
    },

    saveEdits: function(obj) {
        return this.set(STORAGE_KEYS.EDITS, obj);
    },

    // Resume (facts + jobs + newJobs)
    getResume: function() {
        return this.get(STORAGE_KEYS.RESUME, { facts: {}, jobs: {}, newJobs: [] });
    },

    saveResume: function(obj) {
        return this.set(STORAGE_KEYS.RESUME, obj);
    },

    // Contacts (replaces contact_me.php)
    getContacts: function() {
        return this.get(STORAGE_KEYS.CONTACTS, []);
    },

    addContact: function(contact) {
        const contacts = this.getContacts();
        contacts.unshift({
            ...contact,
            id: Date.now().toString(),
            date: new Date().toISOString()
        });
        return this.set(STORAGE_KEYS.CONTACTS, contacts);
    },

    // Newsletter (replaces subscription.php)
    getNewsletter: function() {
        return this.get(STORAGE_KEYS.NEWSLETTER, []);
    },

    addNewsletter: function(email) {
        const list = this.getNewsletter();
        if (list.find(s => s.email === email)) {
            return { ok: false, error: 'Bereits abonniert' };
        }
        list.unshift({
            email,
            date: new Date().toISOString(),
            id: Date.now().toString()
        });
        this.set(STORAGE_KEYS.NEWSLETTER, list);
        return { ok: true };
    },

    // Import/Export (for backup/migration)
    exportAll: function() {
        const data = {};
        for (const [key, storageKey] of Object.entries(STORAGE_KEYS)) {
            data[key] = this.get(storageKey);
        }
        return {
            version: '1.0',
            exportDate: new Date().toISOString(),
            data
        };
    },

    downloadJSON: function() {
        const data = this.exportAll();
        const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'amcf-backup-' + new Date().toISOString().slice(0,10) + '.json';
        a.click();
        URL.revokeObjectURL(url);
    },

    importJSON: function(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = (e) => {
                try {
                    const backup = JSON.parse(e.target.result);
                    if (!backup.data) throw new Error('Invalid backup format');
                    
                    for (const [key, storageKey] of Object.entries(STORAGE_KEYS)) {
                        if (backup.data[key] !== undefined) {
                            this.set(storageKey, backup.data[key]);
                        }
                    }
                    resolve({ ok: true });
                } catch (e) {
                    reject(e);
                }
            };
            reader.readAsText(file);
        });
    },

    // Clear all data (for testing/reset)
    clearAll: function() {
        for (const storageKey of Object.values(STORAGE_KEYS)) {
            localStorage.removeItem(storageKey);
        }
    }
};

// Make globally available
window.AMCFStorage = Storage;