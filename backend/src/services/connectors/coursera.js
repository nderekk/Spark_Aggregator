const axios = require('axios');
const dotenv = require('dotenv');
dotenv.config();


async function fetchFromRepoA() {

    const auth = Buffer.from(`${process.env.REPO_A_KEY}:${process.env.REPO_A_SECRET}`).toString('base64');
    const response = await axios.post(process.env.REPO_A_URL, 
    'grant_type=client_credentials',
    {
        headers: {
            'Authorization': `Basic ${auth}`,
            'Content-Type': 'application/x-www-form-urlencoded'
        }
    });
    return response.data.access_token;
}

async function getCourses() {
    console.log("Fetching courses from Repo A...");
    try {
        const token = await fetchFromRepoA();

        const response = await axios.get(process.env.REPO_A_COURSES_URL, {
            headers: { 'Authorization': `Bearer ${token}` },
            params: {
                fields: 'description,difficultyLevel,primaryLanguages,slug,domainTypes',
                includes: 'description',
                limit: 100
            }
        });
        return response.data; 
    } catch (error) {
        console.error("Connector Error:", error.response ? error.response.data : error.message);
        throw error;
    }
}

function normalize(data) {
    if (!data || !data.elements) return [];

    return data.elements.map(item => ({
        externalId: item.id,
        title: item.name,
        name: item.name, 
        description: item.description || "No description available",
        provider: 'Coursera',
        url: `https://www.coursera.org/learn/${item.slug}`,
        language: (item.primaryLanguages && item.primaryLanguages.length > 0) ? item.primaryLanguages[0] : 'en',
        level: item.difficultyLevel || 'Beginner',
        category: (item.domainTypes && item.domainTypes.length > 0) ? item.domainTypes[0].domainId : 'General',
        keywords: item.slug ? item.slug.split('-') : []
    }));
}

module.exports = {
    getCourses,
    normalize
};