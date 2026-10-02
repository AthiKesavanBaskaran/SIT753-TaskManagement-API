const { isValidTask } = require('../../src/validation');

describe('Task Validation Unit Tests', () => {
    it('should return true for a valid task with a title', () => {
        const result = isValidTask({ title: 'Finish DevSecOps pipeline' });
        expect(result).toBe(true);
    });

    it('should return false if title is missing', () => {
        const result = isValidTask({ description: 'No title here' });
        expect(result).toBe(false);
    });

    it('should return false if title is empty spaces', () => {
        const result = isValidTask({ title: '   ' });
        expect(result).toBe(false);
    });

    it('should return false if task object is null', () => {
        const result = isValidTask(null);
        expect(result).toBe(false);
    });
});