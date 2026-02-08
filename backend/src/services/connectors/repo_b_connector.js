const fs = require('fs');
const csv = require('csv-parser');
const path = require('path');

async function getCourses() {
    const results = [];
    const filePath = path.join(__dirname, '../../data/udemy_courses.csv');
    
    return new Promise((resolve, reject) => {
        fs.createReadStream(filePath)
            .pipe(csv())
            .on('data', (data) => results.push(data))
            .on('end', () => resolve(results))
            .on('error', (error) => reject(error));
    });
}

function normalize(data) {
    const courses = Array.isArray(data) ? data : [];

    return courses.map(course => ({
        externalId: `udemy-${course.course_id}`,
        title: course.course_title,
        description: course.description ,
        provider: 'Udemy',
        url: course.course_url,
        language: course.language || 'en',
        level: course.level || 'Beginner',
        category: course.category || 'General',
        keywords: course.keywords || []
    }));
}

module.exports = {
    getCourses,
    normalize
};