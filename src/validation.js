function isValidTask(task) {
    if (!task || !task.title || typeof task.title !== 'string') {
        return false;
    }
    if (task.title.trim() === '') {
        return false;
    }
    return true;
}

module.exports = { isValidTask };