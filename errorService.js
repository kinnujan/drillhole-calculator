import { error as logError } from './logger.js';

class ErrorService {
    constructor() {
        this.errorElement = null;
    }

    getErrorElement() {
        if (!this.errorElement) {
            this.errorElement = document.getElementById('error');
        }
        return this.errorElement;
    }

    handleError(err, userMessage = 'An error occurred. Please try again.') {
        try {
            const errorElement = this.getErrorElement();
            if (errorElement) {
                errorElement.textContent = userMessage;
                errorElement.style.display = 'block';
                setTimeout(() => {
                    errorElement.style.display = 'none';
                }, 5000);
            } else {
                console.error('Error element not found in the DOM');
            }
        } catch (e) {
            console.error('Error displaying error message:', e);
        }

        this.logError(err);
    }

    clearError() {
        try {
            const errorElement = this.getErrorElement();
            if (errorElement) {
                errorElement.textContent = '';
                errorElement.style.display = 'none';
            }
        } catch (e) {
            console.error('Error clearing error element:', e);
        }
    }

    logError(err) {
        if (err instanceof Error) {
            logError(err);
        } else {
            logError(new Error(err));
        }
    }
}

const errorService = new ErrorService();
export default errorService;
